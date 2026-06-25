import "server-only";
import webpush from "web-push";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/server";

let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:apps@kosher-place.com", pub, priv);
  vapidReady = true;
  return true;
}

interface SubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  company: number | null;
}

// שליחת התראת רקע למלקטים שמנויים לסניף הזה (או ל"כל הסניפים"). best-effort.
export async function sendNewOrderPush(
  company: number | null,
  orderName: string | null,
  customer: string | null,
): Promise<void> {
  if (!supabaseConfigured || !ensureVapid()) return;
  try {
    const admin = supabaseAdmin();
    const { data } = await admin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth,company");
    const subs = ((data as SubRow[]) ?? []).filter(
      (s) => s.company == null || s.company === company,
    );
    if (!subs.length) return;
    const payload = JSON.stringify({
      title: "🔔 הזמנה חדשה",
      body: [customer, orderName].filter(Boolean).join(" · ") || "הזמנה חדשה התקבלה",
      url: company ? `/en/picker?company=${company}` : "/en/picker",
      tag: orderName || "new-order",
    });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { urgency: "high", TTL: 120 },
          );
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode ?? 0;
          if (code === 404 || code === 410) {
            await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
        }
      }),
    );
  } catch (e) {
    console.error("[push] send failed", e);
  }
}
