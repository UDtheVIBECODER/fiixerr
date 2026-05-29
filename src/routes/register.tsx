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

function RegisterPage() {
  const navigate = useNavigate();
  const register = useServerFn(registerWithCode);
  const [code, setCode] = useState("");
  const [codeValid, setCodeValid] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await register({ data: { code: code.trim(), username: username.trim(), password } });
      const { error } = await supabase.auth.signInWithPassword({ email: result.email, password });
      if (error) throw error;
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
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
            }}
            placeholder="e.g. WELCOME-2026"
          />
        </div>

        {codeValid && (
          <>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" required value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={32} autoComplete="username" />
              <p className="text-xs text-muted-foreground">Letters, numbers, underscore only.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <Button type="submit" size="touch" className="w-full" disabled={loading}>
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
