import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin/session";
import { setThreshold } from "@/lib/category/thresholds";

// POST /api/manager/category-threshold — סף מלאי מינימלי לקטגוריה (מנהל בלבד).
// שדות: branch, storeId, categoryId, qty (מספר; ריק/0 = הסרת הסף).
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const form = await req.formData();
  const branch = Number(form.get("branch")) || 0;
  const storeId = String(form.get("storeId") ?? "").trim();
  const categoryId = String(form.get("categoryId") ?? "").trim();
  const qtyRaw = String(form.get("qty") ?? "").trim();
  const qty = qtyRaw === "" ? null : Math.max(0, Math.floor(Number(qtyRaw) || 0));
  const lang = String(form.get("lang") ?? "he");

  if (branch > 0 && storeId && categoryId) {
    await setThreshold(branch, storeId, categoryId, qty);
    revalidatePath("/", "layout");
  }
  const ref = req.headers.get("referer");
  const dest = ref || new URL(`/${lang}/manager?company=${branch}`, req.url).toString();
  return NextResponse.redirect(dest, 303);
}
