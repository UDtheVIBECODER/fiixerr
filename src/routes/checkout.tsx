// @ts-nocheck
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";

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

function CheckoutPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [method, setMethod] = useState("card");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: "", zip: "" });
  const [submitting, setSubmitting] = useState(false);

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

  const subtotal = useMemo(() => (draft ? draft.parts_total + draft.labor_total : 0), [draft]);

  async function confirmAndPay() {
    if (!draft) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
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
          status: "pending",
          pre_repair_checklist: {},
          post_repair_checklist: {},
          notes: `Payment method selected: ${method}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      sessionStorage.removeItem(DRAFT_KEY);
      navigate({ to: "/confirmation/$id", params: { id: data.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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
          Review your total below and choose how you'd like to pay. No hidden fees.
        </p>

        <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8">
          <section className="space-y-6" aria-label="Payment details">
            <div className="surface-card rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-bold text-foreground">Choose a payment method</h2>
              <div
                className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3"
                role="radiogroup"
                aria-label="Payment method"
              >
                {[
                  { id: "card", label: "Card" },
                  { id: "apple", label: "Apple Pay" },
                  { id: "google", label: "Google Pay" },
                  { id: "paypal", label: "PayPal" },
                  { id: "cashapp", label: "Cash App" },
                ].map((m) => {
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMethod(m.id)}
                      className={[
                        "min-h-[56px] rounded-lg border-2 px-3 text-sm font-semibold transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-[var(--surface)] text-foreground hover:border-foreground/40",
                      ].join(" ")}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {method === "card" ? (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="cc-name" className="text-base font-semibold">Name on card</Label>
                    <Input
                      id="cc-name"
                      autoComplete="cc-name"
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value })}
                      className="mt-2 h-14 text-lg border-2 border-border focus-visible:ring-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="cc-number" className="text-base font-semibold">Card number</Label>
                    <div className="mt-2 relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="cc-number"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="1234 5678 9012 3456"
                        value={card.number}
                        onChange={(e) => setCard({ ...card, number: e.target.value })}
                        className="h-14 text-lg pl-12 border-2 border-border focus-visible:ring-2"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cc-exp" className="text-base font-semibold">Expiry</Label>
                    <Input
                      id="cc-exp"
                      autoComplete="cc-exp"
                      placeholder="MM / YY"
                      value={card.expiry}
                      onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                      className="mt-2 h-14 text-lg border-2 border-border focus-visible:ring-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cc-cvv" className="text-base font-semibold">CVV</Label>
                    <Input
                      id="cc-cvv"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      value={card.cvv}
                      onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                      className="mt-2 h-14 text-lg border-2 border-border focus-visible:ring-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-lg border-2 border-dashed border-border p-6 text-center text-foreground/75">
                  You'll be redirected to {method === "apple" ? "Apple Pay" : method === "google" ? "Google Pay" : method === "paypal" ? "PayPal" : "Cash App"} to complete your payment.
                </div>
              )}

              <div className="mt-6 rounded-lg bg-[var(--surface)] border border-border p-4 flex gap-3 items-start text-sm text-foreground/80">
                <ShieldCheck className="h-5 w-5 text-foreground mt-0.5" aria-hidden="true" />
                <p>
                  Live card processing is being activated. Click <strong>Reserve booking</strong> below to lock in your slot — we'll only charge you once the technician is dispatched.
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

            <Button
              variant="hero"
              size="touch"
              className="w-full mt-5 text-lg"
              onClick={confirmAndPay}
              disabled={submitting}
              aria-label={`Reserve booking for ${fmt(draft.grand_total)}`}
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Lock className="h-5 w-5" aria-hidden="true" />}
              Reserve booking
            </Button>
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
