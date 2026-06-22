import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { odoo } from "@/lib/odoo/adapter";
import { findPhuketStore, PHUKET_COMPANY_ID, PHUKET_PRICELIST_ID } from "@/lib/odoo/phuket";
import { getGroceryBundle } from "@/lib/odoo/branches";
import { applyStoreBranding } from "@/lib/odoo/branding";
import {
  getActiveBanners,
  getStoreOpenStatus,
  getBranchBranding,
  getStoreBranding,
  getBannerSettings,
  getBlockedProductIds,
  getBranchTheme,
} from "@/lib/supabase/data";
import { Storefront, type StoreBundle } from "@/components/Storefront";

// ISR — קאש את הקטלוג ל-5 דקות (פוחת עומס על ODOO + TTFB מהיר).
// שינויי מנהל (באנרים/מיתוג/שעות) קוראים revalidatePath ומרעננים מיד.
export const revalidate = 300;

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const dict = await getDictionary(locale);
  const stores = await odoo.getStores();

  const [data0, banners] = await Promise.all([
    Promise.all(
      stores.map(async (store) => {
        const open = (
          await getStoreOpenStatus(String(findPhuketStore(store.id)?.posConfigId ?? store.id))
        ).open;
        // המכולת — קטלוג eCommerce מלא (כל מוצרי המצרכים)
        if (store.id === "grocery") {
          // פוקט = סניף עם חנות POS → מכולת לפי קטגוריות מכולת ציבוריות (broad=false)
          const g = await getGroceryBundle(PHUKET_COMPANY_ID, PHUKET_PRICELIST_ID, false);
          return {
            store,
            categories: g?.categories ?? [],
            products: g?.products ?? [],
            open,
          };
        }
        return {
          store,
          categories: await odoo.getCategories(store.id),
          products: await odoo.getProducts({ storeId: store.id }),
          open,
        };
      }),
    ) as Promise<StoreBundle[]>,
    getActiveBanners(),
  ]);

  // מיתוג פר-חנות — /he משתמש ב-slug, ממופה ל-pos.config (מלבד "grocery")
  const storeBranding = await getStoreBranding(PHUKET_COMPANY_ID);
  const dataBranded = applyStoreBranding(data0, storeBranding, locale, (id) =>
    id === "grocery" ? "grocery" : String(findPhuketStore(id)?.posConfigId ?? id),
  );
  // סינון מוצרים חסומים (מעל ODOO, פר-סניף) + ערכת צבעים פר-סניף
  const [blocked, theme] = await Promise.all([
    getBlockedProductIds(PHUKET_COMPANY_ID),
    getBranchTheme(PHUKET_COMPANY_ID),
  ]);
  const data = blocked.size
    ? dataBranded.map((d) => ({
        ...d,
        products: d.products.filter((p) => !blocked.has(String(p.id).split("|")[0])),
      }))
    : dataBranded;

  // הגדרות באנרים — מנוהלות לפי מזהה pos.config; ב-/he החנויות הן slug, אז ממפים.
  const rawBanner = await getBannerSettings(PHUKET_COMPANY_ID);
  const bannerSettings: Record<string, boolean> = { "*": rawBanner["*"] ?? true };
  for (const s of stores) {
    const cfg = findPhuketStore(s.id)?.posConfigId;
    const key = s.id === "grocery" ? "grocery" : cfg != null ? String(cfg) : s.id;
    if (rawBanner[key] !== undefined) bannerSettings[s.id] = rawBanner[key];
  }

  const b = await getBranchBranding(PHUKET_COMPANY_ID);
  const branding = b
    ? {
        name: locale === "he" ? b.name_he : b.name_en,
        tagline: locale === "he" ? b.tagline_he : b.tagline_en,
        logoUrl: b.logo_url,
      }
    : null;

  return (
    <Storefront
      locale={locale}
      dict={dict}
      data={data}
      banners={banners}
      branding={branding}
      bannerSettings={bannerSettings}
      theme={theme}
    />
  );
}
