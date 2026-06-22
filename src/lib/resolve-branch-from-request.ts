// סבב 2א — מקור-אמת לסניף הפעיל מתוך בקשה, בעדיפות URL > Cookie.
// פונקציה טהורה (ללא תלות/I/O, edge-safe). המפות מוזרקות מבחוץ (כמו ה-whitelist
// ב-resolveOrderCompany) — אין כאן מקור-אמת מתחרה.

export interface BranchRequestMaps {
  /** רשימת מזהי החברה החוקיים (נגזרת ממפות הסניפים). */
  validCompanyIds: number[];
  /** slug → company id. */
  slugToId: Record<string, number>;
}

/**
 * מחזיר את מזהה החברה (companyId) של הסניף הפעיל, או null אם אין סניף חוקי.
 * עדיפות: סניף מה-URL (`/{he|en}/s/{slug}`) מנצח את ה-Cookie.
 */
export function resolveBranchFromRequest(
  pathname: string,
  cookieBranch: string | undefined,
  maps: BranchRequestMaps,
): number | null {
  const { validCompanyIds, slugToId } = maps;
  const isKnown = (id: number) => Number.isFinite(id) && validCompanyIds.includes(id);

  // 1) URL — /{he|en}/s/{slug}
  const m = pathname.match(/^\/(?:he|en)\/s\/([^/?#]+)/);
  if (m) {
    const slug = decodeURIComponent(m[1]).toLowerCase();
    const fromSlug = slugToId[slug];
    const id = fromSlug ?? Number(slug);
    if (isKnown(id)) return id;
  }

  // 2) Cookie
  if (cookieBranch != null && cookieBranch !== "") {
    const id = Number(cookieBranch);
    if (isKnown(id)) return id;
  }

  return null;
}

/**
 * אימות ערך branch (מ-Cookie או מ-query param) מול whitelist → company id חוקי או null.
 * משמש את ה-layout (Cookie) ואת ה-API routes (?branch=/?company=). טהור, ללא I/O.
 */
export function parseBranchId(
  value: string | undefined,
  validCompanyIds: number[],
): number | null {
  if (value == null || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && validCompanyIds.includes(id) ? id : null;
}
