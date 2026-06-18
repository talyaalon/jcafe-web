import "server-only";
import { executeKw, searchRead } from "./client";
import { phuketStores } from "./phuket";
import type { BranchConfig } from "./branches";

// ===== דחיפת פריטי מטבח ל-Preparation Display של ODOO =====
// לכל חנות-מטבח בהזמנה: יוצרים pos.order ב-Session הפתוח + process_order →
// ODOO מנתב כל מנה למסך ההכנה הנכון (Hot/Cold/Grill) לפי קטגוריית המוצר.

export interface PrepItem {
  templateId: number;
  qty: number;
  price: number;
  name: string;
  storeId: string;
}

// storeId → pos.config id + האם מטבח. תומך ב-slug של פוקט ובמזהה config ישיר (סניפים).
function resolveConfig(
  storeId: string,
  configs: BranchConfig[],
): { configId: number; isKitchen: boolean } | null {
  if (/^\d+$/.test(storeId)) {
    const c = configs.find((x) => x.id === Number(storeId));
    return { configId: Number(storeId), isKitchen: c ? c.type === "kitchen" : true };
  }
  const ps = phuketStores.find((s) => s.id === storeId);
  return ps ? { configId: ps.posConfigId, isKitchen: ps.type === "kitchen" } : null;
}

async function openSession(configId: number): Promise<number | null> {
  const cfg = (
    await searchRead<{ current_session_id: [number, string] | false }>(
      "pos.config",
      [["id", "=", configId]],
      ["current_session_id"],
    )
  )[0];
  return cfg?.current_session_id ? cfg.current_session_id[0] : null;
}

async function variantOf(templateId: number): Promise<number | null> {
  const v = (
    await searchRead<{ id: number }>(
      "product.product",
      [["product_tmpl_id", "=", templateId]],
      ["id"],
      { limit: 1 },
    )
  )[0];
  return v?.id ?? null;
}

export interface PrepResult {
  configId: number;
  posOrderId: number;
  prepOk: boolean;
}

export async function pushKitchenToPrep(opts: {
  items: PrepItem[];
  companyId: number;
  configs: BranchConfig[];
  note?: string;
}): Promise<PrepResult[]> {
  const { items, companyId, configs, note } = opts;

  // קיבוץ פריטי מטבח לפי pos.config
  const byConfig = new Map<number, PrepItem[]>();
  for (const it of items) {
    const r = resolveConfig(it.storeId, configs);
    if (!r || !r.isKitchen) continue;
    if (!byConfig.has(r.configId)) byConfig.set(r.configId, []);
    byConfig.get(r.configId)!.push(it);
  }

  const results: PrepResult[] = [];
  for (const [configId, list] of byConfig) {
    const sessionId = await openSession(configId);
    if (!sessionId) continue;

    const lines: unknown[] = [];
    for (const it of list) {
      const variant = await variantOf(it.templateId);
      if (!variant) continue;
      const sub = it.price * it.qty;
      lines.push([
        0,
        0,
        {
          product_id: variant,
          qty: it.qty,
          price_unit: it.price,
          price_subtotal: sub,
          price_subtotal_incl: sub,
          full_product_name: it.name,
        },
      ]);
    }
    if (!lines.length) continue;

    const total = list.reduce((s, l) => s + l.price * l.qty, 0);
    try {
      const vals: Record<string, unknown> = {
        session_id: sessionId,
        company_id: companyId,
        amount_tax: 0,
        amount_total: total,
        amount_paid: 0,
        amount_return: 0,
        lines,
      };
      if (note) vals.general_note = note;
      const posOrderId = await executeKw<number>("pos.order", "create", [vals]);
      let prepOk = false;
      try {
        await executeKw("pos_preparation_display.order", "process_order", [posOrderId]);
        prepOk = true;
      } catch {
        /* prep push failed — pos.order עדיין נוצר */
      }
      results.push({ configId, posOrderId, prepOk });
    } catch {
      /* skip this config */
    }
  }
  return results;
}
