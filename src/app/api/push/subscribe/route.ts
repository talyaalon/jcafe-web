import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/session";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";

// POST /api/push/subscribe — שומר מנוי Push של המלקט (אדמין בלבד).
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured) return NextResponse.json({ ok: false });
  const body = (await req.json()) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    company?: number | string | null;
  };
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  }
  const company = body.company != null && Number(body.company) ? Number(body.company) : null;
  await supabaseAdmin()
    .from("push_subscriptions")
    .upsert(
      { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, company },
      { onConflict: "endpoint" },
    );
  return NextResponse.json({ ok: true });
}
