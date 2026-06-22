// ===== תבנית מייל אחידה ומעוצבת להזמנות (לקוח + צוות) — צבעי המותג, טבלה מסודרת =====

export interface EmailItem {
  name: string;
  qty: number;
  price?: number | null;
  storeName?: string | null;
}

export interface OrderEmailOpts {
  locale?: "he" | "en";
  forStaff?: boolean;
  branchName: string;
  logoUrl?: string | null;
  orderNo: string;
  createdAt?: string;
  method?: string | null;
  customer?: { name?: string | null; phone?: string | null; email?: string | null; address?: string | null };
  scheduledFor?: string | null;
  items: EmailItem[];
  subtotal?: number;
  delivery?: number;
  total: number;
  notes?: string | null;
}

const WINE = "#6c2b8e";
const WINE_DK = "#562272";
const INK = "#2a2a2a";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const baht = (n: number) => "฿" + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US");

export function orderEmailSubject(o: OrderEmailOpts): string {
  const he = o.locale !== "en";
  if (o.forStaff) return `🔔 ${he ? "הזמנה חדשה" : "New order"} ${o.orderNo} — ${o.branchName}`;
  return he ? `אישור הזמנה ${o.orderNo} · ${o.branchName}` : `Order ${o.orderNo} confirmed · ${o.branchName}`;
}

