// חישוב דמי משלוח לפי מרחק (קו אווירי מהסניף לעיר בפוקט) + מדרגות שהמנהל מגדיר.

// אופן התמחור: 'zone' = מחיר לפי אזור ספציפי; 'distance' = מחיר לפי מרחק (קמ).
export type PricingMode = "zone" | "distance";

export interface DeliverySettings {
  origin_lat: number;
  origin_lng: number;
  base_fee: number;
  per_km: number;
  free_over: number;
  max_km: number;
  pickup_address?: string | null;
  pricing_mode: PricingMode;
}

export const DEFAULT_DELIVERY: DeliverySettings = {
  origin_lat: 7.8804,
  origin_lng: 98.3923,
  base_fee: 40,
  per_km: 10,
  free_over: 0,
  max_km: 25,
  pickup_address: null,
  pricing_mode: "zone",
};

// קואורדינטות מרכזי הערים בפוקט (לחישוב מרחק ללא צורך ב-API חיצוני).
export const PHUKET_CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  "Phuket Town": { lat: 7.8804, lng: 98.3923 },
  Rawai: { lat: 7.7766, lng: 98.3255 },
  Patong: { lat: 7.8966, lng: 98.296 },
  Kata: { lat: 7.8205, lng: 98.2987 },
  Karon: { lat: 7.8466, lng: 98.2945 },
  Chalong: { lat: 7.8463, lng: 98.3381 },
  Kathu: { lat: 7.9116, lng: 98.3324 },
  Thalang: { lat: 8.0353, lng: 98.336 },
};

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface DeliveryQuote {
  km: number;
  fee: number;
  free: boolean;
  outOfRange: boolean;
}

export function quoteDelivery(
  settings: DeliverySettings,
  city: string,
  subtotal: number,
): DeliveryQuote | null {
  const dest = PHUKET_CITY_COORDS[city];
  if (!dest) return null;
  const km = haversineKm({ lat: settings.origin_lat, lng: settings.origin_lng }, dest);
  if (km > settings.max_km) return { km, fee: 0, free: false, outOfRange: true };
  let fee = Math.round(settings.base_fee + settings.per_km * km);
  let free = false;
  if (settings.free_over > 0 && subtotal >= settings.free_over) {
    fee = 0;
    free = true;
  }
  return { km, fee, free, outOfRange: false };
}
