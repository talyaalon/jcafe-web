import type { OdooAdapter } from "./types";
import { stores, categories, products } from "./mock-data";

// מימוש דמה של ה-adapter (ללא ODOO) — לשימוש בפיתוח/בדיקות.
export const mockAdapter: OdooAdapter = {
  async getStores() {
    return [...stores].sort((a, b) => a.order - b.order);
  },

  async getCategories(storeId) {
    return categories.filter((c) => c.storeId === storeId);
  },

  async getProducts({ storeId, categoryId, search }) {
    let list = products.filter((p) => p.storeId === storeId);
    if (categoryId) list = list.filter((p) => p.categoryId === categoryId);
    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) => p.nameHe.includes(search.trim()) || p.nameEn.toLowerCase().includes(q),
      );
    }
    return list;
  },
};
