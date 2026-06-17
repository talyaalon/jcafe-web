import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { odoo } from "@/lib/odoo/adapter";
import { getActiveBanners } from "@/lib/supabase/data";
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
      stores.map(async (store) => ({
        store,
        categories: await odoo.getCategories(store.id),
        products: await odoo.getProducts({ storeId: store.id }),
      })),
    ) as Promise<StoreBundle[]>,
    getActiveBanners(),
  ]);

  return <Storefront locale={locale} dict={dict} data={data} banners={banners} />;
}
