"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { branchHref } from "@/lib/branch-slugs";
import { useCart, type CartItem } from "./CartContext";
import { cartStorageKey, cartBackupKey } from "./cart-storage";

export interface ReorderItem {
  name: string;
  qty: number;
  price?: number;
  storeName: string;
  storeId: string;
  templateId?: number;
  image?: string;
}
export interface ReorderOrder {
  company: number | null;
  items: ReorderItem[];
}

// "הזמנה חוזרת": מגבה את הסל הקיים של הסניף (יוחזר אחרי התשלום), פותח עגלה חדשה עם
// פריטי ההזמנה, ומנווט לחנות הסניף עם העגלה פתוחה (?cart=1).
export function useReorder(locale: Locale) {
  const router = useRouter();
  const { replaceCart } = useCart();

  return (o: ReorderOrder) => {
    if (o.company == null) return;
    const branch = o.company;
    try {
      const cur = localStorage.getItem(cartStorageKey(branch));
      if (cur && (JSON.parse(cur) as unknown[]).length) {
        localStorage.setItem(cartBackupKey(branch), cur);
      } else {
        localStorage.removeItem(cartBackupKey(branch));
      }
    } catch {
      /* ignore */
    }
    const items: CartItem[] = o.items.map((it) => ({
      product: {
        id: String(it.templateId ?? it.name),
        storeId: it.storeId,
        categoryId: "",
        nameHe: it.name,
        nameEn: it.name,
        price: it.price ?? 0,
        qtyAvailable: null,
        isKitchen: it.storeId !== "grocery",
        isFeatured: false,
        image: it.image,
      },
      qty: it.qty,
      store: { id: it.storeId, nameHe: it.storeName, nameEn: it.storeName, emoji: "" },
      branch,
    }));
    replaceCart(branch, items);
    router.push(`${branchHref(locale, branch)}?cart=1`);
  };
}
