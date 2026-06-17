"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";

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
