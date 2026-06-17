"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatTHB } from "@/lib/format";
import { useCart } from "@/lib/cart/CartContext";
import { CartThumb } from "./CartThumb";

export function CartPanel({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { items, subtotal, inc, dec, remove, clear } = useCart();
  const pName = (p: { nameHe: string; nameEn: string }) =>
    locale === "he" ? p.nameHe : p.nameEn;
  const orderTotal = locale === "he" ? 'סה"כ הזמנה' : "Order total";

  if (items.length === 0) {
    return (
      <aside className="border border-line rounded-lg p-6 bg-white text-center h-fit sticky top-4">
        <div className="font-extrabold text-ink text-lg text-start">{dict.cart.yourOrder}</div>
        <div className="text-4xl text-wine/30 mt-6">🛒</div>
        <p className="text-ink/55 text-sm mt-3 mb-6">
          {dict.cart.empty}
          <br />
          {dict.cart.emptyHint}
        </p>
        <button className="w-full bg-soft border border-line text-ink/40 font-bold rounded-lg py-3 text-sm cursor-not-allowed">
          {dict.cart.checkout}
        </button>
      </aside>
    );
  }

  return (
    <aside className="border border-line rounded-lg bg-white sticky top-4 flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden">
      {/* header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-line">
        <div>
          <h2 className="font-extrabold text-ink text-lg leading-tight">{dict.cart.yourOrder}</h2>
          <p className="text-[12px] text-ink/50 mt-0.5">Jcafe Phuket</p>
        </div>
        <button onClick={clear} aria-label={dict.cart.remove} className="text-ink/40 hover:text-red-500">
          🗑
        </button>
      </div>

      {/* scrollable items */}
      <div className="flex-1 overflow-y-auto divide-y divide-line">
        {items.map(({ product, qty }) => (
          <div key={product.id} className="flex gap-3 px-4 py-3">
            <CartThumb src={product.image} alt={pName(product)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] leading-tight line-clamp-2">{pName(product)}</span>
                <button
                  onClick={() => remove(product.id)}
                  className="text-ink/40 hover:text-red-500 flex-none"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2.5 border border-wine rounded-lg px-2 py-0.5 text-wine">
                  <button onClick={() => dec(product.id)} className="font-bold w-4">−</button>
                  <span className="text-xs font-bold w-4 text-center">{qty}</span>
                  <button onClick={() => inc(product.id)} className="font-bold w-4">+</button>
                </div>
                <div className="text-end leading-tight">
                  <div className="font-bold text-sm">{formatTHB(product.price * qty)}</div>
                  <div className="text-[10px] text-ink/45">
                    {formatTHB(product.price)} {locale === "he" ? "ליח׳" : "/ea"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="border-t border-line px-4 py-3">
        <div className="flex justify-between py-0.5 text-[13px]">
          <span>{dict.cart.subtotal}</span>
          <span>{formatTHB(subtotal)}</span>
        </div>
        <div className="flex justify-between py-0.5 text-[13px] text-ink/55">
          <span>{dict.cart.delivery}</span>
          <span>{dict.cart.calcAtCheckout}</span>
        </div>
        <div className="flex justify-between pt-2 mt-1 border-t border-line">
          <span className="font-extrabold text-ink">{orderTotal}</span>
          <span className="font-extrabold text-wine">{formatTHB(subtotal)}</span>
        </div>
        <Link
          href={`/${locale}/checkout`}
          className="block text-center bg-wine text-white font-bold rounded-lg py-3 text-sm mt-3 hover:bg-wine-hover"
        >
          {dict.cart.checkout}
        </Link>
      </div>
    </aside>
  );
}
