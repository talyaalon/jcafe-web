import "server-only";
import { supabasePublic, supabaseConfigured } from "./server";
import { DEFAULT_DELIVERY, type DeliverySettings } from "@/lib/delivery";

export async function getDeliverySettings(branch = 14): Promise<DeliverySettings> {
  if (!supabaseConfigured) return DEFAULT_DELIVERY;
  const { data } = await supabasePublic
    .from("delivery_settings")
    .select("origin_lat,origin_lng,base_fee,per_km,free_over,max_km,pickup_address,pricing_mode")
    .eq("branch", branch)
    .maybeSingle();
  if (!data) return DEFAULT_DELIVERY;
  return {
    origin_lat: Number(data.origin_lat),
    origin_lng: Number(data.origin_lng),
    base_fee: Number(data.base_fee),
    per_km: Number(data.per_km),
    free_over: Number(data.free_over),
    max_km: Number(data.max_km),
    pickup_address: (data.pickup_address as string | null) ?? null,
    pricing_mode: data.pricing_mode === "distance" ? "distance" : "zone",
  };
}

export interface DeliveryZone {
  id: number;
  name: string;
  zip: string | null;
  fee: number;
  coverage_only: boolean;
}
export async function getDeliveryZones(branch = 14): Promise<DeliveryZone[]> {
  if (!supabaseConfigured) return [];
  const { data } = await supabasePublic
    .from("delivery_zones")
    .select("id,name,zip,fee,coverage_only")
    .eq("branch", branch)
    .order("name", { ascending: true });
  return (
    (data as { id: number; name: string; zip: string | null; fee: number; coverage_only: boolean | null }[]) ?? []
  ).map((z) => ({ ...z, coverage_only: !!z.coverage_only }));
}

export interface Banner {
  id: number;
  title: string | null;
  image_url: string;
  link: string | null;
  product_id?: string | null;
  discount_percent?: number | null;
}

export async function getActiveBanners(branch = 14): Promise<Banner[]> {
  if (!supabaseConfigured) return [];
  const { data } = await supabasePublic
    .from("banners")
    .select("id,title,image_url,link,product_id,discount_percent")
    .eq("active", true)
    .eq("branch", branch)
    .order("sort", { ascending: true });
  return data ?? [];
}

export interface BannerRow extends Banner {
  active: boolean;
  sort: number;
}

// הגדרות תצוגת באנרים: '*' = כל הסניף; אחרת מזהה חנות. חסר = מופעל (ברירת מחדל).
export async function getBannerSettings(branch = 14): Promise<Record<string, boolean>> {
  if (!supabaseConfigured) return {};
  const { data } = await supabasePublic
    .from("banner_settings")
    .select("store_id,enabled")
    .eq("branch", branch);
  const map: Record<string, boolean> = {};
  for (const r of (data as { store_id: string; enabled: boolean }[]) ?? []) map[r.store_id] = r.enabled;
  return map;
}

// האם להציג באנרים לחנות מסוימת בסניף (master של הסניף AND החנות).
export function bannersVisible(settings: Record<string, boolean>, storeId: string): boolean {
  return (settings["*"] ?? true) && (settings[storeId] ?? true);
}

export async function getAllBanners(branch = 14): Promise<BannerRow[]> {
  if (!supabaseConfigured) return [];
  const { data } = await supabasePublic
    .from("banners")
    .select("id,title,image_url,link,active,sort,product_id,discount_percent")
    .eq("branch", branch)
    .order("sort", { ascending: true });
  return (data as BannerRow[]) ?? [];
}

export interface BranchBranding {
  name_he: string | null;
  name_en: string | null;
  tagline_he: string | null;
  tagline_en: string | null;
  logo_url: string | null;
}

export async function getBranchBranding(branch = 14): Promise<BranchBranding | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabasePublic
    .from("branch_branding")
    .select("name_he,name_en,tagline_he,tagline_en,logo_url")
    .eq("branch", branch)
    .maybeSingle();
  return (data as BranchBranding) ?? null;
}

