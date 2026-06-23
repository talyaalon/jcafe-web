import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { searchRead } from "@/lib/odoo/client";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/products/options?tmplId=123&lang=he
// מחזיר את קבוצות התוספות (bread/toppings) של מוצר, מ-product attributes ב-ODOO.
// קבוצות מוחזרות רק אם המוצר מוגדר כך (attribute_line_ids) — אחרת ריק.
// אלו נתונים קבועים (לא תלויי-מלאי) → נשמרים ב-cache לשעה לכל (מוצר, שפה) → טעינה מיידית.
interface Group {
  id: string;
  name: string;
  type: "radio" | "multi";
  options: { id: string; label: string; price: number }[];
}

const HE = "he_IL";

// שליפת הקבוצות מ-ODOO, שמורה ב-cache לפי (מוצר, שפה). שמות מתורגמים לפי השפה.
function fetchGroups(tmplId: number, lang: "he" | "en"): Promise<Group[]> {
  return unstable_cache(
    async () => {
      const opts = lang === "he" ? { context: { lang: HE } } : {};
      // lines (לפי tmplId) ו-tavs (לפי tmplId) אינם תלויים זה בזה → במקביל. attrs תלוי
      // ב-attrIds מ-lines → אחריהם. כך 2 סבבים במקום 3 (מהיר יותר בפתיחה ראשונה).
      const [lines, tavs] = await Promise.all([
        searchRead<{ id: number; attribute_id: [number, string] }>(
          "product.template.attribute.line",
          [["product_tmpl_id", "=", tmplId]],
          ["id", "attribute_id"],
        ),
        searchRead<{
          id: number;
          name: string;
          price_extra: number;
          attribute_line_id: [number, string];
        }>(
          "product.template.attribute.value",
          [["product_tmpl_id", "=", tmplId]],
          ["id", "name", "price_extra", "attribute_line_id"],
          opts,
        ),
      ]);
      if (!lines.length) return [];

      const attrIds = [...new Set(lines.map((l) => l.attribute_id[0]))];
      const attrs = await searchRead<{ id: number; name: string; display_type: string }>(
        "product.attribute",
        [["id", "in", attrIds]],
        ["id", "name", "display_type"],
        opts,
      );
      const attrMap = new Map(attrs.map((a) => [a.id, a]));

      return lines
        .map((line) => {
          const attr = attrMap.get(line.attribute_id[0]);
          const type = attr?.display_type === "multi" ? "multi" : "radio";
          const options = tavs
            .filter((v) => v.attribute_line_id[0] === line.id)
            .map((v) => ({ id: String(v.id), label: v.name, price: v.price_extra || 0 }))
            // סינון ערכי placeholder ("-", ",", ".") — ערך "ללא" של multi ב-ODOO
            .filter((o) => /[A-Za-z֐-׿0-9]/.test(o.label));
          return { id: String(line.id), name: attr?.name ?? "", type, options } as Group;
        })
        .filter((g) => g.options.length > 0);
    },
    ["product-options", String(tmplId), lang],
    // cache קצר (דקה) כדי שתרגומים שתזיני ב-ODOO יופיעו מהר. ניתן להעלות חזרה ל-1h
    // אחרי שהתרגומים יציבים — למהירות מקסימלית.
    { revalidate: 60, tags: [`options-${tmplId}`] },
  )();
}

export async function GET(req: Request) {
  if (!rateLimit(`options:${clientIp(req)}`, 120, 60 * 1000)) {
    return NextResponse.json({ ok: false, groups: [] }, { status: 429 });
  }
  try {
    const url = new URL(req.url);
    const tmplId = Number(url.searchParams.get("tmplId"));
    const lang = url.searchParams.get("lang") === "he" ? "he" : "en";
    if (!Number.isInteger(tmplId) || tmplId <= 0) {
      return NextResponse.json({ ok: true, groups: [] });
    }
    const groups = await fetchGroups(tmplId, lang);
    return NextResponse.json({ ok: true, groups });
  } catch (e) {
    console.error("[products/options]", e);
    return NextResponse.json({ ok: false, groups: [] }, { status: 200 });
  }
}
