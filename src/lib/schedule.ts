// עזרי תאריך/שעה לתזמון הזמנה (datetime-local).

export function minDateTime(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000); // שעה קדימה
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function prettyDateTime(v: string): string {
  const [date, time] = v.split("T");
  if (!date) return v;
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y} ${time ?? ""}`.trim();
}
