// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getCallerRole(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.role ?? null;
}

const EDITABLE_FIELDS = [
  "appointment_at",
  "notes",
  "street_address",
  "zip",
  "customer_name",
  "customer_phone",
  "customer_email",
] as const;

export const editBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        bookingId: z.string().uuid(),
        appointment_at: z.string().optional(),
        notes: z.string().nullable().optional(),
        street_address: z.string().optional(),
        zip: z.string().optional(),
        customer_name: z.string().optional(),
        customer_phone: z.string().optional(),
        customer_email: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await getCallerRole(context.userId);
    if (!["ADMIN", "ULTIMATE_ADMIN"].includes(role)) throw new Error("Forbidden");

    const { bookingId, ...fields } = data;

    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select(
        "assigned_to, appointment_at, notes, street_address, zip, customer_name, customer_phone, customer_email",
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!booking) throw new Error("Booking not found");

    // Workers can only edit jobs assigned to them
    if (role === "ADMIN" && booking.assigned_to !== context.userId) {
      throw new Error("Not your job");
    }

    const changes: Record<string, { old: any; new: any }> = {};
    const updates: Record<string, any> = {};

    for (const [field, newVal] of Object.entries(fields)) {
      if (newVal === undefined) continue;
      const oldVal = (booking as any)[field];
      if (oldVal !== newVal) {
        changes[field] = { old: oldVal, new: newVal };
        updates[field] = newVal;
      }
    }

    if (Object.keys(changes).length === 0) return { ok: true, changed: false };

    const { error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update(updates)
      .eq("id", bookingId);
    if (updateErr) throw new Error(updateErr.message);

    const { error: logErr } = await supabaseAdmin
      .from("order_edits")
      .insert({ booking_id: bookingId, edited_by: context.userId, changes });
    if (logErr) throw new Error(logErr.message);

    return { ok: true, changed: true };
  });

export const getOrderEdits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ bookingId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await getCallerRole(context.userId);
    if (!["ADMIN", "ULTIMATE_ADMIN"].includes(role)) throw new Error("Forbidden");

    // Workers can only view edits for their own assigned jobs
    if (role === "ADMIN") {
      const { data: booking } = await supabaseAdmin
        .from("bookings")
        .select("assigned_to")
        .eq("id", data.bookingId)
        .maybeSingle();
      if (booking?.assigned_to !== context.userId) throw new Error("Not your job");
    }

    const { data: edits, error } = await supabaseAdmin
      .from("order_edits")
      .select("id, edited_by, edited_at, changes, overturned_by, overturned_at")
      .eq("booking_id", data.bookingId)
      .order("edited_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rawEdits = edits ?? [];
    const userIds = [
      ...new Set(
        rawEdits
          .flatMap((e) => [e.edited_by, e.overturned_by])
          .filter(Boolean),
      ),
    ];

    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, username")
        .in("id", userIds);
      userMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, p.username]),
      );
    }

    return {
      edits: rawEdits.map((e) => ({
        ...e,
        editor_username: userMap[e.edited_by] ?? "Unknown",
        overturner_username: e.overturned_by
          ? (userMap[e.overturned_by] ?? "Unknown")
          : null,
      })),
    };
  });

export const overturnEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ editId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await getCallerRole(context.userId);
    if (role !== "ULTIMATE_ADMIN") throw new Error("Forbidden");

    const { data: edit, error: fetchErr } = await supabaseAdmin
      .from("order_edits")
      .select("id, booking_id, changes, overturned_at")
      .eq("id", data.editId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!edit) throw new Error("Edit not found");
    if (edit.overturned_at) throw new Error("Already overturned");

    // Revert each changed field back to its old value
    const revert: Record<string, any> = {};
    for (const [field, change] of Object.entries(
      edit.changes as Record<string, { old: any; new: any }>,
    )) {
      revert[field] = change.old;
    }

    const { error: revertErr } = await supabaseAdmin
      .from("bookings")
      .update(revert)
      .eq("id", edit.booking_id);
    if (revertErr) throw new Error(revertErr.message);

    const { error: markErr } = await supabaseAdmin
      .from("order_edits")
      .update({
        overturned_by: context.userId,
        overturned_at: new Date().toISOString(),
      })
      .eq("id", data.editId);
    if (markErr) throw new Error(markErr.message);

    return { ok: true };
  });
