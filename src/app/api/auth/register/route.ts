import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register — יוצר משתמש דרך service role.
export async function POST(req: Request) {
  // הגבלת קצב: עד 5 הרשמות לכל IP ב-10 דקות (מונע יצירת חשבונות המונית)
  if (!rateLimit(`register:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts, please try later" },
      { status: 429 },
    );
  }
  try {
    const { email, password, name } = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };
    if (!email || !EMAIL_RE.test(String(email)) || !password || String(password).length < 6) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password (min 6)" },
        { status: 400 },
      );
    }
    const cleanName = name ? String(name).slice(0, 80) : undefined;
    const { error } = await supabaseAdmin().auth.admin.createUser({
      email: String(email).toLowerCase().trim(),
      password: String(password),
      email_confirm: true,
      user_metadata: cleanName ? { name: cleanName } : undefined,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[register]", e);
    return NextResponse.json({ ok: false, error: "Registration failed" }, { status: 500 });
  }
}
