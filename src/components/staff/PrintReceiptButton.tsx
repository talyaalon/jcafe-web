"use client";

import type { Locale } from "@/i18n/config";

export interface ReceiptItem {
  name: string;
  qty: number;
  price?: number | null;
  storeName: string;
}
export interface ReceiptOrder {
  order_name: string | null;
  created_at: string;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  method: string | null;
  address?: string | null;
  scheduled_for?: string | null;
  notes?: string | null;
  total: number;
  delivery_fee?: number | null;
  items: ReceiptItem[];
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const baht = (n: number) => "฿" + (Math.round(n * 100) / 100).toLocaleString("en-US");

function receiptHtml(
  o: ReceiptOrder,
  branchName: string,
  logoUrl: string | null,
  he: boolean,
  docType: "receipt" | "invoice" = "receipt",
) {
  const subtotal = o.items.reduce((s, i) => s + (Number(i.price) || 0) * i.qty, 0);
  const delivery =
    o.delivery_fee != null ? Number(o.delivery_fee) : Math.max(0, Number(o.total) - subtotal);
  const d = new Date(o.created_at);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const isDelivery = o.method === "delivery";
  const L = he
    ? {
        receipt: "קבלה",
        order: "הזמנה",
        date: "תאריך",
        customer: "פרטי לקוח",
        name: "שם",
        phone: "טלפון",
        email: "אימייל",
        address: "כתובת",
        method: "אופן",
        delivery: "משלוח",
        pickup: "איסוף עצמי",
        scheduled: "מתוזמן ל",
        product: "מוצר",
        qty: "כמות",
        unit: "מחיר",
        sum: "סכום",
        subtotal: "סכום ביניים",
        deliveryFee: "דמי משלוח",
        total: 'סה"כ לתשלום',
        notes: "הערות",
        thanks: "תודה שקניתם אצלנו!",
      }
    : {
        receipt: "RECEIPT",
        order: "Order",
        date: "Date",
        customer: "Customer",
        name: "Name",
        phone: "Phone",
        email: "Email",
        address: "Address",
        method: "Method",
        delivery: "Delivery",
        pickup: "Pickup",
        scheduled: "Scheduled for",
        product: "Item",
        qty: "Qty",
        unit: "Unit",
        sum: "Total",
        subtotal: "Subtotal",
        deliveryFee: "Delivery",
        total: "TOTAL",
        notes: "Notes",
        thanks: "Thank you for your order!",
      };

  // כותרת המסמך — קבלה או חשבונית
  const docLabel = docType === "invoice" ? (he ? "חשבונית" : "INVOICE") : L.receipt;

  const rows = o.items
    .map(
      (i) => `<tr>
        <td class="it">${esc(i.name)}<div class="st">${esc(i.storeName)}</div></td>
        <td class="c">${i.qty}</td>
        <td class="c">${i.price != null ? baht(Number(i.price)) : "—"}</td>
        <td class="e">${i.price != null ? baht(Number(i.price) * i.qty) : "—"}</td>
      </tr>`,
    )
    .join("");

  const head = logoUrl
    ? `<img class="logo" src="${esc(logoUrl)}" alt="">`
    : `<div class="wm">J Cafe</div><div class="wmt">THE KOSHER PLACE</div>`;

  const infoRow = (k: string, v: string) =>
    v ? `<div class="row"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>` : "";

  return `<!doctype html><html lang="${he ? "he" : "en"}" dir="${he ? "rtl" : "ltr"}"><head>
<meta charset="utf-8"><title>${esc(o.order_name || docLabel)}</title>
<style>
  @page { margin: 8mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #222; margin: 0; }
  .wrap { max-width: 460px; margin: 0 auto; padding: 6px 10px; }
  .head { text-align: center; border-bottom: 3px solid #861e74; padding-bottom: 12px; margin-bottom: 12px; }
  .logo { max-height: 78px; max-width: 230px; object-fit: contain; }
  .wm { font-size: 34px; font-weight: 900; color: #861e74; line-height: 1; }
  .wmt { font-size: 12px; font-weight: 700; letter-spacing: 4px; color: #861e74; margin-top: 3px; }
  .branch { font-size: 15px; font-weight: 800; color: #2e3333; margin-top: 8px; }
  .meta { display: flex; justify-content: space-between; font-size: 12px; color: #555; margin-bottom: 10px; }
  .meta b { color: #861e74; font-size: 14px; }
  .sec { font-size: 13px; font-weight: 800; color: #861e74; margin: 12px 0 4px; }
  .row { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; padding: 2px 0; border-bottom: 1px dashed #e6e3ea; }
  .row .k { color: #777; }
  .row .v { font-weight: 700; text-align: ${he ? "left" : "right"}; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12.5px; }
  th { background: #f4eef3; color: #861e74; font-size: 11px; text-align: ${he ? "right" : "left"}; padding: 6px; }
  th.c, th.e, td.c, td.e { text-align: center; white-space: nowrap; }
  th.e, td.e { text-align: ${he ? "left" : "right"}; }
  td { padding: 7px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
  td.it { font-weight: 700; }
  td.st { }
  .it .st { font-weight: 400; color: #999; font-size: 10.5px; margin-top: 2px; }
  .tot { margin-top: 8px; }
  .tot .row { border: 0; font-size: 13px; }
  .tot .grand { border-top: 2px solid #861e74; margin-top: 4px; padding-top: 6px; font-size: 17px; font-weight: 900; color: #861e74; }
  .foot { text-align: center; margin-top: 16px; padding-top: 10px; border-top: 1px dashed #ccc; color: #777; font-size: 12px; }
  .notes { font-size: 12px; color: #555; background: #f7f6f8; border-radius: 6px; padding: 8px; margin-top: 8px; }
</style></head>
<body onload="setTimeout(function(){window.focus();window.print();},250)">
  <div class="wrap">
    <div class="head">${head}<div class="branch">${esc(branchName)}</div></div>
    <div class="meta"><span><b>${esc(o.order_name || "—")}</b><br>${docLabel}</span><span>${L.date}<br><b style="color:#222;font-size:12px">${dateStr}</b></span></div>

    <div class="sec">${L.customer}</div>
    ${infoRow(L.name, o.customer_name || "")}
    ${infoRow(L.phone, o.phone || "")}
    ${infoRow(L.email, o.email || "")}
    ${infoRow(L.method, isDelivery ? L.delivery : L.pickup)}
    ${isDelivery ? infoRow(L.address, o.address || "") : ""}
    ${o.scheduled_for ? infoRow(L.scheduled, o.scheduled_for) : ""}

    <div class="sec">${L.product}</div>
    <table>
      <thead><tr><th>${L.product}</th><th class="c">${L.qty}</th><th class="c">${L.unit}</th><th class="e">${L.sum}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="tot">
      <div class="row"><span>${L.subtotal}</span><span>${baht(subtotal)}</span></div>
      ${delivery > 0 ? `<div class="row"><span>${L.deliveryFee}</span><span>${baht(delivery)}</span></div>` : ""}
      <div class="row grand"><span>${L.total}</span><span>${baht(Number(o.total))}</span></div>
    </div>

    ${o.notes ? `<div class="notes"><b>${L.notes}:</b> ${esc(o.notes)}</div>` : ""}
    <div class="foot">${L.thanks}<br>${esc(branchName)}</div>
  </div>
</body></html>`;
}

export function PrintReceiptButton({
  order,
  branchName,
  logoUrl,
  locale,
  className,
  docType = "receipt",
  label,
}: {
  order: ReceiptOrder;
  branchName: string;
  logoUrl: string | null;
  locale: Locale;
  className?: string;
  docType?: "receipt" | "invoice";
  label?: string;
}) {
  const he = locale === "he";
  const print = () => {
    const html = receiptHtml(order, branchName, logoUrl, he, docType);
    const w = window.open("", "_blank", "width=480,height=720");
    if (!w) {
      alert(he ? "חלון ההדפסה נחסם — אפשרו חלונות קופצים" : "Print window blocked — allow pop-ups");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };
  const text =
    label ??
    (docType === "invoice"
      ? he
        ? "הדפסת חשבונית"
        : "Print invoice"
      : he
        ? "הדפסת קבלה"
        : "Print receipt");
  return (
    <button
      type="button"
      onClick={print}
      className={
        className ||
        "inline-flex items-center justify-center gap-2 bg-white text-wine border border-wine font-bold rounded-lg px-3 py-1.5 text-sm hover:bg-wine hover:text-white transition"
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="w-[18px] h-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
      </svg>
      {text}
    </button>
  );
}
