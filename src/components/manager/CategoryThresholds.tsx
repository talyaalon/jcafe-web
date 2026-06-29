"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { StoreCats } from "./CategoryBlocker";

// סף מלאי מינימלי לכל קטגוריה — בחירת חנות → קטגוריה → סף (טופס POST רגיל).
// מוצר בקטגוריה שמלאיו <= הסף לא יוצג באתר.
export function CategoryThresholds({
  locale,
  branch,
  stores,
  thresholds,
}: {
  locale: Locale;
  branch: number;
  stores: StoreCats[];
  thresholds: Record<string, number>;
}) {
  const he = locale === "he";
  const [storeId, setStoreId] = useState(stores[0]?.storeId ?? "");
  const store = stores.find((s) => s.storeId === storeId) ?? stores[0];
  const cats = store?.categories ?? [];
  const roots = cats.filter((c) => c.parentId == null);
  const subsOf = (rootId: string) => cats.filter((c) => c.parentId === rootId);

  const selectCls =
    "w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-wine outline-none bg-white";

  // רשימת הקטגוריות שמוגדר להן סף (עם שמות לתצוגה)
  const list = Object.entries(thresholds).map(([key, qty]) => {
    const sep = key.indexOf(":");
    const sid = key.slice(0, sep);
    const cid = key.slice(sep + 1);
    const st = stores.find((s) => s.storeId === sid);
    const cat = st?.categories.find((c) => c.id === cid);
    const name = st && cat ? `${st.storeName} · ${cat.name}` : key;
    return { key, sid, cid, qty, name };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl mt-6">
      {/* choose store → category → threshold */}
      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="font-bold text-ink mb-1">{he ? "סף מלאי לקטגוריה" : "Category stock threshold"}</h3>
        <p className="text-ink/55 text-[13px] mb-3">
          {he
            ? "בחרו חנות ואז קטגוריה, וקבעו סף מלאי. מוצר בקטגוריה שכמותו במלאי שווה לסף או נמוכה ממנו — לא יוצג באתר."
            : "Pick a store, then a category, and set a stock threshold. A product whose stock is at or below it is hidden from the site."}
        </p>

        {stores.length === 0 ? (
          <p className="text-ink/40 text-sm">
            {he ? "אין קטגוריות לחנויות בסניף זה." : "No categories for this branch's stores."}
          </p>
        ) : (
          <form method="POST" action="/api/manager/category-threshold" className="space-y-3">
            <input type="hidden" name="branch" value={branch} />
            <input type="hidden" name="lang" value={locale} />
            <input type="hidden" name="storeId" value={store?.storeId ?? ""} />
            <div>
              <label className="block text-[12px] font-bold text-ink/70 mb-1">
                {he ? "חנות" : "Store"}
              </label>
              <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={selectCls}>
                {stores.map((s) => (
                  <option key={s.storeId} value={s.storeId}>
                    {s.storeName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-ink/70 mb-1">
                {he ? "קטגוריה" : "Category"}
              </label>
              <select name="categoryId" required defaultValue="" className={selectCls}>
                <option value="" disabled>
                  {he ? "— בחרו קטגוריה —" : "— select a category —"}
                </option>
                {roots.map((root) => {
                  const rootCur = thresholds[`${store!.storeId}:${root.id}`];
                  return (
                    <optgroup key={root.id} label={root.name}>
                      <option value={root.id}>
                        {he ? `כל ${root.name}` : `All ${root.name}`}
                        {rootCur != null ? (he ? ` (סף ${rootCur})` : ` (min ${rootCur})`) : ""}
                      </option>
                      {subsOf(root.id).map((sub) => {
                        const cur = thresholds[`${store!.storeId}:${sub.id}`];
                        return (
                          <option key={sub.id} value={sub.id}>
                            {" "}
                            {sub.name}
                            {cur != null ? (he ? ` (סף ${cur})` : ` (min ${cur})`) : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-ink/70 mb-1">
                {he ? "סף מלאי (ריק/0 = ללא סף)" : "Stock threshold (empty/0 = none)"}
              </label>
              <input
                type="number"
                name="qty"
                min={0}
                placeholder={he ? "לדוגמה: 5" : "e.g. 5"}
                className="w-32 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-wine"
              />
            </div>
            <button
              type="submit"
              className="bg-wine text-white rounded-xl px-4 py-1.5 text-sm font-bold hover:bg-wine-hover"
            >
              {he ? "קבע סף" : "Set threshold"}
            </button>
          </form>
        )}
      </div>

      {/* thresholds list */}
      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="font-bold text-ink mb-1">
          {he ? "קטגוריות עם סף" : "Categories with a threshold"}{" "}
          <span className="text-ink/40 font-normal">({list.length})</span>
        </h3>
        <p className="text-ink/55 text-[13px] mb-3">
          {he ? "קטגוריות שמוגדר להן סף מלאי בסניף זה." : "Categories with a stock threshold in this branch."}
        </p>
        {list.length === 0 ? (
          <p className="text-ink/40 text-sm">{he ? "אין ספים מוגדרים." : "No thresholds set."}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-line/60">
            {list.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{t.name}</div>
                  <div className="text-[11px] text-ink/45">
                    {he ? `סף מלאי: ${t.qty}` : `min stock: ${t.qty}`}
                  </div>
                </div>
                <form method="POST" action="/api/manager/category-threshold" className="flex-none">
                  <input type="hidden" name="branch" value={branch} />
                  <input type="hidden" name="lang" value={locale} />
                  <input type="hidden" name="storeId" value={t.sid} />
                  <input type="hidden" name="categoryId" value={t.cid} />
                  <input type="hidden" name="qty" value="" />
                  <button className="text-xs font-bold text-brand-green border border-brand-green/40 rounded-lg px-3 py-1 hover:bg-brand-green/10">
                    {he ? "הסר" : "Remove"}
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
