"use client";

import { useState } from "react";
import {
  saveStoreHoursAction,
  toggleBannerAction,
  deleteBannerAction,
  editBannerAction,
  saveDeliveryAction,
} from "@/app/[lang]/manager/actions";
import type { DeliverySettings } from "@/lib/delivery";
import { formatTHB } from "@/lib/format";
import { BannerUploader } from "./BannerUploader";

interface DayH {
  day_of_week: number;
  closed: boolean;
  open_time: string | null;
  close_time: string | null;
}
export interface StoreHours {
  id: string;
  name: string;
  hours: DayH[];
}
export interface BannerRow {
  id: number;
  title: string | null;
  image_url: string;
  link: string | null;
  active: boolean;
  sort: number;
}

export interface OrderRow {
  id: string;
  order_name: string | null;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  method: string | null;
  scheduled_for: string | null;
  notes: string | null;
  total: number;
  items: { name: string; qty: number; storeId: string; storeName: string }[];
  pos_status: string;
  kitchen_status: string;
  created_at: string;
}

type Section = "orders" | "hours" | "banners" | "delivery";

export function ManagerDashboard({
  locale,
  stores,
  banners,
  delivery,
  orders,
}: {
  locale: "he" | "en";
  stores: StoreHours[];
  banners: BannerRow[];
  delivery: DeliverySettings;
  orders: OrderRow[];
}) {
  const he = locale === "he";
  const [section, setSection] = useState<Section>("orders");
  const [editId, setEditId] = useState<number | null>(null);
  const days = he
    ? ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const nav = [
    { key: "orders" as const, icon: "🧾", label: he ? "הזמנות" : "Orders" },
    { key: "hours" as const, icon: "🕐", label: he ? "שעות פעילות" : "Store hours" },
    { key: "banners" as const, icon: "🖼️", label: he ? "באנרים ומבצעים" : "Banners & promos" },
    { key: "delivery" as const, icon: "🛵", label: he ? "משלוחים" : "Delivery" },
  ];
  const soon = he ? ["לקוחות", "מוצרים", "הגדרות"] : ["Customers", "Products", "Settings"];

  const fmtDateTime = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const statusLabel = (s: string) =>
    ({
      new: he ? "חדש" : "New",
      picking: he ? "בליקוט" : "Picking",
      preparing: he ? "בהכנה" : "Preparing",
      ready: he ? "מוכן" : "Ready",
    })[s] ?? s;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-6 p-6 max-w-6xl mx-auto">
      {/* sidebar */}
      <aside className="bg-white border border-line rounded-xl p-2 h-fit md:sticky md:top-6">
        {nav.map((n) => (
          <button
            key={n.key}
            onClick={() => setSection(n.key)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-start transition ${
              section === n.key ? "bg-wine text-white font-bold" : "text-ink/70 hover:bg-soft"
            }`}
          >
            <span>{n.icon}</span>
            {n.label}
          </button>
        ))}
        <div className="border-t border-line my-2" />
        <div className="px-3 text-[11px] text-ink/40 mb-1">{he ? "בקרוב" : "Coming soon"}</div>
        {soon.map((s) => (
          <div key={s} className="px-3 py-1.5 text-sm text-ink/30 cursor-default">
            {s}
          </div>
        ))}
      </aside>

      {/* content */}
      <main>
        {section === "orders" && (
          <section>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-extrabold text-wine">{he ? "הזמנות" : "Orders"}</h2>
              <span className="text-xs text-ink/45">{orders.length} {he ? "הזמנות" : "orders"}</span>
            </div>
            <p className="text-ink/55 text-sm mb-4">
              {he ? "כל ההזמנות שנכנסו דרך האתר (אחרונות למעלה)." : "All orders placed through the site (newest first)."}
            </p>
            {orders.length === 0 ? (
              <p className="text-ink/40 text-sm">{he ? "אין הזמנות עדיין." : "No orders yet."}</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white border border-line rounded-xl p-4">
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div>
                        <span className="font-extrabold text-wine">{o.order_name || "—"}</span>
                        <span className="text-xs text-ink/50 ms-2">{fmtDateTime(o.created_at)}</span>
                      </div>
                      <span className="font-extrabold text-ink">{formatTHB(o.total)}</span>
                    </div>
                    <div className="text-[13px] text-ink/70 mt-1">
                      {o.customer_name}
                      {o.phone ? ` · ${o.phone}` : ""}
                      {o.email ? ` · ${o.email}` : ""}
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-soft">
                        {o.method === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף" : "Pickup"}
                      </span>
                      {o.scheduled_for && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          🗓 {o.scheduled_for}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-soft">
                        {he ? "מלקט" : "Picker"}: {statusLabel(o.pos_status)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-soft">
                        {he ? "מטבח" : "Kitchen"}: {statusLabel(o.kitchen_status)}
                      </span>
                    </div>
                    <ul className="mt-2 text-[13px] text-ink/80 border-t border-line pt-2 grid sm:grid-cols-2 gap-x-4 gap-y-0.5">
                      {o.items.map((it, idx) => (
                        <li key={idx} className="flex justify-between gap-2">
                          <span>
                            {it.name} <span className="text-ink/40">({it.storeName})</span>
                          </span>
                          <span className="font-bold flex-none">×{it.qty}</span>
                        </li>
                      ))}
                    </ul>
                    {o.notes && <div className="text-[11px] text-ink/50 mt-2">📝 {o.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {section === "hours" && (
          <section>
            <h2 className="text-xl font-extrabold text-wine mb-1">
              {he ? "שעות פעילות" : "Store hours"}
            </h2>
            <p className="text-ink/55 text-sm mb-4">
              {he
                ? "הגדירו שעות לכל חנות ויום. חנות סגורה תוצג ככזו באתר."
                : "Set hours per store and day. Closed stores show as closed on the site."}
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {stores.map((s) => (
                <form
                  key={s.id}
                  action={saveStoreHoursAction}
                  className="bg-white border border-line rounded-xl p-4"
                >
                  <input type="hidden" name="store_id" value={s.id} />
                  <h3 className="font-bold text-ink mb-3">{s.name}</h3>
                  <div className="space-y-1.5">
                    {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                      const row = s.hours.find((h) => h.day_of_week === d);
                      return (
                        <div key={d} className="flex items-center gap-2 text-sm">
                          <span className="w-9 text-ink/60">{days[d]}</span>
                          <input
                            type="time"
                            name={`open_${d}`}
                            defaultValue={row?.open_time ?? ""}
                            className="border border-line rounded px-2 py-1 w-28"
                          />
                          <span className="text-ink/40">–</span>
                          <input
                            type="time"
                            name={`close_${d}`}
                            defaultValue={row?.close_time ?? ""}
                            className="border border-line rounded px-2 py-1 w-28"
                          />
                          <label className="flex items-center gap-1 text-ink/60 ms-auto">
                            <input
                              type="checkbox"
                              name={`closed_${d}`}
                              defaultChecked={row?.closed ?? false}
                            />
                            {he ? "סגור" : "Closed"}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <button className="mt-3 bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover">
                    {he ? "שמירה" : "Save"}
                  </button>
                </form>
              ))}
            </div>
          </section>
        )}

        {section === "banners" && (
          <section>
            <h2 className="text-xl font-extrabold text-wine mb-1">
              {he ? "באנרים ומבצעים" : "Banners & promos"}
            </h2>
            <p className="text-ink/55 text-sm mb-4">
              {he
                ? "באנרים מופיעים בדף הבית מעל הקטגוריות (בטאב 'הכל')."
                : "Banners appear on the homepage above categories (on 'All')."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {banners.map((b) => (
                <div key={b.id} className="bg-white border border-line rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image_url} alt={b.title ?? ""} className="w-full h-28 object-cover" />
                  <div className="p-3">
                    {editId === b.id ? (
                      <form action={editBannerAction} className="space-y-2">
                        <input type="hidden" name="id" value={b.id} />
                        <input
                          name="title"
                          defaultValue={b.title ?? ""}
                          placeholder={he ? "כותרת" : "Title"}
                          className="w-full border border-line rounded px-2 py-1 text-sm"
                        />
                        <input
                          name="link"
                          defaultValue={b.link ?? ""}
                          placeholder={he ? "קישור" : "Link"}
                          className="w-full border border-line rounded px-2 py-1 text-sm"
                        />
                        <input
                          name="sort"
                          type="number"
                          defaultValue={b.sort}
                          className="w-20 border border-line rounded px-2 py-1 text-sm"
                        />
                        <div className="flex gap-2 items-center">
                          <button className="bg-wine text-white text-xs font-bold rounded px-3 py-1.5">
                            {he ? "שמור" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            className="text-xs text-ink/50"
                          >
                            {he ? "ביטול" : "Cancel"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="font-bold text-sm text-ink truncate">{b.title || "—"}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <form action={toggleBannerAction}>
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="active" value={String(b.active)} />
                            <button
                              className={`text-xs font-bold rounded-lg px-3 py-1 border ${b.active ? "border-brand-green text-brand-green" : "border-line text-ink/50"}`}
                            >
                              {b.active ? (he ? "פעיל" : "Active") : he ? "כבוי" : "Off"}
                            </button>
                          </form>
                          <button
                            onClick={() => setEditId(b.id)}
                            className="text-xs font-bold text-wine border border-line rounded-lg px-3 py-1"
                          >
                            {he ? "עריכה" : "Edit"}
                          </button>
                          <form action={deleteBannerAction} className="ms-auto">
                            <input type="hidden" name="id" value={b.id} />
                            <button className="text-xs font-bold text-red-500 border border-red-200 rounded-lg px-3 py-1">
                              {he ? "מחק" : "Delete"}
                            </button>
                          </form>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {banners.length === 0 && (
                <p className="text-ink/40 text-sm">{he ? "אין באנרים עדיין." : "No banners yet."}</p>
              )}
            </div>

            <div className="max-w-lg">
              <BannerUploader he={he} />
            </div>
          </section>
        )}

        {section === "delivery" && (
          <section>
            <h2 className="text-xl font-extrabold text-wine mb-1">{he ? "משלוחים" : "Delivery"}</h2>
            <p className="text-ink/55 text-sm mb-4">
              {he
                ? "דמי משלוח מחושבים לפי מרחק (קו אווירי מהסניף לעיר). מעבר לרדיוס המקסימלי — משלוח נחסם."
                : "Delivery fee is distance-based (from the branch to the city). Beyond max radius — delivery is blocked."}
            </p>
            <form action={saveDeliveryAction} className="bg-white border border-line rounded-xl p-4 max-w-lg space-y-3">
              {(
                [
                  ["base_fee", he ? "דמי בסיס (฿)" : "Base fee (฿)", delivery.base_fee],
                  ["per_km", he ? "מחיר לק״מ (฿)" : "Per km (฿)", delivery.per_km],
                  ["free_over", he ? "משלוח חינם מעל (฿, 0=כבוי)" : "Free over (฿, 0=off)", delivery.free_over],
                  ["max_km", he ? "רדיוס מקסימלי (ק״מ)" : "Max radius (km)", delivery.max_km],
                  ["origin_lat", he ? "קו רוחב הסניף" : "Branch latitude", delivery.origin_lat],
                  ["origin_lng", he ? "קו אורך הסניף" : "Branch longitude", delivery.origin_lng],
                ] as const
              ).map(([name, label, val]) => (
                <div key={name} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-ink/70">{label}</label>
                  <input
                    name={name}
                    type="number"
                    step="any"
                    defaultValue={String(val)}
                    className="w-40 border border-line rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <button className="bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover">
                {he ? "שמירה" : "Save"}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
