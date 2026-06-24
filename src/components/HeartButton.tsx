"use client";

import type { Product } from "@/lib/odoo/types";
import { useFavorites } from "@/lib/favorites/FavoritesContext";
import { useCart } from "@/lib/cart/CartContext";

// כפתור שמירה למועדפים (לב) ליד מוצר.
export function HeartButton({ product, className = "" }: { product: Product; className?: string }) {
  const { isFavorite, toggle } = useFavorites();
  const { branchCompany } = useCart();
  const fav = isFavorite(product.id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        // שומרים את הסניף הנוכחי על המועדף — כדי לדעת לאיזה סל להוסיף בהמשך
        toggle(branchCompany != null ? { ...product, branch: branchCompany } : product);
      }}
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={fav}
      className={`grid place-items-center w-8 h-8 rounded-full bg-white/90 shadow-sm border border-line text-lg leading-none transition ${className}`}
    >
      <span className={fav ? "text-wine" : "text-ink/30"}>{fav ? "♥" : "♡"}</span>
    </button>
  );
}
