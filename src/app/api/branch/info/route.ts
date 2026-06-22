import { NextResponse } from "next/server";
import { getBranchBranding, getDeliverySettings } from "@/lib/supabase/data";
import { COMPANY_SLUG } from "@/lib/odoo/branches";
import { BRANCH_TAG } from "@/lib/odoo/branches";
import { parseBranchId } from "@/lib/resolve-branch-from-request";

const VALID_COMPANY_IDS = Object.keys(COMPANY_SLUG).map(Number);

// GET /api/branch/info?company=15 — מידע תצוגה לסניף (לצ'קאאוט): שם, לוגו, slug, כתובת איסוף.
export async function GET(req: Request) {
  // fail-closed (2ג-1): סניף חסר/לא-חוקי → 400, במקום נפילה שקטה לפוקט.
  const company = parseBranchId(
    new URL(req.url).searchParams.get("company") ?? undefined,
    VALID_COMPANY_IDS,
  );
  if (company == null) {
    return NextResponse.json({ ok: false, error: "INVALID_BRANCH" }, { status: 400 });
  }
  const [b, d] = await Promise.all([getBranchBranding(company), getDeliverySettings(company)]);
  return NextResponse.json({
    company,
    slug: COMPANY_SLUG[company] ?? String(company),
    nameHe: b?.name_he ?? null,
    nameEn: b?.name_en ?? BRANCH_TAG[company] ?? null,
    taglineHe: b?.tagline_he ?? null,
    taglineEn: b?.tagline_en ?? null,
    logoUrl: b?.logo_url ?? null,
    pickupAddress: d?.pickup_address ?? null,
  });
}
