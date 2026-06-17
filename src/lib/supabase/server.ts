import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// לקוח ציבורי — קריאות בלבד (RLS: public read).
export const supabasePublic = createClient(url, anon, {
  auth: { persistSession: false },
});

// לקוח מנהל — כתיבות (service role, עוקף RLS). דורש SUPABASE_SERVICE_ROLE_KEY.
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY חסר ב-.env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}

export const supabaseConfigured = Boolean(url && anon);
