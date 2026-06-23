"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatTHB } from "@/lib/format";
import { useCart } from "@/lib/cart/CartContext";
import { branchHref } from "@/lib/branch-slugs";
import { useStoreStatus } from "@/lib/store-status";
import { CartThumb } from "./CartThumb";

export function CartPanel({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { items, subtotal, inc, dec, remove, branchCompany } = useCart();
  const statuses = useStoreStatus(branchCompany);
  const he = locale === "he";
  const pName = (p: { nameHe: string; nameEn: string }) => (he ? p.nameHe : p.nameEn);
  const orderTotal = he ? 'סה"כ הזמנה' : "Order total";

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

  // קיבוץ לפי חנות
  const groupIds = [...new Set(items.map((i) => i.store.id))];
  const groups = groupIds.map((id) => ({
    store: items.find((i) => i.store.id === id)!.store,
    items: items.filter((i) => i.store.id === id),
    closed: statuses[id] === false,
  }));

  return (
    <aside className="border border-line rounded-lg bg-white sticky top-4 flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden">
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-line">
        <div>
          <h2 className="font-extrabold text-ink text-lg leading-tight">{dict.cart.yourOrder}</h2>
          <p className="text-[12px] text-ink/50 mt-0.5">Jcafe Phuket</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.map(({ store, items: gItems, closed }) => (
            <div key={store.id} className="border-b border-line">
              {/* store header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="font-bold text-[13px] text-wine">
                  {he ? store.nameHe : store.nameEn}
                  {closed && (
                    <span className="ms-2 text-[11px] font-bold text-red-500">
                      {he ? "סגור כעת" : "Closed now"}
                    </span>
                  )}
                </span>
              </div>

              {gItems.map(({ product, qty }) => (
                <div key={product.id} className="flex gap-3 px-4 py-2">
                  <CartThumb src={product.image} alt={pName(product)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] leading-tight line-clamp-2">
                        {pName(product)}
                        {product.discountPercent ? (
                          <span className="ms-1 inline-block align-middle bg-red-500 text-white text-[9px] font-extrabold rounded-full px-1.5 py-0.5">
                            -{product.discountPercent}%
                          </span>
                        ) : null}
                      </span>
                      <button
                        onClick={() => remove(product.id)}
                        className="text-ink/40 hover:text-red-500 flex-none"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div dir="ltr" className="flex items-center gap-2.5 border border-wine rounded-lg px-2 py-0.5 text-wine">
                        <button onClick={() => dec(product.id)} className="font-bold w-4">−</button>
                        <span className="text-xs font-bold w-4 text-center">{qty}</span>
                        <button onClick={() => inc(product.id)} className="font-bold w-4">+</button>
                      </div>
                      <div className="text-end leading-tight">
                        <div className="font-bold text-sm">{formatTHB(product.price * qty)}</div>
                        <div className="text-[10px] text-ink/45">
                          {product.discountPercent && product.originalPrice ? (
                            <span className="line-through me-1">{formatTHB(product.originalPrice)}</span>
                          ) : null}
                          {formatTHB(product.price)} {he ? "ליח׳" : "/ea"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {closed && (
                <div className="mx-4 mb-3 mt-1 rounded-lg bg-red-50 border border-red-200 p-2.5 text-[12px] text-red-700">
                  {he
                    ? "החנות סגורה כעת — הסירו את הפריט (✕) או בצעו הזמנה מתוזמנת בתשלום."
                    : "Store closed — remove the item (✕) or schedule the order at checkout."}
                </div>
              )}
            </div>
          ))}
      </div>

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
          className="block text-center w-full bg-wine text-white font-bold rounded-lg py-3 text-sm mt-3 hover:bg-wine-hover"
        >
          {dict.cart.checkout}
        </Link>
        <Link
          href={branchHref(locale, branchCompany)}
          className="block text-center w-full border border-line text-ink/70 rounded-lg py-2.5 text-sm mt-2 hover:border-wine"
        >
          {he ? "המשך קנייה" : "Continue shopping"}
        </Link>
      </div>
    </aside>
  );
}
