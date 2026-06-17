import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin/session";
import { getPosOrders, itemStatus } from "@/lib/supabase/pos";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import { PosFloor, type FloorOrder } from "@/components/staff/PosFloor";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function PickerPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const he = locale === "he";

  if (!(await isAdmin())) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f6f8] p-4">
        <ManagerLogin
          locale={locale}
          next={`/${locale}/picker`}
          title={he ? "כניסת מלקט (POS)" : "Picker login (POS)"}
        />
      </div>
    );
  }

  const orders = (await getPosOrders()).filter((o) => o.pos_status !== "done");
  const summaries: FloorOrder[] = orders.map((o) => ({
    id: o.id,
    order_name: o.order_name,
    customer: o.customer_name,
    method: o.method,
    created_at: o.created_at,
    total: o.items.length,
    done: o.items.filter((i) => itemStatus(i) === "done").length,
    stores: [...new Set(o.items.map((i) => i.storeName))],
    scheduled: o.scheduled_for,
  }));

  return (
    <div className="min-h-screen bg-[#f7f6f8]">
      <AutoRefresh seconds={15} />
      <header className="bg-wine text-white px-6 py-3 flex items-center justify-between">
        <span className="font-extrabold">🧺 J-Cafe POS — {he ? "ליקוט" : "Picking"}</span>
        <span className="text-sm opacity-85">
          {he ? "שולחנות פעילים" : "Active"}: {summaries.length}
        </span>
      </header>
      <PosFloor locale={locale} orders={summaries} />
    </div>
  );
}
