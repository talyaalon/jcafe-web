import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getBranches } from "@/lib/odoo/branches";
import { priceOrderItems, type OrderItemIn } from "@/lib/odoo/pricelist";
import { PHUKET_COMPANY_ID, PHUKET_PRICELIST_ID } from "@/lib/odoo/phuket";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

interface Body {
  items?: OrderItemIn[];
  companyId?: number;
  deliveryFee?: number;
  amount?: number; // תאימות לאחור בלבד
}

// POST /api/stripe/payment-intent — יוצר Payment Intent.
// הסכום מחושב בצד-שרת מתוך הפריטים + Pricelist הסניף (לא נסמך על הלקוח),
// בתוספת דמי משלוח. כך לא ניתן לשלם פחות ממחיר המוצרים האמיתי.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    let baht: number;
    if (Array.isArray(body.items) && body.items.length) {
      const companyId = Number(body.companyId) || PHUKET_COMPANY_ID;
      let pricelistId = PHUKET_PRICELIST_ID;
      if (companyId !== PHUKET_COMPANY_ID) {
        const branch = (await getBranches()).find((b) => b.companyId === companyId);
        pricelistId = branch?.configs.find((c) => c.pricelistId)?.pricelistId ?? PHUKET_PRICELIST_ID;
      }
      const { total } = await priceOrderItems(pricelistId, body.items);
      const delivery = Math.max(0, Number(body.deliveryFee) || 0);
      baht = total + delivery;
    } else {
      // נתיב ישן (ללא פריטים) — לא מאובטח; נשמר רק לתאימות.
      baht = Number(body.amount) || 0;
    }

    const satang = Math.round(baht * 100);
    if (!satang || satang < 1) {
      return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
    }

    const intent = await stripe.paymentIntents.create({
      amount: satang,
      currency: "thb",
      payment_method_types: ["card"],
      description: "J-Cafe order",
    });

    return NextResponse.json({ ok: true, clientSecret: intent.client_secret, amount: baht });
  } catch (e) {
    console.error("[payment-intent]", e);
    return NextResponse.json({ ok: false, error: "Payment init failed" }, { status: 500 });
  }
}
