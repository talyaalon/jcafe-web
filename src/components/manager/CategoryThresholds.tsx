import type { Locale } from "@/i18n/config";
import type { StoreCats } from "./CategoryBlocker";

// סף מלאי מינימלי לכל קטגוריה — מוצר שמלאיו <= הסף לא יוצג באתר.
// טופס POST רגיל לכל קטגוריה (עמיד, לא תלוי ב-JS).
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

  return (
    <div className="bg-white border border-line rounded-xl p-4 max-w-2xl mt-6">
      <h3 className="font-bold text-ink mb-1">
        {he ? "סף מלאי לקטגוריה" : "Category stock threshold"}
      </h3>
      <p className="text-ink/55 text-[13px] mb-3">
        {he
          ? "לכל קטגוריה אפשר לקבוע סף מלאי. מוצר בקטגוריה שכמותו במלאי שווה לסף או נמוכה ממנו — לא יוצג באתר. ריק/0 = ללא סף."
          : "Set a stock threshold per category. A product whose stock is at or below the threshold is hidden from the site. Empty/0 = no threshold."}
      </p>

      {stores.length === 0 ? (
        <p className="text-ink/40 text-sm">
          {he ? "אין קטגוריות לחנויות בסניף זה." : "No categories for this branch's stores."}
        </p>
      ) : (
        <div className="space-y-4 max-h-[28rem] overflow-y-auto">
          {stores.map((s) => (
            <div key={s.storeId}>
              <div className="text-sm font-extrabold text-wine mb-1">{s.storeName}</div>
              <div className="divide-y divide-line/60">
                {s.categories.map((c) => {
                  const current = thresholds[`${s.storeId}:${c.id}`];
                  return (
                    <form
                      key={c.id}
                      method="POST"
                      action="/api/manager/category-threshold"
                      className="flex items-center justify-between gap-2 py-1.5"
                    >
                      <span className="text-sm text-ink truncate flex-1">{c.name}</span>
                      <input type="hidden" name="branch" value={branch} />
                      <input type="hidden" name="storeId" value={s.storeId} />
                      <input type="hidden" name="categoryId" value={c.id} />
                      <input type="hidden" name="lang" value={locale} />
                      <input
                        type="number"
                        name="qty"
                        min={0}
                        defaultValue={current ?? ""}
                        placeholder={he ? "סף" : "min"}
                        className="w-20 border border-line rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-wine"
                      />
                      <button className="bg-wine text-white rounded-lg px-3 py-1 text-xs font-bold hover:bg-wine-hover flex-none">
                        {he ? "שמור" : "Save"}
                      </button>
                    </form>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
