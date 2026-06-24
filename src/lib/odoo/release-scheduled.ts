import "server-only";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";
import type { PosOrder } from "@/lib/supabase/pos";
import { getBranches } from "./branches";
import { pushKitchenToPrep, kitchenNote } from "./pos-prep";
import { PHUKET_COMPANY_ID } from "./phuket";

// אזור הזמן של החנויות (תאילנד, UTC+7, ללא שעון קיץ)
const TZ_OFFSET_MIN = 7 * 60;
const HOUR_MS = 60 * 60 * 1000;

// scheduledFor מגיע כ-"YYYY-MM-DDTHH:mm" בשעון מקומי (תאילנד).
// מחזיר את רגע השחרור (מועד ההזמנה פחות שעה) כ-Date אמיתי ב-UTC, או null אם אין/לא תקין.
export function releaseAtFor(scheduledFor: string | null | undefined): Date | null {
  if (!scheduledFor || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(scheduledFor)) return null;
  const sign = TZ_OFFSET_MIN >= 0 ? "+" : "-";
  const abs = Math.abs(TZ_OFFSET_MIN);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  const t = new Date(`${scheduledFor.slice(0, 16)}:00${sign}${hh}:${mm}`).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t - HOUR_MS);
}

// משחרר למטבח את כל ההזמנות העתידיות שהגיע מועד השחרור שלהן (release_at <= עכשיו).
// בטוח לקריאה במקביל (claim אטומי מונע דחיפה כפולה). מחזיר כמה שוחררו.
export async function releaseDueOrders(company?: number): Promise<number> {
  if (!supabaseConfigured) return 0;
  try {
    let q = supabaseAdmin()
      .from("pos_orders")
      .select("*")
      .eq("released", false)
      .lte("release_at", new Date().toISOString());
    if (company) q = q.eq("company", company);
    const { data } = await q;
    const due = (data as PosOrder[]) ?? [];
    if (!due.length) return 0;

    const branches = await getBranches();
    let released = 0;

    for (const o of due) {
      // claim אטומי — אם 0 שורות עודכנו, תהליך אחר כבר תפס אותה
      const { data: claimed } = await supabaseAdmin()
        .from("pos_orders")
        .update({ released: true })
        .eq("id", o.id)
        .eq("released", false)
        .select("id");
      if (!claimed?.length) continue;

      try {
        const companyId = o.company ?? PHUKET_COMPANY_ID;
        const configs = branches.find((b) => b.companyId === companyId)?.configs ?? [];
        const prep = await pushKitchenToPrep({
          items: o.items.map((i) => ({
            templateId: i.templateId ?? 0,
            qty: i.qty,
            price: i.price ?? 0,
            name: i.name,
            storeId: i.storeId || "",
          })),
          companyId,
          configs,
          note: kitchenNote(o.order_name, o.scheduled_for),
        });
        await supabaseAdmin()
          .from("pos_orders")
          .update({ prep_pos_order_ids: prep.map((r) => r.posOrderId) })
          .eq("id", o.id);
        released++;
      } catch (e) {
        console.error("[releaseDueOrders] push failed, rolling back claim", o.id, e);
        // החזרת ה-claim כדי שתנסה שוב במחזור הבא
        await supabaseAdmin().from("pos_orders").update({ released: false }).eq("id", o.id);
      }
    }
    return released;
  } catch (e) {
    console.error("[releaseDueOrders]", e);
    return 0;
  }
}
