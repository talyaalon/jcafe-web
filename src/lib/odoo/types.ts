// ===== Domain types (תואמים לישויות ODOO; שכבת ה-adapter ממירה ביניהם) =====

export type StoreType = "grocery" | "kitchen";

export interface Store {
  id: string;
  slug: string;
  nameHe: string;
  nameEn: string;
  type: StoreType; // grocery = ליקוט בסריקה · kitchen = KDS
  emoji: string;
  order: number;
  /** לוגו מותאם לחנות (מצד מנהל) — מוצג בלשונית החנות */
  logo?: string | null;
  /** kitchen tag ב-ODOO לניתוב ל-KDS (רק לחנויות מטבח) */
  kitchenTag?: string;
}

export interface Category {
  id: string;
  slug: string;
  nameHe: string;
  nameEn: string;
  storeId: string;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  nameHe: string;
  nameEn: string;
  descHe?: string;
  descEn?: string;
  price: number; // THB
  weight?: string;
  /** מלאי אמיתי מ-ODOO; null = מנת מטבח (ללא מלאי מספרי) */
  qtyAvailable: number | null;
  isKitchen: boolean;
  isFeatured: boolean;
  /** למוצר יש אפשרויות בחירה (סוג לחם / תוספות) — נפתח חלון בחירה לפני הוספה לסל */
  hasOptions?: boolean;
  barcode?: string;
  /** URL לתמונת המוצר מ-ODOO (/web/image/...) */
  image?: string;
}

// ===== ODOO Adapter — ממשק אחיד (מומש ב-mock ו-api) =====
export interface OdooAdapter {
  getStores(): Promise<Store[]>;
  getCategories(storeId: string): Promise<Category[]>;
  getProducts(opts: {
    storeId: string;
    categoryId?: string;
    search?: string;
  }): Promise<Product[]>;
}
