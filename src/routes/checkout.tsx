import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { getEnabledGateways } from "@/lib/pos.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CreditCard, Smartphone, DollarSign, Landmark, ChevronLeft, ShieldCheck, Lock, CircleCheck as CheckCircle2, Loader as Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

// ---------------------------------------------------------------------------
// Search params schema — booking data passed from BookingEngine confirmation
// ---------------------------------------------------------------------------
const checkoutSearchSchema = z.object({
  bookingId: z.string().optional(),
  grandTotal: z.coerce.number().optional(),
  partsTotal: z.coerce.number().optional(),
  laborTotal: z.coerce.number().optional(),
  travelFee: z.coerce.number().optional(),
  deviceLabel: z.string().optional(),
  services: z.string().optional(), // JSON-encoded array of service names
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (search) => checkoutSearchSchema.parse(search),
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Secure Checkout — Fiixerr" }] }),
});

// ---------------------------------------------------------------------------
// Payment gateway metadata
// ---------------------------------------------------------------------------
type GatewayId = "stripe" | "applepay" | "googlepay" | "paypal" | "cashapp";

type Gateway = {
  id: GatewayId;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
};

const ALL_GATEWAYS: Gateway[] = [
  {
    id: "stripe",
    label: "Credit / Debit Card",
    subtitle: "Visa, Mastercard, Amex, Discover",
    icon: <CreditCard className="h-6 w-6" aria-hidden="true" />,
    color: "border-[var(--cyan)]",
  },
  {
    id: "applepay",
    label: "Apple Pay",
    subtitle: "Touch ID or Face ID",
    icon: <Smartphone className="h-6 w-6" aria-hidden="true" />,
    color: "border-neutral-800",
  },
  {
    id: "googlepay",
    label: "Google Pay",
    subtitle: "Any Google-linked card",
    icon: <Smartphone className="h-6 w-6" aria-hidden="true" />,
    color: "border-sky-600",
  },
  {
    id: "paypal",
    label: "PayPal",
    subtitle: "PayPal balance or linked bank",
    icon: <Landmark className="h-6 w-6" aria-hidden="true" />,
    color: "border-blue-700",
  },
  {
    id: "cashapp",
    label: "Cash App",
    subtitle: "$Cashtag or debit card",
    icon: <DollarSign className="h-6 w-6" aria-hidden="true" />,
    color: "border-emerald-600",
  },
];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
function CheckoutPage() {
  const search = useSearch({ from: "/checkout" });
  const fetchGateways = useServerFn(getEnabledGateways);

  const { data: gatewayData } = useQuery({
    queryKey: ["enabled-gateways"],
    queryFn: () => fetchGateways(),
    staleTime: 5 * 60_000,
  });

  const enabledIds = new Set<string>(gatewayData?.gateways ?? ALL_GATEWAYS.map((g) => g.id));
  const gateways = ALL_GATEWAYS.filter((g) => enabledIds.has(g.id));

  const [selectedGateway, setSelectedGateway] = useState<GatewayId | null>(null);
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");

  const grandTotal = search.grandTotal ?? 0;
  const partsTotal = search.partsTotal ?? 0;
  const laborTotal = search.laborTotal ?? 0;
  const travelFee = search.travelFee ?? 0;
  const deviceLabel = search.deviceLabel ?? "Your device";
  const serviceNames: string[] = search.services ? JSON.parse(search.services) : [];

  function formatCardNumber(v: string) {
    return v
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }

  function formatExpiry(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 4);
    if (clean.length >= 3) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return clean;
  }

  async function handlePay() {
    if (!selectedGateway) {
      toast.error("Please select a payment method.");
      return;
    }

    if (selectedGateway === "stripe") {
      if (!cardNumber || !expiry || !cvv || !nameOnCard) {
        toast.error("Please fill in all card details.");
        return;
      }
    }

    setProcessing(true);
    try {
      // Simulate payment processing — replace with real gateway SDK call
      await new Promise((res) => setTimeout(res, 1800));
      console.info("[Checkout] Payment submitted via gateway:", selectedGateway, {
        bookingId: search.bookingId,
        total: grandTotal,
      });
      setPaid(true);
    } catch (err) {
      console.error("[Checkout] Payment failed:", err);
      toast.error("Payment could not be processed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  if (paid) {
    return <PaymentSuccess total={grandTotal} bookingId={search.bookingId} />;
  }

  return (
    <>
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="mx-auto max-w-3xl">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            {/* ── Left: Payment method selector + form ── */}
            <div className="space-y-6">
              <div className="surface-card rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <Lock className="h-5 w-5 text-[var(--cyan)]" />
                  <h1 className="text-2xl font-bold text-foreground">Secure Checkout</h1>
                </div>

                <h2 className="text-base font-semibold text-foreground mb-4">
                  Choose payment method
                </h2>

                <div className="space-y-3">
                  {gateways.map((gw) => {
                    const active = selectedGateway === gw.id;
                    return (
                      <button
                        key={gw.id}
                        type="button"
                        aria-pressed={active}
                        aria-label={`Pay with ${gw.label}`}
                        onClick={() => setSelectedGateway(gw.id)}
                        className={cn(
                          "w-full min-h-[64px] flex items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all",
                          active
                            ? `${gw.color} bg-[var(--cyan)]/5`
                            : "border-border bg-surface hover:border-[var(--cyan)]/40",
                        )}
                      >
                        <div
                          className={cn(
                            "h-11 w-11 rounded-lg border grid place-items-center shrink-0",
                            active
                              ? "border-[var(--cyan)] text-[var(--cyan)]"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {gw.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground">{gw.label}</div>
                          <div className="text-sm text-muted-foreground">{gw.subtitle}</div>
                        </div>
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full border-2 grid place-items-center shrink-0",
                            active
                              ? "border-[var(--cyan)] bg-[var(--cyan)]"
                              : "border-border bg-transparent",
                          )}
                        >
                          {active && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card form — only shown for credit/debit */}
              {selectedGateway === "stripe" && (
                <div className="surface-card rounded-2xl p-6 md:p-8 space-y-4">
                  <h2 className="text-base font-semibold text-foreground">Card details</h2>

                  <div className="space-y-2">
                    <Label htmlFor="nameOnCard">Name on card</Label>
                    <Input
                      id="nameOnCard"
                      value={nameOnCard}
                      onChange={(e) => setNameOnCard(e.target.value)}
                      placeholder="Jane Smith"
                      className="h-12 bg-[var(--surface)]"
                      autoComplete="cc-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card number</Label>
                    <Input
                      id="cardNumber"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456"
                      inputMode="numeric"
                      className="h-12 bg-[var(--surface)] font-mono tracking-widest"
                      autoComplete="cc-number"
                      maxLength={19}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry</Label>
                      <Input
                        id="expiry"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        inputMode="numeric"
                        className="h-12 bg-[var(--surface)]"
                        autoComplete="cc-exp"
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                        inputMode="numeric"
                        type="password"
                        className="h-12 bg-[var(--surface)]"
                        autoComplete="cc-csc"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Digital wallet instruction panels */}
              {(selectedGateway === "applepay" ||
                selectedGateway === "googlepay" ||
                selectedGateway === "paypal" ||
                selectedGateway === "cashapp") && (
                <div className="surface-card rounded-2xl p-6 md:p-8">
                  <WalletInstructions gateway={selectedGateway} total={grandTotal} />
                </div>
              )}

              {/* Pay button */}
              <Button
                size="xl"
                variant="hero"
                className="w-full"
                onClick={handlePay}
                disabled={!selectedGateway || processing}
                aria-label={`Pay ${fmt(grandTotal)} now`}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    Pay {fmt(grandTotal)}
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                256-bit TLS encryption. Your payment data is never stored on our servers.
              </p>
            </div>

            {/* ── Right: Order summary ── */}
            <OrderSummary
              deviceLabel={deviceLabel}
              serviceNames={serviceNames}
              partsTotal={partsTotal}
              laborTotal={laborTotal}
              travelFee={travelFee}
              grandTotal={grandTotal}
            />
          </div>
        </div>
      </div>
      <Toaster theme="light" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WalletInstructions({ gateway, total }: { gateway: GatewayId; total: number }) {
  const config: Record<string, { heading: string; body: string }> = {
    applepay: {
      heading: "Apple Pay",
      body: `Tap "Pay ${fmt(total)}" above, then confirm with Face ID or Touch ID on your device. Your card is never shared with Fiixerr.`,
    },
    googlepay: {
      heading: "Google Pay",
      body: `Tap "Pay ${fmt(total)}" above. You'll be prompted to authenticate with Google Pay on your phone or browser.`,
    },
    paypal: {
      heading: "PayPal",
      body: `Tap "Pay ${fmt(total)}" above to be redirected to PayPal. You can use your PayPal balance, linked bank, or any card saved in your account.`,
    },
    cashapp: {
      heading: "Cash App Pay",
      body: `Tap "Pay ${fmt(total)}" above. Open the Cash App and scan the QR code or confirm the payment request sent to your $Cashtag.`,
    },
  };

  const { heading, body } = config[gateway] ?? { heading: "", body: "" };
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-foreground">{heading}</h3>
      <p className="text-sm text-foreground/80 leading-relaxed">{body}</p>
    </div>
  );
}

function OrderSummary({
  deviceLabel,
  serviceNames,
  partsTotal,
  laborTotal,
  travelFee,
  grandTotal,
}: {
  deviceLabel: string;
  serviceNames: string[];
  partsTotal: number;
  laborTotal: number;
  travelFee: number;
  grandTotal: number;
}) {
  return (
    <aside className="lg:sticky lg:top-8 self-start surface-card rounded-2xl p-6 h-fit space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Order Summary
        </div>
        <div className="mt-2 font-semibold text-foreground">{deviceLabel}</div>
      </div>

      {serviceNames.length > 0 && (
        <ul className="text-sm space-y-1">
          {serviceNames.map((s) => (
            <li key={s} className="text-foreground/80">
              — {s}
            </li>
          ))}
        </ul>
      )}

      <Separator />

      <div className="text-sm space-y-2">
        <SummaryRow label="Parts" value={fmt(partsTotal)} />
        <SummaryRow label="Labor" value={fmt(laborTotal)} />
        <SummaryRow label="Travel fee" value={fmt(travelFee)} />
      </div>

      <Separator />

      <div className="flex items-baseline justify-between">
        <span className="text-base font-bold text-foreground">Total</span>
        <span className="text-2xl font-bold text-[var(--cyan)]">{fmt(grandTotal)}</span>
      </div>

      <div className="rounded-lg bg-secondary/60 p-3 text-xs text-foreground/70 leading-relaxed">
        All prices are final as quoted at booking time. Lifetime parts warranty applies from the
        moment your repair is complete.
      </div>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function PaymentSuccess({ total, bookingId }: { total: number; bookingId?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full surface-card rounded-2xl p-10 text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment confirmed!</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {bookingId ? `Booking #${bookingId.slice(0, 8).toUpperCase()} — ` : ""}
            {fmt(total)} received. You'll receive a confirmation email shortly.
          </p>
        </div>
        <Button asChild variant="cyan" size="touch" className="w-full">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
      <Toaster theme="light" />
    </div>
  );
}
