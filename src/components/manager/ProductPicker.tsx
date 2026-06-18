"use client";

import { useState } from "react";

export interface PickerProduct {
  id: string;
  nameHe: string;
  nameEn: string;
}

export function ProductPicker({
  products,
  he,
  name,
  defaultId = "",
}: {
  products: PickerProduct[];
  he: boolean;
  name: string;
  defaultId?: string;
}) {
  const [selected, setSelected] = useState(defaultId);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const label = (p: PickerProduct) => (he ? p.nameHe : p.nameEn) || p.nameEn;
  const sel = products.find((p) => p.id === selected);
  const filtered = (
    query.trim()
      ? products.filter((p) =>
          `${p.nameHe} ${p.nameEn}`.toLowerCase().includes(query.toLowerCase()),
        )
      : products
  ).slice(0, 40);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selected} />
      {sel ? (
        <div className="flex items-center justify-between gap-2 border border-line rounded-lg px-3 py-2 text-sm bg-soft">
          <span className="truncate">🔗 {label(sel)}</span>
          <button
            type="button"
            onClick={() => {
              setSelected("");
              setQuery("");
            }}
            className="text-ink/40 hover:text-red-500 flex-none"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={he ? "חיפוש מוצר לקישור…" : "Search product to link…"}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm"
          />
          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
              <div className="absolute z-40 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-line rounded-lg shadow-lg">
                {filtered.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-ink/40">{he ? "אין תוצאות" : "No results"}</div>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelected(p.id);
                        setOpen(false);
                      }}
                      className="block w-full text-start px-3 py-2 text-sm hover:bg-soft"
                    >
                      {label(p)}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
