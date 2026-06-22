// סבב 1 — בידוד סניפים בנתיב ההזמנה/תשלום.
// פונקציה טהורה (ללא תלות, ללא I/O) שגוזרת ואוכפת את חברת ההזמנה אך ורק מתוך
// ה-branch של פריטי העגלה. השרת אוטוריטטיבי: אין פולבק שקט לפוקט, אין lenient.
// ה-whitelist (validCompanyIds) מוזרק מבחוץ — חייב להיגזר ממקור הסניפים האמיתי
// (getBranches), לא מספרים מקודדים כאן, כדי לא ליצור מקור-אמת מתחרה.

export type OrderCompanyErrorCode =
  | "EMPTY_CART"
  | "INVALID_BRANCH"
  | "BRANCH_ISOLATION_VIOLATION"
  | "COMPANY_MISMATCH";

export class OrderCompanyError extends Error {
  readonly code: OrderCompanyErrorCode;
  constructor(code: OrderCompanyErrorCode, message: string) {
    super(message);
    this.name = "OrderCompanyError";
    this.code = code;
  }
}

interface ItemWithBranch {
  branch?: number;
}

/**
 * גוזר את מזהה החברה (companyId) של ההזמנה מתוך ה-branch של הפריטים בלבד.
 * זורק OrderCompanyError בכל הפרה — לפני כל כתיבה ל-ODOO/Supabase.
 *
 * @param items           פריטי העגלה, כל אחד נושא branch (מזהה חברת הסניף).
 * @param bodyCompanyId   ה-companyId שהלקוח שלח — לאימות-צולב בלבד, לעולם לא כמקור.
 * @param validCompanyIds רשימת הסניפים החוקיים (נגזרת מ-getBranches).
 */
export function resolveOrderCompany(
  items: ItemWithBranch[],
  bodyCompanyId: number | undefined,
  validCompanyIds: number[],
): number {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderCompanyError("EMPTY_CART", "Cart is empty");
  }

  // כל פריט חייב לשאת branch מספרי תקין — אין נפילה שקטה לברירת מחדל.
  const branches = new Set<number>();
  for (const it of items) {
    const b = it?.branch;
    if (typeof b !== "number" || !Number.isFinite(b)) {
      throw new OrderCompanyError("INVALID_BRANCH", "Cart item is missing a valid branch");
    }
    branches.add(b);
  }

  // רשת ביטחון: עגלה לעולם לא מערבבת סניפים (כל סניף = עסק של בעלים אחר).
  if (branches.size > 1) {
    throw new OrderCompanyError(
      "BRANCH_ISOLATION_VIOLATION",
      `Cart contains items from multiple branches: ${[...branches].sort((a, b) => a - b).join(",")}`,
    );
  }

  const derived = [...branches][0];

  // ה-branch חייב להיות סניף חוקי ידוע — לא מספר שרירותי.
  if (!validCompanyIds.includes(derived)) {
    throw new OrderCompanyError("INVALID_BRANCH", `Branch ${derived} is not a known company`);
  }

  // אימות-צולב מול ה-companyId מהלקוח (אם נשלח) — אי-התאמה = באג/חבלה.
  if (bodyCompanyId !== undefined && bodyCompanyId !== null && Number(bodyCompanyId) !== derived) {
    throw new OrderCompanyError(
      "COMPANY_MISMATCH",
      `Client companyId ${bodyCompanyId} does not match derived branch ${derived}`,
    );
  }

  return derived;
}
