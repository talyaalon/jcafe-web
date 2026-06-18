import { NextResponse } from "next/server";
import { searchRead, executeKw } from "@/lib/odoo/client";

// חקירת מבנה ה-POS לצורך תכנון המיפוי (סניף → חנויות → מוצרים).
// GET /api/odoo/explore
async function safe<T>(label: string, fn: () => Promise<T>) {
  try {
    return { [label]: await fn() };
  } catch (e) {
    return { [label]: { error: e instanceof Error ? e.message : String(e) } };
  }
}

export async function GET() {
  const results = Object.assign(
    {},
    await safe("posConfigs", () =>
      searchRead("pos.config", [], ["id", "name", "company_id", "pricelist_id"], { limit: 100 }),
    ),
    await safe("companies", () =>
      searchRead("res.company", [], ["id", "name", "parent_id"], { limit: 80 }),
    ),
    await safe("posCategories", () =>
      searchRead("pos.category", [], ["id", "name", "parent_id"], { limit: 200 }),
    ),
    await safe("availableInPosCount", () =>
      executeKw<number>("product.template", "search_count", [[["available_in_pos", "=", true]]]),
    ),
    await safe("samplePosProducts", () =>
      searchRead(
        "product.template",
        [["available_in_pos", "=", true]],
        ["id", "name", "pos_categ_ids", "categ_id", "list_price", "barcode"],
        { limit: 12 },
      ),
    ),
    await safe("companies", () => searchRead("res.company", [], ["id", "name"], { limit: 20 })),
    // פרטי ה-POS configs של פוקט (חברה 14) — איך מגבילים קטגוריות/מחירון
    await safe("phuketPosDetails", () =>
      searchRead(
        "pos.config",
        [["company_id", "=", 14]],
        ["id", "name", "limit_categories", "iface_available_categ_ids", "pricelist_id", "company_id"],
        { limit: 20 },
      ),
    ),
    // כמה מוצרים זמינים ב-POS עבור חברת פוקט (כולל משותפים)
    await safe("phuketProductCount", () =>
      executeKw<number>("product.template", "search_count", [
        [
          ["available_in_pos", "=", true],
          ["company_id", "in", [14, false]],
        ],
      ]),
    ),
    // שפות פעילות (לבדיקת תרגום עברית)
    await safe("activeLangs", () =>
      searchRead("res.lang", [["active", "=", true]], ["code", "name"], { limit: 20 }),
    ),
    // מבנה מחירון פוקט (11)
    await safe("pricelist11Count", () =>
      executeKw<number>("product.pricelist.item", "search_count", [[["pricelist_id", "=", 11]]]),
    ),
    await safe("pricelist11Sample", () =>
      searchRead(
        "product.pricelist.item",
        [["pricelist_id", "=", 11]],
        ["applied_on", "compute_price", "fixed_price", "percent_price", "base", "product_tmpl_id", "categ_id", "min_quantity"],
        { limit: 12 },
      ),
    ),
    // מוצרים בעלי attributes (תוספות/אפשרויות) בפוקט
    await safe("productsWithAttributes", () =>
      searchRead(
        "product.template",
        [
          ["available_in_pos", "=", true],
          ["company_id", "in", [14, false]],
          ["attribute_line_ids", "!=", false],
        ],
        ["id", "name", "attribute_line_ids"],
        { limit: 8 },
      ),
    ),
    await safe("attributes", () =>
      searchRead("product.attribute", [], ["id", "name", "display_type", "create_variant"], { limit: 40 }),
    ),
    await safe("attrLineSample", () =>
      searchRead(
        "product.template.attribute.line",
        [],
        ["id", "product_tmpl_id", "attribute_id", "value_ids"],
        { limit: 8 },
      ),
    ),
    await safe("recentSO", () =>
      searchRead(
        "sale.order",
        [["company_id", "=", 14]],
        ["id", "name", "amount_total", "amount_untaxed", "state"],
        { limit: 3, order: "id desc" },
      ),
    ),
    await safe("recentSOLines", () =>
      searchRead(
        "sale.order.line",
        [["order_id.company_id", "=", 14]],
        ["order_id", "name", "product_uom_qty", "price_unit", "price_subtotal", "display_type"],
        { limit: 25, order: "id desc" },
      ),
    ),
  );

  return NextResponse.json(results);
}
