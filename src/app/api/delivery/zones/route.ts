import { NextResponse } from "next/server";
import { getDeliveryZones } from "@/lib/supabase/data";
import { parseBranchId } from "@/lib/resolve-branch-from-request";
import { COMPANY_SLUG } from "@/lib/branch-slugs";

const VALID_COMPANY_IDS = Object.keys(COMPANY_SLUG).map(Number);

// GET /api/delivery/zones?branch=14 — אזורי משלוח של הסניף.
export async function GET(req: Request) {
  // fail-closed (2ג-1): סניף חסר/לא-חוקי → 400.
  const branch = parseBranchId(
    new URL(req.url).searchParams.get("branch") ?? undefined,
    VALID_COMPANY_IDS,
  );
  if (branch == null) {
    return NextResponse.json({ ok: false, error: "INVALID_BRANCH" }, { status: 400 });
  }
  const zones = await getDeliveryZones(branch);
  return NextResponse.json({ zones });
}
