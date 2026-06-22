"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface PickerProduct {
  id: string;
  nameHe: string;
  nameEn: string;
  reference?: string;
}

export function ProductPicker({
  products,
  he,
  name,
  defaultId = "",
  discountName,
  defaultDiscount = 0,
}: {
  products: PickerProduct[];
  he: boolean;
  name: string;
  defaultId?: string;
  /** אם מסופק — מוצג שדה אחוז הנחה ושמור ב-input מוסתר בשם הזה */
  discountName?: string;
  defaultDiscount?: number;
}) {
  const [selected, setSelected] = useState(defaultId);
  const [discount, setDiscount] = useState(defaultDiscount);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const place = () => {
    const el = inputRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  };
  useEffect(() => {
    if (!open) return;
    place();
    const h = () => place();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => {
      window.removeEventListener("scroll", h, true);
      window.removeEventListener("resize", h);
    };
  }, [open]);

  const label = (p: PickerProduct) => (he ? p.nameHe : p.nameEn) || p.nameEn;
  const sel = products.find((p) => p.id === selected);
  const filtered = (
    query.trim()
      ? products.filter((p) => `${p.nameHe} ${p.nameEn}`.toLowerCase().includes(query.toLowerCase()))
      : products
  ).slice(0, 60);

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      {discountName && <input type="hidden" name={discountName} value={selected ? discount : 0} />}

      {sel ? (
        <>
          <div className="flex items-center justify-between gap-2 border border-line rounded-lg px-3 py-2 text-sm bg-soft">
            <span className="truncate">🔗 {label(sel)}</span>
            <button
              type="button"
              onClick={() => {
                setSelected("");
                setQuery("");
                setDiscount(0);
              }}
              className="text-ink/40 hover:text-red-500 flex-none"
            >
              ✕
            </button>
          </div>
          {discountName && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <label className="text-[13px] text-ink/70">{he ? "אחוז הנחה ללקוח" : "Discount %"}</label>
              <div className="flex items-center border border-line rounded-lg overflow-hidden">
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={discount || ""}
                  onChange={(e) => setDiscount(Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                  placeholder="0"
                  className="w-16 px-2 py-1.5 text-sm outline-none text-center"
                />
                <span className="px-2 text-ink/50 bg-soft text-sm">%</span>
              </div>
              {discount > 0 && (
                <span className="text-[12px] text-brand-green font-semibold">
                  {he ? `המחיר יוצג עם ${discount}% הנחה` : `Shown with ${discount}% off`}
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={he ? "חיפוש מוצר לקישור…" : "Search product to link…"}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm"
        />
      )}

      {/* רשימה צפה מעל הכל (portal ל-body) — לא נחתכת ע"י overflow, וניתנת לגלילה */}
      {open && mounted && rect &&
        createPortal(
          <div
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 9999 }}
            className="max-h-72 overflow-y-auto overscroll-contain bg-white border border-line rounded-lg shadow-2xl"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-ink/40">{he ? "אין תוצאות" : "No results"}</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelected(p.id);
                    setOpen(false);
                  }}
                  className="block w-full text-start px-3 py-2 text-sm hover:bg-soft border-b border-line/50 last:border-0"
                >
                  {label(p)}
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
