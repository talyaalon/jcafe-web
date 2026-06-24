import type { Product } from "@/lib/odoo/types";
import { findPhuketStore } from "@/lib/odoo/phuket";
import type { CartStoreRef } from "./CartContext";

// בניית CartStoreRef ממוצר (לפי storeId) — משותף ל-FavoritesMenu ו-AccountView.
export function storeRefFor(p: Product): CartStoreRef {
  const s = findPhuketStore(p.storeId);
  return s
    ? { id: s.id, nameHe: s.nameHe, nameEn: s.nameEn, emoji: s.emoji }
    : { id: p.storeId, nameHe: p.storeId, nameEn: p.storeId, emoji: "" };
}
