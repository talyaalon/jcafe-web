import { NextResponse } from "next/server";
import { findOrCreatePartner, createOrder, type OrderItem } from "@/lib/odoo/orders";

interface OrderBody {
  customer: {
    name: string;
    email?: string;
    phone?: string;
    street?: string;
    city?: string;
    zip?: string;
  };
  items: { id: string; qty: number; price: number; name: string; storeName: string }[];
  method?: "delivery" | "pickup";
  notes?: string;
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

    const partnerId = await findOrCreatePartner(body.customer);

    const items: OrderItem[] = body.items.map((i) => ({
      templateId: Number(String(i.id).split("|")[0]),
      qty: i.qty,
      unitPrice: i.price,
      name: i.name,
      storeName: i.storeName,
    }));

    const order = await createOrder({ partnerId, items, notes: body.notes });

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
