import "server-only";
import { getDeliverySettings, getDeliveryZones } from "@/lib/supabase/data";
import { quoteDelivery } from "@/lib/delivery";

// חישוב דמי משלוח בצד-שרת — מקור האמת (לא נסמך על deliveryFee מהלקוח).
// אם הוגדרו אזורים → לפי האזור; אחרת חישוב מרחק. מכבד free_over.
export async function serverDeliveryFee(
  companyId: number,
  method: string | undefined,
  city: string,
  subtotal: number,
): Promise<{ fee: number; blocked: boolean }> {
  if (method !== "delivery") return { fee: 0, blocked: false };
  const [settings, zones] = await Promise.all([
    getDeliverySettings(companyId),
    getDeliveryZones(companyId),
  ]);
  const freeNow = settings.free_over > 0 && subtotal >= settings.free_over;

  if (zones.length > 0) {
    const z = zones.find((zone) => zone.name === city);
    if (!z) return { fee: 0, blocked: true }; // אזור לא נתמך
    return { fee: freeNow ? 0 : Number(z.fee), blocked: false };
  }

  const q = quoteDelivery(settings, city, subtotal);
  if (!q) return { fee: 0, blocked: false };
  if (q.outOfRange) return { fee: 0, blocked: true };
  return { fee: q.fee, blocked: false };
}
