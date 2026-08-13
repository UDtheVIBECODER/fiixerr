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

/** Ride fee in USD based on straight-line distance from the nearest available technician. */
export function calcRideFee(distanceKm: number): number {
  const BASE           = 15;
  const RATE_PER_MILE  = 0.50;
  const distanceMiles  = distanceKm * 0.621371;
  return Math.round((BASE + distanceMiles * RATE_PER_MILE) * 100) / 100;
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
  /** Compact label: "123 Main St, Dallas, TX 75201" */
  shortName: string;
};

/** Greater DFW metro bounding box (west, north, east, south) for Nominatim viewbox.
 *  Covers Fort Worth → Rockwall, Denton → Waxahachie. */
export const DFW_VIEWBOX = "-98.5,33.8,-96.0,31.8";

/** Geocode a free-text address via Nominatim (OpenStreetMap). Rate limit: 1 req/s. */
export async function geocodeAddress(
  query: string,
  options?: { viewbox?: string; bounded?: boolean },
): Promise<NominatimResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "8",
      addressdetails: "1",
    });
    if (options?.viewbox) params.set("viewbox", options.viewbox);
    if (options?.bounded) params.set("bounded", "1");

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "User-Agent": "Fiixerr/1.0 (booking)" } },
    );
    if (!res.ok) return [];

    const data = await res.json() as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: {
        house_number?: string;
        road?: string;
        suburb?: string;
        neighbourhood?: string;
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
        postcode?: string;
      };
    }>;

    return data.map((r) => {
      const a = r.address ?? {};
      const parts: string[] = [];
      if (a.house_number && a.road) parts.push(`${a.house_number} ${a.road}`);
      else if (a.road) parts.push(a.road);
      const area = a.suburb ?? a.neighbourhood ?? "";
      if (area) parts.push(area);
      const city = a.city ?? a.town ?? a.village ?? a.county ?? "";
      if (city) parts.push(city);
      if (a.state) parts.push(a.state);
      if (a.postcode) parts.push(a.postcode);
      return {
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        displayName: r.display_name,
        shortName: parts.length
          ? parts.join(", ")
          : r.display_name.split(", ").slice(0, 4).join(", "),
      };
    });
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
