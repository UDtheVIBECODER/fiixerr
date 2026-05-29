import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdminOrUltimate(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "ADMIN" && data?.role !== "ULTIMATE_ADMIN") {
    throw new Error("Forbidden");
  }
}

export const listCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminOrUltimate(context.userId);
    const [brandsRes, modelsRes, servicesRes, pricingRes] = await Promise.all([
      supabaseAdmin.from("brands").select("*").order("sort_order"),
      supabaseAdmin.from("models").select("*").order("sort_order"),
      supabaseAdmin.from("services").select("*").order("sort_order"),
      supabaseAdmin.from("pricing_matrix").select("*"),
    ]);
    if (brandsRes.error) throw new Error(brandsRes.error.message);
    if (modelsRes.error) throw new Error(modelsRes.error.message);
    if (servicesRes.error) throw new Error(servicesRes.error.message);
    if (pricingRes.error) throw new Error(pricingRes.error.message);
    return {
      brands: brandsRes.data ?? [],
      models: modelsRes.data ?? [],
      services: servicesRes.data ?? [],
      pricing: pricingRes.data ?? [],
    };
  });

export const upsertBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(64),
        slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
        icon_url: z.string().url().max(500).nullable().optional(),
        sort_order: z.number().int().min(0).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrUltimate(context.userId);
    const { error } = await supabaseAdmin.from("brands").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminOrUltimate(context.userId);
    const { error } = await supabaseAdmin.from("brands").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        brand_id: z.string().uuid(),
        name: z.string().min(1).max(64),
        release_year: z.number().int().min(1990).max(2100).nullable().optional(),
        sort_order: z.number().int().min(0).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrUltimate(context.userId);
    const { error } = await supabaseAdmin.from("models").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminOrUltimate(context.userId);
    const { error } = await supabaseAdmin.from("models").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(64),
        slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
        description: z.string().max(500).nullable().optional(),
        default_labor_fee: z.number().min(0),
        sort_order: z.number().int().min(0).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrUltimate(context.userId);
    const { error } = await supabaseAdmin.from("services").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdminOrUltimate(context.userId);
    const { error } = await supabaseAdmin.from("services").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        model_id: z.string().uuid(),
        service_id: z.string().uuid(),
        part_cost: z.number().min(0),
        labor_fee: z.number().min(0),
        estimated_minutes: z.number().int().min(0).default(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrUltimate(context.userId);
    const { error } = await supabaseAdmin.from("pricing_matrix").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
