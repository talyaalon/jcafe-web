import test from "node:test";
import assert from "node:assert/strict";

// Stage B — שכבת מלאי חיה מעל הקטלוג השמור: מסתירה מצרך שאזל לפי מלאי עדכני.
import { overlayAvailability } from "./availability.ts";

interface P {
  id: string;
  isKitchen: boolean;
  allowOutOfStock?: boolean;
  qtyAvailable?: number | null;
}
const prod = (id: string, over: Partial<P> = {}): P => ({ id, isKitchen: false, ...over });
const bundle = (products: P[]) => ({ store: { id: "s" }, products });

test("מצרך במלאי (qty>0) → נשאר", () => {
  const out = overlayAvailability([bundle([prod("10")])], new Map([[10, 5]]));
  assert.deepEqual(out[0].products.map((p) => p.id), ["10"]);
});

test("מצרך שאזל (qty 0) → מוסר", () => {
  const out = overlayAvailability([bundle([prod("10")])], new Map([[10, 0]]));
  assert.deepEqual(out[0].products, []);
});

test("מצרך 'המשך מכירה כשאזל' (qty 0) → נשאר", () => {
  const out = overlayAvailability([bundle([prod("10", { allowOutOfStock: true })])], new Map([[10, 0]]));
  assert.deepEqual(out[0].products.map((p) => p.id), ["10"]);
});

test("מנת מטבח (isKitchen) → תמיד נשארת, גם qty 0", () => {
  const out = overlayAvailability([bundle([prod("10", { isKitchen: true })])], new Map([[10, 0]]));
  assert.deepEqual(out[0].products.map((p) => p.id), ["10"]);
});

test("אין נתון מלאי חי (id לא במפה) → נשאר (לא מסתירים בחוסר ודאות)", () => {
  const out = overlayAvailability([bundle([prod("10")])], new Map());
  assert.deepEqual(out[0].products.map((p) => p.id), ["10"]);
});

test("מזהה עם וריאנט (10|opt) → נבדק לפי ה-template (10)", () => {
  const out = overlayAvailability([bundle([prod("10|cheese")])], new Map([[10, 0]]));
  assert.deepEqual(out[0].products, []);
});

test("ממלא qtyAvailable למצרך מנוהל-מלאי (לאכיפת מקסימום)", () => {
  const out = overlayAvailability([bundle([prod("10")])], new Map([[10, 3]]));
  assert.equal(out[0].products[0].qtyAvailable, 3);
});

test("מטבח / allow_out → qtyAvailable לא מוגבל (נשאר כפי שהוא)", () => {
  const out = overlayAvailability(
    [bundle([prod("10", { isKitchen: true }), prod("20", { allowOutOfStock: true })])],
    new Map([
      [10, 2],
      [20, 2],
    ]),
  );
  assert.equal(out[0].products[0].qtyAvailable, undefined);
  assert.equal(out[0].products[1].qtyAvailable, undefined);
});

test("מסנן רק את שאזל ומשאיר את השאר", () => {
  const out = overlayAvailability(
    [bundle([prod("10"), prod("20"), prod("30", { allowOutOfStock: true })])],
    new Map([
      [10, 0],
      [20, 7],
      [30, 0],
    ]),
  );
  assert.deepEqual(out[0].products.map((p) => p.id), ["20", "30"]);
});
