import "server-only";

// ===== Google Maps (צד-שרת) — Geocoding + Places Autocomplete =====
const KEY = process.env.GOOGLE_MAPS_KEY ?? "";

export interface GeoPoint {
  lat: number;
  lng: number;
  formatted: string;
}

// כתובת חופשית → קואורדינטות (מוטה לתאילנד). null אם לא נמצא/אין מפתח.
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  if (!KEY || !address.trim()) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address,
    )}&region=th&key=${KEY}`;
    const r = await fetch(url);
    const d = (await r.json()) as {
      status: string;
      results?: { geometry?: { location?: { lat: number; lng: number } }; formatted_address?: string }[];
    };
    const loc = d.results?.[0]?.geometry?.location;
    if (d.status !== "OK" || !loc) return null;
    return { lat: loc.lat, lng: loc.lng, formatted: d.results?.[0]?.formatted_address ?? address };
  } catch (e) {
    console.error("[geocodeAddress]", e);
    return null;
  }
}

export interface Prediction {
  description: string;
  placeId: string;
}

// השלמת כתובת (מוגבל לתאילנד). מחזיר עד 5 הצעות.
export async function placesAutocomplete(input: string): Promise<Prediction[]> {
  if (!KEY || input.trim().length < 3) return [];
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input,
    )}&components=country:th&key=${KEY}`;
    const r = await fetch(url);
    const d = (await r.json()) as {
      status: string;
      predictions?: { description: string; place_id: string }[];
    };
    if (d.status !== "OK" && d.status !== "ZERO_RESULTS") return [];
    return (d.predictions ?? []).slice(0, 5).map((p) => ({ description: p.description, placeId: p.place_id }));
  } catch (e) {
    console.error("[placesAutocomplete]", e);
    return [];
  }
}
