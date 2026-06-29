import { blockProductAction, unblockProductAction } from "@/app/[lang]/manager/actions";

// קטגוריות חסומות נשמרות בטבלת blocked_products עם key = "cat:<storeId>:<categoryId>".
// רכיב ללא state בצד-לקוח — כל חסימה היא טופס עם ערכים מוטמעים (עובד גם בלי JS,
// בדיוק כמו חסימת המוצרים), כך שלא תלוי ב-hydration.
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
  const blockedKeys = new Set(blocked.map((b) => b.key));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl mt-6">
      {/* categories by store + block */}
      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="font-bold text-ink mb-1">{he ? "חסימת קטגוריה" : "Block a category"}</h3>
        <p className="text-ink/55 text-[13px] mb-3">
          {he
            ? "הקטגוריות לפי חנות. חסימת קטגוריה מסתירה אותה (וכל מוצריה) מחנות הסניף."
            : "Categories by store. Blocking a category hides it (and all its products) from this branch's store."}
        </p>

        {stores.length === 0 ? (
          <p className="text-ink/40 text-sm">
            {he ? "אין קטגוריות לחנויות בסניף זה." : "No categories for this branch's stores."}
          </p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {stores.map((s) => (
              <div key={s.storeId}>
                <div className="text-sm font-extrabold text-wine mb-1">{s.storeName}</div>
                <div className="divide-y divide-line/60">
                  {s.categories.map((c) => {
                    const key = `cat:${s.storeId}:${c.id}`;
                    const isBlocked = blockedKeys.has(key);
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-2 py-1.5">
                        <span className="text-sm text-ink truncate">{c.name}</span>
                        {isBlocked ? (
                          <span className="text-[11px] text-ink/40 font-bold flex-none">
                            {he ? "חסום" : "Blocked"}
                          </span>
                        ) : (
                          <form action={blockProductAction} className="flex-none">
                            <input type="hidden" name="branch" value={branch} />
                            <input type="hidden" name="template_id" value={key} />
                            <input type="hidden" name="name" value={`${s.storeName} · ${c.name}`} />
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
            ))}
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
          <div className="max-h-96 overflow-y-auto divide-y divide-line/60">
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
