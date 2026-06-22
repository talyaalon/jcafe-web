import { NextResponse } from "next/server";
import { searchRead } from "@/lib/odoo/client";
import { isAdmin } from "@/lib/admin/session";

// GET /api/manager/products/search?company=14&q=...
// חיפוש מוצר לפי שם או קוד-מק"ט (default_code) — לחסימה פר-סניף. מוגן למנהל.
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const company = Number(url.searchParams.get("company")) || 14;
  if (q.length < 2) return NextResponse.json({ products: [] });

  try {
    const rows = await searchRead<{ id: number; name: string; default_code: string | false }>(
      "product.template",
      [
        ["available_in_pos", "=", true],
        ["company_id", "in", [company, false]],
        "|",
        ["name", "ilike", q],
        ["default_code", "ilike", q],
      ],
      ["id", "name", "default_code"],
      { limit: 30, order: "name asc" },
    );
    return NextResponse.json({
      products: rows.map((r) => ({
        id: String(r.id),
        name: r.name,
        reference: r.default_code || "",
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { products: [], error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
