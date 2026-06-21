import { NextResponse } from "next/server";

// POST /api/notify/order — שולח מייל אישור הזמנה דרך Resend (אם מוגדר מפתח).
export async function POST(req: Request) {
  const key = process.env.RESEND_API_KEY;
  try {
    const body = (await req.json()) as {
      to?: string;
      orderNo?: string;
      total?: number;
      name?: string;
      method?: string;
      deliveryFee?: number;
      items?: { name: string; qty: number; price?: number }[];
    };
    const { to, orderNo, total, name } = body;
    if (!to || !orderNo) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    // ללא מפתח Resend — לא שולחים (no-op רך), כדי שלא לשבור את ההזמנה.
    if (!key) return NextResponse.json({ ok: false, skipped: "no RESEND_API_KEY" });

    const esc = (s: string) =>
      String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] || c);
    const baht = (n: number) => `฿${Number(n || 0).toLocaleString("en-US")}`;
    const items = Array.isArray(body.items) ? body.items : [];
    const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * i.qty, 0);
    const delivery = Math.max(0, Number(body.deliveryFee) || 0);

    const rows = items
      .map(
        (i) => `
        <tr>
          <td style="padding:6px 0;border-bottom:1px solid #eee">${esc(i.name)} <span style="color:#999">×${i.qty}</span></td>
          <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${i.price != null ? baht(i.price * i.qty) : ""}</td>
        </tr>`,
      )
      .join("");

    const from = process.env.RESEND_FROM || "J-Cafe <onboarding@resend.dev>";
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222">
        <h2 style="color:#861E74;margin-bottom:2px">J-Cafe — THE KOSHER PLACE</h2>
        <p style="color:#888;margin-top:0;font-size:13px">Order confirmation & receipt</p>
        <p>Hi ${esc(name || "there")}, thank you for your order!</p>
        <p>Order <b>${esc(orderNo)}</b>${body.method ? ` · ${esc(body.method)}` : ""}</p>
        ${
          rows
            ? `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
                 ${rows}
                 <tr><td style="padding:8px 0;color:#666">Subtotal</td><td style="padding:8px 0;text-align:right">${baht(subtotal)}</td></tr>
                 ${delivery ? `<tr><td style="padding:2px 0;color:#666">Delivery</td><td style="padding:2px 0;text-align:right">${baht(delivery)}</td></tr>` : ""}
                 <tr><td style="padding:8px 0;border-top:2px solid #861E74;font-weight:bold">Total</td><td style="padding:8px 0;border-top:2px solid #861E74;text-align:right;font-weight:bold;color:#861E74">${baht(total ?? subtotal + delivery)}</td></tr>
               </table>`
            : total
              ? `<p>Total: <b>${baht(total)}</b></p>`
              : ""
        }
        <p style="margin-top:16px">We'll be in touch shortly.</p>
        <hr style="border:none;border-top:1px solid #eee"/><p style="color:#888;font-size:12px">THE KOSHER PLACE · Thailand</p>
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
    // קריאה הגנתית — לא לקרוס אם התשובה אינה JSON תקין
    const text = await res.text();
    let data: { message?: string; id?: string } = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.slice(0, 200) };
    }
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data?.message || "send failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
