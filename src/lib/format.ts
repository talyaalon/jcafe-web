/** עיצוב מחיר בבאט תאילנדי (THB) */
export function formatTHB(amount: number): string {
  return `฿${amount.toLocaleString("en-US")}`;
}
