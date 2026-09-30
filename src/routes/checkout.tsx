// @ts-nocheck
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowLeft, Lock, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({
    meta: [
      { title: "Secure Checkout — Fiixerr" },
      { name: "description", content: "Review your repair total and pay securely." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const DRAFT_KEY = "fiixerr_booking_draft_v1";

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

function CheckoutPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) {
        toast.error("No booking in progress. Start over.");
        navigate({ to: "/" });
        return;
      }
      setDraft(JSON.parse(raw));
    } catch {
      navigate({ to: "/" });
    }
  }, [navigate]);

  useEffect(() => {
    if (!draft) return;
    const amount_cents = Math.round(draft.grand_total * 100);
    setLoadingIntent(true);
    supabase.functions
      .invoke("create-payment-intent", { body: { amount_cents } })
      .then(({ data, error }) => {
        if (error) throw error;
        setClientSecret(data.client_secret);
      })
      .catch((e) => {
        toast.error("Could not initialise payment. Please try again.");
        console.error(e);
      })
      .finally(() => setLoadingIntent(false));
  }, [draft]);

  const subtotal = useMemo(() => (draft ? draft.parts_total + draft.labor_total : 0), [draft]);

  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-5 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-foreground">Fiixerr</Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Secure checkout
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-base text-foreground hover:underline mb-6 min-h-[48px]"
          aria-label="Back to booking"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to booking
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Checkout</h1>
        <p className="mt-2 text-base text-foreground/75">
          Review your total below and complete your payment. No hidden fees.
        </p>

        <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8">
          <section className="space-y-6" aria-label="Payment details">
            <div className="surface-card rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-foreground">Payment</h2>

              {loadingIntent && (
                <div className="mt-6 flex items-center gap-3 text-foreground/70">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Preparing secure payment…
                </div>
              )}

              {!loadingIntent && clientSecret && (
                <div className="mt-6">
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: "stripe",
                        variables: { borderRadius: "8px" },
                      },
                    }}
                  >
                    <PaymentForm draft={draft} subtotal={subtotal} fmt={fmt} navigate={navigate} />
                  </Elements>
                </div>
              )}

              {!loadingIntent && !clientSecret && (
                <div className="mt-6 rounded-lg border-2 border-dashed border-border p-6 text-center text-foreground/60 text-sm">
                  Payment could not be loaded. Please refresh and try again.
                </div>
              )}

              <div className="mt-6 rounded-lg bg-[var(--surface)] border border-border p-4 flex gap-3 items-start text-sm text-foreground/80">
                <ShieldCheck className="h-5 w-5 text-foreground mt-0.5 shrink-0" aria-hidden="true" />
                <p>
                  Your card is charged immediately to lock in your appointment slot. You'll receive a
                  confirmation once payment succeeds.
                </p>
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-6 self-start surface-card rounded-2xl p-6 h-fit" aria-label="Order summary">
            <h2 className="text-lg font-bold text-foreground">Order summary</h2>
            <dl className="mt-5 space-y-3 text-base">
              <div className="flex justify-between">
                <dt className="text-foreground/75">Device</dt>
                <dd className="font-semibold text-right">{draft.brand_name} {draft.model_name}</dd>
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                {draft.services.map((s) => (
                  <div key={s.id} className="flex justify-between">
                    <dt className="text-foreground/80">{s.name}</dt>
                    <dd className="font-medium">{fmt(s.part_cost + s.labor_fee)}</dd>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-foreground/75">Subtotal</dt>
                  <dd className="font-medium">{fmt(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-foreground/75">
                    {draft.service_mode === "mobile" ? "Ride fee" : "Travel"}
                  </dt>
                  <dd className="font-medium">{fmt(draft.travel_fee)}</dd>
                </div>
              </div>
            </dl>

            <div className="mt-5 rounded-lg bg-foreground text-background p-5">
              <div className="text-sm font-semibold uppercase tracking-wide opacity-90">Final Total</div>
              <div className="text-4xl font-bold tracking-tight mt-1">{fmt(draft.grand_total)}</div>
            </div>

            <p className="mt-3 text-xs text-center text-foreground/60">
              By continuing you agree to Fiixerr's repair terms and lifetime parts warranty.
            </p>
          </aside>
        </div>
      </main>
      <Toaster theme="light" />
    </div>
  );
}

function PaymentForm({ draft, subtotal, fmt, navigate }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);

    try {
      // Validate fields first
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message);
        return;
      }

      // Confirm payment (no redirect for card; redirects for wallets if needed)
      const { paymentIntent, error } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message ?? "Payment failed. Please try again.");
        return;
      }

      if (paymentIntent?.status !== "succeeded") {
        toast.error("Payment was not completed. Please try again.");
        return;
      }

      // Payment succeeded — create the booking
      const { data, error: dbError } = await supabase
        .from("bookings")
        .insert({
          customer_name: draft.customer.name.trim(),
          customer_phone: draft.customer.phone.trim(),
          customer_email: draft.customer.email?.trim() || null,
          street_address: draft.service_mode === "mobile" ? draft.customer.address.trim() : null,
          zip: draft.zip,
          service_mode: draft.service_mode,
          brand_id: draft.brand_id,
          model_id: draft.model_id,
          service_ids: draft.service_ids,
          brand_name_snapshot: draft.brand_name,
          model_name_snapshot: draft.model_name,
          services_snapshot: draft.services,
          parts_total: draft.parts_total,
          labor_total: draft.labor_total,
          travel_fee: draft.travel_fee,
          grand_total: draft.grand_total,
          pickup_lat: draft.pickup_lat ?? null,
          pickup_lng: draft.pickup_lng ?? null,
          pickup_address: draft.pickup_address ?? null,
          ride_fee: draft.ride_fee ?? 0,
          appointment_at: draft.appointment_at,
          status: "paid",
          stripe_payment_intent_id: paymentIntent.id,
          pre_repair_checklist: {},
          post_repair_checklist: {},
        })
        .select("id")
        .single();

      if (dbError) throw dbError;

      sessionStorage.removeItem(DRAFT_KEY);
      navigate({ to: "/confirmation/$id", params: { id: data.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button
        type="submit"
        variant="hero"
        size="touch"
        className="w-full mt-6 text-lg"
        disabled={!stripe || submitting}
        aria-label={`Pay ${fmt(draft.grand_total)} and reserve booking`}
      >
        {submitting
          ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          : <Lock className="h-5 w-5" aria-hidden="true" />
        }
        Pay {fmt(draft.grand_total)} & reserve
      </Button>
    </form>
  );
}
