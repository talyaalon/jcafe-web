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

export interface DayHours {
  day_of_week: number;
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

// האם החנות פתוחה בתאריך/שעה שנבחרו (datetime-local string).
export function isOpenAt(hours: DayHours[], dt: string): boolean {
  if (!dt) return false;
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return false;
  const row = hours.find((h) => h.day_of_week === d.getDay());
  if (!row || row.closed || !row.open_time || !row.close_time) return false;
  const p = (n: number) => String(n).padStart(2, "0");
  const hhmm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  return hhmm >= row.open_time && hhmm <= row.close_time;
}
