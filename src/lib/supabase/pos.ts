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
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  method: string | null;
  scheduled_for: string | null;
  notes: string | null;
  total: number;
  items: PosOrderItem[];
  pos_status: string;
  kitchen_status: string;
  courier_status?: string | null;
  created_at: string;
}

export async function getPosOrders(): Promise<PosOrder[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data } = await supabaseAdmin()
      .from("pos_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    return (data as PosOrder[]) ?? [];
  } catch {
    return [];
  }
}

export async function getPosOrder(id: string): Promise<PosOrder | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data } = await supabaseAdmin().from("pos_orders").select("*").eq("id", id).maybeSingle();
    return (data as PosOrder) ?? null;
  } catch {
    return null;
  }
}

export const isGrocery = (storeId: string) => storeId === "grocery";
export const isKitchen = (storeId: string) => !!storeId && storeId !== "grocery";
export const itemStatus = (it: PosOrderItem) => it.status ?? "pending";
