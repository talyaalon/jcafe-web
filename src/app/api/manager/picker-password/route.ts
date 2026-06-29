import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/session";
import { setPickerPassword } from "@/lib/picker/passwords";

// POST /api/manager/picker-password — מנהל קובע/משנה/מוחק סיסמת מלקט לסניף.
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const form = await req.formData();
  const branch = Number(form.get("branch")) || 0;
  const password = String(form.get("password") ?? "");
  const lang = String(form.get("lang") ?? "he");
  if (branch > 0) {
    await setPickerPassword(branch, password);
  }
  const ref = req.headers.get("referer");
  const dest = ref || new URL(`/${lang}/manager?company=${branch}`, req.url).toString();
  return NextResponse.redirect(dest, 303);
}
