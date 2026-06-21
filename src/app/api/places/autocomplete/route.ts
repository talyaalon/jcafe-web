import { NextResponse } from "next/server";
import { placesAutocomplete } from "@/lib/google";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/places/autocomplete?input=... — הצעות כתובת (פרוקסי ל-Google, המפתח נשאר בשרת).
export async function GET(req: Request) {
  if (!rateLimit(`places:${clientIp(req)}`, 80, 60 * 1000)) {
    return NextResponse.json({ predictions: [] }, { status: 429 });
  }
  const input = new URL(req.url).searchParams.get("input") ?? "";
  const predictions = await placesAutocomplete(input);
  return NextResponse.json({ predictions });
}
