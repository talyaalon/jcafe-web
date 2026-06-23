import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin/session";
import {
  getStoreHours,
  getAllBanners,
  getDeliverySettings,
  getDeliveryZones,
  getBranchBranding,
  getStoreBranding,
  getBannerSettings,
  getBranchPayment,
  getBranchTheme,
  getBlockedProducts,
} from "@/lib/supabase/data";
import { getPosOrders, getNotificationRecipients } from "@/lib/supabase/pos";
import { getWebsiteCustomers } from "@/lib/odoo/orders";
import {
  getBranchesCached,
  getBranchProducts,
  getBranchStores,
  COMPANY_SLUG,
} from "@/lib/odoo/branches";
import { PHUKET_COMPANY_ID } from "@/lib/odoo/phuket";
import { CopyLink } from "@/components/manager/CopyLink";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import { ManagerDashboard, type StoreHours } from "@/components/manager/ManagerDashboard";
import { BranchSelect } from "@/components/manager/BranchSelect";
import { logoutAction } from "./actions";

export default async function ManagerPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ company?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const he = locale === "he";

  if (!(await isAdmin())) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f6f8] p-4">
        <ManagerLogin locale={locale} />
      </div>
    );
  }

  const branches = await getBranchesCached();
  const { company } = await searchParams;
  const requested = Number(company);
  const branch =
    branches.find((b) => b.companyId === requested)?.companyId ??
    branches.find((b) => b.companyId === 14)?.companyId ??
    branches[0]?.companyId ??
    14;
  const branchName = branches.find((b) => b.companyId === branch)?.name ?? "";
  const configs = branches.find((b) => b.companyId === branch)?.configs ?? [];

  const [
    banners,
    bannerSettings,
    branding,
    storeBranding,
    brandStores,
    delivery,
    orders,
    webCustomers,
    stores,
    products,
    zones,
    recipients,
    payment,
    theme,
    blockedProducts,
  ] = await Promise.all([
    getAllBanners(branch),
    getBannerSettings(branch),
    getBranchBranding(branch),
    getStoreBranding(branch),
    getBranchStores(branch).catch(() => []),
    getDeliverySettings(branch),
    getPosOrders(),
    getWebsiteCustomers().catch(() => []),
    (async () => {
      const cfgStores: StoreHours[] = await Promise.all(
        configs.map(async (c) => ({
          id: String(c.id),
          name: c.name,
          hours: await getStoreHours(String(c.id)),
        })),
      );
      // חנות המכולת היא חנות סינתטית ("grocery") בסניפים שאינם פוקט — מוסיפים לה תיבת שעות
      if (branch !== PHUKET_COMPANY_ID) {
        cfgStores.push({
          id: "grocery",
          name: he ? "מכולת" : "Kosher Store",
          hours: await getStoreHours("grocery"),
        });
      }
      return cfgStores;
    })() as Promise<StoreHours[]>,
    getBranchProducts(branch).catch(() => []),
    getDeliveryZones(branch),
    getNotificationRecipients(branch),
    getBranchPayment(branch),
    getBranchTheme(branch),
    getBlockedProducts(branch),
  ]);

  return (
    <div className="min-h-screen bg-[#f7f6f8]">
      <header className="bg-wine text-white flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="font-extrabold">J Cafe — {he ? "ניהול" : "Manager"}</span>
          <BranchSelect
            locale={locale}
            path="manager"
            current={branch}
            branches={branches.map((b) => ({
              companyId: b.companyId,
              name: b.name,
              count: b.configs.length,
            }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/${locale}/manager/preview?company=${branch}`}
            className="text-sm border border-gold-soft rounded-lg px-3 py-1 hover:bg-white/10"
          >
            🌐 {he ? "תצוגת אתר" : "Site preview"}
          </a>
          <form action={logoutAction}>
            <input type="hidden" name="lang" value={locale} />
            <button className="text-sm border border-gold-soft rounded-lg px-3 py-1 hover:bg-white/10">
              {he ? "התנתקות" : "Logout"}
            </button>
          </form>
        </div>
      </header>

      <div className="bg-soft border-b border-line px-4 sm:px-6 py-2 text-sm text-ink/70 flex items-center gap-3 flex-wrap">
        <span>
          {he ? "מנהל סניף:" : "Managing branch:"} <b className="text-wine">{branchName}</b> ·{" "}
          {stores.length} {he ? "חנויות" : "stores"}
        </span>
        <span className="text-ink/40">·</span>
        <span className="flex items-center gap-1">
          {he ? "קישור ללקוחות:" : "Customer link:"}{" "}
          <CopyLink locale={locale} slug={COMPANY_SLUG[branch] ?? branch} />
        </span>
      </div>

      <ManagerDashboard
        locale={locale}
        branch={branch}
        stores={stores}
        banners={banners}
        bannerSettings={bannerSettings}
        branding={branding}
        brandStores={brandStores}
        storeBranding={storeBranding}
        delivery={delivery}
        orders={orders}
        webCustomers={webCustomers}
        products={products}
        zones={zones}
        recipients={recipients}
        payment={payment}
        theme={theme}
        blockedProducts={blockedProducts}
      />
    </div>
  );
}
