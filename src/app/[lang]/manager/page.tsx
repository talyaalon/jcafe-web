import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin/session";
import { getStoreHours, getAllBanners, getDeliverySettings } from "@/lib/supabase/data";
import { getPosOrders } from "@/lib/supabase/pos";
import { getWebsiteCustomers } from "@/lib/odoo/orders";
import { phuketStores } from "@/lib/odoo/phuket";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import { ManagerDashboard, type StoreHours } from "@/components/manager/ManagerDashboard";
import { logoutAction } from "./actions";

export default async function ManagerPage({ params }: { params: Promise<{ lang: string }> }) {
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

  const banners = await getAllBanners();
  const delivery = await getDeliverySettings();
  const orders = await getPosOrders();
  const webCustomers = await getWebsiteCustomers().catch(() => []);
  const stores: StoreHours[] = await Promise.all(
    phuketStores.map(async (s) => ({
      id: s.id,
      name: he ? s.nameHe : s.nameEn,
      hours: await getStoreHours(s.id),
    })),
  );

  return (
    <div className="min-h-screen bg-[#f7f6f8]">
      <header className="bg-wine text-white flex items-center justify-between px-6 py-3">
        <div className="font-extrabold">J Cafe — {he ? "ניהול" : "Manager"}</div>
        <div className="flex items-center gap-2">
          <a
            href={`/${locale}/manager/preview`}
            className="text-sm border border-gold-soft rounded-lg px-3 py-1 hover:bg-white/10"
          >
            🌐 {he ? "תצוגת אתר / סניפים" : "Site preview / Branches"}
          </a>
          <form action={logoutAction}>
            <input type="hidden" name="lang" value={locale} />
            <button className="text-sm border border-gold-soft rounded-lg px-3 py-1 hover:bg-white/10">
              {he ? "התנתקות" : "Logout"}
            </button>
          </form>
        </div>
      </header>
      <ManagerDashboard
        locale={locale}
        stores={stores}
        banners={banners}
        delivery={delivery}
        orders={orders}
        webCustomers={webCustomers}
      />
    </div>
  );
}
