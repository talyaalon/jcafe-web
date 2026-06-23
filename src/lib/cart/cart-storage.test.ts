import test from "node:test";
import assert from "node:assert/strict";

// בידוד סל פר-סניף — לוגיקת מפתח-האחסון + מיגרציה מהסל הגלובלי הישן.
import {
  cartStorageKey,
  schedStorageKey,
  groupCartByBranch,
  LEGACY_CART_KEY,
} from "./cart-storage.ts";

test("מפתח סל פר-סניף — בנגקוק (15)", () => {
  assert.equal(cartStorageKey(15), "jcafe_cart_v2:15");
});

test("מפתח סל פר-סניף — פוקט (14)", () => {
  assert.equal(cartStorageKey(14), "jcafe_cart_v2:14");
});

test("מפתח תזמונים פר-סניף", () => {
  assert.equal(schedStorageKey(15), "jcafe_schedules:15");
});

test("המפתח החדש נגזר מהישן (prefix) ושונה ממנו — אין התנגשות", () => {
  assert.equal(LEGACY_CART_KEY, "jcafe_cart_v2");
  assert.notEqual(cartStorageKey(15), LEGACY_CART_KEY);
  assert.ok(cartStorageKey(15).startsWith(LEGACY_CART_KEY + ":"));
});

test("מיגרציה: קיבוץ פריטי הסל הגלובלי לפי תג הסניף (lossless)", () => {
  const items = [
    { branch: 15, n: "bkk-a" },
    { branch: 14, n: "phuket" },
    { branch: 15, n: "bkk-b" },
  ];
  const g = groupCartByBranch(items);
  assert.deepEqual(g.get(15)?.map((i) => i.n), ["bkk-a", "bkk-b"]);
  assert.deepEqual(g.get(14)?.map((i) => i.n), ["phuket"]);
  assert.equal(g.size, 2);
});

test("מיגרציה: פריט ללא תג סניף תקין (null/undefined/לא-שלם) — מושמט", () => {
  const items = [
    { branch: 15, n: "ok" },
    { branch: null as unknown as number, n: "no-branch" },
    { branch: undefined as unknown as number, n: "undef" },
    { branch: 15.5, n: "frac" },
  ];
  const g = groupCartByBranch(items);
  assert.deepEqual(g.get(15)?.map((i) => i.n), ["ok"]);
  assert.equal(g.size, 1);
});

test("מיגרציה: מערך ריק → מפה ריקה", () => {
  assert.equal(groupCartByBranch([]).size, 0);
});
