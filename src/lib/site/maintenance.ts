// מתג "האתר בבנייה" — מאוחסן כקובץ JSON קטן ב-Supabase Storage (bucket ציבורי "banners").
// קריאה edge-safe (משמשת את ה-proxy/middleware); כתיבה דרך service key (API מנהל).
// ⚠️ fail-open: כל תקלה / קובץ חסר ⇒ "כבוי" (האתר רגיל). לעולם לא נסתיר את האתר בטעות.

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const OBJECT_URL = `${BASE}/storage/v1/object/banners/site-maintenance.json`;

// memo קצר בזיכרון המופע (edge) כדי לא לפנות לאחסון בכל בקשה — מתג נראה תוך ≤15ש'.
let memo: { on: boolean; ts: number } | null = null;

// האם "מצב בנייה" דלוק? (קריאה מאומתת ישירות — עוקפת CDN, תמיד טרי)
export async function getMaintenanceOn(): Promise<boolean> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!BASE || !key) return false;
  const now = Date.now();
  if (memo && now - memo.ts < 15000) return memo.on;
  try {
    const res = await fetch(OBJECT_URL, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    if (!res.ok) {
      memo = { on: false, ts: now };
      return false;
    }
    const data = (await res.json()) as { on?: boolean };
    const on = data?.on === true;
    memo = { on, ts: now };
    return on;
  } catch {
    return false;
  }
}

// הדלקה/כיבוי של המתג (server בלבד — דרך service key).
export async function setMaintenanceOn(on: boolean): Promise<boolean> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!BASE || !key) return false;
  try {
    const res = await fetch(OBJECT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
        "Cache-Control": "max-age=30",
        "x-upsert": "true",
      },
      body: JSON.stringify({ on, updatedAt: new Date().toISOString() }),
    });
    memo = { on, ts: Date.now() };
    return res.ok;
  } catch {
    return false;
  }
}
