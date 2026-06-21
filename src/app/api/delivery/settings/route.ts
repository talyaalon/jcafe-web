import { NextResponse } from "next/server";
import { getDeliverySettings } from "@/lib/supabase/data";

// GET /api/delivery/settings?branch=14 — הגדרות משלוח לסניף (ציבורי, לתצוגה בצ'קאאוט).
export async function GET(req: Request) {
  const branch = Number(new URL(req.url).searchParams.get("branch")) || 14;
  const settings = await getDeliverySettings(branch);
  return NextResponse.json({ settings });
}
