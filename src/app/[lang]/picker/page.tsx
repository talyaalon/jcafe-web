import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin/session";

// PWA — מאפשר התקנת מסך המלקט כאפליקציה (אנדרואיד + iOS) במסך מלא
export const metadata: Metadata = {
  title: "מלקט · J Cafe",
  manifest: "/picker.webmanifest",
  appleWebApp: { capable: true, title: "מלקט", statusBarStyle: "default" },
  icons: { apple: "/app-icon.png?s=180" },
};
import { getPosOrders, itemStatus } from "@/lib/supabase/pos";
import { syncActiveKitchenStatuses } from "@/lib/odoo/prep-sync";
import { releaseDueOrders } from "@/lib/odoo/release-scheduled";
import { getBranches } from "@/lib/odoo/branches";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import { BranchSelect } from "@/components/manager/BranchSelect";
import { LangMenu } from "@/components/LangMenu";
import { PosFloor, type FloorOrder } from "@/components/staff/PosFloor";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function PickerPage({
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
          next={`/${locale}/picker`}
          title={he ? "כניסת מלקט (POS)" : "Picker login (POS)"}
        />
      </div>
    );
  }

  const company = Number((await searchParams).company) || 0;
  const branches = (await getBranches()).map((b) => ({ companyId: b.companyId, name: b.name }));

  // שחרור הזמנות עתידיות שהגיע מועדן (שעה לפני) — נכנסות למטבח ולהזמנות הפעילות
  await releaseDueOrders(company || undefined);
  // סנכרון סטטוס המטבח מ-ODOO לפני הצגה (בהכנה / מוכן)
  await syncActiveKitchenStatuses();
  const all = (await getPosOrders(company || undefined)).filter((o) => o.pos_status !== "done");
  const toFloor = (o: (typeof all)[number]): FloorOrder => ({
    id: o.id,
    order_name: o.order_name,
    customer: o.customer_name,
    method: o.method,
    created_at: o.created_at,
    total: o.items.length,
    done: o.items.filter((i) => itemStatus(i) === "done").length,
    stores: [...new Set(o.items.map((i) => i.storeName))],
    scheduled: o.scheduled_for,
    release_at: o.release_at ?? null,
  });
  // עתידיות = מוחזקות (released=false); פעילות = כל השאר
  const summaries: FloorOrder[] = all.filter((o) => o.released !== false).map(toFloor);
  const future: FloorOrder[] = all
    .filter((o) => o.released === false)
    .sort((a, b) => (a.release_at ?? "").localeCompare(b.release_at ?? ""))
    .map(toFloor);

  return (
    <div className="min-h-screen bg-[#f7f6f8]">
      <AutoRefresh seconds={15} />
      <header className="bg-wine text-white px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <span className="font-extrabold">🧺 J-Cafe POS — {he ? "ליקוט" : "Picking"}</span>
        <div className="flex items-center gap-3">
          <BranchSelect
            locale={locale}
            path="picker"
            current={company}
            branches={branches}
            allLabel={he ? "כל הסניפים" : "All branches"}
          />
          <span className="text-sm opacity-85">
            {he ? "שולחנות פעילים" : "Active"}: {summaries.length}
          </span>
          <LangMenu locale={locale} />
        </div>
      </header>
      <PosFloor locale={locale} orders={summaries} future={future} />
    </div>
  );
}
