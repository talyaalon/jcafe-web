import test from "node:test";
import assert from "node:assert/strict";

// סבב 2ב-1a — branchHref: קישור לחנות הסניף הנוכחי לפי companyId.
import { branchHref } from "./branch-slugs.ts";

test("בנגקוק — branchHref('he',15) → /he/s/bangkok", () => {
  assert.equal(branchHref("he", 15), "/he/s/bangkok");
});

test("פוקט באנגלית — branchHref('en',14) → /en/s/phuket", () => {
  assert.equal(branchHref("en", 14), "/en/s/phuket");
});

test("סמוי — branchHref('he',19) → /he/s/samui", () => {
  assert.equal(branchHref("he", 19), "/he/s/samui");
});

test("פנגן — branchHref('he',13) → /he/s/phangan", () => {
  assert.equal(branchHref("he", 13), "/he/s/phangan");
});

test("בנגלמפו — branchHref('he',16) → /he/s/banglumpoo", () => {
  assert.equal(branchHref("he", 16), "/he/s/banglumpoo");
});

test("צ'אנג מאי — branchHref('he',18) → /he/s/chiangmai", () => {
  assert.equal(branchHref("he", 18), "/he/s/chiangmai");
});

// סבב 2ג-3b — fallback בטוח (לא 404) לסניף null/לא-מוכר → עמוד החשבון (branch-agnostic).
test("id לא-מוכר → fallback /he/account", () => {
  assert.equal(branchHref("he", 999), "/he/account");
});

test("branchCompany null (אין סניף פעיל) → /he/account", () => {
  assert.equal(branchHref("he", null), "/he/account");
});

test("null באנגלית → /en/account", () => {
  assert.equal(branchHref("en", null), "/en/account");
});
