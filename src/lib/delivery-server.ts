import "server-only";
import { getDeliverySettings, getDeliveryZones } from "@/lib/supabase/data";
import { quoteDelivery, haversineKm } from "@/lib/delivery";
import { geocodeAddress } from "@/lib/google";

// חישוב דמי משלוח בצד-שרת — מקור האמת (לא נסמך על deliveryFee מהלקוח).
// סדר עדיפות: אזורים מוגדרים → כתובת מלאה (Geocoding לפי מרחק) → עיר (fallback).
export async function serverDeliveryFee(
  companyId: number,
  method: string | undefined,
  loc: { city?: string; address?: string },
  subtotal: number,
): Promise<{ fee: number; blocked: boolean; km?: number }> {
  if (method !== "delivery") return { fee: 0, blocked: false };
  const [settings, zones] = await Promise.all([
    getDeliverySettings(companyId),
    getDeliveryZones(companyId),
  ]);
  const freeNow = settings.free_over > 0 && subtotal >= settings.free_over;

  // 1. כתובת מלאה → Geocoding ומרחק אווירי מהסניף (מדויק — עדיפות ראשונה)
  if (loc.address && loc.address.trim()) {
    const geo = await geocodeAddress(loc.address);
    if (geo) {
      const km = haversineKm({ lat: settings.origin_lat, lng: settings.origin_lng }, geo);
      if (km > settings.max_km) return { fee: 0, blocked: true, km };
      const fee = freeNow ? 0 : Math.round(settings.base_fee + settings.per_km * km);
      return { fee, blocked: false, km };
    }
  }

  // 2. אזורים מוגדרים → לפי שם האזור/עיר
  if (zones.length > 0) {
    const z = zones.find((zone) => zone.name === loc.city);
    if (!z) return { fee: 0, blocked: true };
    return { fee: freeNow ? 0 : Number(z.fee), blocked: false };
  }

  // 3. fallback — עיר מרשימת הערים (קואורדינטות ידועות)
  const q = quoteDelivery(settings, loc.city ?? "", subtotal);
  if (!q) return { fee: 0, blocked: false };
  if (q.outOfRange) return { fee: 0, blocked: true, km: q.km };
  return { fee: q.fee, blocked: false, km: q.km };
}
