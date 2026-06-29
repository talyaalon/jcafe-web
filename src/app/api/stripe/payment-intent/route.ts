import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getBranches } from "@/lib/odoo/branches";
import { resolveOrderCompany, OrderCompanyError } from "@/lib/odoo/resolve-order-company";
import { priceOrderItems, type OrderItemIn } from "@/lib/odoo/pricelist";
import { getActiveBanners } from "@/lib/supabase/data";
import { buildDiscountMap, discountedTotal } from "@/lib/odoo/banner-discount";
import { checkStock } from "@/lib/odoo/stock-check-server";
import { serverDeliveryFee } from "@/lib/delivery-server";
import { PHUKET_COMPANY_ID, PHUKET_PRICELIST_ID } from "@/lib/odoo/phuket";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

interface Body {
  // branch פר-פריט נשלח מהקופה — לגזירת החברה האוטוריטטיבית בשרת
  items?: (OrderItemIn & { branch?: number })[];
  companyId?: number;
  method?: "delivery" | "pickup";
  city?: string;
  address?: string;
  idempotencyKey?: string;
  amount?: number; // תאימות לאחור בלבד
}

// POST /api/stripe/payment-intent — יוצר Payment Intent.
// הסכום מחושב בצד-שרת מתוך הפריטים + Pricelist הסניף (לא נסמך על הלקוח),
// בתוספת דמי משלוח. כך לא ניתן לשלם פחות ממחיר המוצרים האמיתי.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    let baht: number;
    let companyForMeta: number | undefined;
    if (Array.isArray(body.items) && body.items.length) {
      // אותה גזירה אוטוריטטיבית כמו ב-/api/orders: החברה נגזרת מה-branch של
      // הפריטים בלבד — כדי שהחברה שמחויבת ב-PaymentIntent זהה לזו של ההזמנה.
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
          console.warn(`[payment-intent] SECURITY: rejected (${e.code}): ${e.message}`);
          return NextResponse.json({ ok: false, error: e.code }, { status: 400 });
        }
        throw e;
      }
      companyForMeta = companyId;
      let pricelistId = PHUKET_PRICELIST_ID;
      if (companyId !== PHUKET_COMPANY_ID) {
        const branch = branches.find((b) => b.companyId === companyId);
        pricelistId = branch?.configs.find((c) => c.pricelistId)?.pricelistId ?? PHUKET_PRICELIST_ID;
      }
      // שלב A — שער מלאי לפני חיוב: מוצר שאזל מול ODOO חוסם לפני יצירת ה-PI (אין חיוב).
      const stockShort = await checkStock(companyId, body.items);
      if (stockShort.length) {
        return NextResponse.json(
          { ok: false, error: "OUT_OF_STOCK", shortages: stockShort },
          { status: 409 },
        );
      }
      const { priced } = await priceOrderItems(pricelistId, body.items);
      // הנחת באנר — מקור-אמת בצד-שרת, זהה ל-/api/orders, כדי שהחיוב יהיה במחיר המוזל
      // (אחרת הלקוח מחויב מלא בעוד ODOO רושם מוזל).
      const banners = await getActiveBanners(companyId).catch(() => []);
      const productsTotal = discountedTotal(
        priced,
        body.items.map((i) => String(i.id)),
        buildDiscountMap(banners),
      );
      const { fee, blocked } = await serverDeliveryFee(
        companyId,
        body.method,
        { city: body.city, address: body.address },
        productsTotal,
      );
      if (blocked) {
        return NextResponse.json({ ok: false, error: "Delivery not available" }, { status: 400 });
      }
      baht = productsTotal + fee;
    } else {
      // נתיב ישן (ללא פריטים) — לא מאובטח; נשמר רק לתאימות.
      baht = Number(body.amount) || 0;
    }

    const satang = Math.round(baht * 100);
    if (!satang || satang < 1) {
      return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
    }

    const intent = await stripe.paymentIntents.create(
      {
        amount: satang,
        currency: "thb",
        payment_method_types: ["card"],
        description: "J-Cafe order",
        // metadata לרשת-הביטחון של ה-webhook: אם הלקוח שילם אך ההזמנה לא נקלטה,
        // ה-webhook יזהה (לפי idem מול order_idempotency) ויתריע לצוות הסניף.
        metadata: {
          idem: body.idempotencyKey ?? "",
          company: companyForMeta != null ? String(companyForMeta) : "",
          method: body.method ?? "",
          baht: String(baht),
        },
      },
      // מפתח idempotency: retry עם אותו מפתח מחזיר את אותו PI (ללא חיוב כפול)
      body.idempotencyKey ? { idempotencyKey: `pi_${body.idempotencyKey}` } : undefined,
    );

    return NextResponse.json({ ok: true, clientSecret: intent.client_secret, amount: baht });
  } catch (e) {
    console.error("[payment-intent]", e);
    return NextResponse.json({ ok: false, error: "Payment init failed" }, { status: 500 });
  }
}
