import "server-only";
import { searchRead } from "./client";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";
import { isKitchen } from "@/lib/supabase/pos";

// ===== סנכרון פר-מוצר מ-Preparation Display של ODOO → סטטוס פריטי המטבח =====
// כל שורת הכנה (orderline) נושאת דגל `todo`: true = בהכנה, false = מוכן.
// כך כל מוצר מתעדכן בנפרד בזמן אמת (המטבח מסמן מוצר → רק הוא משתנה).

type PosItem = { storeId?: string; status?: string; templateId?: number; [k: string]: unknown };
type OrderRow = { id: string; items: PosItem[]; prep_pos_order_ids: number[] };

export async function syncActiveKitchenStatuses(): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("pos_orders")
      .select("id,items,prep_pos_order_ids")
      .neq("pos_status", "done")
      .limit(60);

    const orders = ((data ?? []) as OrderRow[]).filter(
      (o) => Array.isArray(o.prep_pos_order_ids) && o.prep_pos_order_ids.length > 0,
    );
    if (!orders.length) return;

    const allPosIds = [...new Set(orders.flatMap((o) => o.prep_pos_order_ids))];

    // prep orders → pos_order_id
    const prepOrders = await searchRead<{ id: number; pos_order_id: [number, string] | false }>(
      "pos_preparation_display.order",
      [["pos_order_id", "in", allPosIds]],
      ["id", "pos_order_id"],
    );
    if (!prepOrders.length) return;
    const prepToPos = new Map<number, number>();
    for (const p of prepOrders) if (p.pos_order_id) prepToPos.set(p.id, p.pos_order_id[0]);

    // שורות הכנה (פר מוצר) עם דגל todo
    const olines = await searchRead<{
      preparation_display_order_id: [number, string] | false;
      product_id: [number, string] | false;
      todo: boolean;
      product_cancelled: boolean;
    }>(
      "pos_preparation_display.orderline",
      [["preparation_display_order_id", "in", prepOrders.map((p) => p.id)]],
      ["preparation_display_order_id", "product_id", "todo", "product_cancelled"],
    );
    if (!olines.length) return;

    // וריאנט → תבנית
    const variantIds = [...new Set(olines.map((l) => (l.product_id ? l.product_id[0] : 0)).filter(Boolean))];
    const variants = await searchRead<{ id: number; product_tmpl_id: [number, string] | false }>(
      "product.product",
      [["id", "in", variantIds]],
      ["product_tmpl_id"],
    );
    const varToTmpl = new Map<number, number>();
    for (const v of variants) if (v.product_tmpl_id) varToTmpl.set(v.id, v.product_tmpl_id[0]);

    // pos_order_id → (templateId → {todoAny, cancelledAny})
    const byPos = new Map<number, Map<number, { todoAny: boolean; cancelledAny: boolean }>>();
    for (const l of olines) {
      const prepId = l.preparation_display_order_id ? l.preparation_display_order_id[0] : 0;
      const posId = prepToPos.get(prepId);
      const variant = l.product_id ? l.product_id[0] : 0;
      const tmpl = varToTmpl.get(variant);
      if (!posId || !tmpl) continue;
      if (!byPos.has(posId)) byPos.set(posId, new Map());
      const m = byPos.get(posId)!;
      const cur = m.get(tmpl) ?? { todoAny: false, cancelledAny: false };
      if (l.todo) cur.todoAny = true;
      if (l.product_cancelled) cur.cancelledAny = true;
      m.set(tmpl, cur);
    }

    for (const o of orders) {
      // איחוד סטטוס פר-תבנית על פני כל ה-pos.orders של ההזמנה
      const tmplStatus = new Map<number, { todoAny: boolean; cancelledAny: boolean }>();
      for (const posId of o.prep_pos_order_ids) {
        const m = byPos.get(posId);
        if (!m) continue;
        for (const [tmpl, s] of m) {
          const cur = tmplStatus.get(tmpl) ?? { todoAny: false, cancelledAny: false };
          if (s.todoAny) cur.todoAny = true;
          if (s.cancelledAny) cur.cancelledAny = true;
          tmplStatus.set(tmpl, cur);
        }
      }
      if (!tmplStatus.size) continue;

      const items = o.items.map((it) => {
        if (!isKitchen(it.storeId ?? "")) return it;
        const s = it.templateId != null ? tmplStatus.get(Number(it.templateId)) : undefined;
        if (!s) return it; // אין שורת הכנה תואמת (מוצר לא נותב)
        const status = s.cancelledAny ? "unavailable" : s.todoAny ? "preparing" : "done";
        return { ...it, status };
      });

      const changed = o.items.some(
        (it, i) => isKitchen(it.storeId ?? "") && it.status !== (items[i] as PosItem).status,
      );
      if (changed) await sb.from("pos_orders").update({ items }).eq("id", o.id);
    }
  } catch {
    /* ignore — לא לשבור את מסך המלקט */
  }
}
