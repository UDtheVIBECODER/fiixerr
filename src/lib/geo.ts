/** Haversine straight-line distance between two coordinates (kilometres). */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Ride fee in USD based on straight-line distance from the nearest hub. */
export function calcRideFee(distanceKm: number): number {
  const BASE       = 5;
  const RATE_PER_KM = 1.25; // ≈ $2 / mile
  const MAX        = 50;
  return Math.min(Math.round((BASE + distanceKm * RATE_PER_KM) * 100) / 100, MAX);
}

export type AdminLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

/** Returns the closest admin hub plus distance and fee. */
export function nearestAdmin(
  lat: number,
  lng: number,
  admins: AdminLocation[],
): { admin: AdminLocation; distanceKm: number; fee: number } | null {
  if (!admins.length) return null;
  let best = admins[0];
  let bestDist = haversineKm(lat, lng, best.lat, best.lng);
  for (const a of admins.slice(1)) {
    const d = haversineKm(lat, lng, a.lat, a.lng);
    if (d < bestDist) { best = a; bestDist = d; }
  }
  return { admin: best, distanceKm: bestDist, fee: calcRideFee(bestDist) };
}

export type NominatimResult = {
  lat: number;
  lng: number;
  displayName: string;
};

/** Geocode a free-text address via Nominatim (OpenStreetMap). Rate limit: 1 req/s. */
export async function geocodeAddress(query: string): Promise<NominatimResult[]> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Fiixerr/1.0 (booking)" },
    });
    if (!res.ok) return [];
    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
    return data.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name,
    }));
  } catch {
    return [];
  }
}

/** Reverse geocode a coordinate via Nominatim. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "Fiixerr/1.0 (booking)" } },
    );
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const data = await res.json() as { display_name?: string };
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