export function orderEmailHtml(o: OrderEmailOpts): string {
  const he = o.locale !== "en";
  const dir = he ? "rtl" : "ltr";
  const align = he ? "right" : "left";
  const opp = he ? "left" : "right";
  const isDelivery = o.method === "delivery";

  const subtotal = o.subtotal != null ? o.subtotal : o.items.reduce((s, i) => s + (Number(i.price) || 0) * i.qty, 0);
  const delivery = o.delivery != null ? Number(o.delivery) : Math.max(0, Number(o.total) - subtotal);

  const L = he
    ? {
        confirm: "אישור הזמנה וקבלה",
        newOrder: "התקבלה הזמנה חדשה",
        hi: (n: string) => `שלום ${n}, תודה על ההזמנה!`,
        staffIntro: "הזמנה חדשה נכנסה למערכת — הפרטים למטה.",
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
        lineTotal: "סכום",
        subtotal: "סכום ביניים",
        deliveryFee: "דמי משלוח",
        total: 'סה"כ',
        notes: "הערות",
        footer: "תודה שקניתם אצלנו",
      }
    : {
        confirm: "Order confirmation & receipt",
        newOrder: "New order received",
        hi: (n: string) => `Hi ${n}, thank you for your order!`,
        staffIntro: "A new order has arrived — details below.",
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
        lineTotal: "Total",
        subtotal: "Subtotal",
        deliveryFee: "Delivery",
        total: "Total",
        notes: "Notes",
        footer: "Thank you for your order",
      };

  const logo = o.logoUrl
    ? `<img src="${esc(o.logoUrl)}" alt="" height="46" style="max-height:46px;max-width:180px;display:block;margin:0 auto 6px">`
    : `<div style="font-size:30px;font-weight:900;color:#fff;line-height:1">J Cafe</div>
       <div style="font-size:11px;font-weight:700;letter-spacing:3px;color:#f0d6ea;margin-top:2px">THE KOSHER PLACE</div>`;

  const infoRow = (k: string, v?: string | null) =>
    v
      ? `<tr><td style="padding:5px 0;color:#888;font-size:13px;text-align:${align}">${k}</td>
           <td style="padding:5px 0;font-weight:700;font-size:13px;color:${INK};text-align:${opp}">${esc(v)}</td></tr>`
      : "";

  const itemRows = o.items
    .map(
      (i) => `<tr>
        <td style="padding:9px 8px;border-bottom:1px solid #eee;text-align:${align}">
          <div style="font-weight:700;color:${INK};font-size:14px">${esc(i.name)}</div>
          ${i.storeName ? `<div style="color:#aaa;font-size:11px;margin-top:1px">${esc(i.storeName)}</div>` : ""}
        </td>
        <td style="padding:9px 8px;border-bottom:1px solid #eee;text-align:center;color:#555;font-size:14px">${i.qty}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #eee;text-align:${opp};white-space:nowrap;font-weight:700;color:${INK};font-size:14px">${i.price != null ? baht(Number(i.price) * i.qty) : "—"}</td>
      </tr>`,
    )
    .join("");

  const totalRow = (label: string, val: string, strong = false) =>
    `<tr>
      <td style="padding:${strong ? "10px 8px" : "3px 8px"};text-align:${align};${strong ? `border-top:2px solid ${WINE};font-weight:900;color:${WINE};font-size:17px` : "color:#666;font-size:14px"}">${label}</td>
      <td style="padding:${strong ? "10px 8px" : "3px 8px"};text-align:${opp};white-space:nowrap;${strong ? `border-top:2px solid ${WINE};font-weight:900;color:${WINE};font-size:17px` : "color:#444;font-size:14px"}">${val}</td>
    </tr>`;

  return `<!doctype html><html lang="${he ? "he" : "en"}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f2ecf8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2ecf8;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 8px 30px rgba(86,34,114,.12)">
        <!-- header -->
        <tr><td style="background:linear-gradient(135deg,${WINE},${WINE_DK});padding:26px 24px;text-align:center">
          ${logo}
          <div style="color:#fff;font-size:15px;font-weight:800;margin-top:10px">${esc(o.branchName)}</div>
        </td></tr>
        <!-- intro -->
        <tr><td style="padding:22px 24px 6px;text-align:${align}">
          <div style="font-size:20px;font-weight:900;color:${INK}">${o.forStaff ? L.newOrder : L.confirm}</div>
          <div style="font-size:14px;color:#666;margin-top:6px">${o.forStaff ? L.staffIntro : L.hi(esc(o.customer?.name || (he ? "לקוח/ה" : "there")))}</div>
        </td></tr>
        <!-- order + date -->
        <tr><td style="padding:8px 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f8;border-radius:10px">
            <tr>
              <td style="padding:12px 16px;text-align:${align}"><div style="color:#888;font-size:12px">${L.order}</div><div style="font-weight:900;color:${WINE};font-size:16px">${esc(o.orderNo)}</div></td>
              <td style="padding:12px 16px;text-align:${opp}"><div style="color:#888;font-size:12px">${o.scheduledFor ? L.scheduled : L.date}</div><div style="font-weight:700;color:${INK};font-size:14px">${esc(o.scheduledFor || o.createdAt || "")}</div></td>
            </tr>
          </table>
        </td></tr>
        <!-- customer -->
        ${
          o.customer && (o.customer.name || o.customer.phone || o.customer.email || o.customer.address)
            ? `<tr><td style="padding:16px 24px 4px">
                <div style="font-size:13px;font-weight:800;color:${WINE};text-align:${align};margin-bottom:6px">${L.customer}</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${infoRow(L.name, o.customer.name)}
                  ${infoRow(L.phone, o.customer.phone)}
                  ${infoRow(L.email, o.customer.email)}
                  ${infoRow(L.method, isDelivery ? L.delivery : L.pickup)}
                  ${isDelivery ? infoRow(L.address, o.customer.address) : ""}
                </table>
              </td></tr>`
            : ""
        }
        <!-- items -->
        <tr><td style="padding:18px 24px 4px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            <thead><tr style="background:#f4eef3">
              <th style="padding:8px;text-align:${align};color:${WINE};font-size:11px;font-weight:800">${L.product}</th>
              <th style="padding:8px;text-align:center;color:${WINE};font-size:11px;font-weight:800">${L.qty}</th>
              <th style="padding:8px;text-align:${opp};color:${WINE};font-size:11px;font-weight:800">${L.lineTotal}</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
        </td></tr>
        <!-- totals -->
        <tr><td style="padding:6px 24px 8px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${totalRow(L.subtotal, baht(subtotal))}
            ${delivery > 0 ? totalRow(L.deliveryFee, baht(delivery)) : ""}
            ${totalRow(L.total, baht(Number(o.total)), true)}
          </table>
        </td></tr>
        ${
          o.notes
            ? `<tr><td style="padding:6px 24px 8px"><div style="background:#f7f6f8;border-radius:8px;padding:12px 14px;text-align:${align};font-size:13px;color:#555"><b style="color:${WINE}">${L.notes}:</b> ${esc(o.notes)}</div></td></tr>`
            : ""
        }
        <!-- footer -->
        <tr><td style="padding:20px 24px;text-align:center;border-top:1px solid #eee;color:#999;font-size:12px">
          ${L.footer}<br><b style="color:${WINE}">${esc(o.branchName)}</b> · THE KOSHER PLACE
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
