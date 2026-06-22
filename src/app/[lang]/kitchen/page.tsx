import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin/session";
import { getPosOrders, isKitchen, itemStatus } from "@/lib/supabase/pos";
import { getBranches } from "@/lib/odoo/branches";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import { BranchSelect } from "@/components/manager/BranchSelect";
import { KdsBoard, type KdsOrder } from "@/components/staff/KdsBoard";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function KitchenPage({
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
        <ManagerLogin
          locale={locale}
          next={`/${locale}/kitchen`}
          title={he ? "כניסת מטבח (KDS)" : "Kitchen login (KDS)"}
        />
      </div>
    );
  }

  const company = Number((await searchParams).company) || 0;
  const branches = (await getBranches()).map((b) => ({ companyId: b.companyId, name: b.name }));

  // הזמנות פעילות עם פריטי מטבח (הזמנות עתידיות מוחזקות לא מוצגות עד שעה לפני מועדן)
  const orders = (await getPosOrders(company || undefined)).filter(
    (o) => o.pos_status !== "done" && o.released !== false,
  );
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
      <header className="bg-wine text-white px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <span className="font-extrabold">👨‍🍳 {he ? "מסך מטבח (KDS)" : "Kitchen (KDS)"}</span>
        <div className="flex items-center gap-3">
          <BranchSelect
            locale={locale}
            path="kitchen"
            current={company}
            branches={branches}
            allLabel={he ? "כל הסניפים" : "All branches"}
          />
          <span className="text-sm opacity-85">
            {he ? "בתור" : "In queue"}: {inQueue}
          </span>
        </div>
      </header>
      <KdsBoard locale={locale} orders={kds} />
    </div>
  );
}
