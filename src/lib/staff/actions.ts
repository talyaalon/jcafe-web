"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requestCourier } from "@/lib/shipday";

export async function setPosStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (id && status) await supabaseAdmin().from("pos_orders").update({ pos_status: status }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function setKitchenStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (id && status)
    await supabaseAdmin().from("pos_orders").update({ kitchen_status: status }).eq("id", id);
  revalidatePath("/", "layout");
}

// עדכון סטטוס של פריט בודד בהזמנה (pending | done | unavailable).
export async function setItemStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const index = Number(formData.get("index"));
  const status = String(formData.get("status"));
  const sb = supabaseAdmin();
  const { data } = await sb.from("pos_orders").select("items").eq("id", id).maybeSingle();
  if (!data) return;
  const items = (data.items as Record<string, unknown>[]).map((it, i) =>
    i === index ? { ...it, status } : it,
  );
  await sb.from("pos_orders").update({ items }).eq("id", id);
  revalidatePath("/", "layout");
}

// "סריקה" — מסמן את הפריט הבא שממתין (במכולת) כ-done. ללא חומרה: מתקדם לפי הסדר.
export async function scanNextGrocery(formData: FormData) {
  const id = String(formData.get("id"));
  const sb = supabaseAdmin();
  const { data } = await sb.from("pos_orders").select("items").eq("id", id).maybeSingle();
  if (!data) return;
  const items = data.items as { storeId?: string; status?: string }[];
  const idx = items.findIndex((it) => it.storeId === "grocery" && (it.status ?? "pending") === "pending");
  if (idx >= 0) {
    items[idx] = { ...items[idx], status: "done" };
    await sb.from("pos_orders").update({ items }).eq("id", id);
  }
  revalidatePath("/", "layout");
}

// ארכוב הזמנה ממסך (pos / kitchen) — יוצאת מהלוח הפעיל.
export async function archiveOrder(formData: FormData) {
  const id = String(formData.get("id"));
  const board = String(formData.get("board"));
  const field = board === "kitchen" ? "kitchen_status" : "pos_status";
  await supabaseAdmin().from("pos_orders").update({ [field]: "done" }).eq("id", id);
  revalidatePath("/", "layout");
}

// "מוכן לאיסוף" — מסיים את הליקוט + שולח בקשת שליח ל-ShipDay (placeholder).
export async function readyForPickupAction(formData: FormData) {
  const id = String(formData.get("id"));
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("pos_orders")
    .select("order_name,customer_name,phone")
    .eq("id", id)
    .maybeSingle();
  await requestCourier({
    orderName: (data?.order_name as string) ?? null,
    customer: (data?.customer_name as string) ?? null,
    phone: (data?.phone as string) ?? null,
  });
  await sb.from("pos_orders").update({ pos_status: "done", courier_status: "requested" }).eq("id", id);
  revalidatePath("/", "layout");
}
