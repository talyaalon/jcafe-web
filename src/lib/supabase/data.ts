import "server-only";
import { supabasePublic, supabaseConfigured } from "./server";
import { DEFAULT_DELIVERY, type DeliverySettings } from "@/lib/delivery";

export async function getDeliverySettings(branch = 14): Promise<DeliverySettings> {
  if (!supabaseConfigured) return DEFAULT_DELIVERY;
  const { data } = await supabasePublic
    .from("delivery_settings")
    .select("origin_lat,origin_lng,base_fee,per_km,free_over,max_km")
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
  };
}

export interface DeliveryZone {
  id: number;
  name: string;
  zip: string | null;
  fee: number;
}
export async function getDeliveryZones(branch = 14): Promise<DeliveryZone[]> {
  if (!supabaseConfigured) return [];
  const { data } = await supabasePublic
    .from("delivery_zones")
    .select("id,name,zip,fee")
    .eq("branch", branch)
    .order("name", { ascending: true });
  return (data as DeliveryZone[]) ?? [];
}

export interface Banner {
  id: number;
  title: string | null;
  image_url: string;
  link: string | null;
  product_id?: string | null;
}

export async function getActiveBanners(branch = 14): Promise<Banner[]> {
  if (!supabaseConfigured) return [];
  const { data } = await supabasePublic
    .from("banners")
    .select("id,title,image_url,link,product_id")
    .eq("active", true)
    .eq("branch", branch)
    .order("sort", { ascending: true });
  return data ?? [];
}

export interface BannerRow extends Banner {
  active: boolean;
  sort: number;
}

export async function getAllBanners(branch = 14): Promise<BannerRow[]> {
  if (!supabaseConfigured) return [];
  const { data } = await supabasePublic
    .from("banners")
    .select("id,title,image_url,link,active,sort,product_id")
    .eq("branch", branch)
    .order("sort", { ascending: true });
  return (data as BannerRow[]) ?? [];
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
