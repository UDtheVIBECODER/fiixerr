import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
  head: () => ({ meta: [{ title: "Signing you in… — Fiixerr" }] }),
});

function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;

    async function routeByRole() {
      // Wait for the Supabase session to be hydrated (broker has already
      // called supabase.auth.setSession by the time we land here, but the
      // refresh / persistence may take a tick on slower devices).
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;

      if (userErr || !userData.user) {
        setMessage("We couldn't verify your session. Redirecting…");
        navigate({ to: "/access", replace: true });
        return;
      }

      // Look up the role from the profiles table. RLS allows users to read
      // their own profile row.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (cancelled) return;

      const role = profile?.role;
      if (role === "ULTIMATE_ADMIN") {
        navigate({ to: "/dashboard/orders", replace: true });
      } else if (role === "ADMIN") {
        navigate({ to: "/dashboard/orders", replace: true });
      } else if (role === "EMPLOYEE") {
        navigate({ to: "/dashboard/orders", replace: true });
      } else {
        // Authenticated but no profile (e.g. Google sign-in by a non-owner
        // address that doesn't match the handle_new_user trigger).
        setMessage("Your Google account isn't linked to a Fiixerr profile.");
        setTimeout(() => navigate({ to: "/access", replace: true }), 1800);
      }
    }

    // Subscribe so we react the moment the broker writes the session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        routeByRole();
      }
    });

    // Also kick off immediately in case the session is already set.
    routeByRole();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-4" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-foreground" aria-hidden="true" />
        <p className="text-foreground text-lg">{message}</p>
      </div>
    </div>
  );
}
