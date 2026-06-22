import { NextResponse } from "next/server";
import { orderEmailHtml, orderEmailSubject } from "@/lib/email-template";

// POST /api/notify/order — שולח מייל אישור הזמנה מעוצב ללקוח דרך Resend (אם מוגדר מפתח).
export async function POST(req: Request) {
  const key = process.env.RESEND_API_KEY;
  try {
    const body = (await req.json()) as {
      to?: string;
      orderNo?: string;
      total?: number;
      name?: string;
      phone?: string;
      address?: string;
      method?: string;
      deliveryFee?: number;
      scheduledFor?: string;
      notes?: string;
      branchName?: string;
      logoUrl?: string;
      locale?: "he" | "en";
      items?: { name: string; qty: number; price?: number; storeName?: string }[];
    };
    const { to, orderNo, total, name } = body;
    if (!to || !orderNo) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    // ללא מפתח Resend — לא שולחים (no-op רך), כדי שלא לשבור את ההזמנה.
    if (!key) return NextResponse.json({ ok: false, skipped: "no RESEND_API_KEY" });

    const items = Array.isArray(body.items) ? body.items : [];
    const opts = {
      locale: body.locale || "he",
      forStaff: false,
      branchName: body.branchName || "J Cafe — THE KOSHER PLACE",
      logoUrl: body.logoUrl || null,
      orderNo: orderNo!,
      method: body.method,
      customer: { name, phone: body.phone, email: to, address: body.address },
      scheduledFor: body.scheduledFor,
      notes: body.notes,
      items,
      delivery: Math.max(0, Number(body.deliveryFee) || 0),
      total: Number(total ?? 0),
    };

    const from = process.env.RESEND_FROM || "J-Cafe <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: orderEmailSubject(opts),
        html: orderEmailHtml(opts),
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
