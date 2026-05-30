import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useMyProfile } from "@/hooks/useMyProfile";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Lock } from "lucide-react";

export const Route = createFileRoute("/_dashboard/dashboard/settings")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/access" });
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { data, isLoading } = useMyProfile();

  if (isLoading) return <div className="text-foreground">Loading…</div>;

  if (data?.profile?.role !== "ULTIMATE_ADMIN") {
    return (
      <div className="max-w-md text-center mx-auto mt-12 space-y-3">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-foreground">Owner access only</h1>
        <p className="text-muted-foreground">Payment Gateway Settings are restricted to the owner account.</p>
        <Link to="/dashboard/orders" className="inline-block underline">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Payment Gateway Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure how Fiixerr collects payments from your customers.
        </p>
      </header>

      <section className="border-2 border-border rounded-2xl bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-foreground mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Lovable Stripe — managed</h2>
            <p className="text-sm text-muted-foreground mt-1">
              When enabled, payments are processed directly through Lovable's PCI-compliant Stripe integration. Cards, Apple Pay, and Google Pay are supported out of the box. Funds are deposited to your verified business bank account.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-[var(--surface)] border border-border p-4 text-sm text-foreground/80">
          <strong className="text-foreground">Not enabled yet.</strong> Customer checkouts currently reserve bookings as <code className="bg-background px-1.5 py-0.5 rounded">PENDING</code> and are not charged. To accept live payments, ask Lovable to enable the built-in Stripe integration for this project.
        </div>
      </section>

      <section className="border border-border rounded-2xl bg-card p-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Why we don't ask for your raw API keys</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Stripe Secret Keys must never be stored in a database that the frontend can read — doing so would expose them to every visitor and put your merchant account at risk. Lovable's managed integration keeps the secret key on the server only and routes customers through Stripe's hosted, PCI-DSS Level 1 checkout. You retain full control of the connected account.
        </p>
      </section>
    </div>
  );
}
