import "server-only";
import crypto from "node:crypto";

// סיסמאות מלקט פר-סניף — מאוחסנות (hash בלבד) ב-bucket פרטי "config" ב-Supabase Storage.
// ה-hash הוא HMAC עם ADMIN_SESSION_SECRET, כך שגם אם הקובץ ידלוף אי-אפשר לשחזר סיסמה.

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const OBJECT_URL = `${BASE}/storage/v1/object/config/picker-passwords.json`;
const secret = () =>
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-insecure-secret";

function hash(pw: string): string {
  return crypto.createHmac("sha256", secret()).update(pw).digest("hex");
}

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
  if (clean) map[String(branch)] = hash(clean);
  else delete map[String(branch)];
  return writeAll(map);
}

// אימות סיסמת מלקט לסניף (השוואה timing-safe). אם לא הוגדרה סיסמה — נדחה.
export async function verifyPickerPassword(branch: number, pw: string): Promise<boolean> {
  const stored = (await getAll())[String(branch)];
  if (!stored) return false;
  const given = hash(pw.trim());
  const a = Buffer.from(stored);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// אילו סניפים כבר הוגדרה להם סיסמה (לתצוגה במסך המנהל).
export async function getBranchesWithPickerPassword(): Promise<Set<number>> {
  return new Set(Object.keys(await getAll()).map(Number));
}
