import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// POST /api/auth/register — יוצר משתמש מאומת (email_confirm) דרך service role.
export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password || String(password).length < 6) {
      return NextResponse.json({ ok: false, error: "Invalid email or password (min 6)" }, { status: 400 });
    }
    const { error } = await supabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { name } : undefined,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
