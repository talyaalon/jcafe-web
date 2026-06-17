"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Product } from "@/lib/odoo/types";
import { formatTHB } from "@/lib/format";

// כרטיס אופקי לחנויות מטבח (מסעדה): תמונה | שם+תיאור+מחיר | "Add to cart".
export function ProductRowCard({
  product,
  locale,
  dict,
  onOpen,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
  onOpen: (p: Product) => void;
}) {
  const name = locale === "he" ? product.nameHe : product.nameEn;
  const desc = locale === "he" ? product.descHe : product.descEn;
  const [imgOk, setImgOk] = useState(true);

  return (
    <div
      onClick={() => onOpen(product)}
      className="flex gap-3 border border-line rounded-xl p-3 bg-white cursor-pointer transition hover:shadow-md"
    >
      <div className="w-24 h-24 rounded-lg bg-soft grid place-items-center overflow-hidden flex-none">
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
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="font-bold text-ink text-sm leading-tight">{name}</div>
        {desc && <div className="text-ink/55 text-[12px] mt-1 line-clamp-2">{desc}</div>}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-extrabold text-ink text-sm">{formatTHB(product.price)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(product);
            }}
            className="border border-line text-ink/70 rounded-lg px-3.5 py-1.5 text-xs font-bold transition hover:border-wine hover:text-wine"
          >
            {dict.product.add}
          </button>
        </div>
      </div>
    </div>
  );
}
