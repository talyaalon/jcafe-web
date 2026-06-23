import { NextResponse } from "next/server";
import Stripe from "stripe";
import { findOrCreatePartner, createOrder, type OrderItem } from "@/lib/odoo/orders";
import { getBranches, BRANCH_TAG } from "@/lib/odoo/branches";
import { resolveOrderCompany, OrderCompanyError } from "@/lib/odoo/resolve-order-company";
import { priceOrderItems } from "@/lib/odoo/pricelist";
import { buildDiscountMap, discountForItem, discountedUnit } from "@/lib/odoo/banner-discount";
import { serverDeliveryFee } from "@/lib/delivery-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
import { pushKitchenToPrep } from "@/lib/odoo/pos-prep";
import { PHUKET_COMPANY_ID, PHUKET_PRICELIST_ID } from "@/lib/odoo/phuket";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";
import { getBranchBranding, getActiveBanners } from "@/lib/supabase/data";
import { notifyStaffNewOrder } from "@/lib/notify-staff";
import { releaseAtFor } from "@/lib/odoo/release-scheduled";

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
    discount?: number;
    branch?: number;
  }[];
  method?: "delivery" | "pickup";
  payment?: "card" | "cod" | "qr";
  paymentIntentId?: string;
  idempotencyKey?: string;
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

    // קביעת חברה — נגזרת אך ורק מה-branch של פריטי העגלה (השרת אוטוריטטיבי).
    // אכיפה לפני כל כתיבה ל-ODOO/Supabase: עגלה ריקה/מעורבת/סניף לא-חוקי/
    // אי-התאמה ל-companyId מהלקוח → 400, בלי שום רשומה חלקית.
    const branches = await getBranches();
    let companyId: number;
    try {
      companyId = resolveOrderCompany(
        body.items,
        body.companyId,
        branches.map((b) => b.companyId),
      );
    } catch (e) {
      if (e instanceof OrderCompanyError) {
        console.warn(`[orders] SECURITY: order rejected (${e.code}): ${e.message}`);
        return NextResponse.json({ ok: false, error: e.code }, { status: 400 });
      }
      throw e;
    }
    const branch = branches.find((b) => b.companyId === companyId);
    const branchConfigs = branch?.configs ?? [];
    let branchName = BRANCH_TAG[companyId] ?? "Phuket";
    let pricelistId = PHUKET_PRICELIST_ID;
    if (companyId !== PHUKET_COMPANY_ID && branch) {
      if (!BRANCH_TAG[companyId]) branchName = branch.name;
      pricelistId = branch.configs.find((c) => c.pricelistId)?.pricelistId ?? PHUKET_PRICELIST_ID;
    }

    // מחיר מהימן מצד-שרת (מ-ODOO + Pricelist הסניף) — מונע תרמית מחירים מהלקוח.
    const { priced, tampered } = await priceOrderItems(pricelistId, body.items);
    if (tampered) {
      console.warn(
        `[orders] price mismatch for company ${companyId} — using server prices`,
        priced.filter((p) => Math.abs(p.clientPrice - p.unitPrice) > 0.01),
      );
    }
    // הנחות באנר פעילות לסניף — מקור-אמת בצד-שרת (לא סומכים על אחוז ההנחה מהלקוח)
    const activeBanners = await getActiveBanners(companyId).catch(() => []);
    const discountMap = buildDiscountMap(activeBanners);
    const discountAt = (idx: number) => discountForItem(String(body.items[idx].id), discountMap);
    // מחיר בסיס מהשרת (ל-ODOO price_unit) ומחיר אפקטיבי אחרי הנחה (לסכומים ולקבלה)
    const baseUnitAt = (idx: number) => priced[idx]?.unitPrice ?? body.items[idx].price;
    const unitPriceAt = (idx: number) => discountedUnit(baseUnitAt(idx), discountAt(idx));
    const productsTotal = body.items.reduce(
      (s, _i, idx) => s + unitPriceAt(idx) * (priced[idx]?.qty ?? body.items[idx].qty),
      0,
    );
    const fullAddr = [body.customer.street, body.customer.city, body.customer.zip]
      .filter(Boolean)
      .join(", ");
    const { fee: deliveryFee } = await serverDeliveryFee(
      companyId,
      body.method,
      { city: body.customer.city, address: fullAddr },
      productsTotal,
    );
    const grandTotal = productsTotal + deliveryFee;

    // אימות תשלום בכרטיס מול Stripe (לפני יצירת לקוח/הזמנה) — מונע "לקוח שמשקר ששילם".
    if (body.payment === "card") {
      const piId = body.paymentIntentId;
      if (!piId) {
        return NextResponse.json({ ok: false, error: "Missing payment" }, { status: 402 });
      }
      try {
        const pi = await stripe.paymentIntents.retrieve(piId);
        const paidBaht = (pi.amount_received || 0) / 100;
        if (pi.status !== "succeeded" || paidBaht + 0.01 < productsTotal) {
          return NextResponse.json({ ok: false, error: "Payment not verified" }, { status: 402 });
        }
      } catch {
        return NextResponse.json({ ok: false, error: "Payment not verified" }, { status: 402 });
      }
    }

    // Idempotency — מונע יצירת הזמנה כפולה ב-retry (תוקף את המפתח לפני היצירה).
    const idem = body.idempotencyKey;
    if (idem && supabaseConfigured) {
      const sb = supabaseAdmin();
      const { error: claimErr } = await sb.from("order_idempotency").insert({ key: idem });
      if (claimErr) {
        const { data } = await sb
          .from("order_idempotency")
          .select("order_no,so_id")
          .eq("key", idem)
          .maybeSingle();
        if (data?.order_no) {
          return NextResponse.json({
            ok: true,
            orderNo: data.order_no,
            soId: data.so_id,
            confirmed: true,
            duplicate: true,
          });
        }
        return NextResponse.json(
          { ok: false, error: "Order already being processed" },
          { status: 409 },
        );
      }
    }

    const partnerId = await findOrCreatePartner(body.customer, branchName);

    const items: OrderItem[] = body.items.map((i, idx) => ({
      templateId: Number(String(i.id).split("|")[0]),
      qty: i.qty,
      // ODOO: מחיר בסיס מלא + שדה discount באחוזים (הדרך הנייטיבית של ODOO)
      unitPrice: baseUnitAt(idx),
      discount: discountAt(idx),
      name: i.name,
      storeName: i.storeName,
    }));

    const order = await createOrder({ partnerId, items, notes: body.notes, companyId, pricelistId });

    // שמירת תוצאת ההזמנה למפתח ה-idempotency (retry יחזיר אותה במקום ליצור שוב)
    if (idem && supabaseConfigured) {
      try {
        await supabaseAdmin()
          .from("order_idempotency")
          .update({ order_no: order.name, so_id: order.id })
          .eq("key", idem);
      } catch {
        /* ignore */
      }
    }

    // הזמנה עתידית: מחזיקים אותה עד שעה לפני המועד — לא נשלחת למטבח כעת,
    // ומופיעה רק בלשונית "עתידיות" אצל המלקט. שחרור בפועל ב-releaseDueOrders.
    const releaseAt = releaseAtFor(body.scheduledFor);
    const hold = !!releaseAt && releaseAt.getTime() > Date.now();

    // דחיפת פריטי המטבח ל-Preparation Display של ODOO — best-effort, לא חוסם.
    // מדלגים אם ההזמנה מוחזקת (תידחף בעת השחרור).
    let prepPosOrderIds: number[] = [];
    if (!hold) {
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
    }

    // שמירה למסכי הצוות (מלקט/מטבח) — best-effort, לא חוסם
    if (supabaseConfigured) {
      try {
        await supabaseAdmin()
          .from("pos_orders")
          .insert({
            order_name: order.name,
            company: companyId,
            customer_name: body.customer.name,
            phone: body.customer.phone,
            email: body.customer.email || null,
            method: body.method,
            scheduled_for: body.scheduledFor || null,
            notes: body.notes || null,
            total: grandTotal,
            delivery_fee: deliveryFee,
            address: body.method === "delivery" ? fullAddr || null : null,
            released: !hold,
            release_at: hold ? releaseAt!.toISOString() : null,
            prep_pos_order_ids: prepPosOrderIds,
            items: body.items.map((i, idx) => ({
              name: i.name,
              qty: i.qty,
              price: unitPriceAt(idx),
              discount: discountAt(idx),
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

    // התראת מייל/וואטסאפ לצוות הסניף שממנו נוצרה ההזמנה — best-effort, לא חוסם
    try {
      const branding = await getBranchBranding(companyId).catch(() => null);
      await notifyStaffNewOrder(companyId, {
        orderNo: order.name,
        branchName,
        logoUrl: branding?.logo_url ?? null,
        customer: body.customer.name,
        phone: body.customer.phone,
        email: body.customer.email,
        address: body.method === "delivery" ? fullAddr || null : null,
        method: body.method,
        scheduledFor: body.scheduledFor || null,
        notes: body.notes || null,
        total: grandTotal,
        delivery: deliveryFee,
        items: body.items.map((i, idx) => ({
          name: i.name,
          qty: i.qty,
          price: unitPriceAt(idx),
          storeName: i.storeName,
        })),
      });
    } catch {
      /* ignore — לא לשבור את ההזמנה */
    }

    return NextResponse.json({
      ok: true,
      orderNo: order.name,
      soId: order.id,
      confirmed: order.confirmed,
    });
  } catch (e) {
    console.error("[orders]", e);
    return NextResponse.json(
      { ok: false, error: "Order failed, please try again" },
      { status: 500 },
    );
  }
}
