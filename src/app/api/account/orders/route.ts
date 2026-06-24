import { NextResponse } from "next/server";
import { supabasePublic, supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";
import type { PosOrder } from "@/lib/supabase/pos";

// GET /api/account/orders — הזמנות המשתמש המחובר, מועשרות מ-pos_orders (פריטים + סניף).
// אימות: Authorization: Bearer <access_token> (מ-supabaseBrowser.auth.getSession()).
// מסונן לפי הסניף הנוכחי (?company=) — האזור האישי מופרד לכל סניף.
// ?name=<order_name> → הזמנה בודדת (עם בדיקת בעלות מול טבלת orders של המשתמש).
export async function GET(req: Request) {
  if (!supabaseConfigured) return NextResponse.json({ orders: [] });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const {
    data: { user },
  } = await supabasePublic.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const company = Number(url.searchParams.get("company")) || 0;
  const name = url.searchParams.get("name");

  const admin = supabaseAdmin();

  // ההזמנות של המשתמש (קישור user→הזמנה דרך odoo_name). מסונן במפורש ל-user.id.
  const { data: mine } = await admin
    .from("orders")
    .select("odoo_name,created_at")
    .eq("user_id", user.id);
  const myNames = (mine ?? [])
    .map((o) => (o as { odoo_name: string | null }).odoo_name)
    .filter((n): n is string => !!n);

  if (myNames.length === 0) return NextResponse.json({ orders: [] });
  // הזמנה בודדת — חייבת להיות של המשתמש
  if (name && !myNames.includes(name)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let q = admin
    .from("pos_orders")
    .select("*")
    .in("order_name", name ? [name] : myNames)
    .order("created_at", { ascending: false });
  if (company) q = q.eq("company", company);

  const { data } = await q;
  const orders = ((data as PosOrder[]) ?? []).map((o) => ({
    order_name: o.order_name,
    created_at: o.created_at,
    company: o.company ?? null,
    method: o.method,
    total: o.total,
    delivery_fee: o.delivery_fee ?? null,
    address: o.address ?? null,
    customer_name: o.customer_name,
    phone: o.phone,
    email: o.email,
    status: o.pos_status,
    scheduled_for: o.scheduled_for ?? null,
    notes: o.notes ?? null,
    items: o.items ?? [],
  }));

  return NextResponse.json({ orders });
}
