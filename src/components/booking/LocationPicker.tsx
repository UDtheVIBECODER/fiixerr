// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { nearestAdmin, geocodeAddress, DFW_VIEWBOX, type AdminLocation } from "@/lib/geo";
// AdminLocation is re-used as the shape for available worker locations
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, X } from "lucide-react";

interface LocationPickerProps {
  onLocationSet: (lat: number, lng: number, address: string, fee: number) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  /** ISO string for the appointment time — used to find workers available at that slot. Defaults to now. */
  appointmentAt?: string;
}

export function LocationPicker({
  onLocationSet,
  initialLat,
  initialLng,
  initialAddress = "",
  appointmentAt,
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
  const appointmentAtRef = useRef(appointmentAt);
  const processCoordsRef = useRef<(lat: number, lng: number) => void>();

  const [address, setAddress] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [feeInfo, setFeeInfo] = useState<{
    distanceKm: number;
    fee: number;
    workerName: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    onLocationSetRef.current = onLocationSet;
  }, [onLocationSet]);

  useEffect(() => {
    appointmentAtRef.current = appointmentAt;
  }, [appointmentAt]);

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
        .bindPopup(`<b>${a.name}</b><br><small>Available Technician</small>`)
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
        workerName: result.admin.name,
      });
      onLocationSetRef.current(lat, lng, addressRef.current, result.fee);
    } else {
      setFeeInfo(null);
      onLocationSetRef.current(lat, lng, addressRef.current, 0);
    }
  }

  // Keep processCoordsRef fresh on every render
  processCoordsRef.current = processCoords;

  // Load available technician locations and refresh when appointmentAt changes
  function loadWorkerLocations() {
    const params = appointmentAtRef.current
      ? { appointment_at: appointmentAtRef.current }
      : {};
    supabase
      .rpc("get_available_worker_locations", params)
      .then(({ data }) => {
        if (data && data.length > 0) {
          adminsRef.current = data as AdminLocation[];
        } else {
          // Fallback to admin hubs if no workers are available for this slot
          supabase
            .from("admin_locations")
            .select("id, name, lat, lng")
            .eq("active", true)
            .then(({ data: hubs }) => {
              if (hubs) adminsRef.current = hubs;
            });
        }
        // Re-render overlays if map already ready
        if (markerRef.current) {
          const ll = markerRef.current.getLatLng();
          processCoordsRef.current?.(ll.lat, ll.lng);
        }
      });
  }

  useEffect(() => {
    loadWorkerLocations();
  }, []);

  // Re-fetch when appointment time is confirmed so the fee reflects the right workers
  useEffect(() => {
    if (!appointmentAt) return;
    loadWorkerLocations();
  }, [appointmentAt]);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleAddressInput(val: string) {
    syncAddress(val);
    clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setShowSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await geocodeAddress(val, { viewbox: DFW_VIEWBOX, bounded: false });
        setSuggestions(results.slice(0, 6));
        setShowSuggestions(true);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function pickSuggestion(s: { lat: number; lng: number; displayName: string; shortName: string }) {
    syncAddress(s.shortName);
    setSuggestions([]);
    setShowSuggestions(false);
    if (!markerRef.current || !mapRef.current) return;
    markerRef.current.setLatLng([s.lat, s.lng]);
    mapRef.current.setView([s.lat, s.lng], 15);
    processCoordsRef.current?.(s.lat, s.lng);
  }

  function clearAddress() {
    syncAddress("");
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
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
              ref={inputRef}
              value={address}
              onChange={(e) => handleAddressInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Type an address, neighborhood, or city…"
              className="h-11 pl-10 pr-8 bg-[var(--surface)] border-border"
              autoComplete="off"
            />
            {searching ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            ) : address ? (
              <button
                type="button"
                onClick={clearAddress}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
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

        {showSuggestions && (searching || suggestions.length > 0) && (
          <ul
            ref={dropdownRef}
            className="absolute z-[1000] left-0 right-[52px] top-[calc(100%+4px)] bg-card border border-border rounded-lg shadow-xl overflow-hidden"
          >
            {searching && suggestions.length === 0 && (
              <li className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching…
              </li>
            )}
            {suggestions.map((s, i) => (
              <li key={i} className="border-b border-border last:border-0">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                  onClick={() => pickSuggestion(s)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--surface)] transition-colors flex items-start gap-2.5"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{s.shortName}</span>
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
          <span className="font-semibold text-foreground">
            ${feeInfo.fee.toFixed(2)} ride fee
          </span>
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
