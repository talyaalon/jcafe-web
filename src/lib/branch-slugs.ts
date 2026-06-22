// מפות slug↔company של הסניפים — מודול טהור (ללא "server-only"/ODOO), edge-safe.
// חולץ מ-branches.ts כדי שגם ה-Middleware (edge) וגם השרת יוכלו לייבא מאותו מקור,
// בלי מקור-אמת מתחרה. branches.ts מייבא ומייצא מחדש מכאן.

// קישורים יפים לכל סניף: slug → company id ב-ODOO.
export const BRANCH_SLUGS: Record<string, number> = {
  phuket: 14,
  bangkok: 15,
  sukhumvit: 15,
  jcafe: 15,
  banglumpoo: 16,
  phangan: 13,
  "koh-phangan": 13,
  samui: 19,
  chiangmai: 18,
  "chiang-mai": 18,
};

// שם ה-slug המועדף לכל סניף (להצגה/קישור)
export const COMPANY_SLUG: Record<number, string> = {
  14: "phuket",
  15: "bangkok",
  16: "banglumpoo",
  13: "phangan",
  19: "samui",
  18: "chiangmai",
};

// קבלת מזהה חברה מפרמטר ה-route (מספר או slug).
export function resolveBranch(param: string): number | null {
  const n = Number(param);
  if (Number.isFinite(n) && n > 0) return n;
  return BRANCH_SLUGS[param.toLowerCase()] ?? null;
}
