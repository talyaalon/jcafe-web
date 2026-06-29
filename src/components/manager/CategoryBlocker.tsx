"use client";

import { useState } from "react";

// קטגוריות חסומות נשמרות בטבלת blocked_products עם key = "cat:<storeId>:<categoryId>".
// בחירת החנות מסננת את הקטגוריות (state בצד-לקוח), אך השליחה עצמה היא טופס POST רגיל
// ל-API (עובד תמיד, גם אם ה-JS תקוע) — לא תלוי ב-server-action wiring/hydration.
export interface StoreCats {
  storeId: string;
  storeName: string;
  // parentId: null = קטגוריה ראשית; אחרת = תת-קטגוריה תחת אותו id
  categories: { id: string; name: string; parentId?: string | null }[];
}
export interface BlockedCatRow {
  id: number;
  key: string;
  name: string | null;
}

export function CategoryBlocker({
  branch,
  he,
  stores,
  blocked,
}: {
  branch: number;
  he: boolean;
  stores: StoreCats[];
  blocked: BlockedCatRow[];
}) {
  const [storeId, setStoreId] = useState(stores[0]?.storeId ?? "");
  const store = stores.find((s) => s.storeId === storeId) ?? stores[0];
  const blockedKeys = new Set(blocked.map((b) => b.key));
  const cats = store?.categories ?? [];
  const roots = cats.filter((c) => c.parentId == null);
  const subsOf = (rootId: string) => cats.filter((c) => c.parentId === rootId);

  const selectCls =
    "w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-wine outline-none bg-white";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl mt-6">
      {/* choose store → category → block */}
      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="font-bold text-ink mb-1">{he ? "חסימת קטגוריה" : "Block a category"}</h3>
        <p className="text-ink/55 text-[13px] mb-3">
          {he
            ? "בחרו חנות ואז קטגוריה. קטגוריה חסומה (וכל מוצריה) לא תוצג בחנות הסניף."
            : "Pick a store, then a category. A blocked category (and all its products) is hidden from this branch's store."}
        </p>

        {stores.length === 0 ? (
          <p className="text-ink/40 text-sm">
            {he ? "אין קטגוריות לחנויות בסניף זה." : "No categories for this branch's stores."}
          </p>
        ) : (
          <form method="POST" action="/api/manager/category-block" className="space-y-3">
            <input type="hidden" name="branch" value={branch} />
            <div>
              <label className="block text-[12px] font-bold text-ink/70 mb-1">
                {he ? "חנות" : "Store"}
              </label>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className={selectCls}
              >
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
              <select name="cat" required defaultValue="" className={selectCls}>
                <option value="" disabled>
                  {he ? "— בחרו קטגוריה —" : "— select a category —"}
                </option>
                {roots.map((root) => {
                  const subs = subsOf(root.id);
                  const rootKey = `cat:${store!.storeId}:${root.id}`;
                  const rootBlocked = blockedKeys.has(rootKey);
                  return (
                    <optgroup key={root.id} label={root.name}>
                      <option
                        value={`${rootKey}|${store!.storeName} · ${root.name}`}
                        disabled={rootBlocked}
                      >
                        {he ? `כל ${root.name}` : `All ${root.name}`}
                        {rootBlocked ? (he ? " (חסום)" : " (blocked)") : ""}
                      </option>
                      {subs.map((sub) => {
                        const subKey = `cat:${store!.storeId}:${sub.id}`;
                        const subBlocked = blockedKeys.has(subKey);
                        return (
                          <option
                            key={sub.id}
                            value={`${subKey}|${store!.storeName} · ${root.name} · ${sub.name}`}
                            disabled={subBlocked}
                          >
                            {" "}
                            {sub.name}
                            {subBlocked ? (he ? " (חסום)" : " (blocked)") : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <button
              type="submit"
              className="text-xs font-bold text-red-600 border border-red-200 rounded-lg px-4 py-1.5 hover:bg-red-50"
            >
              {he ? "חסום קטגוריה" : "Block category"}
            </button>
          </form>
        )}
      </div>

      {/* blocked list */}
      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="font-bold text-ink mb-1">
          {he ? "קטגוריות חסומות" : "Blocked categories"}{" "}
          <span className="text-ink/40 font-normal">({blocked.length})</span>
        </h3>
        <p className="text-ink/55 text-[13px] mb-3">
          {he ? "קטגוריות שמוסתרות מהחנות בסניף זה." : "Categories hidden from this branch's store."}
        </p>
        {blocked.length === 0 ? (
          <p className="text-ink/40 text-sm">
            {he ? "אין קטגוריות חסומות." : "No blocked categories."}
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-line/60">
            {blocked.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 py-2">
                <div className="text-sm font-semibold text-ink truncate">{b.name || b.key}</div>
                <form method="POST" action="/api/manager/category-block" className="flex-none">
                  <input type="hidden" name="branch" value={branch} />
                  <input type="hidden" name="unblock_id" value={b.id} />
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
