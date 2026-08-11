// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/customer-login")({
  component: CustomerLoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — Fiixerr" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CustomerLoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("signin"); // "signin" | "signup"
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sign in form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign up extras
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (tab === "signup" && password !== confirmPassword) {
      setErrorMsg("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setErrorMsg(error.message); return; }
        navigate({ to: "/book" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) { setErrorMsg(error.message); return; }
        // Supabase may require email confirmation depending on project settings
        navigate({ to: "/book" });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setErrorMsg("");
    setLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${origin}/auth/callback`,
      });
      if (result?.error) {
        setErrorMsg(result.error.message || "Google sign-in failed.");
        setLoading(false);
      }
      // If redirected, browser navigates away — no further action needed
    } catch (err) {
      setErrorMsg(err?.message || "Google sign-in failed.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Wrench className="h-5 w-5" />
            Fiixerr
          </div>
          <div className="w-16" /> {/* spacer */}
        </div>
      </header>

      {/* main */}
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          {/* card */}
          <div className="surface-card rounded-2xl p-8 sm:p-10">
            {/* tabs */}
            <div className="flex rounded-lg bg-secondary p-1 mb-8">
              <button
                onClick={() => { setTab("signin"); setErrorMsg(""); }}
                className={cn(
                  "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                  tab === "signin"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign in
              </button>
              <button
                onClick={() => { setTab("signup"); setErrorMsg(""); }}
                className={cn(
                  "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                  tab === "signup"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Create account
              </button>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-1">
              {tab === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground mb-7">
              {tab === "signin"
                ? "Sign in to view your bookings and schedule new repairs."
                : "Create a free account to book your first repair."}
            </p>

            {/* Google button */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border-2 border-border bg-background hover:bg-secondary transition-colors text-sm font-medium text-foreground mb-5 disabled:opacity-50"
            >
              {/* Google SVG icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "signup" && (
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    autoComplete="name"
                    className="mt-1.5 h-12"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mt-1.5 h-12"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  {tab === "signin" && (
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === "signup" ? "At least 8 characters" : "Your password"}
                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                    minLength={tab === "signup" ? 8 : undefined}
                    className="h-12 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {tab === "signup" && (
                <div>
                  <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
                  <Input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="mt-1.5 h-12"
                  />
                </div>
              )}

              {errorMsg && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">{errorMsg}</p>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-xl mt-2"
                disabled={loading}
              >
                {loading
                  ? "Just a moment…"
                  : tab === "signin"
                  ? "Sign in"
                  : "Create account"}
              </Button>
            </form>

            {tab === "signin" && (
              <p className="mt-5 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  onClick={() => setTab("signup")}
                  className="text-foreground font-medium hover:underline"
                >
                  Create one →
                </button>
              </p>
            )}

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={() => navigate({ to: "/book" })}
              className="w-full mt-4 h-12 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
            >
              Continue as Guest →
            </button>
            <p className="text-center text-xs text-muted-foreground mt-2">
              No account needed — just your name and phone number.
            </p>
          </div>

          {/* admin link */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Are you a technician or admin?{" "}
            <Link to="/access" className="text-foreground hover:underline">
              Sign in to the dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
