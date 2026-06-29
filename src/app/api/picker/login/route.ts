import { NextResponse } from "next/server";
import { verifyPickerPassword } from "@/lib/picker/passwords";
import { createPickerToken, pickerCookieName, PICKER_MAX_AGE } from "@/lib/admin/picker-session";

// POST /api/picker/login — כניסת מלקט לסניף ספציפי (טופס POST רגיל).
export async function POST(req: Request) {
  const form = await req.formData();
  const branch = Number(form.get("branch")) || 0;
  const password = String(form.get("password") ?? "");
  const lang = String(form.get("lang") ?? "he");

  const ok = branch > 0 && (await verifyPickerPassword(branch, password));
  const dest = new URL(
    `/${lang}/picker?company=${branch}${ok ? "" : "&err=1"}`,
    req.url,
  );
  const res = NextResponse.redirect(dest, 303);
  if (ok) {
    res.cookies.set(pickerCookieName(branch), createPickerToken(branch), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: PICKER_MAX_AGE,
    });
  }
  return res;
}
