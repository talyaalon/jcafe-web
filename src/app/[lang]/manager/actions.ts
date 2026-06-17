"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ADMIN_COOKIE } from "@/lib/admin/session";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const pw = String(formData.get("password") ?? "");
  const lang = String(formData.get("lang") ?? "he");
  const next = String(formData.get("next") ?? "");
  if (pw && pw === process.env.ADMIN_PASSWORD) {
    const c = await cookies();
    c.set(ADMIN_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    redirect(next || `/${lang}/manager`);
  }
  return { error: "wrong" };
}

export async function logoutAction(formData: FormData) {
  const lang = String(formData.get("lang") ?? "he");
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
  redirect(`/${lang}/manager`);
}

export async function saveStoreHoursAction(formData: FormData) {
  const storeId = String(formData.get("store_id"));
  const rows = DAYS.map((d) => ({
    store_id: storeId,
    day_of_week: d,
    closed: formData.get(`closed_${d}`) === "on",
    open_time: (String(formData.get(`open_${d}`) ?? "").trim() || null) as string | null,
    close_time: (String(formData.get(`close_${d}`) ?? "").trim() || null) as string | null,
  }));
  await supabaseAdmin().from("store_hours").upsert(rows, { onConflict: "store_id,day_of_week" });
  revalidatePath("/", "layout");
}

export async function addBannerAction(formData: FormData) {
  const image_url = String(formData.get("image_url") ?? "").trim();
  if (!image_url) return;
  await supabaseAdmin()
    .from("banners")
    .insert({
      image_url,
      title: String(formData.get("title") ?? "").trim() || null,
      link: String(formData.get("link") ?? "").trim() || null,
      sort: Number(formData.get("sort") ?? 0) || 0,
      active: true,
    });
  revalidatePath("/", "layout");
}

export async function deleteBannerAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (id) await supabaseAdmin().from("banners").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function toggleBannerAction(formData: FormData) {
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "true";
  if (id) await supabaseAdmin().from("banners").update({ active: !active }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function saveDeliveryAction(formData: FormData) {
  const num = (k: string, d: number) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) ? v : d;
  };
  await supabaseAdmin()
    .from("delivery_settings")
    .update({
      origin_lat: num("origin_lat", 7.8804),
      origin_lng: num("origin_lng", 98.3923),
      base_fee: num("base_fee", 40),
      per_km: num("per_km", 10),
      free_over: num("free_over", 0),
      max_km: num("max_km", 25),
    })
    .eq("id", 1);
  revalidatePath("/", "layout");
}

export async function editBannerAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await supabaseAdmin()
    .from("banners")
    .update({
      title: String(formData.get("title") ?? "").trim() || null,
      link: String(formData.get("link") ?? "").trim() || null,
      sort: Number(formData.get("sort") ?? 0) || 0,
    })
    .eq("id", id);
  revalidatePath("/", "layout");
}
