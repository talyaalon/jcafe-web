"use client";

import { useState } from "react";
import {
  saveStoreHoursAction,
  toggleBannerAction,
  deleteBannerAction,
  editBannerAction,
} from "@/app/[lang]/manager/actions";
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

type Section = "hours" | "banners";

export function ManagerDashboard({
  locale,
  stores,
  banners,
}: {
  locale: "he" | "en";
  stores: StoreHours[];
  banners: BannerRow[];
}) {
  const he = locale === "he";
  const [section, setSection] = useState<Section>("hours");
  const [editId, setEditId] = useState<number | null>(null);
  const days = he
    ? ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const nav = [
    { key: "hours" as const, icon: "🕐", label: he ? "שעות פעילות" : "Store hours" },
    { key: "banners" as const, icon: "🖼️", label: he ? "באנרים ומבצעים" : "Banners & promos" },
  ];
  const soon = he
    ? ["הזמנות", "לקוחות", "מוצרים", "משלוחים", "הגדרות"]
    : ["Orders", "Customers", "Products", "Delivery", "Settings"];

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
      </main>
    </div>
  );
}
