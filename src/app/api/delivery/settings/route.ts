import { NextResponse } from "next/server";
import { getDeliverySettings } from "@/lib/supabase/data";

// GET /api/delivery/settings — הגדרות משלוח (ציבורי, לחישוב בצ'קאאוט).
export async function GET() {
  const settings = await getDeliverySettings();
  return NextResponse.json({ settings });
}
