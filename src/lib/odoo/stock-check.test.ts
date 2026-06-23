import test from "node:test";
import assert from "node:assert/strict";

// שלב A-1 — בדיקת מלאי חיה: הפונקציה הטהורה שמחליטה אילו פריטים אזלו.
import { computeShortages, type StockRow, type StockDemand } from "./stock-check.ts";

const row = (over: Partial<StockRow> & { id: number }): StockRow => ({
  id: over.id,
  name: over.name ?? `P${over.id}`,
  qty_available: over.qty_available,
  is_storable: over.is_storable,
  allow_out_of_stock_order: over.allow_out_of_stock_order,
});
const demand = (templateId: number, qty: number): StockDemand => ({ templateId, qty });

test("במלאי (qty 5 ≥ req 2) → אין מחסור", () => {
  const rows = [row({ id: 10, qty_available: 5, is_storable: true })];
  assert.deepEqual(computeShortages(rows, [demand(10, 2)]), []);
});

test("אזל (qty 1 < req 3, storable, לא allow_out) → מחסור", () => {
  const rows = [row({ id: 10, name: "Milk", qty_available: 1, is_storable: true })];
  assert.deepEqual(computeShortages(rows, [demand(10, 3)]), [
    { templateId: 10, name: "Milk", available: 1, requested: 3 },
  ]);
});

test("allow_out_of_stock_order=true + qty 0 → פטור (אין מחסור)", () => {
  const rows = [row({ id: 10, qty_available: 0, is_storable: true, allow_out_of_stock_order: true })];
  assert.deepEqual(computeShortages(rows, [demand(10, 9)]), []);
});

test("is_storable=false + qty 0 → פטור (לא מנוהל-מלאי)", () => {
  const rows = [row({ id: 10, qty_available: 0, is_storable: false })];
  assert.deepEqual(computeShortages(rows, [demand(10, 9)]), []);
});

// ===== הבהרה 2: בספק — לאכוף =====
test("is_storable חסר (undefined) + qty 0 → אוכף (מחסור)", () => {
  const rows = [row({ id: 10, qty_available: 0 })];
  assert.equal(computeShortages(rows, [demand(10, 1)]).length, 1);
});

test("allow_out חסר + storable + qty 0 → אוכף", () => {
  const rows = [row({ id: 10, qty_available: 0, is_storable: true })];
  assert.equal(computeShortages(rows, [demand(10, 1)]).length, 1);
});

test("qty_available חסר/לא-מספרי → נחשב 0 → אוכף", () => {
  const rows = [row({ id: 10, is_storable: true })];
  assert.deepEqual(computeShortages(rows, [demand(10, 1)]), [
    { templateId: 10, name: "P10", available: 0, requested: 1 },
  ]);
});

test("שורת template חסרה לגמרי (מוצר אורכב/נמחק) → block, available 0", () => {
  assert.deepEqual(computeShortages([], [{ templateId: 77, qty: 1, name: "Gone" }]), [
    { templateId: 77, name: "Gone", available: 0, requested: 1 },
  ]);
});

test("שתי שורות ביקוש לאותו template (2+3=5) מול qty 4 → מחסור requested 5", () => {
  const rows = [row({ id: 10, qty_available: 4, is_storable: true })];
  assert.deepEqual(computeShortages(rows, [demand(10, 2), demand(10, 3)]), [
    { templateId: 10, name: "P10", available: 4, requested: 5 },
  ]);
});

test("תערובת: פטור + אזל → רק האזל מוחזר", () => {
  const rows = [
    row({ id: 10, qty_available: 0, is_storable: false }), // פטור
    row({ id: 20, name: "Egg", qty_available: 1, is_storable: true }), // אזל מול 4
  ];
  const out = computeShortages(rows, [demand(10, 5), demand(20, 4)]);
  assert.deepEqual(out, [{ templateId: 20, name: "Egg", available: 1, requested: 4 }]);
});
