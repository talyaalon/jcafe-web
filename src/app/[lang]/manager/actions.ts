"use server";

import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ADMIN_COOKIE, createAdminToken, SESSION_MAX_AGE } from "@/lib/admin/session";
import { rateLimit } from "@/lib/rate-limit";

// השוואת סיסמה בזמן-קבוע (מונע timing attack)
function passwordOk(pw: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!pw || !expected) return false;
  const a = Buffer.from(pw);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const pw = String(formData.get("password") ?? "");
  const lang = String(formData.get("lang") ?? "he");
  const next = String(formData.get("next") ?? "");
  // הגבלת קצב נגד brute-force: עד 10 ניסיונות לכל IP ב-10 דקות
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`login:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: "rate" };
  }
  if (passwordOk(pw)) {
    const c = await cookies();
    c.set(ADMIN_COOKIE, createAdminToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
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
      product_id: String(formData.get("product_id") ?? "").trim() || null,
      discount_percent: Math.max(0, Math.min(90, Number(formData.get("discount_percent")) || 0)),
      active: true,
      branch: Number(formData.get("branch")) || 14,
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
  const branch = Number(formData.get("branch")) || 14;
  const mode = String(formData.get("pricing_mode") ?? "zone") === "distance" ? "distance" : "zone";
  await supabaseAdmin()
    .from("delivery_settings")
    .upsert(
      {
        id: branch,
        branch,
        origin_lat: num("origin_lat", 7.8804),
        origin_lng: num("origin_lng", 98.3923),
        base_fee: num("base_fee", 40),
        per_km: num("per_km", 10),
        free_over: num("free_over", 0),
        max_km: num("max_km", 25),
        pricing_mode: mode,
        pickup_address: String(formData.get("pickup_address") ?? "").trim() || null,
      },
      { onConflict: "branch" },
    );
  revalidatePath("/", "layout");
}

export async function addZoneAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const coverageOnly = String(formData.get("coverage_only") ?? "") === "1";
  await supabaseAdmin()
    .from("delivery_zones")
    .insert({
      branch: Number(formData.get("branch")) || 14,
      name,
      zip: String(formData.get("zip") ?? "").trim() || null,
      fee: coverageOnly ? 0 : Number(formData.get("fee")) || 0,
      coverage_only: coverageOnly,
    });
  revalidatePath("/", "layout");
}

export async function deleteZoneAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (id) await supabaseAdmin().from("delivery_zones").delete().eq("id", id);
  revalidatePath("/", "layout");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addRecipientAction(formData: FormData) {
  const branch = Number(formData.get("branch")) || 14;
  const channel = String(formData.get("channel") ?? "");
  let value = String(formData.get("value") ?? "").trim();
  if (channel !== "email" && channel !== "whatsapp") return;
  if (channel === "email") {
    value = value.toLowerCase();
    if (!EMAIL_RE.test(value)) return;
  } else {
    // וואטסאפ — נרמול למספר בינלאומי (ספרות + + מוביל)
    value = value.replace(/[^\d+]/g, "");
    if (value.replace(/\D/g, "").length < 8) return;
  }
  await supabaseAdmin().from("notification_recipients").insert({ branch, channel, value });
  revalidatePath("/", "layout");
}

export async function deleteRecipientAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (id) await supabaseAdmin().from("notification_recipients").delete().eq("id", id);
  revalidatePath("/", "layout");
}

// ===== שיטות תשלום פר-סניף =====
export async function savePaymentAction(formData: FormData) {
  const branch = Number(formData.get("branch")) || 14;
  await supabaseAdmin()
    .from("branch_payment")
    .upsert(
      {
        branch,
        card: formData.get("card") === "on",
        qr: formData.get("qr") === "on",
        cod: formData.get("cod") === "on",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "branch" },
    );
  revalidatePath("/", "layout");
}

// ===== מוצרים חסומים פר-סניף =====
export async function blockProductAction(formData: FormData) {
  const branch = Number(formData.get("branch")) || 14;
  const template_id = String(formData.get("template_id") ?? "").trim();
  if (!template_id) return;
  await supabaseAdmin()
    .from("blocked_products")
    .upsert(
      {
        branch,
        template_id,
        name: String(formData.get("name") ?? "").trim() || null,
        reference: String(formData.get("reference") ?? "").trim() || null,
      },
      { onConflict: "branch,template_id" },
    );
  revalidatePath("/", "layout");
}
export async function unblockProductAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (id) await supabaseAdmin().from("blocked_products").delete().eq("id", id);
  revalidatePath("/", "layout");
}

// ===== ערכת צבעים פר-סניף =====
const HEX = /^#[0-9a-fA-F]{6}$/;
export async function saveThemeAction(formData: FormData) {
  const branch = Number(formData.get("branch")) || 14;
  const hex = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return HEX.test(v) ? v.toLowerCase() : null;
  };
  await supabaseAdmin()
    .from("branch_theme")
    .upsert(
      {
        branch,
        primary_color: hex("primary_color"),
        primary_hover: hex("primary_hover"),
        primary_bright: hex("primary_bright"),
        accent_color: hex("accent_color"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "branch" },
    );
  revalidatePath("/", "layout");
}
export async function resetThemeAction(formData: FormData) {
  const branch = Number(formData.get("branch")) || 14;
  await supabaseAdmin().from("branch_theme").delete().eq("branch", branch);
  revalidatePath("/", "layout");
}

export async function setBannerEnabledAction(formData: FormData) {
  const branch = Number(formData.get("branch")) || 14;
  const store_id = String(formData.get("store_id") ?? "").trim() || "*";
  const enabled = String(formData.get("enabled")) === "true";
  await supabaseAdmin()
    .from("banner_settings")
    .upsert(
      { branch, store_id, enabled, updated_at: new Date().toISOString() },
      { onConflict: "branch,store_id" },
    );
  revalidatePath("/", "layout");
}

export async function saveBrandingAction(formData: FormData) {
  const branch = Number(formData.get("branch")) || 14;
  const txt = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  await supabaseAdmin()
    .from("branch_branding")
    .upsert(
      {
        branch,
        name_he: txt("name_he"),
        name_en: txt("name_en"),
        tagline_he: txt("tagline_he"),
        tagline_en: txt("tagline_en"),
        logo_url: txt("logo_url"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "branch" },
    );
  revalidatePath("/", "layout");
}

export async function saveStoreBrandingAction(formData: FormData) {
  const branch = Number(formData.get("branch")) || 14;
  const store_id = String(formData.get("store_id") ?? "").trim();
  if (!store_id) return;
  const txt = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  await supabaseAdmin()
    .from("store_branding")
    .upsert(
      {
        branch,
        store_id,
        name_he: txt("name_he"),
        name_en: txt("name_en"),
        logo_url: txt("logo_url"),
        tab_logo_url: txt("tab_logo_url"),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "branch,store_id" },
    );
  revalidatePath("/", "layout");
}

export async function editBannerAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  const image_url = String(formData.get("image_url") ?? "").trim();
  const patch: Record<string, unknown> = {
    title: String(formData.get("title") ?? "").trim() || null,
    product_id: String(formData.get("product_id") ?? "").trim() || null,
    discount_percent: Math.max(0, Math.min(90, Number(formData.get("discount_percent")) || 0)),
  };
  if (image_url) patch.image_url = image_url;
  await supabaseAdmin().from("banners").update(patch).eq("id", id);
  revalidatePath("/", "layout");
}
