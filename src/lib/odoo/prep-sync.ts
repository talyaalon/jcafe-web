import "server-only";
import { searchRead } from "./client";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";
import { isKitchen } from "@/lib/supabase/pos";

// ===== סנכרון פר-מוצר מ-Preparation Display של ODOO =====
// מוצר "מוכן" אם: שורת ההכנה שלו סומנה (todo=false), *או* כל המסכים הרלוונטיים
// שלו (לפי קטגוריית המוצר) הגיעו לשלב Ready/Completed. אחרת — "בהכנה".
// מתעלם ממסכים שאינם מציגים את המוצר (חופפים/catch-all שלא סומנו).

type PosItem = { storeId?: string; status?: string; templateId?: number; [k: string]: unknown };
type OrderRow = { id: string; items: PosItem[]; prep_pos_order_ids: number[] };
const isReadyName = (n: string) => /ready|completed/i.test(n);

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
    const prepOrders = await searchRead<{ id: number; pos_order_id: [number, string] | false }>(
      "pos_preparation_display.order",
      [["pos_order_id", "in", allPosIds]],
      ["id", "pos_order_id"],
    );
    if (!prepOrders.length) return;
    const prepToPos = new Map<number, number>();
    for (const p of prepOrders) if (p.pos_order_id) prepToPos.set(p.id, p.pos_order_id[0]);
    const prepIds = prepOrders.map((p) => p.id);

    // שלבי הזמנה לכל (prep, מסך)
    const orderStages = await searchRead<{
      order_id: [number, string] | false;
      stage_id: [number, string] | false;
      preparation_display_id: [number, string] | false;
    }>("pos_preparation_display.order.stage", [["order_id", "in", prepIds]], [
      "order_id",
      "stage_id",
      "preparation_display_id",
    ]);
    const stagesByPrep = new Map<number, { displayId: number; ready: boolean }[]>();
    for (const s of orderStages) {
      const k = s.order_id ? s.order_id[0] : 0;
      const arr = stagesByPrep.get(k) ?? stagesByPrep.set(k, []).get(k)!;
      arr.push({
        displayId: s.preparation_display_id ? s.preparation_display_id[0] : 0,
        ready: isReadyName(s.stage_id ? s.stage_id[1] : ""),
      });
    }

    // קטגוריות לכל מסך
    const displays = await searchRead<{ id: number; category_ids: number[] }>(
      "pos_preparation_display.display",
      [],
      ["id", "category_ids"],
    );
    const displayCategs = new Map<number, Set<number>>();
    for (const d of displays) displayCategs.set(d.id, new Set(d.category_ids ?? []));

    // שורות הכנה
    const olines = await searchRead<{
      preparation_display_order_id: [number, string] | false;
      product_id: [number, string] | false;
      todo: boolean;
      product_cancelled: boolean;
    }>("pos_preparation_display.orderline", [["preparation_display_order_id", "in", prepIds]], [
      "preparation_display_order_id",
      "product_id",
      "todo",
      "product_cancelled",
    ]);
    if (!olines.length) return;

    // וריאנט→תבנית + קטגוריות תבנית
    const variantIds = [...new Set(olines.map((l) => (l.product_id ? l.product_id[0] : 0)).filter(Boolean))];
    const variants = await searchRead<{ id: number; product_tmpl_id: [number, string] | false }>(
      "product.product",
      [["id", "in", variantIds]],
      ["product_tmpl_id"],
    );
    const varToTmpl = new Map<number, number>();
    for (const v of variants) if (v.product_tmpl_id) varToTmpl.set(v.id, v.product_tmpl_id[0]);
    const tmplIds = [...new Set([...varToTmpl.values()])];
    const tmpls = await searchRead<{ id: number; pos_categ_ids: number[] }>(
      "product.template",
      [["id", "in", tmplIds]],
      ["pos_categ_ids"],
    );
    const tmplCategs = new Map<number, number[]>();
    for (const t of tmpls) tmplCategs.set(t.id, t.pos_categ_ids ?? []);

    // pos_order_id → (templateId → {allDone, cancelledAny})
    const byPos = new Map<number, Map<number, { allDone: boolean; cancelledAny: boolean }>>();
    for (const l of olines) {
      const prepId = l.preparation_display_order_id ? l.preparation_display_order_id[0] : 0;
      const posId = prepToPos.get(prepId);
      const tmpl = varToTmpl.get(l.product_id ? l.product_id[0] : 0);
      if (!posId || !tmpl) continue;

      // המסכים הרלוונטיים למוצר (לפי קטגוריה) מתוך שלבי ההזמנה
      const categs = tmplCategs.get(tmpl) ?? [];
      const relevant = (stagesByPrep.get(prepId) ?? []).filter((s) => {
        const dc = displayCategs.get(s.displayId);
        return dc && categs.some((c) => dc.has(c));
      });
      const stageDone = relevant.length > 0 && relevant.every((s) => s.ready);
      const lineDone = l.todo === false || stageDone;

      if (!byPos.has(posId)) byPos.set(posId, new Map());
      const m = byPos.get(posId)!;
      const cur = m.get(tmpl) ?? { allDone: true, cancelledAny: false };
      if (!lineDone) cur.allDone = false;
      if (l.product_cancelled) cur.cancelledAny = true;
      m.set(tmpl, cur);
    }

    for (const o of orders) {
      const tmplStatus = new Map<number, { allDone: boolean; cancelledAny: boolean }>();
      for (const posId of o.prep_pos_order_ids) {
        const m = byPos.get(posId);
        if (!m) continue;
        for (const [tmpl, s] of m) {
          const cur = tmplStatus.get(tmpl) ?? { allDone: true, cancelledAny: false };
          if (!s.allDone) cur.allDone = false;
          if (s.cancelledAny) cur.cancelledAny = true;
          tmplStatus.set(tmpl, cur);
        }
      }
      if (!tmplStatus.size) continue;

      const items = o.items.map((it) => {
        if (!isKitchen(it.storeId ?? "")) return it;
        const s = it.templateId != null ? tmplStatus.get(Number(it.templateId)) : undefined;
        if (!s) return it;
        const status = s.cancelledAny ? "unavailable" : s.allDone ? "done" : "preparing";
        return { ...it, status };
      });

      const changed = o.items.some(
        (it, i) => isKitchen(it.storeId ?? "") && it.status !== (items[i] as PosItem).status,
      );
      if (changed) await sb.from("pos_orders").update({ items }).eq("id", o.id);
    }
  } catch {
    /* ignore */
  }
}
