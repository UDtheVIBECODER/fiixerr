// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { checkSetupNeeded, claimUltimateAdmin } from "@/lib/setup.functions";
import { Wrench, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
  head: () => ({
    meta: [
      { title: "Owner Setup — Fiixerr" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SetupPage() {
  const navigate = useNavigate();
  const checkFn = useServerFn(checkSetupNeeded);
  const claimFn = useServerFn(claimUltimateAdmin);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: setupData, isLoading: checkingSetup } = useQuery({
    queryKey: ["setup-status"],
    queryFn: () => checkFn(),
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { email } = await claimFn({ data: { username, password } });
      // Sign in immediately after account creation
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
      navigate({ to: "/dashboard/admin" });
    } catch (err) {
      setError(err?.message || "Setup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-foreground" />
      </div>
    );
  }

  // Already set up — block access
  if (!setupData?.needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-5">
          <ShieldCheck className="h-12 w-12 mx-auto text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Owner account already exists</h1>
          <p className="text-muted-foreground text-sm">
            This workspace already has an owner. Sign in at the dashboard.
          </p>
          <Button className="w-full h-12" onClick={() => navigate({ to: "/access" })}>
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-foreground mb-4">
            <Wrench className="h-6 w-6" />
            <span className="text-xl font-semibold">Fiixerr</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set up your owner account</h1>
          <p className="text-muted-foreground text-sm mt-2">
            This is a one-time setup. Choose your login credentials carefully.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="surface-card rounded-2xl p-8 space-y-5">
          {/* Username */}
          <div>
            <Label htmlFor="username" className="text-sm font-medium">Username</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              Letters, numbers, and underscores only.
            </p>
            <Input
              id="username"
              className="h-12"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. owner"
              required
              minLength={2}
              maxLength={32}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              autoFocus
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative mt-2">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                className="h-12 pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              className="h-12 mt-2"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">{error}</p>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
            ) : (
              <><ShieldCheck className="h-4 w-4" /> Create owner account</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            This account cannot be transferred. Keep your credentials safe.
          </p>
        </form>
      </div>
    </div>
  );
}
