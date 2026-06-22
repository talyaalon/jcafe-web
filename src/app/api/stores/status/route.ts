import { NextResponse } from "next/server";
import { phuketStores, PHUKET_COMPANY_ID } from "@/lib/odoo/phuket";
import { getStoreOpenStatus } from "@/lib/supabase/data";
import { getBranchStores } from "@/lib/odoo/branches";
import { parseBranchId } from "@/lib/resolve-branch-from-request";
import { COMPANY_SLUG } from "@/lib/branch-slugs";

const VALID_COMPANY_IDS = Object.keys(COMPANY_SLUG).map(Number);

// GET /api/stores/status?company=14 — { statuses: { [storeId]: boolean(open) } }
// פר-סניף: המפתח הוא מזהה החנות כפי שמופיע בחזית ובעגלה של אותו הסניף.
export async function GET(req: Request) {
  // fail-closed (2ג-1): סניף חסר/לא-חוקי → 400.
  const company = parseBranchId(
    new URL(req.url).searchParams.get("company") ?? undefined,
    VALID_COMPANY_IDS,
  );
  if (company == null) {
    return NextResponse.json({ ok: false, error: "INVALID_BRANCH" }, { status: 400 });
  }
  // [statusKey (id בעגלה), hoursStoreId (לקריאת שעות הפעילות)]
  let pairs: [string, string][];
  if (company === PHUKET_COMPANY_ID) {
    pairs = phuketStores.map((s) => [s.id, String(s.posConfigId)]);
  } else {
    const stores = await getBranchStores(company).catch(() => []);
    pairs = stores.map((s) => [s.id, s.id]);
  }
  const entries = await Promise.all(
    pairs.map(async ([key, hid]) => [key, (await getStoreOpenStatus(hid)).open] as const),
  );
  return NextResponse.json({ statuses: Object.fromEntries(entries) });
}
