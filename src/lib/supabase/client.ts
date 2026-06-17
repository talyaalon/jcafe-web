"use client";

import { createClient } from "@supabase/supabase-js";

// לקוח דפדפן ל-Supabase Auth + קריאות/כתיבות תחת RLS של המשתמש המחובר.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  { auth: { persistSession: true, autoRefreshToken: true } },
);
