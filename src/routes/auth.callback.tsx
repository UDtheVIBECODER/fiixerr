// @ts-nocheck
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

    async function route() {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;

      if (userErr || !userData.user) {
        setMessage("Couldn't verify your session. Redirecting…");
        setTimeout(() => navigate({ to: "/customer-login", replace: true }), 1200);
        return;
      }

      // Google OAuth is customer-only — always go to /book
      navigate({ to: "/book", replace: true });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        route();
      }
    });

    route();

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
