import { NextResponse } from "next/server";
import { phuketStores, PHUKET_COMPANY_ID } from "@/lib/odoo/phuket";
import { getStoreHours } from "@/lib/supabase/data";
import { getBranchStores } from "@/lib/odoo/branches";

// GET /api/stores/hours?company=14 — { hours: { [storeId]: DayHours[] } } לוולידציית תזמון (פר-סניף).
export async function GET(req: Request) {
  const company = Number(new URL(req.url).searchParams.get("company")) || PHUKET_COMPANY_ID;
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
