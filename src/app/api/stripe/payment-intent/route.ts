import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

// POST /api/stripe/payment-intent — יוצר Payment Intent עבור סכום הסל (THB).
export async function POST(req: Request) {
  try {
    const { amount } = (await req.json()) as { amount: number };
    // THB הוא מטבע עם 2 ספרות עשרוניות → סאטאנג (×100)
    const satang = Math.round(Number(amount) * 100);
    if (!satang || satang < 1) {
      return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
    }

    const intent = await stripe.paymentIntents.create({
      amount: satang,
      currency: "thb",
      payment_method_types: ["card"],
      description: "J-Cafe Phuket order",
    });

    return NextResponse.json({ ok: true, clientSecret: intent.client_secret });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
