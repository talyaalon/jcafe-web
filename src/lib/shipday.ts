import "server-only";

// ===== ShipDay (placeholder) =====
// בעתיד: חיבור ל-ShipDay API ליצירת משלוח + הקצאת שליח.
// כרגע: רושם שההזמנה "נשלחה" ומחזיר אישור (ללא קריאה אמיתית).

export interface ShipdayResult {
  ok: boolean;
  message: string;
}

export async function requestCourier(_order: {
  orderName: string | null;
  customer: string | null;
  phone: string | null;
  address?: string | null;
}): Promise<ShipdayResult> {
  const key = process.env.SHIPDAY_API_KEY;
  if (!key) {
    // ללא מפתח — placeholder בלבד
    return { ok: true, message: "נשלח ל-ShipDay (placeholder) — בקשת שליח נרשמה" };
  }
  // TODO: קריאה אמיתית ל-ShipDay:
  // const res = await fetch("https://api.shipday.com/orders", {
  //   method: "POST",
  //   headers: { Authorization: `Basic ${key}`, "Content-Type": "application/json" },
  //   body: JSON.stringify({ orderNumber: _order.orderName, customerName: _order.customer, ... }),
  // });
  return { ok: true, message: "בקשת שליח נשלחה ל-ShipDay" };
}
