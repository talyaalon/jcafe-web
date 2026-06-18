import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// POST /api/stripe/webhook — מאמת חתימת Stripe ומקבל אירועי תשלום.
// כרגע מאמת + רושם לוג (בסיס לאיתור תשלומים "יתומים"); אפשר להרחיב
// בעתיד ליצירת/השלמת הזמנה אוטומטית מתוך metadata.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!WEBHOOK_SECRET || !sig) {
    // ללא סוד מוגדר — לא חוסם את המערכת, אך לא מעבד.
    return NextResponse.json({ ok: false, error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await req.text(); // גוף גולמי נדרש לאימות החתימה
    event = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch (e) {
    console.error("[stripe/webhook] signature verify failed", e);
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.info(`[stripe/webhook] paid ${pi.id} ${(pi.amount_received || 0) / 100} THB`);
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.warn(`[stripe/webhook] failed ${pi.id}`);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
