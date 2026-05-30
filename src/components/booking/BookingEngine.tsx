import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ArrowRight, Check, MapPin, Search, Smartphone,
  Calendar as CalendarIcon, Loader2, CheckCircle2, ShieldCheck, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

type Brand = { id: string; name: string; slug: string; sort_order: number };
type Model = { id: string; brand_id: string; name: string; release_year: number | null; sort_order: number };
type Service = { id: string; name: string; slug: string; description: string | null; default_labor_fee: number; sort_order: number };
type Pricing = { id: string; model_id: string; service_id: string; part_cost: number; labor_fee: number; estimated_minutes: number };
type Zip = { id: string; zip: string; city: string | null; travel_fee: number; active: boolean };

const STEPS = ["Brand", "Model", "Services", "Logistics", "Schedule", "Details"] as const;

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function BookingEngine() {
  const [step, setStep] = useState(0);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [zip, setZip] = useState("");
  const [mode, setMode] = useState<"mobile" | "dropoff">("mobile");
  const [slot, setSlot] = useState<string | null>(null);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("sort_order");
      if (error) throw error;
      return data as Brand[];
    },
  });

  const { data: models = [] } = useQuery({
    queryKey: ["models", brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("models").select("*").eq("brand_id", brandId!).order("sort_order");
      if (error) throw error;
      return data as Model[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("sort_order");
      if (error) throw error;
      return data as Service[];
    },
  });

  const { data: pricing = [] } = useQuery({
    queryKey: ["pricing", modelId],
    enabled: !!modelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_matrix").select("*").eq("model_id", modelId!);
      if (error) throw error;
      return data as Pricing[];
    },
  });

  const { data: zipRow } = useQuery({
    queryKey: ["zip", zip],
    enabled: zip.length === 5,
    queryFn: async () => {
      const { data } = await supabase
        .from("zip_codes").select("*").eq("zip", zip).eq("active", true).maybeSingle();
      return data as Zip | null;
    },
  });

  const brand = brands.find((b) => b.id === brandId) ?? null;
  const model = models.find((m) => m.id === modelId) ?? null;

  const priceByService = useMemo(() => {
    const map = new Map<string, Pricing>();
    pricing.forEach((p) => map.set(p.service_id, p));
    return map;
  }, [pricing]);

  const selectedServiceDetails = useMemo(
    () =>
      services
        .filter((s) => serviceIds.includes(s.id))
        .map((s) => {
          const p = priceByService.get(s.id);
          return {
            id: s.id,
            name: s.name,
            slug: s.slug,
            part_cost: Number(p?.part_cost ?? 0),
            labor_fee: Number(p?.labor_fee ?? s.default_labor_fee ?? 0),
          };
        }),
    [services, serviceIds, priceByService]
  );

  const partsTotal = selectedServiceDetails.reduce((a, s) => a + s.part_cost, 0);
  const laborTotal = selectedServiceDetails.reduce((a, s) => a + s.labor_fee, 0);
  const travelFee = mode === "mobile" && zipRow ? Number(zipRow.travel_fee) : 0;
  const grandTotal = partsTotal + laborTotal + travelFee;

  // Validation per step
  const canNext = () => {
    switch (step) {
      case 0: return !!brandId;
      case 1: return !!modelId;
      case 2: return serviceIds.length > 0;
      case 3: return zip.length === 5 && !!zipRow;
      case 4: return !!slot;
      case 5: return true;
      default: return false;
    }
  };

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  // Generate slots: next 7 days, 4 time options each
  const timeSlots = useMemo(() => {
    const days: { date: Date; label: string; times: { iso: string; label: string }[] }[] = [];
    const times = [9, 12, 15, 18];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      d.setMinutes(0, 0, 0);
      days.push({
        date: new Date(d),
        label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        times: times.map((h) => {
          const t = new Date(d);
          t.setHours(h, 0, 0, 0);
          return {
            iso: t.toISOString(),
            label: t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          };
        }),
      });
    }
    return days;
  }, []);

  const intakeSchema = z.object({
    name: z.string().trim().min(2, "Enter your name").max(100),
    phone: z.string().trim().min(7, "Enter a phone number").max(20),
    email: z.string().trim().email("Enter a valid email").max(200),
    address: mode === "mobile"
      ? z.string().trim().min(5, "Address required for mobile service").max(200)
      : z.string().optional(),
  });

  const submit = async () => {
    const parsed = intakeSchema.safeParse(customer);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Check your details");
      return;
    }
    if (!brand || !model || !slot) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        customer_name: customer.name.trim(),
        customer_phone: customer.phone.trim(),
        customer_email: customer.email.trim(),
        street_address: mode === "mobile" ? customer.address.trim() : null,
        zip,
        service_mode: mode,
        brand_id: brand.id,
        model_id: model.id,
        service_ids: serviceIds,
        brand_name_snapshot: brand.name,
        model_name_snapshot: model.name,
        services_snapshot: selectedServiceDetails,
        parts_total: partsTotal,
        labor_total: laborTotal,
        travel_fee: travelFee,
        grand_total: grandTotal,
        appointment_at: slot,
        pre_repair_checklist: {},
        post_repair_checklist: {},
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error("Could not confirm booking. Please try again.");
      return;
    }
    setBookingId(data.id);
  };

  if (bookingId) {
    return <BookingSuccess id={bookingId} total={grandTotal} slot={slot!} mode={mode} />;
  }

  return (
    <section id="book" aria-labelledby="book-heading" className="mx-auto max-w-7xl px-4 sm:px-5 py-16 sm:py-20">
      <div className="max-w-2xl mb-8 sm:mb-10">
        <p id="pricing" className="text-[var(--cyan)] text-sm font-semibold tracking-wide uppercase">Upfront pricing</p>
        <h2 id="book-heading" className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          Book your repair in 6 simple steps.
        </h2>
        <p className="mt-3 text-lg text-foreground/75">See your exact total before we touch your device — no surprises.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5 sm:gap-6">
        <div
          className="surface-card rounded-2xl p-4 sm:p-6 md:p-8"
          role="region"
          aria-label={`Booking step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
        >
          <StepBar step={step} />

          <div className="mt-6 sm:mt-8 min-h-[360px]" aria-live="polite">
            {step === 0 && <BrandStep brands={brands} value={brandId} onChange={(id) => { setBrandId(id); setModelId(null); setServiceIds([]); }} />}
            {step === 1 && (
              <ModelStep
                models={filteredModels}
                value={modelId}
                onChange={(id) => { setModelId(id); setServiceIds([]); }}
                search={modelSearch}
                setSearch={setModelSearch}
              />
            )}
            {step === 2 && (
              <ServicesStep
                services={services}
                pricing={priceByService}
                selected={serviceIds}
                toggle={(id) => setServiceIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])}
              />
            )}
            {step === 3 && (
              <LogisticsStep
                zip={zip} setZip={setZip} zipRow={zipRow} mode={mode} setMode={setMode}
              />
            )}
            {step === 4 && <ScheduleStep days={timeSlots} value={slot} onChange={setSlot} />}
            {step === 5 && (
              <IntakeStep
                mode={mode}
                customer={customer}
                setCustomer={setCustomer}
              />
            )}
          </div>

          <div className="mt-6 sm:mt-8 flex items-center justify-between gap-3 border-t border-border pt-5 sm:pt-6">
            <Button
              variant="outline" size="touch"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              aria-label="Go to previous step"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                variant="cyan" size="touch"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
                aria-label={`Continue to ${STEPS[step + 1]}`}
              >
                Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button variant="hero" size="touch" onClick={submit} disabled={submitting} aria-label="Confirm booking">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                Confirm booking
              </Button>
            )}
          </div>
        </div>

        <PriceSummary
          brand={brand?.name}
          model={model?.name}
          services={selectedServiceDetails}
          partsTotal={partsTotal}
          laborTotal={laborTotal}
          travelFee={travelFee}
          mode={mode}
          zip={zip}
          zipOk={!!zipRow}
          grandTotal={grandTotal}
        />
      </div>
    </section>
  );
}

function StepBar({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex flex-col gap-2">
            <div className={cn(
              "h-1 rounded-full transition-colors",
              done || active ? "bg-[var(--cyan)]" : "bg-border"
            )} />
            <div className="flex items-center gap-2 text-xs">
              <span className={cn(
                "inline-grid place-items-center h-5 w-5 rounded-full text-[10px] font-semibold",
                done ? "bg-[var(--cyan)] text-[var(--primary-foreground)]" :
                active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
              )}>
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={cn(active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function BrandStep({ brands, value, onChange }: { brands: Brand[]; value: string | null; onChange: (id: string) => void }) {
  return (
    <div>
      <h3 className="text-2xl font-bold tracking-tight text-foreground">Step 1: Choose your phone brand</h3>
      <p className="text-foreground/75 mt-2 text-base">We service all current and recent flagship lineups.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {brands.map((b) => {
          const active = value === b.id;
          return (
            <button
              type="button"
              key={b.id}
              onClick={() => onChange(b.id)}
              aria-pressed={active}
              aria-label={`Select brand ${b.name}`}
              className={cn(
                "min-h-[120px] rounded-xl p-5 text-left transition-all border",
                active
                  ? "border-[var(--cyan)] bg-[var(--cyan)]/10 cyan-glow"
                  : "border-border bg-[var(--surface)] hover:border-[var(--cyan)]/40"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-lg grid place-items-center border",
                active ? "border-[var(--cyan)]/40 text-cyan" : "border-border text-muted-foreground"
              )} aria-hidden="true">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-semibold">{b.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModelStep({
  models, value, onChange, search, setSearch,
}: {
  models: Model[]; value: string | null; onChange: (id: string) => void;
  search: string; setSearch: (s: string) => void;
}) {
  return (
    <div>
      <h3 className="text-2xl font-bold tracking-tight text-foreground">Step 2: Choose your phone model</h3>
      <p className="text-foreground/75 mt-2 text-base">Type your model name to find it quickly.</p>
      <div className="mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models…"
          className="h-12 pl-10 bg-[var(--surface)] border-border"
        />
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
        {models.map((m) => {
          const active = value === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={cn(
                "min-h-[56px] text-left rounded-lg px-4 py-3 border transition-all",
                active
                  ? "border-[var(--cyan)] bg-[var(--cyan)]/10"
                  : "border-border bg-[var(--surface)] hover:border-[var(--cyan)]/40"
              )}
            >
              <div className="font-medium">{m.name}</div>
              {m.release_year && <div className="text-xs text-muted-foreground">{m.release_year}</div>}
            </button>
          );
        })}
        {models.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground py-8 text-center">No matches.</div>
        )}
      </div>
    </div>
  );
}

function ServicesStep({
  services, pricing, selected, toggle,
}: {
  services: Service[];
  pricing: Map<string, Pricing>;
  selected: string[];
  toggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-2xl font-bold tracking-tight text-foreground">Step 3: Choose your repairs</h3>
      <p className="text-foreground/75 mt-2 text-base">Select one or more. Prices include genuine parts and labor.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((s) => {
          const p = pricing.get(s.id);
          const total = (Number(p?.part_cost ?? 0)) + (Number(p?.labor_fee ?? s.default_labor_fee));
          const active = selected.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={cn(
                "min-h-[96px] text-left rounded-xl p-4 border transition-all flex items-start gap-4",
                active
                  ? "border-[var(--cyan)] bg-[var(--cyan)]/10"
                  : "border-border bg-[var(--surface)] hover:border-[var(--cyan)]/40"
              )}
            >
              <div className={cn(
                "h-6 w-6 rounded-md grid place-items-center border shrink-0 mt-0.5",
                active ? "bg-[var(--cyan)] border-[var(--cyan)] text-[var(--primary-foreground)]" : "border-border"
              )}>
                {active && <Check className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-cyan font-semibold">{total > 0 ? fmt(total) : "Free"}</div>
                </div>
                {s.description && <div className="text-sm text-muted-foreground mt-1">{s.description}</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LogisticsStep({
  zip, setZip, zipRow, mode, setMode,
}: {
  zip: string; setZip: (z: string) => void; zipRow: Zip | null | undefined;
  mode: "mobile" | "dropoff"; setMode: (m: "mobile" | "dropoff") => void;
}) {
  const valid = zip.length === 5 && !!zipRow;
  const invalid = zip.length === 5 && zipRow === null;
  return (
    <div>
      <h3 className="text-2xl font-bold tracking-tight text-foreground">Step 4: Where should we meet?</h3>
      <p className="text-foreground/75 mt-2 text-base">Enter your zip code. We'll confirm coverage and quote travel upfront.</p>

      <div className="mt-6">
        <Label htmlFor="zip" className="text-sm">Zip code</Label>
        <div className="mt-2 relative max-w-[220px]">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="zip" inputMode="numeric" maxLength={5}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="10001"
            className="h-12 pl-10 bg-[var(--surface)] border-border"
          />
        </div>
        {valid && (
          <div className="mt-2 text-sm text-cyan flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> {zipRow!.city} — service available
          </div>
        )}
        {invalid && (
          <div className="mt-2 text-sm text-destructive">Sorry, we don't service this zip yet. Try 10001, 90210, 60601, 94102, 78701…</div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          { v: "mobile", title: "Come to me", sub: "Mobile repair at your address", fee: zipRow ? `+${fmt(Number(zipRow.travel_fee))} travel` : "Travel quoted at checkout" },
          { v: "dropoff", title: "Drop-off / Meet-up", sub: "Bring it to our nearest tech", fee: "No travel fee" },
        ] as const).map((opt) => {
          const active = mode === opt.v;
          return (
            <button
              key={opt.v}
              onClick={() => setMode(opt.v)}
              className={cn(
                "min-h-[100px] text-left rounded-xl p-5 border transition-all",
                active
                  ? "border-[var(--cyan)] bg-[var(--cyan)]/10"
                  : "border-border bg-[var(--surface)] hover:border-[var(--cyan)]/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{opt.title}</div>
                <div className={cn(
                  "h-5 w-5 rounded-full border grid place-items-center",
                  active ? "border-[var(--cyan)] bg-[var(--cyan)]" : "border-border"
                )}>
                  {active && <div className="h-2 w-2 rounded-full bg-[var(--primary-foreground)]" />}
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-1">{opt.sub}</div>
              <div className="text-sm text-cyan mt-3">{opt.fee}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleStep({
  days, value, onChange,
}: {
  days: { date: Date; label: string; times: { iso: string; label: string }[] }[];
  value: string | null;
  onChange: (iso: string) => void;
}) {
  const [selectedDay, setSelectedDay] = useState(0);
  return (
    <div>
      <h3 className="text-2xl font-bold tracking-tight text-foreground">Step 5: Pick a date and time</h3>
      <p className="text-foreground/75 mt-2 text-base">Same-week availability. Reschedule for free up to 2 hours before.</p>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {days.map((d, i) => (
          <button
            key={d.label}
            onClick={() => setSelectedDay(i)}
            className={cn(
              "min-h-[56px] shrink-0 rounded-lg px-4 py-2 border text-sm transition-all",
              selectedDay === i
                ? "border-[var(--cyan)] bg-[var(--cyan)]/10 text-foreground"
                : "border-border bg-[var(--surface)] text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarIcon className="inline h-3.5 w-3.5 mr-1.5" />
            {d.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {days[selectedDay].times.map((t) => {
          const active = value === t.iso;
          return (
            <button
              key={t.iso}
              onClick={() => onChange(t.iso)}
              className={cn(
                "h-12 rounded-lg border text-sm font-medium transition-all",
                active
                  ? "border-[var(--cyan)] bg-[var(--cyan)] text-[var(--primary-foreground)]"
                  : "border-border bg-[var(--surface)] hover:border-[var(--cyan)]/40"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IntakeStep({
  mode, customer, setCustomer,
}: {
  mode: "mobile" | "dropoff";
  customer: { name: string; phone: string; email: string; address: string };
  setCustomer: (c: typeof customer) => void;
}) {
  return (
    <div>
      <h3 className="text-2xl font-bold tracking-tight text-foreground">Step 6: Your contact details</h3>
      <p className="text-foreground/75 mt-2 text-base">We'll text a reminder before the technician arrives.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name">
          <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="h-12 bg-[var(--surface)]" />
        </Field>
        <Field label="Phone">
          <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} type="tel" className="h-12 bg-[var(--surface)]" />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} type="email" className="h-12 bg-[var(--surface)]" />
        </Field>
        {mode === "mobile" && (
          <Field label="Street address" className="sm:col-span-2">
            <Input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="123 Main St, Apt 4B" className="h-12 bg-[var(--surface)]" />
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function PriceSummary({
  brand, model, services, partsTotal, laborTotal, travelFee, mode, zip, zipOk, grandTotal,
}: {
  brand?: string; model?: string;
  services: { id: string; name: string; part_cost: number; labor_fee: number }[];
  partsTotal: number; laborTotal: number; travelFee: number; mode: "mobile" | "dropoff";
  zip: string; zipOk: boolean; grandTotal: number;
}) {
  return (
    <aside className="lg:sticky lg:top-24 self-start surface-card rounded-2xl p-6 h-fit">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your quote</div>
        <ShieldCheck className="h-4 w-4 text-cyan" />
      </div>

      <div className="mt-5 text-sm">
        <div className="text-muted-foreground">Device</div>
        <div className="font-medium">{brand && model ? `${brand} — ${model}` : "Not selected"}</div>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <div className="text-muted-foreground">Services</div>
        {services.length === 0 && <div className="text-muted-foreground/70">None selected</div>}
        {services.map((s) => (
          <div key={s.id} className="flex justify-between">
            <span>{s.name}</span>
            <span>{fmt(s.part_cost + s.labor_fee)}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-4 text-sm space-y-2">
        <Row label="Parts" v={fmt(partsTotal)} />
        <Row label="Labor" v={fmt(laborTotal)} />
        <Row
          label={mode === "mobile" ? `Travel ${zip && zipOk ? `(${zip})` : ""}` : "Travel"}
          v={mode === "mobile" ? fmt(travelFee) : fmt(0)}
        />
      </div>

      <div className="mt-5 rounded-lg bg-[var(--cyan)] text-[var(--primary-foreground)] p-5">
        <div className="text-sm font-semibold uppercase tracking-wide opacity-90">Total Repair Cost</div>
        <div className="text-4xl font-bold tracking-tight mt-1">{fmt(grandTotal)}</div>
      </div>
      <p className="mt-3 text-sm text-foreground/70 leading-relaxed">
        Parts + Labor + Travel = Total. No diagnostic fees. No upcharges on-site.
      </p>
    </aside>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{v}</span>
    </div>
  );
}

function BookingSuccess({ id, total, slot, mode }: { id: string; total: number; slot: string; mode: "mobile" | "dropoff" }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  return (
    <section id="book" className="mx-auto max-w-3xl px-5 py-24">
      <div className="surface-card rounded-2xl p-10 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-[var(--cyan)]/15 border border-[var(--cyan)]/40 grid place-items-center text-cyan">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="mt-6 text-2xl sm:text-3xl font-semibold tracking-tight">You're booked with Fiixerr.</h2>
        <p className="mt-3 text-muted-foreground">
          Confirmation #{id.slice(0, 8).toUpperCase()} — we just emailed you the details and the lifetime warranty terms.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <Stat k="When" v={new Date(slot).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} />
          <Stat k="Where" v={mode === "mobile" ? "We come to you" : "Drop-off"} />
          <Stat k="Total" v={fmt(total)} />
        </div>
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-border p-4 bg-[var(--surface)]">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="mt-1 font-medium">{v}</div>
    </div>
  );
}
