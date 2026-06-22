import { NextResponse } from "next/server";
import { phuketStores, PHUKET_COMPANY_ID } from "@/lib/odoo/phuket";
import { getStoreOpenStatus } from "@/lib/supabase/data";
import { getBranchStores } from "@/lib/odoo/branches";

// GET /api/stores/status?company=14 — { statuses: { [storeId]: boolean(open) } }
// פר-סניף: המפתח הוא מזהה החנות כפי שמופיע בחזית ובעגלה של אותו הסניף.
export async function GET(req: Request) {
  const company = Number(new URL(req.url).searchParams.get("company")) || PHUKET_COMPANY_ID;
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
