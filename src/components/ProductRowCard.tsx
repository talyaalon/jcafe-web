"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Product } from "@/lib/odoo/types";
import { formatTHB } from "@/lib/format";
import { useCart } from "@/lib/cart/CartContext";
import { HeartButton } from "./HeartButton";

// כרטיס אופקי לחנויות מטבח: לחיצה על השם/תמונה → Pop-up; "Add to cart" → הוספה מיידית + stepper.
export function ProductRowCard({
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
  const desc = locale === "he" ? product.descHe : product.descEn;
  const [imgOk, setImgOk] = useState(true);
  const { items, inc, dec } = useCart();
  const qty = items.find((i) => i.product.id === product.id)?.qty ?? 0;

  return (
    <div className="relative flex gap-3 border border-line rounded-xl p-3 bg-white transition hover:shadow-md">
      <HeartButton product={product} className="absolute top-2 end-2 z-10" />
      <button
        onClick={() => onOpen(product)}
        className="w-24 h-24 rounded-lg bg-soft grid place-items-center overflow-hidden flex-none"
        aria-label={name}
      >
        {product.image && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={name}
            loading="lazy"
            onError={() => setImgOk(false)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl text-wine/40">🍽️</span>
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col">
        <button
          onClick={() => onOpen(product)}
          className="font-bold text-ink text-sm leading-tight text-start hover:text-wine"
        >
          {name}
        </button>
        {desc && <div className="text-ink/55 text-[12px] mt-1 line-clamp-2">{desc}</div>}

        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-extrabold text-ink text-sm">{formatTHB(product.price)}</span>
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
              onClick={() => onAdd(product)}
              className="border border-wine text-wine rounded-lg px-3.5 py-1.5 text-xs font-bold transition hover:bg-wine hover:text-white"
            >
              {dict.product.add}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
