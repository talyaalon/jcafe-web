import { supabaseBrowser } from "@/lib/supabase/client";
import type { AccountOrder } from "./order-types";

// שליפת הזמנות המשתמש המחובר מה-endpoint המאובטח (Bearer token מה-session).
// מסונן לסניף (company) או הזמנה בודדת (name). מחזיר [] אם אין session.
export async function fetchAccountOrders(params: {
  company?: number | null;
  name?: string;
}): Promise<AccountOrder[]> {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return [];
  const qs = new URLSearchParams();
  if (params.company) qs.set("company", String(params.company));
  if (params.name) qs.set("name", params.name);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/account/orders${suffix}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await res.json();
  return (j.orders as AccountOrder[]) ?? [];
}
