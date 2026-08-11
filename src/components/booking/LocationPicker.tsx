// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { nearestAdmin, geocodeAddress, type AdminLocation } from "@/lib/geo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation } from "lucide-react";

interface LocationPickerProps {
  onLocationSet: (lat: number, lng: number, address: string, fee: number) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
}

export function LocationPicker({
  onLocationSet,
  initialLat,
  initialLng,
  initialAddress = "",
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const adminMarkersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Mutable refs to avoid stale closures in Leaflet event handlers
  const adminsRef = useRef<AdminLocation[]>([]);
  const addressRef = useRef(initialAddress);
  const onLocationSetRef = useRef(onLocationSet);
  const processCoordsRef = useRef<(lat: number, lng: number) => void>();

  const [address, setAddress] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [feeInfo, setFeeInfo] = useState<{
    distanceKm: number;
    fee: number;
    hubName: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    onLocationSetRef.current = onLocationSet;
  }, [onLocationSet]);

  function syncAddress(val: string) {
    addressRef.current = val;
    setAddress(val);
  }

  function processCoords(lat: number, lng: number) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const currentAdmins = adminsRef.current;

    // Clear previous admin overlays
    adminMarkersRef.current.forEach((m) => m.remove());
    adminMarkersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Draw admin hub markers (green)
    const hubIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#16a34a;border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,.35)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      className: "",
    });
    currentAdmins.forEach((a) => {
      const m = L.marker([a.lat, a.lng], { icon: hubIcon })
        .bindPopup(`<b>${a.name}</b><br><small>Service Hub</small>`)
        .addTo(map);
      adminMarkersRef.current.push(m);
    });

    // Find nearest hub and draw dashed line
    const result = nearestAdmin(lat, lng, currentAdmins);
    if (result) {
      polylineRef.current = L.polyline(
        [[lat, lng], [result.admin.lat, result.admin.lng]],
        { color: "#0f2c4a", dashArray: "6 4", weight: 2, opacity: 0.55 },
      ).addTo(map);
      setFeeInfo({
        distanceKm: result.distanceKm,
        fee: result.fee,
        hubName: result.admin.name,
      });
      onLocationSetRef.current(lat, lng, addressRef.current, result.fee);
    } else {
      setFeeInfo(null);
      onLocationSetRef.current(lat, lng, addressRef.current, 0);
    }
  }

  // Keep processCoordsRef fresh on every render
  processCoordsRef.current = processCoords;

  // Load admin hubs
  useEffect(() => {
    supabase
      .from("admin_locations")
      .select("id, name, lat, lng")
      .eq("active", true)
      .then(({ data }) => {
        if (data) {
          adminsRef.current = data;
          // Re-render overlays if map already ready
          if (markerRef.current) {
            const ll = markerRef.current.getLatLng();
            processCoordsRef.current?.(ll.lat, ll.lng);
          }
        }
      });
  }, []);

  // Initialize Leaflet map (once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((Lmod) => {
      const L = (Lmod as any).default ?? Lmod;
      if (cancelled || !containerRef.current) return;

      LRef.current = L;
      const startLat = initialLat ?? 32.7767;
      const startLng = initialLng ?? -96.797;
      const zoom = initialLat ? 14 : 11;

      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [startLat, startLng],
        zoom,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const customerIcon = L.divIcon({
        html: '<div style="width:20px;height:20px;border-radius:50%;background:#0f2c4a;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.45)"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: "",
      });
      const marker = L.marker([startLat, startLng], {
        draggable: true,
        icon: customerIcon,
      }).addTo(map);

      mapRef.current = map;
      markerRef.current = marker;

      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        processCoordsRef.current?.(ll.lat, ll.lng);
      });

      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        processCoordsRef.current?.(e.latlng.lat, e.latlng.lng);
      });

      if (initialLat && initialLng) {
        processCoordsRef.current?.(initialLat, initialLng);
      }

      setMapReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      adminMarkersRef.current = [];
      polylineRef.current = null;
    };
  }, []);

  function handleAddressInput(val: string) {
    syncAddress(val);
    setSuggestions([]);
    clearTimeout(debounceRef.current);
    if (val.length < 3) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await geocodeAddress(val);
        setSuggestions(results.slice(0, 5));
      } finally {
        setSearching(false);
      }
    }, 800);
  }

  function pickSuggestion(s: { lat: number; lng: number; displayName: string }) {
    syncAddress(s.displayName);
    setSuggestions([]);
    if (!markerRef.current || !mapRef.current) return;
    markerRef.current.setLatLng([s.lat, s.lng]);
    mapRef.current.setView([s.lat, s.lng], 15);
    processCoordsRef.current?.(s.lat, s.lng);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeolocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        if (!markerRef.current || !mapRef.current) return;
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], 15);
        processCoordsRef.current?.(lat, lng);
      },
      () => setGeolocating(false),
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  const mi = feeInfo ? (feeInfo.distanceKm * 0.621371).toFixed(1) : null;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={address}
              onChange={(e) => handleAddressInput(e.target.value)}
              placeholder="Search your address…"
              className="h-11 pl-10 bg-[var(--surface)] border-border"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 px-3 shrink-0"
            onClick={useMyLocation}
            disabled={geolocating}
            title="Use my current location"
          >
            {geolocating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <ul className="absolute z-[1000] left-0 right-0 top-[calc(100%+4px)] bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface)] border-b border-border last:border-0 transition-colors"
                >
                  {s.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Click the map or drag the{" "}
        <span className="font-medium">blue pin</span> to set your exact pickup location.
      </p>

      {feeInfo && (
        <div className="flex items-center gap-3 rounded-lg bg-[var(--cyan)]/10 border border-[var(--cyan)]/25 px-4 py-3 text-sm">
          <MapPin className="h-4 w-4 text-[var(--cyan)] shrink-0" />
          <div>
            <span className="font-semibold text-foreground">
              ${feeInfo.fee.toFixed(2)} ride fee
            </span>
            <span className="text-muted-foreground ml-2">
              · {mi} mi to {feeInfo.hubName}
            </span>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden border border-border"
        style={{ height: 320 }}
        aria-label="Interactive location picker map. Click or drag the pin to set your pickup location."
      />
    </div>
  );
}
