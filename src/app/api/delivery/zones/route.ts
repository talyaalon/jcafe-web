import { NextResponse } from "next/server";
import { getDeliveryZones } from "@/lib/supabase/data";

// GET /api/delivery/zones?branch=14 — אזורי משלוח של הסניף.
export async function GET(req: Request) {
  const branch = Number(new URL(req.url).searchParams.get("branch")) || 14;
  const zones = await getDeliveryZones(branch);
  return NextResponse.json({ zones });
}
