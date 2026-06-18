import { NextResponse } from "next/server";
import { findOrCreatePartner, createOrder, type OrderItem } from "@/lib/odoo/orders";
import { getBranches, BRANCH_TAG } from "@/lib/odoo/branches";
import { pushKitchenToPrep } from "@/lib/odoo/pos-prep";
import { PHUKET_COMPANY_ID, PHUKET_PRICELIST_ID } from "@/lib/odoo/phuket";
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
  items: {
    id: string;
    qty: number;
    price: number;
    name: string;
    storeName: string;
    storeId?: string;
    barcode?: string;
  }[];
  method?: "delivery" | "pickup";
  notes?: string;
  scheduledFor?: string;
  branch?: string;
  companyId?: number;
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

    // קביעת חברה + מחירון + תג סניף לפי companyId
    const companyId = Number(body.companyId) || PHUKET_COMPANY_ID;
    const branch = (await getBranches()).find((b) => b.companyId === companyId);
    const branchConfigs = branch?.configs ?? [];
    let branchName = BRANCH_TAG[companyId] ?? "Phuket";
    let pricelistId = PHUKET_PRICELIST_ID;
    if (companyId !== PHUKET_COMPANY_ID && branch) {
      if (!BRANCH_TAG[companyId]) branchName = branch.name;
      pricelistId = branch.configs.find((c) => c.pricelistId)?.pricelistId ?? PHUKET_PRICELIST_ID;
    }

    const partnerId = await findOrCreatePartner(body.customer, branchName);

    const items: OrderItem[] = body.items.map((i) => ({
      templateId: Number(String(i.id).split("|")[0]),
      qty: i.qty,
      unitPrice: i.price,
      name: i.name,
      storeName: i.storeName,
    }));

    const order = await createOrder({ partnerId, items, notes: body.notes, companyId, pricelistId });

    // דחיפת פריטי המטבח ל-Preparation Display של ODOO — best-effort, לא חוסם
    let prepPosOrderIds: number[] = [];
    try {
      const prepResults = await pushKitchenToPrep({
        items: body.items.map((i) => ({
          templateId: Number(String(i.id).split("|")[0]),
          qty: i.qty,
          price: i.price,
          name: i.name,
          storeId: i.storeId || "",
        })),
        companyId,
        configs: branchConfigs,
        note: body.scheduledFor ? `Scheduled: ${body.scheduledFor}` : undefined,
      });
      prepPosOrderIds = prepResults.map((r) => r.posOrderId);
    } catch {
      /* ignore — לא לשבור את ההזמנה */
    }

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
            prep_pos_order_ids: prepPosOrderIds,
            items: body.items.map((i) => ({
              name: i.name,
              qty: i.qty,
              price: i.price,
              storeId: i.storeId || "",
              storeName: i.storeName,
              templateId: Number(String(i.id).split("|")[0]),
              barcode: i.barcode || null,
              scanned: 0,
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
