import test from "node:test";
import assert from "node:assert/strict";

// סבב 1 — בידוד סניפים בנתיב ההזמנה/תשלום.
// הטסט מקבע את החוזה של הפונקציה הטהורה שתגזור ותאכוף את חברת ההזמנה
// מתוך ה-branch של פריטי העגלה בלבד (השרת אוטוריטטיבי; אין פולבק לפוקט).
//
// ⚠️ אדום בכוונה: המודול ./resolve-order-company עדיין לא קיים בקוד הנוכחי,
// ולכן אין היום שום גזירה/אכיפה מרוכזת — בדיוק הפער שסבב 1 סוגר.
import { resolveOrderCompany, OrderCompanyError } from "./resolve-order-company.ts";

// whitelist נגזר ממקור הסניפים (כאן מוזרק לטסט) — לא מספרים קשיחים בקוד.
const VALID = [13, 14, 15, 16, 18, 19];
const BANGKOK = 15;
const PHUKET = 14;

const item = (branch: number | undefined) => ({ id: "123", qty: 1, price: 100, branch });

test("מייחס לסניף של הפריטים — בנגקוק נשאר בנגקוק", () => {
  const company = resolveOrderCompany([item(BANGKOK), item(BANGKOK)], BANGKOK, VALID);
  assert.equal(company, BANGKOK);
});

test("ללא companyId מהלקוח — נגזר מהפריטים, ולא נופל לפוקט", () => {
  // זהו לב הבאג: היום השרת היה נופל ל-PHUKET (14). הנגזר חייב להיות 15.
  const company = resolveOrderCompany([item(BANGKOK)], undefined, VALID);
  assert.equal(company, BANGKOK);
  assert.notEqual(company, PHUKET);
});

test("עגלה מעורבת-סניפים → נדחית (BRANCH_ISOLATION_VIOLATION)", () => {
  assert.throws(
    () => resolveOrderCompany([item(BANGKOK), item(PHUKET)], undefined, VALID),
    (e: unknown) => e instanceof OrderCompanyError && e.code === "BRANCH_ISOLATION_VIOLATION",
  );
});

test("אי-התאמה בין companyId מהלקוח לנגזר → נדחית (COMPANY_MISMATCH)", () => {
  assert.throws(
    () => resolveOrderCompany([item(BANGKOK)], PHUKET, VALID),
    (e: unknown) => e instanceof OrderCompanyError && e.code === "COMPANY_MISMATCH",
  );
});

test("branch שאינו ב-whitelist → נדחה (INVALID_BRANCH), גם אם הוא מספר", () => {
  assert.throws(
    () => resolveOrderCompany([item(999)], 999, VALID),
    (e: unknown) => e instanceof OrderCompanyError && e.code === "INVALID_BRANCH",
  );
});

test("פריט ללא branch → נדחה (INVALID_BRANCH), בלי פולבק שקט", () => {
  assert.throws(
    () => resolveOrderCompany([item(undefined)], undefined, VALID),
    (e: unknown) => e instanceof OrderCompanyError && e.code === "INVALID_BRANCH",
  );
});

test("עגלה ריקה → נדחית (EMPTY_CART)", () => {
  assert.throws(
    () => resolveOrderCompany([], BANGKOK, VALID),
    (e: unknown) => e instanceof OrderCompanyError && e.code === "EMPTY_CART",
  );
});
