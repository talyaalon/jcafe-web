// שלב A — בדיקת מלאי חיה ב-checkout. מודול טהור (ללא I/O), נבדק ב-node:test.
// כלל האכיפה (הבהרה 2 — "בספק לאכוף"): פריט פטור רק בדגל ODOO מפורש —
// is_storable===false (לא מנוהל-מלאי) או allow_out_of_stock_order===true ("המשך מכירה
// כשאזל"). כל מקרה אחר (דגל חסר, qty חסר, שורה חסרה) → אוכף.

export interface StockRow {
  id: number;
  name: string;
  qty_available?: number;
  is_storable?: boolean;
  allow_out_of_stock_order?: boolean;
}

export interface StockDemand {
  templateId: number;
  qty: number;
  name?: string;
}

export interface Shortage {
  templateId: number;
  name: string;
  available: number;
  requested: number;
}

/**
 * משווה ביקוש (מהעגלה) מול שורות ODOO ומחזיר את הפריטים שאזלו.
 * מקבץ ביקוש לפי templateId (אותו מוצר בכמה שורות = סכום הכמויות).
 */
export function computeShortages(rows: StockRow[], demands: StockDemand[]): Shortage[] {
  const rowById = new Map<number, StockRow>();
  for (const r of rows) rowById.set(r.id, r);

  // קיבוץ הביקוש לפי מוצר (templateId)
  const agg = new Map<number, { requested: number; name?: string }>();
  for (const d of demands) {
    const cur = agg.get(d.templateId) ?? { requested: 0 };
    cur.requested += d.qty;
    if (cur.name == null && d.name != null) cur.name = d.name;
    agg.set(d.templateId, cur);
  }

  const shortages: Shortage[] = [];
  for (const [templateId, { requested, name: demandName }] of agg) {
    const row = rowById.get(templateId);
    // פטור רק בדגל מפורש; בספק — אוכף.
    if (row && row.is_storable === false) continue;
    if (row && row.allow_out_of_stock_order === true) continue;
    const available = row && typeof row.qty_available === "number" ? row.qty_available : 0;
    if (available < requested) {
      shortages.push({
        templateId,
        name: row?.name ?? demandName ?? `P${templateId}`,
        available,
        requested,
      });
    }
  }
  return shortages;
}
