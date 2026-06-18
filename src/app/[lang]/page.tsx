import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { odoo } from "@/lib/odoo/adapter";
import { findPhuketStore, PHUKET_COMPANY_ID, PHUKET_PRICELIST_ID } from "@/lib/odoo/phuket";
import { getGroceryBundle } from "@/lib/odoo/branches";
import { getActiveBanners, getStoreOpenStatus, getBranchBranding } from "@/lib/supabase/data";
import { Storefront, type StoreBundle } from "@/components/Storefront";

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

  const [data, banners] = await Promise.all([
    Promise.all(
      stores.map(async (store) => {
        const open = (
          await getStoreOpenStatus(String(findPhuketStore(store.id)?.posConfigId ?? store.id))
        ).open;
        // המכולת — קטלוג eCommerce מלא (כל מוצרי המצרכים)
        if (store.id === "grocery") {
          const g = await getGroceryBundle(PHUKET_COMPANY_ID, PHUKET_PRICELIST_ID);
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

  const b = await getBranchBranding(PHUKET_COMPANY_ID);
  const branding = b
    ? {
        name: locale === "he" ? b.name_he : b.name_en,
        tagline: locale === "he" ? b.tagline_he : b.tagline_en,
        logoUrl: b.logo_url,
      }
    : null;

  return (
    <Storefront locale={locale} dict={dict} data={data} banners={banners} branding={branding} />
  );
}
