// מנוע הנחת באנר — מקור-אמת אחד להנחה לפי מוצר. משמש את שלושת המקומות:
// (1) החיוב ב-Stripe (payment-intent), (2) ההזמנה ב-ODOO (orders), (3) התצוגה (Storefront).
// מודול טהור (ללא I/O), נבדק ב-node:test. מקור הנתונים (getActiveBanners) נשאר בצד-שרת.

export interface DiscountBanner {
  product_id?: string | null;
  discount_percent?: number | null;
}

/** מפת מוצר→אחוז הנחה מתוך הבאנרים הפעילים (אחוז>0 בלבד, תקרת 90%). */
export function buildDiscountMap(banners: DiscountBanner[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of banners) {
    if (b.product_id && b.discount_percent && b.discount_percent > 0) {
      map.set(String(b.product_id), Math.min(90, Number(b.discount_percent)));
    }
  }
  return map;
}

/** אחוז ההנחה לפריט עגלה (מזהה "templateId" או "templateId|variant"). 0 אם אין. */
export function discountForItem(itemId: string, map: Map<string, number>): number {
  return map.get(String(itemId).split("|")[0]) ?? 0;
}

/** מחיר יחידה אחרי הנחה — אותו עיגול שמשמש את ODOO orders (2 ספרות). */
export function discountedUnit(baseUnit: number, percent: number): number {
  if (!percent) return baseUnit;
  return Math.round(baseUnit * (1 - percent / 100) * 100) / 100;
}

/**
 * סכום המוצרים אחרי הנחת באנר — חייב להיות זהה בין החיוב (Stripe) לבין ההזמנה (ODOO).
 * priced[idx] ו-itemIds[idx] מיושרים לפי אינדקס (כמו הפלט של priceOrderItems).
 */
export function discountedTotal(
  priced: { unitPrice: number; qty: number }[],
  itemIds: string[],
  map: Map<string, number>,
): number {
  return priced.reduce((sum, p, idx) => {
    const pct = discountForItem(itemIds[idx] ?? "", map);
    return sum + discountedUnit(p.unitPrice, pct) * p.qty;
  }, 0);
}

/**
 * מחיל הנחת באנר על מוצר לתצוגה: price→מוזל, originalPrice=המקורי, discountPercent=האחוז.
 * מוצר ללא הנחה מוחזר כמות שהוא. כך כל מסלול תצוגה (גריד/חיפוש/מודל) מראה את המבצע
 * ומוסיף לסל את המחיר המוזל — לא רק בלחיצה על הבאנר.
 */
export function applyBannerDiscount<T extends { id: string; price: number }>(
  product: T,
  map: Map<string, number>,
): T & { originalPrice?: number; discountPercent?: number } {
  const pct = discountForItem(product.id, map);
  if (pct <= 0) return product;
  return {
    ...product,
    price: discountedUnit(product.price, pct),
    originalPrice: product.price,
    discountPercent: pct,
  };
}
