// @ts-nocheck
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

function ConfirmationPage() {
  const { id } = useParams({ from: "/confirmation/$id" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["booking-confirm", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, customer_name, customer_email, customer_phone, brand_name_snapshot, model_name_snapshot, services_snapshot, grand_total, appointment_at, service_mode, street_address, zip, status, pickup_lat, pickup_lng, pickup_address, ride_fee")
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
            Confirmation <strong>#{ref}</strong> —{" "}
            {data.customer_email
              ? <>we've emailed your receipt and warranty details to <span className="text-foreground">{data.customer_email}</span>.</>
              : <>your booking is confirmed. Our team will contact you by phone.</>
            }
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
              {data.services_snapshot.map((s) => (
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

          {data.service_mode === "mobile" && data.pickup_lat && data.pickup_lng && (
            <div className="mt-8">
              <h2 className="text-base font-semibold text-foreground mb-3">Your pickup location</h2>
              <ConfirmationMap lat={data.pickup_lat} lng={data.pickup_lng} />
              {data.ride_fee > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Ride fee: <span className="font-medium text-foreground">${Number(data.ride_fee).toFixed(2)}</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-8 rounded-xl bg-[var(--surface)] border border-border p-5 text-sm text-foreground/80">
            <strong className="text-foreground">Lifetime parts warranty.</strong> Every replacement part Fiixerr installs is covered for as long as you own the device. If anything fails from a manufacturing defect, we replace it free of charge.
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="tel:4302429880"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground text-background px-5 py-3 text-base font-semibold min-h-[48px] w-full sm:w-auto"
            >
              <Phone className="h-5 w-5" />
              Call Us
            </a>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md border-2 border-foreground text-foreground px-5 py-3 text-base font-semibold min-h-[48px] w-full sm:w-auto"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, k, v }) {
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

function ConfirmationMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((Lmod) => {
      const L = (Lmod as any).default ?? Lmod;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        dragging: false,
      }).setView([lat, lng], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#0f2c4a;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        className: "",
      });
      L.marker([lat, lng], { icon }).addTo(map);
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border border-border"
      style={{ height: 220 }}
      aria-label="Pickup location map"
    />
  );
}
