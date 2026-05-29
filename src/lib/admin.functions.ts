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

export const generateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().trim().min(4).max(64).regex(/^[a-zA-Z0-9_-]+$/),
        role: z.enum(["ADMIN", "EMPLOYEE"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertUltimateAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("registration_codes")
      .insert({ code: data.code, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertUltimateAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("registration_codes")
      .select("code, role, is_used, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { codes: data ?? [] };
  });

export const deleteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertUltimateAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("registration_codes")
      .delete()
      .eq("code", data.code);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertUltimateAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, role, created_at")
      .in("role", ["ADMIN", "EMPLOYEE"])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { staff: data ?? [] };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertUltimateAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
