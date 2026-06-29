import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";
import { getBranchBranding } from "@/lib/supabase/data";
import { BRANCH_TAG } from "@/lib/odoo/branches";
import { notifyStaffNewOrder } from "@/lib/notify-staff";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// רשת-ביטחון: אם לקוח שילם אך ההזמנה לא נרשמה (הדפדפן נפל בין התשלום ל-/api/orders),
// נזהה זאת ונתריע לצוות הסניף — כך ששום תשלום לא "נופל בין הכיסאות".
async function paidOrderSafetyNet(pi: Stripe.PaymentIntent): Promise<void> {
  const idem = pi.metadata?.idem || "";
  const company = Number(pi.metadata?.company) || null;
  const baht = (pi.amount_received || pi.amount || 0) / 100;
  if (!supabaseConfigured || !idem) {
    console.info(`[stripe/webhook] paid ${pi.id} ${baht} THB (no idem/db — skip safety-net)`);
    return;
  }
  const sb = supabaseAdmin();

  // grace: לתת ל-/api/orders של הלקוח זמן "לתפוס" את מפתח ה-idempotency
  await new Promise((r) => setTimeout(r, 8000));

  // אם המפתח קיים — ההזמנה נרשמה (או בתהליך) → אין צורך בהתראה
  const { data: rec } = await sb
    .from("order_idempotency")
    .select("key")
    .eq("key", idem)
    .maybeSingle();
  if (rec) {
    console.info(`[stripe/webhook] order recorded for ${pi.id} — ok`);
    return;
  }

  // הזמנה "יתומה" (שולמה ולא נרשמה) — דה-דופ של ההתראה לפי PI id
  const { error: claimErr } = await sb
    .from("order_idempotency")
    .insert({ key: `wh-alert:${pi.id}` });
  if (claimErr) return; // כבר התרענו על ה-PI הזה

  console.error(`[stripe/webhook] ORPHAN PAID ORDER pi=${pi.id} company=${company} baht=${baht}`);
  if (!company) return;
  try {
    const branding = await getBranchBranding(company).catch(() => null);
    await notifyStaffNewOrder(company, {
      orderNo: `⚠️ תשלום ללא הזמנה — ${pi.id}`,
      branchName: BRANCH_TAG[company] ?? String(company),
      logoUrl: branding?.logo_url ?? null,
      customer: "לקוח שילם אך ההזמנה לא נקלטה — בדקו ב-Stripe",
      method: pi.metadata?.method,
      total: baht,
      delivery: 0,
      items: [],
    });
  } catch (e) {
    console.error("[stripe/webhook] safety-net alert failed", e);
  }
}

// POST /api/stripe/webhook — מאמת חתימת Stripe ומעבד אירועי תשלום.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!WEBHOOK_SECRET || !sig) {
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
      await paidOrderSafetyNet(event.data.object as Stripe.PaymentIntent);
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
