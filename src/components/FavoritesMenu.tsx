"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Product } from "@/lib/odoo/types";
import { useFavorites } from "@/lib/favorites/FavoritesContext";
import { useCart, type CartStoreRef } from "@/lib/cart/CartContext";
import { findPhuketStore } from "@/lib/odoo/phuket";
import { formatTHB } from "@/lib/format";
import { CartThumb } from "./CartThumb";

function storeRefFor(p: Product): CartStoreRef {
  const s = findPhuketStore(p.storeId);
  return s
    ? { id: s.id, nameHe: s.nameHe, nameEn: s.nameEn, emoji: s.emoji }
    : { id: p.storeId, nameHe: p.storeId, nameEn: p.storeId, emoji: "" };
}

export function FavoritesMenu({ locale }: { locale: Locale }) {
  const he = locale === "he";
  const { favorites, count, toggle } = useFavorites();
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const pName = (p: Product) => (he ? p.nameHe : p.nameEn);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={he ? "מועדפים" : "Favorites"}
        className="relative flex items-center gap-1.5 hover:text-wine"
      >
        {/* לב SVG עם קו עבה — בולט יותר מתו היוניקוד הדק */}
        <svg
          viewBox="0 0 24 24"
          className={`w-[22px] h-[22px] ${count > 0 ? "text-wine" : "text-ink/60"}`}
          fill={count > 0 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <span className="hidden sm:inline">{he ? "מועדפים" : "Favorites"}</span>
        {count > 0 && (
          <span className="absolute -top-2 -end-2 min-w-[18px] h-[18px] px-1 rounded-full bg-wine text-white text-[10px] font-bold grid place-items-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-3 w-80 max-w-[90vw] bg-white border border-line rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-line font-extrabold text-ink flex items-center justify-between">
              <span>{he ? "המועדפים שלי" : "My favorites"}</span>
              <span className="text-xs text-ink/45">{count}</span>
            </div>

            {favorites.length === 0 ? (
              <div className="p-6 text-center text-ink/50 text-sm">
                {he ? "עדיין לא סימנת מועדפים ♡" : "No favorites yet ♡"}
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-line">
                {favorites.map((p) => (
                  <div key={p.id} className="flex gap-3 px-3 py-2.5 items-center">
                    <CartThumb src={p.image} alt={pName(p)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] leading-tight line-clamp-2">{pName(p)}</div>
                      <div className="text-wine font-bold text-sm mt-0.5">{formatTHB(p.price)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-none">
                      <button
                        onClick={() => addItem(p, storeRefFor(p), 1)}
                        className="bg-wine text-white text-[11px] font-bold rounded-lg px-2.5 py-1 hover:bg-wine-hover"
                      >
                        {he ? "לעגלה" : "Add"}
                      </button>
                      <button
                        onClick={() => toggle(p)}
                        className="text-[11px] text-ink/40 hover:text-red-500"
                      >
                        {he ? "הסר ♥" : "Remove ♥"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
