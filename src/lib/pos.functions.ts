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
  if (data?.role !== "ULTIMATE_ADMIN") throw new Error("Forbidden: ULTIMATE_ADMIN only");
}

export type SystemSetting = {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export const listSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertUltimateAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("id, key, value, description, updated_by, updated_at")
      .order("key");
    if (error) throw new Error(error.message);
    return { settings: (data ?? []) as SystemSetting[] };
  });

export const upsertSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        key: z.string().trim().min(1).max(128),
        value: z.string().max(2048),
        description: z.string().max(256).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertUltimateAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("system_settings")
      .upsert(
        {
          key: data.key,
          value: data.value,
          description: data.description ?? null,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Returns only which gateways are enabled — safe to call from checkout (no keys exposed)
export const getEnabledGateways = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "enabled_gateways")
      .maybeSingle();

    const raw = data?.value ?? "stripe,paypal,cashapp,applepay,googlepay";
    const gateways = raw
      .split(",")
      .map((g: string) => g.trim().toLowerCase())
      .filter(Boolean);

    return { gateways };
  });
