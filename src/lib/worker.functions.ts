// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdminRole(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!["ADMIN", "EMPLOYEE", "ULTIMATE_ADMIN"].includes(data?.role)) throw new Error("Forbidden");
}

async function assertUltimateOrAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!["ADMIN", "ULTIMATE_ADMIN"].includes(data?.role)) throw new Error("Forbidden");
}

/* ── Dashboard data ──────────────────────────────────────────────── */

export const getWorkerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context.userId);

    const [profileRes, myBookingsRes, allPendingRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "id, username, role, is_on_break, is_clocked_in, clocked_in_at, " +
          "availability_days, availability_from, availability_until, availability_note, availability_schedule, " +
          "address, zip, worker_lat, worker_lng, created_at"
        )
        .eq("id", context.userId)
        .maybeSingle(),

      supabaseAdmin
        .from("bookings")
        .select(
          "id, customer_name, customer_email, customer_phone, " +
          "brand_name_snapshot, model_name_snapshot, grand_total, " +
          "appointment_at, status, created_at, street_address, zip, service_mode, notes, " +
          "pickup_lat, pickup_lng, pickup_address"
        )
        .eq("assigned_to", context.userId)
        .order("appointment_at", { ascending: true }),

      supabaseAdmin
        .from("bookings")
        .select(
          "id, customer_name, customer_phone, brand_name_snapshot, model_name_snapshot, " +
          "grand_total, appointment_at, status, street_address, zip, service_mode, notes, assigned_to, " +
          "pickup_lat, pickup_lng, pickup_address"
        )
        .eq("status", "pending")
        .order("appointment_at", { ascending: true }),
    ]);

    const profile = profileRes.data;
    const myBookings = myBookingsRes.data ?? [];
    const allPending = allPendingRes.data ?? [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const todaysJobs = myBookings.filter((b) => {
      const d = new Date(b.appointment_at);
      return d >= todayStart && d < todayEnd;
    });

    const completedJobs = myBookings.filter((b) => b.status === "completed");
    const activeJobs = myBookings.filter((b) =>
      ["pending", "dispatched", "in_progress"].includes(b.status)
    );

    return {
      profile,
      allBookings: myBookings,
      todaysJobs,
      allPending,
      stats: {
        completedCount: completedJobs.length,
        activeCount: activeJobs.length,
        totalEarned: completedJobs.reduce((s, b) => s + Number(b.grand_total), 0),
        totalAssigned: myBookings.length,
      },
    };
  });

/* ── My timesheet (worker view) ──────────────────────────────────── */

export const getMyTimesheet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context.userId);

    const { data, error } = await supabaseAdmin
      .from("timesheets")
      .select("id, clocked_in_at, clocked_out_at, created_at")
      .eq("worker_id", context.userId)
      .order("clocked_in_at", { ascending: false })
      .limit(90);

    if (error) throw new Error(error.message);
    return { entries: data ?? [] };
  });

/* ── All timesheets (admin/owner view) ───────────────────────────── */

export const getAllTimesheets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertUltimateOrAdmin(context.userId);

    const [staffRes, tsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, role, hourly_rate")
        .in("role", ["ADMIN", "EMPLOYEE"])
        .order("username"),
      supabaseAdmin
        .from("timesheets")
        .select("id, worker_id, clocked_in_at, clocked_out_at, pay_override, pay_note")
        .order("clocked_in_at", { ascending: false })
        .limit(500),
    ]);

    if (tsRes.error) throw new Error(tsRes.error.message);

    const staff = staffRes.data ?? [];
    const entries = tsRes.data ?? [];

    return { staff, entries };
  });

/* ── Job status update (own jobs only) ───────────────────────────── */

export const updateMyJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "dispatched", "in_progress", "completed", "cancelled"]),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.userId);
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("assigned_to")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (booking?.assigned_to !== context.userId) throw new Error("Not your job");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ── Break toggle ────────────────────────────────────────────────── */

export const toggleMyBreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ isOnBreak: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_on_break: data.isOnBreak })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ── Clock in / Clock out — records to timesheets ────────────────── */

export const clockInOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clockIn: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.userId);

    const now = new Date().toISOString();

    if (data.clockIn) {
      // Create a new open timesheet entry
      const { error: tsErr } = await supabaseAdmin
        .from("timesheets")
        .insert({ worker_id: context.userId, clocked_in_at: now });
      if (tsErr) throw new Error(tsErr.message);

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_clocked_in: true, clocked_in_at: now })
        .eq("id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      // Close the most recent open entry
      const { data: openEntry } = await supabaseAdmin
        .from("timesheets")
        .select("id")
        .eq("worker_id", context.userId)
        .is("clocked_out_at", null)
        .order("clocked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openEntry) {
        await supabaseAdmin
          .from("timesheets")
          .update({ clocked_out_at: now })
          .eq("id", openEntry.id);
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_clocked_in: false, clocked_in_at: null })
        .eq("id", context.userId);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

/* ── Save worker home address ────────────────────────────────────── */

export const saveWorkerAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        address: z.string(),
        zip: z.string().optional().nullable(),
        lat: z.number(),
        lng: z.number(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ address: data.address, zip: data.zip || null, worker_lat: data.lat, worker_lng: data.lng })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ── Save availability ───────────────────────────────────────────── */

export const saveAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        // schedule: { Mon: { from: "09:00", until: "17:00" }, ... } — only enabled days present
        schedule: z.record(z.object({ from: z.string(), until: z.string() })),
        note: z.string().max(300).nullable(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdminRole(context.userId);

    const enabledDays = Object.keys(data.schedule);
    // Derive a representative global from/until from the first enabled day (for legacy consumers)
    const firstEntry = enabledDays.length > 0 ? data.schedule[enabledDays[0]] : null;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        availability_schedule: data.schedule,
        availability_days: enabledDays,
        availability_from: firstEntry?.from ?? null,
        availability_until: firstEntry?.until ?? null,
        availability_note: data.note || null,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
