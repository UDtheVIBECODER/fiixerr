// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertUltimateAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "ULTIMATE_ADMIN") throw new Error("Forbidden");
}

export const getOverviewStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertUltimateAdmin(context.userId);

    const [bookingsRes, staffRes] = await Promise.all([
      supabaseAdmin.from("bookings").select("id, status, grand_total, customer_email"),
      supabaseAdmin.from("profiles").select("id").in("role", ["ADMIN", "EMPLOYEE"]),
    ]);

    const bookings = bookingsRes.data ?? [];
    const totalRevenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + Number(b.grand_total), 0);

    const byStatus = {
      pending: bookings.filter((b) => b.status === "pending").length,
      dispatched: bookings.filter((b) => b.status === "dispatched").length,
      in_progress: bookings.filter((b) => b.status === "in_progress").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };

    return {
      totalRevenue,
      totalBookings: bookings.length,
      byStatus,
      totalStaff: staffRes.data?.length ?? 0,
      uniqueCustomers: new Set(bookings.map((b) => b.customer_email)).size,
    };
  });

export const getStaffWithStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertUltimateAdmin(context.userId);

    const [staffRes, bookingsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, role, address, zip, is_on_break, break_until, hourly_rate, created_at")
        .in("role", ["ADMIN", "EMPLOYEE"])
        .order("created_at"),
      supabaseAdmin
        .from("bookings")
        .select("id, assigned_to, status, appointment_at, customer_name, brand_name_snapshot, model_name_snapshot, grand_total")
        .not("assigned_to", "is", null),
    ]);

    const bookings = bookingsRes.data ?? [];

    const staff = (staffRes.data ?? []).map((s) => {
      const mine = bookings.filter((b) => b.assigned_to === s.id);
      const completed = mine.filter((b) => b.status === "completed");
      const upcoming = mine
        .filter((b) => ["pending", "dispatched", "in_progress"].includes(b.status))
        .sort((a, b) => new Date(a.appointment_at).getTime() - new Date(b.appointment_at).getTime());
      return {
        ...s,
        completedCount: completed.length,
        totalEarned: completed.reduce((sum, b) => sum + Number(b.grand_total), 0),
        nextJob: upcoming[0] ?? null,
        activeJobCount: upcoming.length,
      };
    });

    return { staff };
  });

export const getAllBookingsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertUltimateAdmin(context.userId);

    const [bookingsRes, staffRes] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("id, customer_name, customer_email, customer_phone, brand_name_snapshot, model_name_snapshot, grand_total, appointment_at, status, assigned_to, created_at, street_address, zip, service_mode, notes")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("profiles")
        .select("id, username")
        .in("role", ["ADMIN", "EMPLOYEE", "ULTIMATE_ADMIN"]),
    ]);

    return {
      bookings: bookingsRes.data ?? [],
      staff: staffRes.data ?? [],
    };
  });

export const getAllCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertUltimateAdmin(context.userId);

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("customer_name, customer_email, customer_phone, id, status, grand_total, created_at, brand_name_snapshot, model_name_snapshot, appointment_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const map = new Map();
    for (const b of data ?? []) {
      if (!map.has(b.customer_email)) {
        map.set(b.customer_email, {
          name: b.customer_name,
          email: b.customer_email,
          phone: b.customer_phone,
          bookings: [],
          totalSpend: 0,
        });
      }
      const c = map.get(b.customer_email);
      c.bookings.push(b);
      if (b.status === "completed") c.totalSpend += Number(b.grand_total);
    }

    return { customers: Array.from(map.values()) };
  });

export const updateBookingAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "dispatched", "in_progress", "completed", "cancelled"]).optional(),
        assignedTo: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertUltimateAdmin(context.userId);
    const updates: Record<string, any> = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.assignedTo !== undefined) updates.assigned_to = data.assignedTo;
    const { error } = await supabaseAdmin.from("bookings").update(updates).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setStaffBreak = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        staffId: z.string().uuid(),
        isOnBreak: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertUltimateAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_on_break: data.isOnBreak, break_until: data.isOnBreak ? null : null })
      .eq("id", data.staffId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertUltimateAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Cannot remove yourself");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ── Set worker hourly rate ──────────────────────────────────────── */

export const setWorkerPayRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      workerId: z.string().uuid(),
      hourlyRate: z.number().min(0).max(10_000),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertUltimateAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ hourly_rate: data.hourlyRate })
      .eq("id", data.workerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ── Set manual pay on a single timesheet entry ──────────────────── */

export const setTimesheetPay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      timesheetId: z.string().uuid(),
      payOverride: z.number().min(0).nullable(),
      payNote: z.string().max(200).nullable(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertUltimateAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("timesheets")
      .update({
        pay_override: data.payOverride,
        pay_note: data.payNote || null,
      })
      .eq("id", data.timesheetId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
