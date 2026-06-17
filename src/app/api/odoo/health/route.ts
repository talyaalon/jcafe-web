import { NextResponse } from "next/server";
import { authenticate, odooVersion, executeKw, searchRead } from "@/lib/odoo/client";

// בדיקת חיבור ל-ODOO + הצצה למבנה הנתונים (מוצרים/קטגוריות).
// GET /api/odoo/health
export async function GET() {
  try {
    const version = await odooVersion();
    const uid = await authenticate();

    const productCount = await executeKw<number>("product.template", "search_count", [[]]);

    const products = await searchRead(
      "product.template",
      [["sale_ok", "=", true]],
      ["id", "name", "list_price", "qty_available", "categ_id", "barcode", "type"],
      { limit: 8 },
    );

    const categories = await searchRead(
      "product.category",
      [],
      ["id", "name", "parent_id"],
      { limit: 50 },
    );

    return NextResponse.json({
      ok: true,
      uid,
      version,
      productCount,
      sampleProducts: products,
      categories,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
