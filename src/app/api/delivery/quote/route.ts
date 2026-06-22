import { NextResponse } from "next/server";
import { serverDeliveryFee } from "@/lib/delivery-server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { parseBranchId } from "@/lib/resolve-branch-from-request";
import { COMPANY_SLUG } from "@/lib/branch-slugs";

const VALID_COMPANY_IDS = Object.keys(COMPANY_SLUG).map(Number);

// GET /api/delivery/quote?branch=&address=&city=&subtotal= — דמי משלוח לתצוגה בצ'קאאוט.
export async function GET(req: Request) {
  if (!rateLimit(`quote:${clientIp(req)}`, 60, 60 * 1000)) {
    return NextResponse.json({ fee: 0, blocked: false }, { status: 429 });
  }
  const sp = new URL(req.url).searchParams;
  // fail-closed (2ג-1): סניף חסר/לא-חוקי → 400.
  const branch = parseBranchId(sp.get("branch") ?? undefined, VALID_COMPANY_IDS);
  if (branch == null) {
    return NextResponse.json({ ok: false, error: "INVALID_BRANCH" }, { status: 400 });
  }
  const address = sp.get("address") ?? "";
  const city = sp.get("city") ?? "";
  const subtotal = Number(sp.get("subtotal")) || 0;
  const r = await serverDeliveryFee(branch, "delivery", { city, address }, subtotal);
  return NextResponse.json(r);
}
