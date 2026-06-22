import { NextResponse } from "next/server";
import { getBranchBranding, getDeliverySettings } from "@/lib/supabase/data";
import { COMPANY_SLUG } from "@/lib/odoo/branches";
import { BRANCH_TAG } from "@/lib/odoo/branches";

// GET /api/branch/info?company=15 — מידע תצוגה לסניף (לצ'קאאוט): שם, לוגו, slug, כתובת איסוף.
export async function GET(req: Request) {
  const company = Number(new URL(req.url).searchParams.get("company")) || 14;
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
