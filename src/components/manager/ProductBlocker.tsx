"use client";

import { useState } from "react";
import { blockProductAction, unblockProductAction } from "@/app/[lang]/manager/actions";
import type { PickerProduct } from "./ProductPicker";

export interface BlockedRow {
  id: number;
  template_id: string;
  name: string | null;
  reference: string | null;
}

export function ProductBlocker({
  branch,
  he,
  blocked,
  products,
}: {
  branch: number;
  he: boolean;
  blocked: BlockedRow[];
  products: PickerProduct[];
}) {
  const [q, setQ] = useState("");
  const blockedIds = new Set(blocked.map((b) => b.template_id));
  const name = (p: PickerProduct) => (he ? p.nameHe : p.nameEn) || p.nameEn;

  const query = q.trim().toLowerCase();
  const results =
    query.length < 2
      ? []
      : products
          .filter((p) =>
            `${p.nameHe} ${p.nameEn} ${p.reference ?? ""}`.toLowerCase().includes(query),
          )
          .slice(0, 40)
          .map((p) => ({ id: p.id, name: name(p), reference: p.reference ?? "" }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
      {/* search + block */}
      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="font-bold text-ink mb-1">{he ? "חיפוש וחסימה" : "Search & block"}</h3>
        <p className="text-ink/55 text-[13px] mb-3">
          {he
            ? "חיפוש לפי שם או קוד מק״ט. מוצר חסום לא יוצג בחנות הסניף — ללא קשר למלאי ב-ODOO."
            : "Search by name or reference code. A blocked product is hidden from this branch's store, regardless of ODOO stock."}
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={he ? "שם מוצר או קוד מק״ט…" : "Product name or reference…"}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-wine outline-none"
        />
        <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-line/60">
          {q.trim().length >= 2 && results.length === 0 && (
            <div className="py-3 text-sm text-ink/40">{he ? "אין תוצאות" : "No results"}</div>
          )}
          {results.map((p) => {
            const isBlocked = blockedIds.has(p.id);
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{p.name}</div>
                  {p.reference && <div className="text-[11px] text-ink/45">#{p.reference}</div>}
                </div>
                {isBlocked ? (
                  <span className="text-[11px] text-ink/40 font-bold flex-none">
                    {he ? "חסום" : "Blocked"}
                  </span>
                ) : (
                  <form action={blockProductAction} className="flex-none">
                    <input type="hidden" name="branch" value={branch} />
                    <input type="hidden" name="template_id" value={p.id} />
                    <input type="hidden" name="name" value={p.name} />
                    <input type="hidden" name="reference" value={p.reference} />
                    <button className="text-xs font-bold text-red-600 border border-red-200 rounded-lg px-3 py-1 hover:bg-red-50">
                      {he ? "חסום" : "Block"}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* blocked list */}
      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="font-bold text-ink mb-1">
          {he ? "מוצרים חסומים" : "Blocked products"}{" "}
          <span className="text-ink/40 font-normal">({blocked.length})</span>
        </h3>
        <p className="text-ink/55 text-[13px] mb-3">
          {he ? "מוצרים שמוסתרים מהחנות בסניף זה." : "Products hidden from this branch's store."}
        </p>
        {blocked.length === 0 ? (
          <p className="text-ink/40 text-sm">{he ? "אין מוצרים חסומים." : "No blocked products."}</p>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-line/60">
            {blocked.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{b.name || b.template_id}</div>
                  {b.reference && <div className="text-[11px] text-ink/45">#{b.reference}</div>}
                </div>
                <form action={unblockProductAction} className="flex-none">
                  <input type="hidden" name="id" value={b.id} />
                  <button className="text-xs font-bold text-brand-green border border-brand-green/40 rounded-lg px-3 py-1 hover:bg-brand-green/10">
                    {he ? "בטל חסימה" : "Unblock"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
