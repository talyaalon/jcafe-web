// Stage B — שכבת מלאי חיה מעל הקטלוג השמור (cache). מודול טהור (ללא I/O), נבדק ב-node:test.
// הקטלוג נשמר ב-cache (מהיר); המלאי נמשך חי בכל טעינה ומסתיר מצרך שאזל — כך תווית
// "אזל" תמיד מדויקת. מנת מטבח / "המשך מכירה כשאזל" מוצגות תמיד. חוסר נתון → לא מסתירים.

interface WithStock {
  id: string;
  isKitchen: boolean;
  allowOutOfStock?: boolean;
  qtyAvailable?: number | null;
}

/**
 * שכבת המלאי החיה: (1) מסתירה מצרך שאזל (qty 0), (2) ממלאת את הכמות החיה
 * (qtyAvailable) למצרכים מנוהלי-מלאי — כדי שאפשר יהיה להגביל הוספה-לסל למקסימום.
 * מטבח ("מוכן לפי הזמנה") ו"המשך מכירה כשאזל" — תמיד מוצגים, ללא הגבלת כמות (qty נשאר null).
 * מזהה "templateId" או "templateId|variant" → נבדק לפי ה-template.
 */
export function overlayAvailability<B extends { products: P[] }, P extends WithStock>(
  bundles: B[],
  avail: Map<number, number>,
): B[] {
  const qtyOf = (id: string) => avail.get(Number(String(id).split("|")[0]));
  return bundles.map((b) => ({
    ...b,
    products: b.products
      .filter((p) => {
        if (p.isKitchen || p.allowOutOfStock) return true; // תמיד מוצג
        const q = qtyOf(p.id);
        return q == null ? true : q > 0; // חוסר נתון חי → לא מסתירים (fail-open לתצוגה)
      })
      .map((p) => {
        if (p.isKitchen || p.allowOutOfStock) return p; // ללא הגבלת כמות
        const q = qtyOf(p.id);
        return q == null ? p : { ...p, qtyAvailable: q };
      }),
  }));
}
