import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin/session";
import { getPosOrder, itemStatus, isGrocery } from "@/lib/supabase/pos";
import { formatTHB } from "@/lib/format";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import { AutoRefresh } from "@/components/AutoRefresh";
import { setItemStatus, scanNextGrocery, archiveOrder } from "@/lib/staff/actions";

export default async function PickerDetail({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const he = locale === "he";

  if (!(await isAdmin())) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f6f8] p-4">
        <ManagerLogin locale={locale} next={`/${locale}/picker/${id}`} title={he ? "כניסת מלקט" : "Picker login"} />
      </div>
    );
  }

  const order = await getPosOrder(id);
  if (!order) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f6f8] p-4 text-ink/60">
        {he ? "הזמנה לא נמצאה" : "Order not found"}
      </div>
    );
  }

  const indexed = order.items.map((it, index) => ({ it, index }));
  const total = indexed.length;
  const done = indexed.filter((x) => itemStatus(x.it) === "done").length;
  const allReady = done >= total && total > 0;

  // קיבוץ לפי חנות (מטבח קודם, מכולת אחרון)
  const storeNames = [...new Set(indexed.map((x) => x.it.storeName))].sort((a, b) => {
    const ag = indexed.find((x) => x.it.storeName === a)?.it.storeId === "grocery" ? 1 : 0;
    const bg = indexed.find((x) => x.it.storeName === b)?.it.storeId === "grocery" ? 1 : 0;
    return ag - bg;
  });

  const dot = (s: string, grocery: boolean) =>
    s === "done"
      ? "bg-brand-green"
      : s === "unavailable"
        ? "bg-red-500"
        : grocery
          ? "bg-ink/25"
          : "bg-amber-400";

  return (
    <div className="min-h-screen bg-[#f7f6f8]">
      <AutoRefresh seconds={12} />
      <header className="bg-wine text-white px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href={`/${locale}/picker`} className="font-bold">
          ← {order.order_name || "—"}
        </Link>
        <span className="text-sm">
          {order.customer_name} ·{" "}
          {order.method === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף" : "Pickup"}
        </span>
        <span className="text-sm font-bold">
          {he ? "התקדמות" : "Progress"} {done}/{total}
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 p-4 sm:p-6 max-w-5xl mx-auto">
        {/* items grouped by store */}
        <div className="space-y-4">
          {storeNames.map((sn) => {
            const rows = indexed.filter((x) => x.it.storeName === sn);
            const grocery = rows[0]?.it.storeId === "grocery";
            const gDone = rows.filter((x) => itemStatus(x.it) === "done").length;
            return (
              <div key={sn} className="bg-white border border-line rounded-xl overflow-hidden">
                <div className="flex justify-between items-center bg-wine text-white px-4 py-2 text-sm font-bold">
                  <span>
                    {grocery ? "🛒 " : "🍳 "}
                    {sn} {grocery ? `(${he ? "ליקוט" : "Picking"})` : `(${he ? "מטבח" : "Kitchen"})`}
                  </span>
                  <span>
                    {grocery ? (he ? "נסרקו" : "Scanned") : he ? "מוכן" : "Ready"} {gDone}/{rows.length}
                  </span>
                </div>
                <ul>
                  {rows.map(({ it, index }) => {
                    const st = itemStatus(it);
                    return (
                      <li key={index} className="flex items-center gap-3 px-4 py-2.5 border-t border-line/60">
                        <span className={`w-3 h-3 rounded-full flex-none ${dot(st, grocery)}`} />
                        <span className="flex-1 text-sm">
                          {it.name} <span className="text-ink/45">×{it.qty}</span>
                        </span>
                        {grocery ? (
                          <form action={setItemStatus}>
                            <input type="hidden" name="id" value={order.id} />
                            <input type="hidden" name="index" value={index} />
                            <input type="hidden" name="status" value={st === "done" ? "pending" : "done"} />
                            <button
                              className={`text-xs font-bold rounded-lg px-2.5 py-1 border ${
                                st === "done"
                                  ? "border-brand-green text-brand-green"
                                  : "border-line text-ink/60 hover:border-wine"
                              }`}
                            >
                              {st === "done" ? (he ? "נסרק ✓" : "Scanned ✓") : he ? "סרוק" : "Scan"}
                            </button>
                          </form>
                        ) : (
                          <span
                            className={`text-xs font-bold rounded-lg px-2.5 py-1 ${
                              st === "done"
                                ? "text-brand-green"
                                : st === "unavailable"
                                  ? "text-red-500"
                                  : "text-amber-600"
                            }`}
                          >
                            {st === "done"
                              ? he
                                ? "מוכן"
                                : "Ready"
                              : st === "unavailable"
                                ? he
                                  ? "לא זמין"
                                  : "Unavailable"
                                : he
                                  ? "במטבח…"
                                  : "In kitchen…"}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {grocery && gDone < rows.length && (
                  <form action={scanNextGrocery} className="flex gap-2 p-3 border-t border-line bg-soft">
                    <input type="hidden" name="id" value={order.id} />
                    <input
                      name="barcode"
                      placeholder={he ? "📷 סרוק ברקוד מוצר הבא…" : "📷 Scan next barcode…"}
                      className="flex-1 border border-line rounded-lg px-3 py-2 text-sm"
                    />
                    <button className="bg-wine text-white font-bold rounded-lg px-4 text-sm">
                      {he ? "סרוק ✓" : "Scan ✓"}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>

        {/* order details */}
        <aside className="bg-white border border-line rounded-xl p-4 h-fit">
          <h3 className="font-bold text-ink mb-3">{he ? "פרטי הזמנה" : "Order details"}</h3>
          <dl className="text-sm space-y-1.5">
            <Row label={he ? "לקוח" : "Customer"} value={order.customer_name} />
            <Row label={he ? "טלפון" : "Phone"} value={order.phone} />
            <Row label={he ? "אימייל" : "Email"} value={order.email} />
            <Row
              label={he ? "אופן" : "Method"}
              value={order.method === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף" : "Pickup"}
            />
            <Row label={he ? 'סה"כ' : "Total"} value={formatTHB(order.total)} />
            {order.scheduled_for && <Row label={he ? "מתוזמן" : "Scheduled"} value={order.scheduled_for} />}
          </dl>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-ink/60 mb-1">
              <span>{he ? "התקדמות כוללת" : "Overall"}</span>
              <span>
                {done}/{total}
              </span>
            </div>
            <div className="h-2 rounded-full bg-line overflow-hidden">
              <div
                className="h-full bg-brand-green transition-all"
                style={{ width: `${total ? (done / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <form action={archiveOrder} className="mt-4">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="board" value="pos" />
            <button
              disabled={!allReady}
              className={`w-full font-extrabold rounded-xl py-3 ${
                allReady
                  ? "bg-wine text-white hover:bg-wine-hover"
                  : "bg-ink/15 text-ink/40 cursor-not-allowed"
              }`}
            >
              {allReady ? (he ? "מוכן לאיסוף ✓" : "Ready for pickup ✓") : `${he ? "נעול" : "Locked"} — ${done}/${total}`}
            </button>
          </form>
          {order.notes && <div className="text-[11px] text-ink/50 mt-3">📝 {order.notes}</div>}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
      <dt className="text-ink/55">{label}</dt>
      <dd className="font-semibold text-ink text-end">{value || "—"}</dd>
    </div>
  );
}
