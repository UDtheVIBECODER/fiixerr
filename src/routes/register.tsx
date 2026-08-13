// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { registerWithCode } from "@/lib/auth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Staff registration — Fiixerr" }] }),
});

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function RegisterPage() {
  const navigate = useNavigate();
  const register = useServerFn(registerWithCode);
  const [code, setCode] = useState("");
  const [codeValid, setCodeValid] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  function validateUsername(val: string) {
    if (val.length < 3) return "At least 3 characters required.";
    if (!USERNAME_RE.test(val)) return "Letters, numbers, and underscores only — no spaces or symbols.";
    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    setServerError("");
    const uErr = validateUsername(username.trim());
    if (uErr) { setUsernameError(uErr); return; }

    setLoading(true);
    try {
      const result = await register({ data: { code: code.trim(), username: username.trim(), password } });
      const { error } = await supabase.auth.signInWithPassword({ email: result.email, password });
      if (error) throw error;
      toast.success("Account created — welcome!");
      const dest =
        result.role === "ULTIMATE_ADMIN" ? "/dashboard/admin"
        : (result.role === "ADMIN" || result.role === "EMPLOYEE") ? "/dashboard/worker"
        : "/dashboard/orders";
      navigate({ to: dest });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed. Check your code and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-6 border border-border rounded-lg p-6 bg-card">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Staff registration</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your registration code, then choose a username and password.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Registration code</Label>
          <Input
            id="code"
            required
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setCodeValid(e.target.value.trim().length >= 4);
              setServerError("");
            }}
            placeholder="e.g. WELCOME-2026"
            autoComplete="off"
          />
        </div>

        {codeValid && (
          <>
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              {/* autoComplete="off" prevents browsers from autofilling emails here */}
              <Input
                id="username"
                required
                value={username}
                onChange={(e) => {
                  const val = e.target.value;
                  setUsername(val);
                  setUsernameError(val ? validateUsername(val) : "");
                  setServerError("");
                }}
                onBlur={() => setUsernameError(validateUsername(username.trim()))}
                minLength={3}
                maxLength={32}
                autoComplete="off"
                placeholder="e.g. john_smith"
              />
              {usernameError
                ? <p className="text-xs text-destructive">{usernameError}</p>
                : <p className="text-xs text-muted-foreground">Letters, numbers, underscore only. No spaces or @ symbols.</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            {serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">{serverError}</p>
            )}
            <Button type="submit" size="touch" className="w-full" disabled={loading || !!usernameError}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </>
        )}

        <div className="flex justify-between text-sm">
          <Link to="/access" className="text-muted-foreground hover:text-foreground">← Back</Link>
          <Link to="/login" className="text-muted-foreground hover:text-foreground">Already have an account?</Link>
        </div>
      </form>
    </div>
  );
}
