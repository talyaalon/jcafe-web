import { NextResponse } from "next/server";
import { searchRead } from "@/lib/odoo/client";
import { isAdmin } from "@/lib/admin/session";

// סקירה בסיסית של מבנה ה-POS (סניפים → חנויות) — לאבחון בלבד.
// GET /api/odoo/explore
async function safe<T>(label: string, fn: () => Promise<T>) {
  try {
    return { [label]: await fn() };
  } catch (e) {
    return { [label]: { error: e instanceof Error ? e.message : String(e) } };
  }
}

export async function GET() {
  // אבחון בלבד — חושף מבנה חברות/חנויות, לכן מוגן למנהל בלבד.
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = Object.assign(
    {},
    await safe("posConfigs", () =>
      searchRead("pos.config", [], ["id", "name", "company_id", "pricelist_id"], { limit: 200 }),
    ),
    await safe("companies", () =>
      searchRead("res.company", [], ["id", "name", "parent_id"], { limit: 80 }),
    ),
  );

  return NextResponse.json(results);
}
