import test from "node:test";
import assert from "node:assert/strict";

// סבב 2א — שכבת מקור-אמת לסניף (URL > Cookie).
// פונקציה טהורה שגוזרת את הסניף הפעיל מבקשה, לפי עדיפות URL > Cookie, ללא תופעות-לוואי.
// המפות (slugToId, validCompanyIds) מוזרקות — בדיוק כמו ש-resolveOrderCompany מקבל
// את ה-whitelist מבחוץ — כדי לא ליצור מקור-אמת מתחרה ולהישאר edge-safe ובדיק.
//
// ⚠️ אדום בכוונה: המודול ./resolve-branch-from-request עדיין לא קיים.
import { resolveBranchFromRequest } from "./resolve-branch-from-request.ts";

const slugToId: Record<string, number> = {
  phuket: 14,
  bangkok: 15,
  banglumpoo: 16,
  phangan: 13,
  samui: 19,
  chiangmai: 18,
};
const opts = { validCompanyIds: [13, 14, 15, 16, 18, 19], slugToId };

test("URL מנצח Cookie — /he/s/bangkok + cookie=14 → 15", () => {
  assert.equal(resolveBranchFromRequest("/he/s/bangkok", "14", opts), 15);
});

test("Cookie משמש כשאין סניף ב-URL — /he/checkout + cookie=15 → 15", () => {
  assert.equal(resolveBranchFromRequest("/he/checkout", "15", opts), 15);
});

test("slug לא-מוכר ב-URL ללא Cookie → null", () => {
  assert.equal(resolveBranchFromRequest("/he/s/atlantis", undefined, opts), null);
});

test("מספר סניף לא-חוקי ב-URL → null (לא מתקבל גם אם מספר)", () => {
  assert.equal(resolveBranchFromRequest("/he/s/99999", undefined, opts), null);
});

test("Cookie לא-חוקי (999) ללא URL → null", () => {
  assert.equal(resolveBranchFromRequest("/en/account", "999", opts), null);
});

test("אין סניף בכלל (לא URL ולא Cookie) → null", () => {
  assert.equal(resolveBranchFromRequest("/he/checkout", undefined, opts), null);
});

test("slug מספרי חוקי ב-URL — /he/s/15 → 15", () => {
  assert.equal(resolveBranchFromRequest("/he/s/15", undefined, opts), 15);
});

test("עצמאי-לוקאל — /en/s/phuket → 14", () => {
  assert.equal(resolveBranchFromRequest("/en/s/phuket", undefined, opts), 14);
});
