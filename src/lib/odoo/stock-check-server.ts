import "server-only";
import { searchRead } from "./client";
import { computeShortages, type StockRow, type StockDemand, type Shortage } from "./stock-check";

// עוטף את מנוע בדיקת-המלאי הטהור עם קריאה חיה ל-ODOO. נפרד מ-stock-check.ts כדי
// ש-stock-check.ts יישאר טהור ובר-בדיקה ב-node:test (ללא server-only/client).

export type { Shortage } from "./stock-check";

/**
 * בודק מול ODOO (ON HAND פר-סניף) אילו פריטים בעגלה אזלו. קריאה אחת מקובצת.
 * מזהה פריט "templateId" או "templateId|variant" → נבדק לפי ה-template.
 */
export async function checkStock(
  companyId: number,
  items: { id: string; qty: number; name?: string }[],
): Promise<Shortage[]> {
  const demands: StockDemand[] = items.map((i) => ({
    templateId: Number(String(i.id).split("|")[0]),
    qty: i.qty,
    name: i.name,
  }));
  const ids = [
    ...new Set(demands.map((d) => d.templateId).filter((n) => Number.isInteger(n) && n > 0)),
  ];
  if (!ids.length) return [];
  const rows = await searchRead<StockRow>(
    "product.template",
    [["id", "in", ids]],
    ["id", "name", "qty_available", "is_storable", "allow_out_of_stock_order"],
    // הקשר חברה — ON HAND מחושב לפי מלאי הסניף הספציפי (זהה לתצוגה)
    { context: { allowed_company_ids: [companyId] }, limit: ids.length },
  );
  return computeShortages(rows, demands);
}
