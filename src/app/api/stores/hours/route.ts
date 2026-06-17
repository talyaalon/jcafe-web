import { NextResponse } from "next/server";
import { phuketStores } from "@/lib/odoo/phuket";
import { getStoreHours } from "@/lib/supabase/data";

// GET /api/stores/hours — מחזיר { hours: { [storeId]: DayHours[] } } לוולידציית תזמון.
export async function GET() {
  const entries = await Promise.all(
    phuketStores.map(async (s) => [s.id, await getStoreHours(s.id)] as const),
  );
  return NextResponse.json({ hours: Object.fromEntries(entries) });
}
