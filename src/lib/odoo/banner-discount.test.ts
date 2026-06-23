import test from "node:test";
import assert from "node:assert/strict";

// מנוע הנחת באנר משותף — מקור-אמת אחד לחיוב (Stripe), להזמנה (ODOO) ולתצוגה.
import {
  buildDiscountMap,
  discountForItem,
  discountedUnit,
  discountedTotal,
  applyBannerDiscount,
} from "./banner-discount.ts";

// ===== buildDiscountMap =====
test("buildDiscountMap: מוצר עם אחוז>0 → נכנס למפה", () => {
  const m = buildDiscountMap([{ product_id: "1518", discount_percent: 20 }]);
  assert.equal(m.get("1518"), 20);
});

test("buildDiscountMap: אחוז 0/null/חסר או product_id חסר → לא נכנס", () => {
  const m = buildDiscountMap([
    { product_id: "1", discount_percent: 0 },
    { product_id: "2", discount_percent: null },
    { product_id: "3" },
    { product_id: null, discount_percent: 20 },
  ]);
  assert.equal(m.size, 0);
});

test("buildDiscountMap: תקרת 90%", () => {
  const m = buildDiscountMap([{ product_id: "9", discount_percent: 150 }]);
  assert.equal(m.get("9"), 90);
});

// ===== discountForItem (מזהה עם וריאנט "templateId|opt") =====
test("discountForItem: מזהה רגיל", () => {
  const m = buildDiscountMap([{ product_id: "1518", discount_percent: 20 }]);
  assert.equal(discountForItem("1518", m), 20);
});

test("discountForItem: מזהה עם וריאנט → מתקלף ל-template", () => {
  const m = buildDiscountMap([{ product_id: "1518", discount_percent: 20 }]);
  assert.equal(discountForItem("1518|cheese", m), 20);
});

test("discountForItem: מוצר ללא הנחה → 0", () => {
  const m = buildDiscountMap([{ product_id: "1518", discount_percent: 20 }]);
  assert.equal(discountForItem("999", m), 0);
});

// ===== discountedUnit (אותו עיגול כמו ODOO orders) =====
test("discountedUnit: 100 ב-20% → 80", () => {
  assert.equal(discountedUnit(100, 20), 80);
});

test("discountedUnit: 365 ב-15% → 310.25 (המקרה האמיתי של Talya)", () => {
  assert.equal(discountedUnit(365, 15), 310.25);
});

test("discountedUnit: 0% → ללא שינוי", () => {
  assert.equal(discountedUnit(365, 0), 365);
});

// ===== discountedTotal (סכום מוזל — חייב להיות זהה בין החיוב לבין ההזמנה) =====
test("discountedTotal: עגלה מעורבת (מוזל + מלא) עם כמויות", () => {
  const map = buildDiscountMap([{ product_id: "1518", discount_percent: 20 }]);
  const priced = [
    { unitPrice: 100, qty: 2 }, // 1518: 80×2 = 160
    { unitPrice: 50, qty: 1 }, // 999: 50×1 = 50 (ללא הנחה)
  ];
  const ids = ["1518", "999"];
  assert.equal(discountedTotal(priced, ids, map), 210);
});

test("discountedTotal: בלי הנחות כלל → כמו הסכום הרגיל", () => {
  const priced = [{ unitPrice: 100, qty: 1 }];
  assert.equal(discountedTotal(priced, ["7"], new Map()), 100);
});

// ===== applyBannerDiscount (תצוגה — מחיר מקורי + מוזל + אחוז) =====
test("applyBannerDiscount: מוצר עם הנחה → price מוזל + originalPrice + discountPercent", () => {
  const map = buildDiscountMap([{ product_id: "1518", discount_percent: 20 }]);
  const out = applyBannerDiscount({ id: "1518", price: 100, nameHe: "פיצה" }, map);
  assert.equal(out.price, 80);
  assert.equal(out.originalPrice, 100);
  assert.equal(out.discountPercent, 20);
  assert.equal(out.nameHe, "פיצה"); // שאר השדות נשמרים
});

test("applyBannerDiscount: מוצר ללא הנחה → ללא שינוי (בלי originalPrice/discountPercent)", () => {
  const map = buildDiscountMap([{ product_id: "1518", discount_percent: 20 }]);
  const out = applyBannerDiscount({ id: "999", price: 100 }, map);
  assert.equal(out.price, 100);
  assert.equal(out.originalPrice, undefined);
  assert.equal(out.discountPercent, undefined);
});

test("applyBannerDiscount: אותו עיגול כמו החיוב (365 ב-15% → 310.25)", () => {
  const map = buildDiscountMap([{ product_id: "1518", discount_percent: 15 }]);
  const out = applyBannerDiscount({ id: "1518", price: 365 }, map);
  assert.equal(out.price, 310.25);
  assert.equal(out.originalPrice, 365);
});
