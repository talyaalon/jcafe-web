import { NextResponse } from "next/server";
import { releaseDueOrders } from "@/lib/odoo/release-scheduled";

export const dynamic = "force-dynamic";

// משחרר הזמנות עתידיות שהגיע מועדן (שעה לפני) — מטריגר ע"י Vercel Cron.
// גיבוי למקרה שאף מסך מלקט אינו פתוח (המלקט משחרר גם בכל רענון).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  const released = await releaseDueOrders();
  return NextResponse.json({ ok: true, released });
}
