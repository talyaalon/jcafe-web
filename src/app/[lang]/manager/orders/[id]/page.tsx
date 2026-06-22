import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin/session";
import { getPosOrder } from "@/lib/supabase/pos";
import { getBranchBranding } from "@/lib/supabase/data";
import { BRANCH_TAG } from "@/lib/odoo/branches";
import { productImageUrl } from "@/lib/odoo/image";
import { formatTHB } from "@/lib/format";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import { PrintReceiptButton } from "@/components/staff/PrintReceiptButton";

const statusLabel = (s: string, he: boolean) =>
  ({
    new: he ? "חדש" : "New",
    picking: he ? "בליקוט" : "Picking",
    preparing: he ? "בהכנה" : "Preparing",
    ready: he ? "מוכן" : "Ready",
    hold: he ? "בהמתנה" : "On hold",
    done: he ? "הושלם" : "Done",
  })[s] ?? s;

export default async function OrderDetail({
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
        <ManagerLogin locale={locale} next={`/${locale}/manager/orders/${id}`} />
      </div>
    );
  }

  const o = await getPosOrder(id);
  if (!o) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f6f8] text-ink/60">
        {he ? "הזמנה לא נמצאה" : "Order not found"}
      </div>
    );
  }

  const company = o.company ?? 14;
  const branding = await getBranchBranding(company);
  const branchName =
    (he ? branding?.name_he : branding?.name_en) ||
    branding?.name_en ||
    BRANCH_TAG[company] ||
    "J Cafe";
  const logoUrl = branding?.logo_url ?? null;

  const subtotal = o.items.reduce((s, i) => s + (Number(i.price) || 0) * i.qty, 0);
  const delivery = o.delivery_fee != null ? Number(o.delivery_fee) : Math.max(0, Number(o.total) - subtotal);
  const created = new Date(o.created_at);
  const p = (n: number) => String(n).padStart(2, "0");
  const createdStr = `${p(created.getDate())}/${p(created.getMonth() + 1)}/${created.getFullYear()} ${p(created.getHours())}:${p(created.getMinutes())}`;

  return (
    <div className="min-h-screen bg-[#f7f6f8]">
      <header className="bg-wine text-white flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap">
        <Link href={`/${locale}/manager`} className="text-sm border border-gold-soft rounded-lg px-3 py-1 whitespace-nowrap">
          ← {he ? "להזמנות" : "Orders"}
        </Link>
        <span className="font-extrabold order-first w-full text-center sm:order-none sm:w-auto">
          {he ? "הזמנה" : "Order"} {o.order_name || "—"}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-85 whitespace-nowrap">{createdStr}</span>
          <PrintReceiptButton
            order={o}
            branchName={branchName}
            logoUrl={logoUrl}
            locale={locale}
            className="inline-flex items-center gap-2 bg-white text-wine font-bold rounded-lg px-3 py-1.5 text-sm hover:bg-gold-soft transition whitespace-nowrap"
          />
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* items */}
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line font-extrabold text-ink">
            {he ? "פריטי ההזמנה" : "Order items"}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-ink/55 bg-soft text-[12px]">
                  <th className="font-bold p-3 w-12"></th>
                  <th className="text-start font-bold p-3">{he ? "מוצר" : "Product"}</th>
                  <th className="text-start font-bold p-3 whitespace-nowrap">{he ? "חנות" : "Store"}</th>
                  <th className="text-center font-bold p-3">{he ? "כמות" : "Qty"}</th>
                  <th className="text-end font-bold p-3 whitespace-nowrap">{he ? "מחיר יח׳" : "Unit"}</th>
                  <th className="text-end font-bold p-3 whitespace-nowrap">{he ? "סכום" : "Total"}</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it, idx) => {
                  const img = productImageUrl(it.templateId);
                  return (
                  <tr key={idx} className="border-t border-line align-top">
                    <td className="p-2">
                      <div className="w-10 h-10 rounded-lg bg-soft border border-line overflow-hidden grid place-items-center">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-ink/25 text-base">🛍️</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-ink min-w-[160px]">{it.name}</td>
                    <td className="p-3 text-ink/60 text-[12px] whitespace-nowrap">{it.storeName}</td>
                    <td className="p-3 text-center text-ink/70">{it.qty}</td>
                    <td className="p-3 text-end text-ink/70 whitespace-nowrap">
                      {it.price != null ? formatTHB(it.price) : "—"}
                    </td>
                    <td className="p-3 text-end font-bold text-ink whitespace-nowrap">
                      {it.price != null ? formatTHB(it.price * it.qty) : "—"}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-line bg-soft text-sm space-y-1">
            <div className="flex justify-between gap-3">
              <span className="text-ink/60">{he ? "סכום ביניים" : "Subtotal"}</span>
              <span className="whitespace-nowrap">{formatTHB(subtotal)}</span>
            </div>
            {delivery > 0 && (
              <div className="flex justify-between gap-3 text-ink/60">
                <span>{he ? "דמי משלוח" : "Delivery"}</span>
                <span className="whitespace-nowrap">{formatTHB(delivery)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3 pt-2 mt-1 border-t border-line font-extrabold text-wine text-[15px]">
              <span>{he ? 'סה"כ' : "Total"}</span>
              <span className="whitespace-nowrap">{formatTHB(o.total)}</span>
            </div>
          </div>
        </div>

        {/* details */}
        <aside className="bg-white border border-line rounded-xl p-4 h-fit space-y-3">
          <h3 className="font-bold text-ink">{he ? "פרטי לקוח" : "Customer"}</h3>
          <dl className="text-sm space-y-1.5">
            <Row label={he ? "שם" : "Name"} value={o.customer_name} />
            <Row label={he ? "טלפון" : "Phone"} value={o.phone} />
            <Row label={he ? "אימייל" : "Email"} value={o.email} />
            <Row
              label={he ? "אופן" : "Method"}
              value={o.method === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף עצמי" : "Pickup"}
            />
            {o.method === "delivery" && o.address && (
              <Row label={he ? "כתובת" : "Address"} value={o.address} />
            )}
            {o.scheduled_for && <Row label={he ? "מתוזמן ל" : "Scheduled"} value={o.scheduled_for} />}
          </dl>

          <div className="border-t border-line pt-3">
            <h3 className="font-bold text-ink mb-2">{he ? "סטטוס" : "Status"}</h3>
            <div className="flex gap-2 flex-wrap text-[12px]">
              <span className="bg-soft rounded-full px-2.5 py-1">
                {he ? "מלקט" : "Picker"}: <b>{statusLabel(o.pos_status, he)}</b>
              </span>
              <span className="bg-soft rounded-full px-2.5 py-1">
                {he ? "מטבח" : "Kitchen"}: <b>{statusLabel(o.kitchen_status, he)}</b>
              </span>
            </div>
          </div>

          {o.notes && (
            <div className="border-t border-line pt-3">
              <h3 className="font-bold text-ink mb-1">{he ? "הערות" : "Notes"}</h3>
              <p className="text-[12px] text-ink/60 break-words">{o.notes}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
      <dt className="text-ink/55">{label}</dt>
      <dd className="font-semibold text-ink text-end break-all">{value || "—"}</dd>
    </div>
  );
}
