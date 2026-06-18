/** עיצוב מחיר בבאט תאילנדי (THB) */
export function formatTHB(amount: number): string {
  // רווח דק (U+2009) בין סמל הבאט לספרה — מונע חפיפת גליפים בפונט.
  return `฿ ${amount.toLocaleString("en-US")}`;
}
