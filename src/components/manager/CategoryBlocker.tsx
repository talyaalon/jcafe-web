"use client";

import { useState } from "react";
import { blockProductAction, unblockProductAction } from "@/app/[lang]/manager/actions";

// קטגוריות חסומות נשמרות בטבלת blocked_products עם key = "cat:<storeId>:<categoryId>".
export interface StoreCats {
  storeId: string;
  storeName: string;
  categories: { id: string; name: string }[];
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
  const [catId, setCatId] = useState("");

  const store = stores.find((s) => s.storeId === storeId);
  const cat = store?.categories.find((c) => c.id === catId);
  const blockedKeys = new Set(blocked.map((b) => b.key));
  const templateId = store && cat ? `cat:${store.storeId}:${cat.id}` : "";
  const name = store && cat ? `${store.storeName} · ${cat.name}` : "";
  const alreadyBlocked = !!templateId && blockedKeys.has(templateId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl mt-6">
      {/* choose + block */}
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
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-bold text-ink/70 mb-1">
                {he ? "חנות" : "Store"}
              </label>
              <select
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value);
                  setCatId("");
                }}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-wine outline-none bg-white"
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
              <select
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-wine outline-none bg-white"
              >
                <option value="">{he ? "— בחרו קטגוריה —" : "— select a category —"}</option>
                {(store?.categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {alreadyBlocked ? (
              <p className="text-[13px] text-ink/45 font-bold">{he ? "כבר חסום" : "Already blocked"}</p>
            ) : (
              <form action={blockProductAction}>
                <input type="hidden" name="branch" value={branch} />
                <input type="hidden" name="template_id" value={templateId} />
                <input type="hidden" name="name" value={name} />
                <button
                  disabled={!templateId}
                  className="text-xs font-bold text-red-600 border border-red-200 rounded-lg px-4 py-1.5 hover:bg-red-50 disabled:opacity-40"
                >
                  {he ? "חסום קטגוריה" : "Block category"}
                </button>
              </form>
            )}
          </div>
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
          <div className="max-h-80 overflow-y-auto divide-y divide-line/60">
            {blocked.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 py-2">
                <div className="text-sm font-semibold text-ink truncate">{b.name || b.key}</div>
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
