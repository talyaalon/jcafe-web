import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import {
  getBranchesCached,
  getBranchDataCached,
  getAvailability,
  resolveBranch,
} from "@/lib/odoo/branches";
import { overlayAvailability } from "@/lib/odoo/availability";
import { applyStoreBranding } from "@/lib/odoo/branding";
import {
  getActiveBanners,
  getStoreOpenStatus,
  getBranchBranding,
  getStoreBranding,
  getBannerSettings,
  getBlockedProductIds,
  getBlockedCategoryKeys,
  getBranchTheme,
} from "@/lib/supabase/data";
import { getThresholdMap } from "@/lib/category/thresholds";
import { Storefront, type StoreBundle } from "@/components/Storefront";

// ISR — קאש קטלוג הסניף ל-5 דקות; שינויי מנהל מרעננים דרך revalidatePath.
export const revalidate = 300;

export default async function BranchStore({
  params,
}: {
  params: Promise<{ lang: string; branch: string }>;
}) {
  const { lang, branch } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const companyId = resolveBranch(branch);
  if (!companyId) notFound();

  // B-3 — כל הקריאות הבלתי-תלויות במקביל (במקום בטור): קטלוג מ-cache + 7 קריאות Supabase/ODOO.
  const [
    branches,
    dict,
    rawCached,
    banners,
    storeBranding,
    bannerSettings,
    blocked,
    blockedCats,
    thresholds,
    theme,
    bb,
  ] = await Promise.all([
    getBranchesCached(),
    getDictionary(locale),
    getBranchDataCached(companyId),
    getActiveBanners(companyId),
    getStoreBranding(companyId),
    getBannerSettings(companyId),
    getBlockedProductIds(companyId),
    getBlockedCategoryKeys(companyId),
    getThresholdMap(companyId),
    getBranchTheme(companyId),
    getBranchBranding(companyId),
  ]);
  if (!branches.find((b) => b.companyId === companyId)) notFound();

  // תלויים בקטלוג: מלאי חי (ממוקד למוצרים המוצגים) + סטטוס פתיחה לכל חנות — במקביל.
  const ids = rawCached.flatMap((b) => b.products.map((p) => Number(String(p.id).split("|")[0])));
  const [avail, openEntries] = await Promise.all([
    getAvailability(companyId, ids),
    Promise.all(
      rawCached.map(async (b) => [b.store.id, (await getStoreOpenStatus(b.store.id)).open] as const),
    ),
  ]);
  const openMap = new Map(openEntries);
  const data0 = overlayAvailability(rawCached, avail).map((b) => ({
    ...b,
    open: openMap.get(b.store.id) ?? true,
  })) as StoreBundle[];
  const dataBranded = applyStoreBranding(data0, storeBranding, locale);
  const data =
    blocked.size || blockedCats.size || thresholds.size
      ? dataBranded.map((d) => ({
          ...d,
          products: d.products.filter((p) => {
            if (blocked.has(String(p.id).split("|")[0])) return false;
            // חסימת קטגוריה — לפי קטגוריית-העל או תת-הקטגוריה
            if (blockedCats.has(`cat:${p.storeId}:${p.categoryId}`)) return false;
            if (p.subCategoryId && blockedCats.has(`cat:${p.storeId}:${p.subCategoryId}`)) return false;
            // סף מלאי — תת-קטגוריה גוברת על קטגוריית-העל; מנות מטבח (ללא מלאי) לא מושפעות
            const th =
              (p.subCategoryId ? thresholds.get(`${p.storeId}:${p.subCategoryId}`) : undefined) ??
              thresholds.get(`${p.storeId}:${p.categoryId}`);
            if (th != null && p.qtyAvailable != null && p.qtyAvailable <= th) return false;
            return true;
          }),
        }))
      : dataBranded;


  const branding = bb
    ? {
        name: locale === "he" ? bb.name_he : bb.name_en,
        tagline: locale === "he" ? bb.tagline_he : bb.tagline_en,
        logoUrl: bb.logo_url,
      }
    : null;

  return (
    <Storefront
      locale={locale}
      dict={dict}
      data={data}
      banners={banners}
      branch={companyId}
      branding={branding}
      bannerSettings={bannerSettings}
      theme={theme}
    />
  );
}
