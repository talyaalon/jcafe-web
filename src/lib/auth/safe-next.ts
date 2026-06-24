// מאמת פרמטר next (יעד חזרה אחרי התחברות/הרשמה): מוחזר רק אם הוא נתיב פנימי
// באותה שפה (חייב להתחיל ב-/{locale}/ — מונע open-redirect לאתר חיצוני).
export function safeNextPath(next: string | undefined | null, locale: string): string | null {
  return next && next.startsWith(`/${locale}/`) ? next : null;
}
