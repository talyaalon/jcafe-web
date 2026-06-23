import type { Store } from "./types";

interface BrandVal {
  name_he: string | null;
  name_en: string | null;
  logo_url: string | null;
  tab_logo_url?: string | null;
}

// החלת מיתוג פר-חנות (שם + לוגו) על חבילות החנות לפי מזהה.
// keyOf ממפה את מזהה החנות בחזית למפתח ב-store_branding (ברירת מחדל: זהות).
export function applyStoreBranding<T extends { store: Store }>(
  bundles: T[],
  map: Record<string, BrandVal>,
  locale: "he" | "en",
  keyOf: (storeId: string) => string = (id) => id,
): T[] {
  return bundles.map((b) => {
    const v = map[keyOf(b.store.id)];
    if (!v) return b;
    return {
      ...b,
      store: {
        ...b.store,
        nameHe: v.name_he?.trim() || b.store.nameHe,
        nameEn: v.name_en?.trim() || b.store.nameEn,
        logo: v.logo_url ?? b.store.logo ?? null,
        tabLogo: v.tab_logo_url ?? b.store.tabLogo ?? null,
      },
    };
  });
}
