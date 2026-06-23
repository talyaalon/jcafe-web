import test from "node:test";
import assert from "node:assert/strict";

// Stage B — שכבת מלאי חיה מעל הקטלוג השמור: מסתירה מצרך שאזל לפי מלאי עדכני.
import { overlayAvailability } from "./availability.ts";

interface P {
  id: string;
  isKitchen: boolean;
  allowOutOfStock?: boolean;
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
