// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { nearestAdmin, type AdminLocation } from "@/lib/geo";
import { Navigation, X } from "lucide-react";

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

interface RouteInfo {
  booking: Booking;
  hubName: string;
  distanceMi: number;
  durationMin: number;
}

async function fetchOsrmRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) return null;
  return {
    geometry: route.geometry,          // GeoJSON LineString
    distanceMi: route.distance / 1609.34,
    durationMin: Math.round(route.duration / 60),
  };
}

export function BookingsMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const bookingMarkersRef = useRef<Map<string, any>>(new Map());
  const adminMarkersRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [admins, setAdmins] = useState<AdminLocation[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

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

  // Render booking markers
  useEffect(() => {
    if (!mapReady) return;
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

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

      // On click: draw OSRM route from nearest hub
      marker.on("click", () => handleBookingClick(b));

      bookingMarkersRef.current.set(b.id, marker);
    });
  }, [mapReady, bookings]);

  async function handleBookingClick(b: Booking) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !b.pickup_lat || !b.pickup_lng) return;

    // Clear previous route line
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    setRouteInfo(null);

    const nearest = nearestAdmin(b.pickup_lat, b.pickup_lng, adminsRef.current);
    if (!nearest) return;

    setRouteLoading(true);
    try {
      const route = await fetchOsrmRoute(
        nearest.admin.lat,
        nearest.admin.lng,
        b.pickup_lat,
        b.pickup_lng,
      );
      if (!route) return;

      routeLineRef.current = L.geoJSON(route.geometry, {
        style: { color: "#2563eb", weight: 5, opacity: 0.85 },
      }).addTo(map);

      map.fitBounds(routeLineRef.current.getBounds(), { padding: [48, 48] });

      setRouteInfo({
        booking: b,
        hubName: nearest.admin.name,
        distanceMi: route.distanceMi,
        durationMin: route.durationMin,
      });
    } finally {
      setRouteLoading(false);
    }
  }

  function clearRoute() {
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    setRouteInfo(null);
  }

  const located = bookings.filter((b) => b.pickup_lat).length;

  return (
    <div className="space-y-3">
      {/* Legend */}
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

      {/* Map */}
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-border"
        style={{ height: 480 }}
        aria-label="Live bookings map"
      />

      {/* Route info panel */}
      {routeLoading && (
        <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground animate-pulse">
          Calculating fastest route…
        </div>
      )}

      {routeInfo && !routeLoading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="font-semibold text-foreground">{routeInfo.booking.customer_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full capitalize font-medium"
                  style={{ background: STATUS_COLORS[routeInfo.booking.status] + "22", color: STATUS_COLORS[routeInfo.booking.status] }}>
                  {routeInfo.booking.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {routeInfo.booking.pickup_address || routeInfo.booking.street_address || "No address on file"}
              </p>
              <p className="text-xs text-muted-foreground">
                From hub: <span className="font-medium text-foreground">{routeInfo.hubName}</span>
              </p>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <p className="text-xl font-bold text-foreground">{routeInfo.distanceMi.toFixed(1)} mi</p>
              <p className="text-sm text-muted-foreground">{routeInfo.durationMin} min drive</p>
              <p className="text-xs text-muted-foreground">
                {new Date(routeInfo.booking.appointment_at).toLocaleString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                  hour: "numeric", minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={clearRoute}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> Clear route
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {located} mobile booking{located !== 1 ? "s" : ""} with location data · updates in real time · click a pin to see the fastest route
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
  const address = b.pickup_address || b.street_address || "—";

  return `
    <div style="min-width:220px;font-size:13px;line-height:1.6">
      <strong style="font-size:14px">${b.customer_name}</strong><br>
      ${b.brand_name_snapshot} ${b.model_name_snapshot}<br>
      <span style="text-transform:capitalize;color:#6b7280">${b.status.replace("_", " ")}</span> · ${when}<br>
      <small style="color:#6b7280">${address}</small><br>
      <small style="color:#9ca3af">Hub distance: ${dist} · Ride fee: $${Number(b.ride_fee ?? 0).toFixed(2)}</small><br>
      <small style="color:#2563eb;font-style:italic">Click pin to show driving route ↓</small>
    </div>
  `;
}
