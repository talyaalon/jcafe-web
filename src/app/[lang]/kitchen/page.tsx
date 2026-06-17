import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin/session";
import { getPosOrders } from "@/lib/supabase/pos";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import { StaffBoard } from "@/components/staff/StaffBoard";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function KitchenPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const he = locale === "he";

  if (!(await isAdmin())) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f6f8] p-4">
        <ManagerLogin
          locale={locale}
          next={`/${locale}/kitchen`}
          title={he ? "כניסת מטבח" : "Kitchen login"}
        />
      </div>
    );
  }

  const orders = await getPosOrders();
  return (
    <div className="min-h-screen bg-[#f7f6f8]">
      <AutoRefresh seconds={20} />
      <header className="bg-wine text-white px-6 py-3 font-extrabold flex items-center justify-between">
        <span>👨‍🍳 {he ? "מסך מטבח — מנות" : "Kitchen — Food"}</span>
        <span className="text-xs font-normal opacity-80">{he ? "מתעדכן אוטומטית" : "Auto-refresh"}</span>
      </header>
      <StaffBoard locale={locale} type="kitchen" orders={orders} />
    </div>
  );
}
