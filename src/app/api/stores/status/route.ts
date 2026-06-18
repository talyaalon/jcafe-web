import { NextResponse } from "next/server";
import { phuketStores } from "@/lib/odoo/phuket";
import { getStoreOpenStatus } from "@/lib/supabase/data";

// GET /api/stores/status — מחזיר { statuses: { [storeId]: boolean(open) } }
export async function GET() {
  const entries = await Promise.all(
    phuketStores.map(
      async (s) => [s.id, (await getStoreOpenStatus(String(s.posConfigId))).open] as const,
    ),
  );
  return NextResponse.json({ statuses: Object.fromEntries(entries) });
}
