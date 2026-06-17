"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Product } from "@/lib/odoo/types";
import { formatTHB } from "@/lib/format";

// TODO: לשלוף תוספות אמיתיות מ-ODOO (product attributes / combos).
// כרגע placeholder למנות מטבח כדי להציג את עיצוב ה-Pop-up.
function kitchenModifiers(locale: Locale) {
  const he = locale === "he";
  return {
    bread: {
      title: he ? "סוג לחם" : "Bread type",
      pick: he ? "בחר/י 1" : "Pick 1",
      options: [
        { id: "b1", label: he ? "לחם מלא" : "Whole Grain Bread", price: 25 },
        { id: "b2", label: he ? "פיתה" : "Pita", price: 0 },
        { id: "b3", label: he ? "לאפה" : "Laffa", price: 0 },
      ],
    },
    toppings: {
      title: he ? "תוספות" : "Toppings",
      max: 2,
      note: he ? "אופציונלי, עד 2" : "Optional max 2",
      options: [
        { id: "t1", label: he ? "טחינה" : "Tahini", price: 25 },
        { id: "t2", label: he ? "עמבה" : "Amba", price: 25 },
        { id: "t3", label: he ? "חריף" : "Spicy", price: 0 },
      ],
    },
  };
}

export function ProductModal({
  product,
  locale,
  dict,
  onClose,
  onAdd,
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
  onClose: () => void;
  onAdd: (product: Product, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const name = locale === "he" ? product.nameHe : product.nameEn;
  const outOfStock = product.qtyAvailable === 0;
  const mods = useMemo(() => kitchenModifiers(locale), [locale]);
  const [bread, setBread] = useState(mods.bread.options[0].id);
  const [toppings, setToppings] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const breadPrice = mods.bread.options.find((o) => o.id === bread)?.price ?? 0;
  const topPrice = toppings.reduce(
    (s, id) => s + (mods.toppings.options.find((o) => o.id === id)?.price ?? 0),
    0,
  );
  const unit = product.price + (product.isKitchen ? breadPrice + topPrice : 0);

  function toggleTopping(id: string) {
    setToppings((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= mods.toppings.max
          ? prev
          : [...prev, id],
    );
  }

  function add() {
    const chosen: Product = product.isKitchen
      ? {
          ...product,
          id: `${product.id}|${bread}|${[...toppings].sort().join(",")}`,
          price: unit,
        }
      : product;
    onAdd(chosen, qty);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* image */}
        <div className="relative h-52 grid place-items-center bg-white p-4 flex-none">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
          ) : (
            <div className="w-24 h-28 rounded-xl bg-gradient-to-b from-cream to-gold-soft/40 grid place-items-center text-3xl text-wine">
              🛍️
            </div>
          )}
          <button
            onClick={onClose}
            aria-label={dict.modal.close}
            className="absolute top-3 end-3 w-8 h-8 rounded-full bg-white/90 text-ink/70 font-bold shadow grid place-items-center"
          >
            ✕
          </button>
        </div>

        {/* scrollable body */}
        <div className="px-5 py-4 overflow-y-auto">
          <h3 className="font-extrabold text-lg text-ink">{name}</h3>
          <div className="text-wine font-extrabold text-lg mt-1">{formatTHB(product.price)}</div>
          {product.weight && <div className="text-ink/55 text-sm mt-0.5">{product.weight}</div>}

          {product.isKitchen && (
            <>
              <p className="text-ink/60 text-[13px] mt-3">
                {locale === "he"
                  ? "מנת מטבח טרייה המוכנה בהזמנה."
                  : "Freshly prepared, made to order."}
              </p>

              {/* bread (Pick 1) */}
              <Group title={mods.bread.title} badge={mods.bread.pick}>
                {mods.bread.options.map((o) => (
                  <Row key={o.id} onClick={() => setBread(o.id)}>
                    <Radio checked={bread === o.id} />
                    <span className="flex-1">{o.label}</span>
                    <span className="text-ink/55 text-[13px]">+{o.price}</span>
                  </Row>
                ))}
              </Group>

              {/* toppings (Optional max N) */}
              <Group title={mods.toppings.title} badge={mods.toppings.note}>
                {mods.toppings.options.map((o) => {
                  const on = toppings.includes(o.id);
                  return (
                    <Row key={o.id} onClick={() => toggleTopping(o.id)}>
                      <Check checked={on} />
                      <span className="flex-1">{o.label}</span>
                      <span className="text-ink/55 text-[13px]">+{o.price}</span>
                    </Row>
                  );
                })}
              </Group>
            </>
          )}
        </div>

        {/* fixed action bar */}
        <div className="px-5 py-4 border-t border-line flex items-center gap-3 flex-none">
          {outOfStock ? (
            <span className="text-red-600 font-semibold text-sm">{dict.product.outOfStock}</span>
          ) : (
            <>
              <div className="flex items-center gap-3 border-2 border-wine rounded-full px-3 py-2 text-wine flex-none">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="text-lg leading-none font-bold w-5">
                  −
                </button>
                <span className="w-5 text-center font-bold">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="text-lg leading-none font-bold w-5">
                  +
                </button>
              </div>
              <button
                onClick={add}
                className="flex-1 bg-wine text-white font-bold rounded-full py-3 hover:bg-wine-hover"
              >
                {dict.modal.addFor} {formatTHB(unit * qty)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Group({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-bold text-ink text-sm">{title}</h4>
        <span className="text-[10px] font-bold text-wine bg-wine/10 rounded-full px-2 py-0.5">{badge}</span>
      </div>
      {children}
    </div>
  );
}
function Row({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-2 text-sm text-start border-b border-line/60 last:border-0">
      {children}
    </button>
  );
}
function Radio({ checked }: { checked: boolean }) {
  return (
    <span className={`w-4 h-4 rounded-full border-2 grid place-items-center flex-none ${checked ? "border-wine" : "border-line"}`}>
      {checked && <span className="w-2 h-2 rounded-full bg-wine" />}
    </span>
  );
}
function Check({ checked }: { checked: boolean }) {
  return (
    <span className={`w-4 h-4 rounded border-2 grid place-items-center flex-none ${checked ? "border-wine bg-wine text-white" : "border-line"}`}>
      {checked && <span className="text-[10px] leading-none">✓</span>}
    </span>
  );
}
