import type { Store, Category, Product } from "./types";

// ===== נתוני דמה — יוחלפו בקריאות ODOO אמיתיות דרך ה-adapter =====

export const stores: Store[] = [
  { id: "s_meat", slug: "meat", nameHe: "הבשרית", nameEn: "Meat", type: "kitchen", emoji: "🥩", order: 1, kitchenTag: "kitchen_meat" },
  { id: "s_dairy", slug: "dairy", nameHe: "החלבית", nameEn: "Dairy", type: "kitchen", emoji: "🧀", order: 2, kitchenTag: "kitchen_dairy" },
  { id: "s_roti", slug: "roti", nameHe: "בננה רוטי", nameEn: "Banana Roti", type: "kitchen", emoji: "🍌", order: 3, kitchenTag: "kitchen_roti" },
  { id: "s_grocery", slug: "grocery", nameHe: "מכולת", nameEn: "Grocery", type: "grocery", emoji: "🛒", order: 4 },
];

export const categories: Category[] = [
  // מכולת
  { id: "c_snacks", slug: "snacks", nameHe: "חטיפים ומתוקים", nameEn: "Sweets & Snacks", storeId: "s_grocery" },
  { id: "c_grocery", slug: "grocery", nameHe: "מכולת", nameEn: "Grocery", storeId: "s_grocery" },
  { id: "c_tahina", slug: "tahina", nameHe: "טחינה", nameEn: "Tahina", storeId: "s_grocery" },
  { id: "c_frozen", slug: "frozen", nameHe: "קפואים", nameEn: "Frozen", storeId: "s_grocery" },
  { id: "c_bakery", slug: "bakery", nameHe: "מאפים", nameEn: "Bakery", storeId: "s_grocery" },
  // הבשרית
  { id: "c_meat_mains", slug: "mains", nameHe: "מנות עיקריות", nameEn: "Mains", storeId: "s_meat" },
  { id: "c_meat_sides", slug: "sides", nameHe: "תוספות", nameEn: "Sides", storeId: "s_meat" },
  // החלבית
  { id: "c_dairy_pizza", slug: "pizza", nameHe: "פיצות", nameEn: "Pizza", storeId: "s_dairy" },
  { id: "c_dairy_mains", slug: "mains", nameHe: "מנות חלביות", nameEn: "Dairy mains", storeId: "s_dairy" },
  // בננה רוטי
  { id: "c_roti_classic", slug: "classic", nameHe: "קלאסי", nameEn: "Classic", storeId: "s_roti" },
  { id: "c_roti_special", slug: "special", nameHe: "ספיישלים", nameEn: "Specials", storeId: "s_roti" },
];

export const products: Product[] = [
  // ===== מכולת (grocery) =====
  { id: "p_bamba", storeId: "s_grocery", categoryId: "c_snacks", nameHe: "במבה אסם", nameEn: "Bamba - Peanut Puff Snack (Osem)", descHe: "חטיף בוטנים קלאסי", descEn: "Classic peanut puff snack", price: 35, weight: "100g", qtyAvailable: 120, isKitchen: false, isFeatured: true, barcode: "7290000000011" },
  { id: "p_bissli", storeId: "s_grocery", categoryId: "c_snacks", nameHe: "ביסלי גריל", nameEn: "Bissli Grill (Osem)", price: 32, weight: "70g", qtyAvailable: 80, isKitchen: false, isFeatured: false, barcode: "7290000000028" },
  { id: "p_hummus", storeId: "s_grocery", categoryId: "c_grocery", nameHe: "חומוס אחלה", nameEn: "Ahla Hummus", price: 60, weight: "400g", qtyAvailable: 45, isKitchen: false, isFeatured: true, barcode: "7290000000035" },
  { id: "p_tahina", storeId: "s_grocery", categoryId: "c_tahina", nameHe: "טחינה הר ברכה", nameEn: "Har Bracha Tahini", price: 95, weight: "500g", qtyAvailable: 30, isKitchen: false, isFeatured: false, barcode: "7290000000042" },
  { id: "p_cottage", storeId: "s_grocery", categoryId: "c_grocery", nameHe: "קוטג' תנובה", nameEn: "Tnuva Cottage Cheese", price: 48, weight: "250g", qtyAvailable: 0, isKitchen: false, isFeatured: false, barcode: "7290000000059" },
  { id: "p_pita", storeId: "s_grocery", categoryId: "c_bakery", nameHe: "פיתות (6 יח')", nameEn: "Pita Bread (6pc)", price: 40, weight: "6pc", qtyAvailable: 60, isKitchen: false, isFeatured: false, barcode: "7290000000066" },
  { id: "p_schnitzel", storeId: "s_grocery", categoryId: "c_frozen", nameHe: "שניצל עוף קפוא", nameEn: "Frozen Chicken Schnitzel", price: 180, weight: "700g", qtyAvailable: 22, isKitchen: false, isFeatured: true, barcode: "7290000000073" },
  { id: "p_falafel", storeId: "s_grocery", categoryId: "c_frozen", nameHe: "פלאפל קפוא", nameEn: "Frozen Falafel", price: 70, weight: "800g", qtyAvailable: 18, isKitchen: false, isFeatured: false, barcode: "7290000000080" },

  // ===== הבשרית (kitchen) =====
  { id: "p_shawarma", storeId: "s_meat", categoryId: "c_meat_mains", nameHe: "שווארמה בלאפה", nameEn: "Shawarma in Laffa", descHe: "שווארמה הודו עם סלטים", descEn: "Turkey shawarma with salads", price: 180, qtyAvailable: null, isKitchen: true, isFeatured: true },
  { id: "p_kebab", storeId: "s_meat", categoryId: "c_meat_mains", nameHe: "קבב על האש", nameEn: "Grilled Kebab", price: 165, qtyAvailable: null, isKitchen: true, isFeatured: false },
  { id: "p_chips", storeId: "s_meat", categoryId: "c_meat_sides", nameHe: "צ'יפס", nameEn: "French Fries", price: 45, qtyAvailable: null, isKitchen: true, isFeatured: false },

  // ===== החלבית (kitchen) =====
  { id: "p_pizza_margherita", storeId: "s_dairy", categoryId: "c_dairy_pizza", nameHe: "פיצה מרגריטה", nameEn: "Margherita Pizza", price: 220, qtyAvailable: null, isKitchen: true, isFeatured: true },
  { id: "p_shakshuka", storeId: "s_dairy", categoryId: "c_dairy_mains", nameHe: "שקשוקה", nameEn: "Shakshuka", price: 95, qtyAvailable: null, isKitchen: true, isFeatured: false },

  // ===== בננה רוטי (kitchen) =====
  { id: "p_roti_classic", storeId: "s_roti", categoryId: "c_roti_classic", nameHe: "בננה רוטי קלאסי", nameEn: "Classic Banana Roti", price: 90, qtyAvailable: null, isKitchen: true, isFeatured: true },
  { id: "p_roti_nutella", storeId: "s_roti", categoryId: "c_roti_special", nameHe: "רוטי נוטלה", nameEn: "Nutella Roti", price: 110, qtyAvailable: null, isKitchen: true, isFeatured: false },
];
