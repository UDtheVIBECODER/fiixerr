// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/access")({
  component: AccessPage,
  head: () => ({ meta: [{ title: "Staff Sign In — Fiixerr" }] }),
});

function AccessPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const email = `${username.trim().toLowerCase()}@fiixerr.staff`;
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
      navigate({ to: "/dashboard/orders" });
    } catch (err) {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-foreground">Staff sign in</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Owner, admin, or employee — sign in below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="surface-card rounded-2xl p-8 space-y-5">
          <div>
            <Label htmlFor="username" className="text-sm font-medium">Username</Label>
            <Input
              id="username"
              className="h-12 mt-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative mt-2">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                className="h-12 pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
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

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">{error}</p>
          )}

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <div className="flex flex-col gap-2 pt-1 text-sm text-center text-muted-foreground">
            <span>
              New employee?{" "}
              <Link to="/register" className="text-foreground font-medium hover:underline">
                Register with invite code
              </Link>
            </span>
            <span>
              First time setup?{" "}
              <Link to="/setup" className="text-foreground font-medium hover:underline">
                Create owner account
              </Link>
            </span>
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Back to website</Link>
        </p>
      </div>
    </div>
  );
}