export interface StoreBrandingRow {
  store_id: string;
  name_he: string | null;
  name_en: string | null;
  logo_url: string | null;
}

// מיתוג פר-חנות לסניף — מפתח store_id → {שם, לוגו}
export async function getStoreBranding(branch = 14): Promise<Record<string, StoreBrandingRow>> {
  if (!supabaseConfigured) return {};
  const { data } = await supabasePublic
    .from("store_branding")
    .select("store_id,name_he,name_en,logo_url")
    .eq("branch", branch);
  const map: Record<string, StoreBrandingRow> = {};
  for (const r of (data as StoreBrandingRow[]) ?? []) map[r.store_id] = r;
  return map;
}

// ===== שיטות תשלום פר-סניף =====
export interface PaymentSettings {
  card: boolean;
  qr: boolean;
  cod: boolean;
}
export async function getBranchPayment(branch = 14): Promise<PaymentSettings> {
  const fallback = { card: true, qr: true, cod: true };
  if (!supabaseConfigured) return fallback;
  const { data } = await supabasePublic
    .from("branch_payment")
    .select("card,qr,cod")
    .eq("branch", branch)
    .maybeSingle();
  return (data as PaymentSettings) ?? fallback;
}

// ===== ערכת צבעים פר-סניף =====
export interface BranchTheme {
  primary_color: string | null;
  primary_hover: string | null;
  primary_bright: string | null;
  accent_color: string | null;
}
export async function getBranchTheme(branch = 14): Promise<BranchTheme | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabasePublic
    .from("branch_theme")
    .select("primary_color,primary_hover,primary_bright,accent_color")
    .eq("branch", branch)
    .maybeSingle();
  return (data as BranchTheme) ?? null;
}

// ===== מוצרים חסומים פר-סניף =====
export interface BlockedProduct {
  id: number;
  template_id: string;
  name: string | null;
  reference: string | null;
}
export async function getBlockedProducts(branch = 14): Promise<BlockedProduct[]> {
  if (!supabaseConfigured) return [];
  const { data } = await supabasePublic
    .from("blocked_products")
    .select("id,template_id,name,reference")
    .eq("branch", branch)
    .order("created_at", { ascending: false });
  return (data as BlockedProduct[]) ?? [];
}
export async function getBlockedProductIds(branch = 14): Promise<Set<string>> {
  const rows = await getBlockedProducts(branch);
  return new Set(rows.map((r) => String(r.template_id)));
}

export interface DayHours {
  day_of_week: number;
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export async function getStoreHours(storeId: string): Promise<DayHours[]> {
  if (!supabaseConfigured) return [];
  const { data } = await supabasePublic
    .from("store_hours")
    .select("day_of_week,closed,open_time,close_time")
    .eq("store_id", storeId)
    .order("day_of_week", { ascending: true });
  return data ?? [];
}

// שעון תאילנד (Asia/Bangkok) — יום בשבוע + HH:MM נוכחיים.
function bangkokNow(): { dow: number; hhmm: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const min = parts.find((p) => p.type === "minute")?.value ?? "00";
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dow: map[wd] ?? 0, hhmm: `${hour}:${min}` };
}

export interface OpenStatus {
  open: boolean;
  /** שעות היום (אם פתוח) או null */
  today: { open_time: string | null; close_time: string | null; closed: boolean } | null;
}

export async function getStoreOpenStatus(storeId: string): Promise<OpenStatus> {
  const hours = await getStoreHours(storeId);
  if (!hours.length) return { open: true, today: null }; // ללא נתונים — לא חוסמים
  const { dow, hhmm } = bangkokNow();
  const today = hours.find((h) => h.day_of_week === dow) ?? null;
  if (!today || today.closed || !today.open_time || !today.close_time) {
    return { open: false, today: today ? { ...today } : null };
  }
  const open = hhmm >= today.open_time && hhmm <= today.close_time;
  return { open, today: { ...today } };
}
