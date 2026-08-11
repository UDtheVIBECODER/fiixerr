// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { nearestAdmin, type AdminLocation } from "@/lib/geo";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  dispatched: "#3b82f6",
  in_progress: "#8b5cf6",
  completed: "#16a34a",
  cancelled: "#9ca3af",
};

interface Booking {
  id: string;
  customer_name: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_address: string | null;
  street_address: string | null;
  status: string;
  appointment_at: string;
  service_mode: string;
  brand_name_snapshot: string;
  model_name_snapshot: string;
  grand_total: number;
  ride_fee: number | null;
}

export function BookingsMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const bookingMarkersRef = useRef<Map<string, any>>(new Map());
  const adminMarkersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [admins, setAdmins] = useState<AdminLocation[]>([]);

  const adminsRef = useRef<AdminLocation[]>([]);
  useEffect(() => {
    adminsRef.current = admins;
  }, [admins]);

  // Load admin hubs
  useEffect(() => {
    supabase
      .from("admin_locations")
      .select("id, name, lat, lng")
      .eq("active", true)
      .then(({ data }) => {
        if (data) setAdmins(data);
      });
  }, []);

  // Load mobile bookings with location data + realtime
  useEffect(() => {
    supabase
      .from("bookings")
      .select(
        "id, customer_name, pickup_lat, pickup_lng, pickup_address, street_address, status, appointment_at, service_mode, brand_name_snapshot, model_name_snapshot, grand_total, ride_fee",
      )
      .eq("service_mode", "mobile")
      .not("pickup_lat", "is", null)
      .then(({ data }) => {
        if (data) setBookings(data as Booking[]);
      });

    const channel = supabase
      .channel("bookings-map-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const b = payload.new as Booking;
            setBookings((prev) => {
              const idx = prev.findIndex((x) => x.id === b.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = b;
                return next;
              }
              if (b.pickup_lat && b.service_mode === "mobile") {
                return [...prev, b];
              }
              return prev;
            });
          } else if (payload.eventType === "DELETE") {
            setBookings((prev) => prev.filter((x) => x.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Init Leaflet map (once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((Lmod) => {
      const L = (Lmod as any).default ?? Lmod;
      if (cancelled || !containerRef.current) return;

      LRef.current = L;
      const map = L.map(containerRef.current).setView([32.7767, -96.797], 10);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Render admin hub markers
  useEffect(() => {
    if (!mapReady || !admins.length) return;
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    adminMarkersRef.current.forEach((m) => m.remove());
    adminMarkersRef.current = [];

    const hubIcon = L.divIcon({
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#16a34a;border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,.35)"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: "",
    });

    admins.forEach((a) => {
      const m = L.marker([a.lat, a.lng], { icon: hubIcon })
        .bindPopup(`<b>${a.name}</b><br><small>Service Hub</small>`)
        .addTo(map);
      adminMarkersRef.current.push(m);
    });
  }, [mapReady, admins]);

  // Render booking markers (recreate on every change for simplicity)
  useEffect(() => {
    if (!mapReady) return;
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Remove all old booking markers
    bookingMarkersRef.current.forEach((m) => m.remove());
    bookingMarkersRef.current.clear();

    bookings.forEach((b) => {
      if (!b.pickup_lat || !b.pickup_lng) return;
      const color = STATUS_COLORS[b.status] ?? "#9ca3af";
      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 5px rgba(0,0,0,.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: "",
      });
      const marker = L.marker([b.pickup_lat, b.pickup_lng], { icon })
        .bindPopup(buildPopup(b, adminsRef.current))
        .addTo(map);
      bookingMarkersRef.current.set(b.id, marker);
    });
  }, [mapReady, bookings]);

  const located = bookings.filter((b) => b.pickup_lat).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap text-sm">
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white/50" style={{ background: c }} />
            <span className="text-muted-foreground capitalize">{s.replace("_", " ")}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-600 border border-white/50" />
          <span className="text-muted-foreground">Hub</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-border"
        style={{ height: 480 }}
        aria-label="Live bookings map"
      />

      <p className="text-xs text-muted-foreground">
        {located} mobile booking{located !== 1 ? "s" : ""} with location data · updates in real time
      </p>
    </div>
  );
}

function buildPopup(b: Booking, admins: AdminLocation[]): string {
  const when = new Date(b.appointment_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const nearest =
    admins.length && b.pickup_lat && b.pickup_lng
      ? nearestAdmin(b.pickup_lat, b.pickup_lng, admins)
      : null;
  const dist = nearest ? `${(nearest.distanceKm * 0.621371).toFixed(1)} mi` : "—";

  return `
    <div style="min-width:210px;font-size:13px;line-height:1.6">
      <strong style="font-size:14px">${b.customer_name}</strong><br>
      ${b.brand_name_snapshot} ${b.model_name_snapshot}<br>
      <span style="text-transform:capitalize;color:#6b7280">${b.status.replace("_", " ")}</span> · ${when}<br>
      ${b.pickup_address ? `<small style="color:#9ca3af">${b.pickup_address}</small><br>` : ""}
      <small>From hub: ${dist} · Ride fee: $${Number(b.ride_fee ?? 0).toFixed(2)}</small>
    </div>
  `;
}
