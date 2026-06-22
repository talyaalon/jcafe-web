import "server-only";
import { getNotificationRecipients } from "@/lib/supabase/pos";
import { orderEmailHtml, orderEmailSubject } from "@/lib/email-template";

// ===== התראות לצוות הסניף (מייל + וואטסאפ) על הזמנה חדשה =====

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const from = process.env.RESEND_FROM || "J-Cafe <onboarding@resend.dev>";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
  } catch (e) {
    console.error("[notify-staff email]", e);
  }
}

async function sendWhatsApp(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // למשל whatsapp:+14155238886
  if (!sid || !token || !from) return; // לא מוגדר — דילוג שקט
  try {
    const num = to.replace(/[^\d+]/g, "");
    const toWa = `whatsapp:${num.startsWith("+") ? num : "+" + num}`;
    const params = new URLSearchParams({ From: from, To: toWa, Body: body });
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
  } catch (e) {
    console.error("[notify-staff whatsapp]", e);
  }
}

export interface StaffOrderInfo {
  orderNo: string;
  branchName: string;
  logoUrl?: string | null;
  customer: string;
  phone?: string;
  email?: string;
  address?: string | null;
  method?: string;
  scheduledFor?: string | null;
  notes?: string | null;
  total: number;
  delivery?: number;
  items: { name: string; qty: number; price?: number | null; storeName?: string | null }[];
}

// שולח לכל הנמענים שהוגדרו לסניף הזה בלבד. best-effort — לא חוסם את ההזמנה.
export async function notifyStaffNewOrder(branch: number, o: StaffOrderInfo): Promise<void> {
  const recipients = await getNotificationRecipients(branch);
  if (!recipients.length) return;

  const opts = {
    locale: "he" as const,
    forStaff: true,
    branchName: o.branchName,
    logoUrl: o.logoUrl ?? null,
    orderNo: o.orderNo,
    method: o.method,
    customer: { name: o.customer, phone: o.phone, email: o.email, address: o.address },
    scheduledFor: o.scheduledFor,
    notes: o.notes,
    items: o.items,
    delivery: o.delivery,
    total: o.total,
  };

  const itemsTxt = o.items.map((i) => `• ${i.name} ×${i.qty}`).join("\n");
  const text =
    `🔔 הזמנה חדשה ${o.orderNo}\n` +
    `סניף: ${o.branchName}\n` +
    `לקוח: ${o.customer}${o.phone ? ` (${o.phone})` : ""}\n` +
    `${o.method === "delivery" ? "משלוח" : "איסוף"}${o.address ? ` · ${o.address}` : ""}\n` +
    `${itemsTxt}\n` +
    `סה"כ: ฿${o.total.toLocaleString("en-US")}`;

  const html = orderEmailHtml(opts);
  const subject = orderEmailSubject(opts);

  await Promise.all(
    recipients.map((r) =>
      r.channel === "whatsapp" ? sendWhatsApp(r.value, text) : sendEmail(r.value, subject, html),
    ),
  );
}
