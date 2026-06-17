import { NextResponse } from "next/server";
import { searchRead } from "@/lib/odoo/client";

// GET /api/products/options?tmplId=123
// מחזיר את קבוצות התוספות (bread/toppings) של מוצר, מ-product attributes ב-ODOO.
// קבוצות מוחזרות רק אם המוצר מוגדר כך (attribute_line_ids) — אחרת ריק.
interface Group {
  id: string;
  name: string;
  type: "radio" | "multi";
  options: { id: string; label: string; price: number }[];
}

export async function GET(req: Request) {
  try {
    const tmplId = Number(new URL(req.url).searchParams.get("tmplId"));
    if (!tmplId) return NextResponse.json({ ok: true, groups: [] });

    const lines = await searchRead<{ id: number; attribute_id: [number, string] }>(
      "product.template.attribute.line",
      [["product_tmpl_id", "=", tmplId]],
      ["id", "attribute_id"],
    );
    if (!lines.length) return NextResponse.json({ ok: true, groups: [] });

    const attrIds = [...new Set(lines.map((l) => l.attribute_id[0]))];
    const attrs = await searchRead<{ id: number; name: string; display_type: string }>(
      "product.attribute",
      [["id", "in", attrIds]],
      ["id", "name", "display_type"],
    );
    const attrMap = new Map(attrs.map((a) => [a.id, a]));

    const tavs = await searchRead<{
      id: number;
      name: string;
      price_extra: number;
      attribute_line_id: [number, string];
    }>(
      "product.template.attribute.value",
      [["product_tmpl_id", "=", tmplId]],
      ["id", "name", "price_extra", "attribute_line_id"],
    );

    const groups: Group[] = lines
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

    return NextResponse.json({ ok: true, groups });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), groups: [] },
      { status: 200 },
    );
  }
}
