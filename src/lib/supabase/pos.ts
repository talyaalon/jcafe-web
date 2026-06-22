import "server-only";
import { supabaseAdmin, supabaseConfigured } from "./server";

export interface PosOrderItem {
  name: string;
  qty: number;
  price?: number;
  storeId: string;
  storeName: string;
  templateId?: number;
  barcode?: string | null;
  /** כמה יחידות נסרקו (במכולת) — done כש-scanned >= qty */
  scanned?: number;
  status?: "pending" | "preparing" | "done" | "unavailable";
}

export interface PosOrder {
  id: string;
  order_name: string | null;
  company?: number | null;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  method: string | null;
  scheduled_for: string | null;
  notes: string | null;
  total: number;
  delivery_fee?: number | null;
  address?: string | null;
  items: PosOrderItem[];
  pos_status: string;
  kitchen_status: string;
  courier_status?: string | null;
  /** false = הזמנה עתידית מוחזקת (טרם נשלחה למטבח). true = פעילה. */
  released?: boolean;
  /** מתי לשחרר למטבח (מועד ההזמנה פחות שעה) — רק להזמנות מוחזקות. */
  release_at?: string | null;
  created_at: string;
}

export async function getPosOrders(company?: number): Promise<PosOrder[]> {
  if (!supabaseConfigured) return [];
  try {
    let q = supabaseAdmin()
      .from("pos_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    if (company) q = q.eq("company", company);
    const { data } = await q;
    return (data as PosOrder[]) ?? [];
  } catch (e) {
    console.error("[getPosOrders]", e);
    return [];
  }
}

export async function getPosOrder(id: string): Promise<PosOrder | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data } = await supabaseAdmin().from("pos_orders").select("*").eq("id", id).maybeSingle();
    return (data as PosOrder) ?? null;
  } catch (e) {
    console.error("[getPosOrder]", e);
    return null;
  }
}

// ===== נמעני התראות (פר-סניף) =====
export interface NotificationRecipient {
  id: number;
  channel: "email" | "whatsapp";
  value: string;
}

export async function getNotificationRecipients(branch: number): Promise<NotificationRecipient[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data } = await supabaseAdmin()
      .from("notification_recipients")
      .select("id,channel,value")
      .eq("branch", branch)
      .order("created_at", { ascending: true });
    return (data as NotificationRecipient[]) ?? [];
  } catch (e) {
    console.error("[getNotificationRecipients]", e);
    return [];
  }
}

export const isGrocery = (storeId: string) => storeId === "grocery";
export const isKitchen = (storeId: string) => !!storeId && storeId !== "grocery";
export const itemStatus = (it: PosOrderItem) => it.status ?? "pending";
