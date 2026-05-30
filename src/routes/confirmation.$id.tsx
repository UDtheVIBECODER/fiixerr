import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ShieldCheck, Calendar, MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/confirmation/$id")({
  component: ConfirmationPage,
  head: () => ({
    meta: [
      { title: "Booking confirmed — Fiixerr" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

function ConfirmationPage() {
  const { id } = useParams({ from: "/confirmation/$id" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["booking-confirm", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, customer_name, customer_email, customer_phone, brand_name_snapshot, model_name_snapshot, services_snapshot, grand_total, appointment_at, service_mode, street_address, zip, status")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-foreground">Loading your booking…</div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Booking not found</h1>
          <p className="text-foreground/70">We couldn't load that confirmation.</p>
          <Link to="/" className="inline-block mt-2 underline">Back home</Link>
        </div>
      </div>
    );
  }

  const when = new Date(data.appointment_at).toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
  });
  const ref = data.id.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-5 py-5">
          <Link to="/" className="text-xl font-bold tracking-tight text-foreground">Fiixerr</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <div className="surface-card rounded-2xl p-8 sm:p-10">
          <div className="mx-auto h-16 w-16 rounded-full bg-foreground/10 grid place-items-center text-foreground" aria-hidden="true">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-center">
            Your booking is reserved.
          </h1>
          <p className="mt-3 text-lg text-foreground/75 text-center">
            Confirmation <strong>#{ref}</strong> — we've emailed your receipt and warranty details to{" "}
            <span className="text-foreground">{data.customer_email}</span>.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Stat icon={<Calendar className="h-5 w-5" aria-hidden="true" />} k="When" v={when} />
            <Stat
              icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
              k="Where"
              v={data.service_mode === "mobile" ? `${data.street_address ?? ""} ${data.zip}` : `Drop-off (${data.zip})`}
            />
            <Stat icon={<Phone className="h-5 w-5" aria-hidden="true" />} k="Contact" v={data.customer_phone} />
            <Stat icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} k="Status" v={String(data.status).toUpperCase()} />
          </div>

          <div className="mt-8 rounded-xl border-2 border-border p-5">
            <h2 className="text-lg font-bold text-foreground">Receipt</h2>
            <div className="mt-3 text-base text-foreground/80">
              {data.brand_name_snapshot} — {data.model_name_snapshot}
            </div>
            <ul className="mt-3 space-y-1.5 text-base">
              {(data.services_snapshot as { id: string; name: string; part_cost: number; labor_fee: number }[]).map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>{s.name}</span>
                  <span className="font-medium">{fmt(s.part_cost + s.labor_fee)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-border flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{fmt(Number(data.grand_total))}</span>
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-[var(--surface)] border border-border p-5 text-sm text-foreground/80">
            <strong className="text-foreground">Lifetime parts warranty.</strong> Every replacement part Fiixerr installs is covered for as long as you own the device. If anything fails from a manufacturing defect, we replace it free of charge.
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-foreground text-background px-5 py-3 text-base font-semibold min-h-[48px]"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="rounded-xl border-2 border-border p-4 bg-[var(--surface)]">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/60">
        {icon}
        {k}
      </div>
      <div className="mt-1.5 font-semibold text-foreground">{v}</div>
    </div>
  );
}
