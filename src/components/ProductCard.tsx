"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Product } from "@/lib/odoo/types";
import { formatTHB } from "@/lib/format";
import { useCart } from "@/lib/cart/CartContext";

export function ProductCard({
  product,
  locale,
  dict,
  onAdd,
  onOpen,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
  onAdd: (p: Product) => void;
  onOpen: (p: Product) => void;
}) {
  const name = locale === "he" ? product.nameHe : product.nameEn;
  const outOfStock = product.qtyAvailable === 0;
  const [imgOk, setImgOk] = useState(true);
  const { items, inc, dec } = useCart();
  const qty = items.find((i) => i.product.id === product.id)?.qty ?? 0;

  return (
    <div className="border border-line rounded-lg bg-white overflow-hidden flex flex-col transition hover:shadow-[0_8px_22px_rgba(0,0,0,0.08)]">
      {/* image — fixed height, opens modal */}
      <button
        onClick={() => onOpen(product)}
        aria-label={name}
        className="relative h-40 bg-white grid place-items-center p-3 border-b border-line/70"
      >
        {product.image && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={name}
            loading="lazy"
            onError={() => setImgOk(false)}
            className="max-h-full max-w-full object-contain mix-blend-multiply"
          />
        ) : (
          <div className="w-14 h-16 rounded-lg bg-gradient-to-b from-cream to-gold-soft/40 grid place-items-center text-2xl text-wine/50">
            🛍️
          </div>
        )}
        {product.isKitchen && (
          <span className="absolute top-2 start-2 text-[10px] bg-gold-soft/80 text-wine font-bold rounded-full px-2 py-0.5">
            {dict.product.kitchen}
          </span>
        )}
      </button>

      {/* info — fixed structure for uniform height */}
      <div className="px-3 pb-3 pt-2 flex flex-col flex-1">
        <div className="font-extrabold text-[15px] text-ink">{formatTHB(product.price)}</div>
        <button
          onClick={() => onOpen(product)}
          className="text-[13px] text-ink/85 leading-snug mt-1 line-clamp-2 min-h-[2.6em] text-start hover:text-wine"
        >
          {name}
        </button>
        <div className="text-[12px] text-ink/45 mt-1 h-4">
          {outOfStock ? (
            <span className="text-red-600 font-semibold">{dict.product.outOfStock}</span>
          ) : (
            product.weight ?? ""
          )}
        </div>

        <div className="mt-auto pt-2 flex items-center justify-end">
          {qty > 0 ? (
            <div className="flex items-center gap-3 border border-wine rounded-lg px-2.5 py-1 text-wine">
              <button onClick={() => dec(product.id)} className="text-lg leading-none font-bold w-5">
                −
              </button>
              <span className="font-bold text-sm w-4 text-center">{qty}</span>
              <button onClick={() => inc(product.id)} className="text-lg leading-none font-bold w-5">
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => onAdd(product)}
              aria-label={dict.product.add}
              className="w-10 h-10 rounded-lg bg-[#f1eff3] text-ink/40 text-2xl leading-none grid place-items-center transition hover:text-wine active:scale-95 disabled:opacity-40"
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
