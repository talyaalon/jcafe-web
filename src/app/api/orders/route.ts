import { NextResponse } from "next/server";
import { findOrCreatePartner, createOrder, type OrderItem } from "@/lib/odoo/orders";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";

interface OrderBody {
  customer: {
    name: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    zip?: string;
  };
  items: { id: string; qty: number; price: number; name: string; storeName: string; storeId?: string }[];
  method?: "delivery" | "pickup";
  notes?: string;
  scheduledFor?: string;
  branch?: string;
}

// POST /api/orders — יוצר לקוח + Sales Order ב-ODOO.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OrderBody;
    if (!body.items?.length) {
      return NextResponse.json({ ok: false, error: "Cart is empty" }, { status: 400 });
    }
    if (!body.customer?.name || !body.customer?.phone || !body.customer?.email) {
      return NextResponse.json({ ok: false, error: "Missing customer details" }, { status: 400 });
    }

    const partnerId = await findOrCreatePartner(body.customer, body.branch || "Phuket");

    const items: OrderItem[] = body.items.map((i) => ({
      templateId: Number(String(i.id).split("|")[0]),
      qty: i.qty,
      unitPrice: i.price,
      name: i.name,
      storeName: i.storeName,
    }));

    const order = await createOrder({ partnerId, items, notes: body.notes });

    // שמירה למסכי הצוות (מלקט/מטבח) — best-effort, לא חוסם
    if (supabaseConfigured) {
      try {
        await supabaseAdmin()
          .from("pos_orders")
          .insert({
            order_name: order.name,
            customer_name: body.customer.name,
            phone: body.customer.phone,
            email: body.customer.email || null,
            method: body.method,
            scheduled_for: body.scheduledFor || null,
            notes: body.notes || null,
            total: body.items.reduce((s, i) => s + i.price * i.qty, 0),
            items: body.items.map((i) => ({
              name: i.name,
              qty: i.qty,
              storeId: i.storeId || "",
              storeName: i.storeName,
            })),
          });
      } catch {
        /* ignore — לא לשבור את ההזמנה */
      }
    }

    return NextResponse.json({
      ok: true,
      orderNo: order.name,
      soId: order.id,
      confirmed: order.confirmed,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
