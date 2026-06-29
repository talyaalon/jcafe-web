import "server-only";
import crypto from "node:crypto";

// סיסמאות מלקט פר-סניף — מאוחסנות ב-bucket פרטי "config" ב-Supabase Storage
// (נגיש רק לשרת עם service key, לא ציבורי). נשמרות כטקסט כדי שהמנהל יוכל לראות/להעתיק
// אותן במסך הניהול (כפי שהתבקש). אלו סיסמאות תפעוליות לצוות הסניף.

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const OBJECT_URL = `${BASE}/storage/v1/object/config/picker-passwords.json`;

async function getAll(): Promise<Record<string, string>> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!BASE || !key) return {};
  try {
    const res = await fetch(OBJECT_URL, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    if (!res.ok) return {};
    return (await res.json()) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeAll(map: Record<string, string>): Promise<boolean> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!BASE || !key) return false;
  try {
    const res = await fetch(OBJECT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-upsert": "true",
      },
      body: JSON.stringify(map),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// קביעה/שינוי/מחיקה (סיסמה ריקה = מחיקה) של סיסמת מלקט לסניף.
export async function setPickerPassword(branch: number, pw: string): Promise<boolean> {
  const map = await getAll();
  const clean = pw.trim();
  if (clean) map[String(branch)] = clean;
  else delete map[String(branch)];
  return writeAll(map);
}

// אימות סיסמת מלקט לסניף (השוואה timing-safe). אם לא הוגדרה סיסמה — נדחה.
export async function verifyPickerPassword(branch: number, pw: string): Promise<boolean> {
  const stored = (await getAll())[String(branch)];
  if (!stored) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(pw.trim());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// כל סיסמאות המלקט (לתצוגה/העתקה במסך המנהל בלבד — admin-gated).
export async function getPickerPasswords(): Promise<Record<string, string>> {
  return getAll();
}
