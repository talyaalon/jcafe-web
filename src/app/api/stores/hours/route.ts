import { NextResponse } from "next/server";
import { phuketStores, PHUKET_COMPANY_ID } from "@/lib/odoo/phuket";
import { getStoreHours } from "@/lib/supabase/data";
import { getBranchStores } from "@/lib/odoo/branches";
import { parseBranchId } from "@/lib/resolve-branch-from-request";
import { COMPANY_SLUG } from "@/lib/branch-slugs";

const VALID_COMPANY_IDS = Object.keys(COMPANY_SLUG).map(Number);

// GET /api/stores/hours?company=14 — { hours: { [storeId]: DayHours[] } } לוולידציית תזמון (פר-סניף).
export async function GET(req: Request) {
  // fail-closed (2ג-1): סניף חסר/לא-חוקי → 400.
  const company = parseBranchId(
    new URL(req.url).searchParams.get("company") ?? undefined,
    VALID_COMPANY_IDS,
  );
  if (company == null) {
    return NextResponse.json({ ok: false, error: "INVALID_BRANCH" }, { status: 400 });
  }
  let pairs: [string, string][];
  if (company === PHUKET_COMPANY_ID) {
    pairs = phuketStores.map((s) => [s.id, String(s.posConfigId)]);
  } else {
    const stores = await getBranchStores(company).catch(() => []);
    pairs = stores.map((s) => [s.id, s.id]);
  }
  const entries = await Promise.all(
    pairs.map(async ([key, hid]) => [key, await getStoreHours(hid)] as const),
  );
  return NextResponse.json({ hours: Object.fromEntries(entries) });
}
