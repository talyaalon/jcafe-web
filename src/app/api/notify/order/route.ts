import { NextResponse } from "next/server";

// POST /api/notify/order — שולח מייל אישור הזמנה דרך Resend (אם מוגדר מפתח).
export async function POST(req: Request) {
  const key = process.env.RESEND_API_KEY;
  try {
    const { to, orderNo, total, name } = await req.json();
    if (!to || !orderNo) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    // ללא מפתח Resend — לא שולחים (no-op רך), כדי שלא לשבור את ההזמנה.
    if (!key) return NextResponse.json({ ok: false, skipped: "no RESEND_API_KEY" });

    const from = process.env.RESEND_FROM || "J-Cafe Phuket <onboarding@resend.dev>";
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#861E74">J-Cafe Phuket</h2>
        <p>Hi ${name || "there"},</p>
        <p>Your order <b>${orderNo}</b> has been received${total ? ` — total <b>฿${total}</b>` : ""}.</p>
        <p>Thank you for your order! We'll be in touch shortly.</p>
        <hr/><p style="color:#888;font-size:12px">THE KOSHER PLACE · Phuket</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `J-Cafe Phuket — Order ${orderNo} confirmed`,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ ok: false, error: data?.message || "send failed" }, { status: 502 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
