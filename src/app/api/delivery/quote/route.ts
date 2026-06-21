import { NextResponse } from "next/server";
import { serverDeliveryFee } from "@/lib/delivery-server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/delivery/quote?branch=&address=&city=&subtotal= — דמי משלוח לתצוגה בצ'קאאוט.
export async function GET(req: Request) {
  if (!rateLimit(`quote:${clientIp(req)}`, 60, 60 * 1000)) {
    return NextResponse.json({ fee: 0, blocked: false }, { status: 429 });
  }
  const sp = new URL(req.url).searchParams;
  const branch = Number(sp.get("branch")) || 14;
  const address = sp.get("address") ?? "";
  const city = sp.get("city") ?? "";
  const subtotal = Number(sp.get("subtotal")) || 0;
  const r = await serverDeliveryFee(branch, "delivery", { city, address }, subtotal);
  return NextResponse.json(r);
}
