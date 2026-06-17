"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatTHB } from "@/lib/format";
import { useCart, type CartStoreRef } from "@/lib/cart/CartContext";
import { useStoreStatus } from "@/lib/store-status";
import { minDateTime, prettyDateTime } from "@/lib/schedule";
import { CartThumb } from "./CartThumb";

// סל נשלף (slide-over) — מובייל/טאבלט. נפתח מהסרגל הדביק או מאייקון העגלה.
export function CartDrawer({
  open,
  onClose,
  locale,
  dict,
}: {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  dict: Dictionary;
}) {
  const { items, subtotal, count, inc, dec, remove, removeStore, clear, schedules, setSchedule, clearSchedule } =
    useCart();
  const statuses = useStoreStatus();
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const he = locale === "he";
  const storeName = (s: CartStoreRef) => (he ? s.nameHe : s.nameEn);
  const pName = (p: { nameHe: string; nameEn: string }) => (he ? p.nameHe : p.nameEn);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  const groupIds = [...new Set(items.map((i) => i.store.id))];
  const groups = groupIds.map((id) => ({
    store: items.find((i) => i.store.id === id)!.store,
    items: items.filter((i) => i.store.id === id),
    closed: statuses[id] === false,
  }));

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div
        className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <button onClick={onClose} aria-label={dict.modal.close} className="text-ink/60 text-lg">
            ✕
          </button>
          <div className="text-center">
            <div className="font-extrabold text-ink text-sm">{dict.cart.yourOrder}</div>
            <div className="text-[11px] text-ink/50">Jcafe Phuket</div>
          </div>
          <button
            onClick={clear}
            aria-label={dict.cart.remove}
            className="text-ink/50 hover:text-red-500"
          >
            🗑
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center text-center px-6">
            <div>
              <div className="text-5xl text-wine/30">🛒</div>
              <p className="text-ink/60 text-sm mt-3">{dict.cart.empty}</p>
              <p className="text-ink/45 text-sm">{dict.cart.emptyHint}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-2 text-sm font-bold text-ink border-b border-line">
                {count} {dict.cart.items}
              </div>
              {groups.map(({ store, items: gItems, closed }) => (
                <div key={store.id}>
                  <div className="px-4 py-2 text-[12px] font-bold text-wine bg-soft">
                    {store.emoji} {storeName(store)}
                    {closed && (
                      <span className="ms-2 text-red-500">{he ? "סגור כעת" : "Closed now"}</span>
                    )}
                  </div>
                  {gItems.map(({ product, qty }) => (
                    <div key={product.id} className="flex gap-3 px-4 py-3 border-b border-line">
                      <CartThumb src={product.image} alt={pName(product)} />
                      <div className="flex-1">
                        <div className="text-[13px] leading-tight line-clamp-2">{pName(product)}</div>
                        {product.weight && (
                          <div className="text-[11px] text-ink/45 mt-0.5">{product.weight}</div>
                        )}
                        <div className="flex items-center gap-2.5 mt-1.5 border-2 border-wine rounded-full px-2 py-0.5 w-fit text-wine">
                          <button onClick={() => dec(product.id)} className="font-bold w-4">−</button>
                          <span className="text-xs font-bold w-4 text-center">{qty}</span>
                          <button onClick={() => inc(product.id)} className="font-bold w-4">+</button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => remove(product.id)}
                          className="text-ink/40 hover:text-red-500"
                        >
                          ✕
                        </button>
                        <span className="font-bold text-sm">{formatTHB(product.price * qty)}</span>
                      </div>
                    </div>
                  ))}
                  {closed && (
                    <div className="mx-4 my-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5">
                      {schedules[store.id] ? (
                        <div className="text-[12px] text-amber-800">
                          <div className="font-bold">
                            🗓 {he ? "מתוזמן ל:" : "Scheduled for:"} {prettyDateTime(schedules[store.id])}
                          </div>
                          <button onClick={() => clearSchedule(store.id)} className="text-wine font-bold mt-1">
                            {he ? "בטל תזמון" : "Clear"}
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-[12px] text-amber-800 mb-2">
                            {he
                              ? "החנות סגורה כעת. הסירו את הפריטים או תזמנו את ההזמנה."
                              : "Store is closed now. Remove items or schedule the order."}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => removeStore(store.id)}
                              className="text-[12px] font-bold text-red-600 border border-red-200 rounded-lg px-2.5 py-1"
                            >
                              {he ? "הסר פריטים" : "Remove items"}
                            </button>
                            <button
                              onClick={() => setPickerFor(pickerFor === store.id ? null : store.id)}
                              className="text-[12px] font-bold text-white bg-wine rounded-lg px-2.5 py-1"
                            >
                              🗓 {he ? "תזמן" : "Schedule"}
                            </button>
                          </div>
                          {pickerFor === store.id && (
                            <input
                              type="datetime-local"
                              min={minDateTime()}
                              onChange={(e) => {
                                if (e.target.value) {
                                  setSchedule(store.id, e.target.value);
                                  setPickerFor(null);
                                }
                              }}
                              className="mt-2 w-full border border-line rounded-lg px-2 py-1.5 text-sm"
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* footer */}
            <div className="border-t border-line p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="font-extrabold text-ink">{dict.cart.total}</span>
                <span className="font-extrabold text-wine text-lg">{formatTHB(subtotal)}</span>
              </div>
              <p className="text-[11px] text-ink/50 text-end mb-3">
                + {dict.cart.delivery} · {locale === "he" ? "לפי מיקום" : "calculated at checkout"}
              </p>
              <Link
                href={`/${locale}/checkout`}
                onClick={onClose}
                className="block text-center bg-wine text-white font-bold rounded-xl py-3.5 hover:bg-wine-hover"
              >
                {dict.checkout.placeOrder}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
