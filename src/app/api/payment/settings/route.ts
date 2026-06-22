import { NextResponse } from "next/server";
import { getBranchPayment } from "@/lib/supabase/data";
import { parseBranchId } from "@/lib/resolve-branch-from-request";
import { COMPANY_SLUG } from "@/lib/branch-slugs";

const VALID_COMPANY_IDS = Object.keys(COMPANY_SLUG).map(Number);

// GET /api/payment/settings?branch=14 — שיטות התשלום הפעילות לסניף (ציבורי)
export async function GET(req: Request) {
  // fail-closed (2ג-1): סניף חסר/לא-חוקי → 400.
  const branch = parseBranchId(
    new URL(req.url).searchParams.get("branch") ?? undefined,
    VALID_COMPANY_IDS,
  );
  if (branch == null) {
    return NextResponse.json({ ok: false, error: "INVALID_BRANCH" }, { status: 400 });
  }
  return NextResponse.json(await getBranchPayment(branch));
}
