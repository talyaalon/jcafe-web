import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { getBranches, getBranchData, resolveBranch } from "@/lib/odoo/branches";
import { getActiveBanners, getStoreOpenStatus } from "@/lib/supabase/data";
import { Storefront, type StoreBundle } from "@/components/Storefront";

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
  const [data, banners] = await Promise.all([
    Promise.all(
      raw.map(async (b) => ({ ...b, open: (await getStoreOpenStatus(b.store.id)).open })),
    ) as Promise<StoreBundle[]>,
    getActiveBanners(companyId),
  ]);

  return (
    <Storefront locale={locale} dict={dict} data={data} banners={banners} branch={companyId} />
  );
}
