/** עיצוב מחיר בבאט תאילנדי (THB) */
export function formatTHB(amount: number): string {
  // רווח דק (U+2009) בין סמל הבאט לספרה — מונע חפיפת גליפים בפונט.
  return `฿ ${amount.toLocaleString("en-US")}`;
}

/** עיצוב תאריך הזמנה: dd/mm/yyyy (אופציונלית עם שעה). */
export function orderDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  const base = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${base} ${p(d.getHours())}:${p(d.getMinutes())}` : base;
}

/** תווית אופן קבלה (משלוח/איסוף) לפי השפה. */
export function methodLabel(method: string | null, he: boolean): string {
  return method === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף" : "Pickup";
}
