import "server-only";
import { supabaseAdmin, supabaseConfigured } from "./server";

export interface PosOrderItem {
  name: string;
  qty: number;
  storeId: string;
  storeName: string;
}

export interface PosOrder {
  id: string;
  order_name: string | null;
  customer_name: string | null;
  phone: string | null;
  method: string | null;
  scheduled_for: string | null;
  items: PosOrderItem[];
  pos_status: string;
  kitchen_status: string;
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

export const isGrocery = (storeId: string) => storeId === "grocery";
export const isKitchen = (storeId: string) => !!storeId && storeId !== "grocery";
