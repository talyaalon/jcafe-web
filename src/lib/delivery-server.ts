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
  const distanceMode = settings.pricing_mode === "distance";

  // מרחק אווירי מהסניף (לפי Geocoding) — נחוץ לתמחור לפי קמ.
  const kmFromOrigin = async (): Promise<number | null> => {
    if (!loc.address || !loc.address.trim()) return null;
    const geo = await geocodeAddress(loc.address);
    if (!geo) return null;
    return haversineKm({ lat: settings.origin_lat, lng: settings.origin_lng }, geo);
  };

  // 1. אם הוגדרו אזורים (כיסוי או מתומחרים) — הם מקור האמת לכיסוי:
  //    הכתובת חייבת להתאים לאחד מהם, אחרת המשלוח חסום.
  if (zones.length > 0) {
    const addr = (loc.address ?? "").toLowerCase();
    const city = (loc.city ?? "").toLowerCase().trim();
    const matches = (zone: (typeof zones)[number]) => {
      const full = (zone.name ?? "").toLowerCase().trim();
      const first = full.split(",")[0].trim();
      if (zone.zip && addr.includes(String(zone.zip).toLowerCase())) return true;
      if (full && addr.includes(full)) return true;
      if (first.length >= 3 && addr.includes(first)) return true;
      if (city && first && first === city) return true;
      return false;
    };
    const z = zones.find(matches);
    if (!z) return { fee: 0, blocked: true };

    // תמחור לפי מרחק — בכל אזור מכוסה המחיר לפי קמ מהסניף.
    if (distanceMode) {
      const km = await kmFromOrigin();
      if (km != null && km > settings.max_km) return { fee: 0, blocked: true, km };
      const fee =
        freeNow || km == null
          ? freeNow
            ? 0
            : Number(settings.base_fee)
          : Math.round(settings.base_fee + settings.per_km * km);
      return { fee, blocked: false, km: km ?? undefined };
    }

    // תמחור לפי אזור — אזור מתומחר משתמש במחירו; אזור כיסוי בלבד → דמי ברירת מחדל.
    const fee = z.coverage_only ? Number(settings.base_fee) : Number(z.fee);
    return { fee: freeNow ? 0 : fee, blocked: false };
  }

  // 2. אין אזורים מוגדרים — כתובת מלאה → Geocoding ומרחק אווירי מהסניף
  if (loc.address && loc.address.trim()) {
    const km = await kmFromOrigin();
    if (km != null) {
      if (km > settings.max_km) return { fee: 0, blocked: true, km };
      const fee = freeNow ? 0 : Math.round(settings.base_fee + settings.per_km * km);
      return { fee, blocked: false, km };
    }
  }

  // 3. fallback — עיר מרשימת הערים (קואורדינטות ידועות)
  const q = quoteDelivery(settings, loc.city ?? "", subtotal);
  if (!q) return { fee: 0, blocked: false };
  if (q.outOfRange) return { fee: 0, blocked: true, km: q.km };
  return { fee: q.fee, blocked: false, km: q.km };
}
