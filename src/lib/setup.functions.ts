// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const checkSetupNeeded = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "ULTIMATE_ADMIN")
    .maybeSingle();
  return { needsSetup: !data };
});

export const claimUltimateAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z
          .string()
          .trim()
          .min(2, "Username must be at least 2 characters")
          .max(32)
          .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
        password: z.string().min(8, "Password must be at least 8 characters").max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Only one ULTIMATE_ADMIN allowed
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "ULTIMATE_ADMIN")
      .maybeSingle();
    if (existing) throw new Error("An owner account already exists.");

    // Username must be unique
    const { data: taken } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();
    if (taken) throw new Error("Username already taken. Choose another.");

    const email = `${data.username.toLowerCase()}@fiixerr.staff`;

    // Create the Supabase auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username, role: "ULTIMATE_ADMIN" },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Failed to create account.");

    // Create the profiles row
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({ id: created.user.id, username: data.username, role: "ULTIMATE_ADMIN" });

    if (profileErr) {
      // Rollback auth user if profile failed
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(profileErr.message);
    }

    // Return the email so the client can sign in
    return { email };
  });
