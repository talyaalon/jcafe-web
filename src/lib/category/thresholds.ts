// סף מלאי מינימלי לכל קטגוריה (פר-סניף). מוצר בקטגוריה שמלאיו <= הסף — מוסתר מהאתר.
// נשמר ב-bucket הפרטי "config" (נגיש לשרת בלבד). edge-safe לקריאה (fetch + service key).

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const OBJECT_URL = `${BASE}/storage/v1/object/config/category-thresholds.json`;

// מבנה: { "<branch>": { "<storeId>:<categoryId>": <minQty> } }
type AllThresholds = Record<string, Record<string, number>>;

async function getAll(): Promise<AllThresholds> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!BASE || !key) return {};
  try {
    const res = await fetch(OBJECT_URL, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    if (!res.ok) return {};
    return (await res.json()) as AllThresholds;
  } catch {
    return {};
  }
}

async function writeAll(map: AllThresholds): Promise<boolean> {
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

// ספים לסניף (לתצוגה במנהל) — מפתח "storeId:categoryId" → minQty.
export async function getThresholds(branch: number): Promise<Record<string, number>> {
  return (await getAll())[String(branch)] ?? {};
}

// אותו דבר כ-Map (לסינון בחזית).
export async function getThresholdMap(branch: number): Promise<Map<string, number>> {
  return new Map(Object.entries(await getThresholds(branch)));
}

// קביעה/שינוי/מחיקה (qty ריק/0 = הסרה) של סף לקטגוריה בחנות.
export async function setThreshold(
  branch: number,
  storeId: string,
  categoryId: string,
  qty: number | null,
): Promise<boolean> {
  const all = await getAll();
  const b = all[String(branch)] ?? {};
  const key = `${storeId}:${categoryId}`;
  if (qty != null && qty > 0) b[key] = qty;
  else delete b[key];
  all[String(branch)] = b;
  return writeAll(all);
}
