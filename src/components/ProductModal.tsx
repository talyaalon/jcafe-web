"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Product } from "@/lib/odoo/types";
import { formatTHB } from "@/lib/format";

interface ModGroup {
  id: string;
  name: string;
  type: "radio" | "multi";
  options: { id: string; label: string; price: number }[];
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
  const baseId = String(product.id).split("|")[0];
  const name = locale === "he" ? product.nameHe : product.nameEn;
  const desc = locale === "he" ? product.descHe : product.descEn;
  const outOfStock = product.qtyAvailable === 0;

  const [qty, setQty] = useState(1);
  const [groups, setGroups] = useState<ModGroup[]>([]);
  const [sel, setSel] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // שליפת תוספות אמיתיות מ-ODOO (רק אם המוצר מוגדר כך).
  useEffect(() => {
    let active = true;
    fetch(`/api/products/options?tmplId=${baseId}`)
      .then((r) => r.json())
      .then((d: { groups?: ModGroup[] }) => {
        if (!active) return;
        const gs = d.groups ?? [];
        setGroups(gs);
        const init: Record<string, string[]> = {};
        for (const g of gs) init[g.id] = g.type === "radio" && g.options[0] ? [g.options[0].id] : [];
        setSel(init);
      })
      .catch(() => active && setGroups([]));
    return () => {
      active = false;
    };
  }, [baseId]);

  function toggle(g: ModGroup, optId: string) {
    setSel((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.type === "radio") return { ...prev, [g.id]: [optId] };
      return { ...prev, [g.id]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
    });
  }

  const extra = groups.reduce(
    (s, g) => s + (sel[g.id] ?? []).reduce((a, id) => a + (g.options.find((o) => o.id === id)?.price ?? 0), 0),
    0,
  );
  const unit = product.price + extra;

  function add() {
    const valueIds = groups.flatMap((g) => sel[g.id] ?? []).sort();
    const labels = groups.flatMap((g) =>
      (sel[g.id] ?? []).map((id) => g.options.find((o) => o.id === id)?.label).filter(Boolean),
    );
    const suffix = labels.length ? ` (${labels.join(", ")})` : "";
    const chosen: Product =
      groups.length > 0
        ? {
            ...product,
            id: `${baseId}|${valueIds.join(",")}`,
            price: unit,
            nameEn: product.nameEn + suffix,
            nameHe: product.nameHe + suffix,
          }
        : product;
    onAdd(chosen, qty);
    onClose();
  }

  const pickLabel = (g: ModGroup) =>
    g.type === "radio" ? (locale === "he" ? "בחר/י 1" : "Pick 1") : locale === "he" ? "אופציונלי" : "Optional";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* image (fixed) */}
        <div className="relative h-44 grid place-items-center bg-white p-4 flex-none border-b border-line">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
          ) : (
            <div className="w-24 h-28 rounded-xl bg-gradient-to-b from-cream to-gold-soft/40 grid place-items-center text-3xl text-wine">
              🍽️
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

        {/* name + price (fixed) */}
        <div className="px-5 pt-3 flex-none">
          <h3 className="font-extrabold text-lg text-ink leading-tight">{name}</h3>
          <div className="text-wine font-extrabold text-lg mt-0.5">{formatTHB(product.price)}</div>
          {product.weight && <div className="text-ink/55 text-sm">{product.weight}</div>}
        </div>

        {/* scrollable: description + modifier groups */}
        <div className="px-5 py-3 flex-1 min-h-0 overflow-y-auto">
          {desc && <p className="text-ink/60 text-[13px] leading-relaxed">{desc}</p>}

          {groups.map((g) => (
            <div key={g.id} className="mt-4 border-t border-line pt-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-bold text-ink text-sm">{g.name}</h4>
                <span className="text-[10px] font-bold text-wine bg-wine/10 rounded-full px-2 py-0.5">
                  {pickLabel(g)}
                </span>
              </div>
              {g.options.map((o) => {
                const on = (sel[g.id] ?? []).includes(o.id);
                return (
                  <button
                    key={o.id}
                    onClick={() => toggle(g, o.id)}
                    className="w-full flex items-center gap-3 py-2 text-sm text-start border-b border-line/60 last:border-0"
                  >
                    {g.type === "radio" ? (
                      <span
                        className={`w-4 h-4 rounded-full border-2 grid place-items-center flex-none ${on ? "border-wine" : "border-line"}`}
                      >
                        {on && <span className="w-2 h-2 rounded-full bg-wine" />}
                      </span>
                    ) : (
                      <span
                        className={`w-4 h-4 rounded border-2 grid place-items-center flex-none ${on ? "border-wine bg-wine text-white" : "border-line"}`}
                      >
                        {on && <span className="text-[10px] leading-none">✓</span>}
                      </span>
                    )}
                    <span className="flex-1">{o.label}</span>
                    <span className="text-ink/55 text-[13px]">+{o.price}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* action bar (fixed) */}
        <div className="px-5 py-4 border-t border-line flex items-center gap-3 flex-none">
          {outOfStock ? (
            <span className="text-red-600 font-semibold text-sm">{dict.product.outOfStock}</span>
          ) : (
            <>
              <div className="flex items-center gap-3 border-2 border-wine rounded-lg px-3 py-2 text-wine flex-none">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="text-lg leading-none font-bold w-5">
                  −
                </button>
                <span className="w-5 text-center font-bold">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="text-lg leading-none font-bold w-5">
                  +
                </button>
              </div>
              <button onClick={add} className="flex-1 bg-wine text-white font-bold rounded-lg py-3 hover:bg-wine-hover">
                {dict.modal.addFor} {formatTHB(unit * qty)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
