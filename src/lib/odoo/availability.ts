// Stage B — שכבת מלאי חיה מעל הקטלוג השמור (cache). מודול טהור (ללא I/O), נבדק ב-node:test.
// הקטלוג נשמר ב-cache (מהיר); המלאי נמשך חי בכל טעינה ומסתיר מצרך שאזל — כך תווית
// "אזל" תמיד מדויקת. מנת מטבח / "המשך מכירה כשאזל" מוצגות תמיד. חוסר נתון → לא מסתירים.

interface WithStock {
  id: string;
  isKitchen: boolean;
  allowOutOfStock?: boolean;
}

/**
 * מסנן מכל בָּאנדל את המצרכים שאזלו לפי מפת המלאי החיה (templateId → qty).
 * מזהה "templateId" או "templateId|variant" → נבדק לפי ה-template.
 */
export function overlayAvailability<B extends { products: P[] }, P extends WithStock>(
  bundles: B[],
  avail: Map<number, number>,
): B[] {
  return bundles.map((b) => ({
    ...b,
    products: b.products.filter((p) => {
      if (p.isKitchen || p.allowOutOfStock) return true; // מטבח / המשך-מכירה — תמיד מוצג
      const q = avail.get(Number(String(p.id).split("|")[0]));
      return q == null ? true : q > 0; // חוסר נתון חי → לא מסתירים (fail-open לתצוגה בלבד)
    }),
  }));
}
