import { NextResponse } from "next/server";
import { getBranchPayment } from "@/lib/supabase/data";

// GET /api/payment/settings?branch=14 — שיטות התשלום הפעילות לסניף (ציבורי)
export async function GET(req: Request) {
  const branch = Number(new URL(req.url).searchParams.get("branch")) || 14;
  return NextResponse.json(await getBranchPayment(branch));
}
