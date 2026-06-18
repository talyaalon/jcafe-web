import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { getBranches, getBranchData, resolveBranch } from "@/lib/odoo/branches";
import { applyStoreBranding } from "@/lib/odoo/branding";
import {
  getActiveBanners,
  getStoreOpenStatus,
  getBranchBranding,
  getStoreBranding,
  getBannerSettings,
} from "@/lib/supabase/data";
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

  const branches = await getBranches();
  if (!branches.find((b) => b.companyId === companyId)) notFound();

  const dict = await getDictionary(locale);
  const raw = await getBranchData(companyId);
  const [data0, banners, storeBranding] = await Promise.all([
    Promise.all(
      raw.map(async (b) => ({ ...b, open: (await getStoreOpenStatus(b.store.id)).open })),
    ) as Promise<StoreBundle[]>,
    getActiveBanners(companyId),
    getStoreBranding(companyId),
  ]);
  const bannerSettings = await getBannerSettings(companyId);
  const data = applyStoreBranding(data0, storeBranding, locale);

  const bb = await getBranchBranding(companyId);
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
    />
  );
}
