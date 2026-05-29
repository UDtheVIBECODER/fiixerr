import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STAFF_EMAIL_DOMAIN = "fiixerr.staff";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only");

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, role, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: data };
  });

export const registerWithCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().trim().min(1).max(64),
        username: usernameSchema,
        password: z.string().min(8).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Validate code first
    const { data: codeRow, error: codeErr } = await supabaseAdmin
      .from("registration_codes")
      .select("code, role, is_used")
      .eq("code", data.code)
      .maybeSingle();
    if (codeErr) throw new Error(codeErr.message);
    if (!codeRow || codeRow.is_used) throw new Error("Invalid or already used code");

    // Check username uniqueness
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();
    if (existing) throw new Error("Username already taken");

    const email = `${data.username.toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Failed to create user");

    const { error: rpcErr } = await supabaseAdmin.rpc("consume_registration_code", {
      _code: data.code,
      _user_id: created.user.id,
      _username: data.username,
    });
    if (rpcErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(rpcErr.message);
    }

    return { email, role: codeRow.role };
  });

export const resolveStaffEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ username: usernameSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    return { email: `${data.username.toLowerCase()}@${STAFF_EMAIL_DOMAIN}` };
  });
