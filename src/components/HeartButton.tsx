"use client";

import type { Product } from "@/lib/odoo/types";
import { useFavorites } from "@/lib/favorites/FavoritesContext";

// כפתור שמירה למועדפים (לב) ליד מוצר.
export function HeartButton({ product, className = "" }: { product: Product; className?: string }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle(product);
      }}
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={fav}
      className={`grid place-items-center w-8 h-8 rounded-full bg-white/90 shadow-sm border border-line text-lg leading-none transition ${className}`}
    >
      <span className={fav ? "text-wine" : "text-ink/30"}>{fav ? "♥" : "♡"}</span>
    </button>
  );
}
