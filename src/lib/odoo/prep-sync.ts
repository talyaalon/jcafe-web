import "server-only";
import { searchRead } from "./client";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";
import { isKitchen } from "@/lib/supabase/pos";

// ===== סנכרון סטטוס מ-Preparation Display של ODOO → סטטוס פריטי המטבח אצלנו =====
// שלב "Ready/Completed" בכל המסכים → "מוכן" (done); אחרת → "בהכנה" (preparing).

type PosItem = { storeId?: string; status?: string; [k: string]: unknown };

export async function syncActiveKitchenStatuses(): Promise<void> {
  if (!supabaseConfigured) return;
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("pos_orders")
      .select("id,items,prep_pos_order_ids")
      .neq("pos_status", "done")
      .limit(60);

    const orders = ((data ?? []) as { id: string; items: PosItem[]; prep_pos_order_ids: number[] }[]).filter(
      (o) => Array.isArray(o.prep_pos_order_ids) && o.prep_pos_order_ids.length > 0,
    );
    if (!orders.length) return;

    // שתי שאילתות ODOO בלבד (batch)
    const allPosIds = [...new Set(orders.flatMap((o) => o.prep_pos_order_ids))];
    const prepOrders = await searchRead<{ id: number; pos_order_id: [number, string] | false }>(
      "pos_preparation_display.order",
      [["pos_order_id", "in", allPosIds]],
      ["id", "pos_order_id"],
    );
    if (!prepOrders.length) return;

    const prepByPos = new Map<number, number[]>();
    for (const po of prepOrders) {
      const k = po.pos_order_id ? po.pos_order_id[0] : 0;
      (prepByPos.get(k) ?? prepByPos.set(k, []).get(k)!).push(po.id);
    }

    const stages = await searchRead<{ order_id: [number, string] | false; stage_id: [number, string] | false }>(
      "pos_preparation_display.order.stage",
      [["order_id", "in", prepOrders.map((p) => p.id)]],
      ["order_id", "stage_id"],
    );
    const stageByPrep = new Map<number, string[]>();
    for (const s of stages) {
      const k = s.order_id ? s.order_id[0] : 0;
      (stageByPrep.get(k) ?? stageByPrep.set(k, []).get(k)!).push(s.stage_id ? s.stage_id[1] : "");
    }

    for (const o of orders) {
      const prepIds = o.prep_pos_order_ids.flatMap((pid) => prepByPos.get(pid) ?? []);
      if (!prepIds.length) continue;
      const stageNames = prepIds.flatMap((pi) => stageByPrep.get(pi) ?? []);
      const ready = stageNames.length > 0 && stageNames.every((n) => /ready|completed/i.test(n));
      const target = ready ? "done" : "preparing";

      const items = o.items.map((it) =>
        isKitchen(it.storeId ?? "") ? { ...it, status: target } : it,
      );
      // עדכון רק אם משהו השתנה
      const changed = o.items.some(
        (it, i) => isKitchen(it.storeId ?? "") && it.status !== (items[i] as PosItem).status,
      );
      if (changed) await sb.from("pos_orders").update({ items }).eq("id", o.id);
    }
  } catch {
    /* ignore — לא לשבור את מסך המלקט */
  }
}
