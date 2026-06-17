import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin/session";
import { getPosOrders, isKitchen, itemStatus } from "@/lib/supabase/pos";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import { KdsBoard, type KdsOrder } from "@/components/staff/KdsBoard";
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
          title={he ? "כניסת מטבח (KDS)" : "Kitchen login (KDS)"}
        />
      </div>
    );
  }

  // הזמנות פעילות עם פריטי מטבח
  const orders = (await getPosOrders()).filter((o) => o.pos_status !== "done");
  const kds: KdsOrder[] = orders
    .map((o) => ({
      id: o.id,
      order_name: o.order_name,
      customer: o.customer_name,
      created_at: o.created_at,
      notes: o.notes,
      dishes: o.items
        .map((it, index) => ({ it, index }))
        .filter((x) => isKitchen(x.it.storeId))
        .map((x) => ({ index: x.index, name: x.it.name, qty: x.it.qty, status: itemStatus(x.it) })),
    }))
    .filter((o) => o.dishes.length > 0)
    // הזמנות שכל מנותיהן הוגשו — לתחתית; מסתירים רק אם נארכבו ע"י המלקט
    .filter((o) => !o.dishes.every((d) => d.status === "unavailable"));

  const inQueue = kds.filter((o) => o.dishes.some((d) => d.status === "pending")).length;

  return (
    <div className="min-h-screen bg-[#f7f6f8]">
      <AutoRefresh seconds={10} />
      <header className="bg-wine text-white px-6 py-3 flex items-center justify-between">
        <span className="font-extrabold">👨‍🍳 {he ? "מסך מטבח (KDS)" : "Kitchen (KDS)"}</span>
        <span className="text-sm opacity-85">
          {he ? "בתור" : "In queue"}: {inQueue}
        </span>
      </header>
      <KdsBoard locale={locale} orders={kds} />
    </div>
  );
}
