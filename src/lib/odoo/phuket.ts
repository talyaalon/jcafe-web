import type { Store } from "./types";

// ===== הגדרת סניף פוקט: חברה + מיפוי חנות → pos.config =====
export const PHUKET_COMPANY_ID = 14;
// מחירון "Phuket Shop (THB)" — חל על כל ה-pos.config של פוקט
export const PHUKET_PRICELIST_ID = 11;

export interface PhuketStore extends Store {
  /** מזהה ה-pos.config ב-ODOO שמגדיר את החנות (קטגוריות + מחירון) */
  posConfigId: number;
}

// מיפוי שאושר: כל חנות = pos.config של חברת פוקט (14).
export const phuketStores: PhuketStore[] = [
  { id: "meat", posConfigId: 20, slug: "meat", nameHe: "הבשרית", nameEn: "Meat", type: "kitchen", emoji: "🥩", order: 1, kitchenTag: "kitchen_meat" },
  { id: "dairy", posConfigId: 21, slug: "dairy", nameHe: "החלבית", nameEn: "Dairy", type: "kitchen", emoji: "🧀", order: 2, kitchenTag: "kitchen_dairy" },
  { id: "roti", posConfigId: 33, slug: "roti", nameHe: "בננה רוטי", nameEn: "Banana Roti", type: "kitchen", emoji: "🍌", order: 3, kitchenTag: "kitchen_roti" },
  { id: "grocery", posConfigId: 30, slug: "grocery", nameHe: "מכולת", nameEn: "Grocery", type: "grocery", emoji: "🛒", order: 4 },
];

export const findPhuketStore = (id: string) =>
  phuketStores.find((s) => s.id === id);
