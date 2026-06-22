"use client";

import { useState } from "react";
import Link from "next/link";
import {
  saveStoreHoursAction,
  toggleBannerAction,
  deleteBannerAction,
  saveDeliveryAction,
  addZoneAction,
  deleteZoneAction,
  setBannerEnabledAction,
  addRecipientAction,
  deleteRecipientAction,
} from "@/app/[lang]/manager/actions";
import type { DeliverySettings } from "@/lib/delivery";
import { formatTHB } from "@/lib/format";
import { BannerUploader } from "./BannerUploader";
import { BannerEditor } from "./BannerEditor";
import { BrandingEditor, type Branding } from "./BrandingEditor";
import {
  StoreBrandingEditor,
  type StoreBrandingInfo,
  type StoreBrandingValue,
} from "./StoreBrandingEditor";
import type { PickerProduct } from "./ProductPicker";
import { ProductBlocker, type BlockedRow } from "./ProductBlocker";
import { PaymentEditor, type PaymentValue } from "./PaymentEditor";
import { ThemeEditor, type ThemeValue } from "./ThemeEditor";
import { ZoneAreaField } from "./ZoneAreaField";
import { SubmitButton } from "./SubmitButton";
import {
  IconOrders,
  IconCustomers,
  IconClock,
  IconImage,
  IconTag,
  IconDelivery,
  IconCard,
  IconBox,
  IconBell,
  IconGear,
  IconMail,
  IconChat,
} from "../Icons";

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
  product_id?: string | null;
  discount_percent?: number | null;
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

export interface WebCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  branches: string[];
  created: string;
  source: "site" | "odoo";
}

export interface ZoneRow {
  id: number;
  name: string;
  zip: string | null;
  fee: number;
  coverage_only: boolean;
}

export interface RecipientRow {
  id: number;
  channel: "email" | "whatsapp";
  value: string;
}

type Section =
  | "orders"
  | "customers"
  | "hours"
  | "banners"
  | "branding"
  | "delivery"
  | "notifications"
  | "products"
  | "payments"
  | "settings";

export function ManagerDashboard({
  locale,
  branch,
  stores,
  banners,
  bannerSettings,
  branding,
  brandStores,
  storeBranding,
  delivery,
  orders,
  webCustomers,
  products,
  zones,
  recipients,
  payment,
  theme,
  blockedProducts,
}: {
  locale: "he" | "en";
  branch: number;
  stores: StoreHours[];
  banners: BannerRow[];
  bannerSettings: Record<string, boolean>;
  branding: Branding | null;
  brandStores: StoreBrandingInfo[];
  storeBranding: Record<string, StoreBrandingValue>;
  delivery: DeliverySettings;
  orders: OrderRow[];
  webCustomers: WebCustomer[];
  products: PickerProduct[];
  zones: ZoneRow[];
  recipients: RecipientRow[];
  payment: PaymentValue;
  theme: ThemeValue | null;
  blockedProducts: BlockedRow[];
}) {
  const he = locale === "he";
  const [section, setSection] = useState<Section>("orders");
  const [editId, setEditId] = useState<number | null>(null);
  const [custBranch, setCustBranch] = useState("all");
  const [custSource, setCustSource] = useState<"all" | "site" | "odoo">("all");
  const days = he
    ? ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const nav = [
    { key: "orders" as const, Icon: IconOrders, label: he ? "הזמנות" : "Orders" },
    { key: "customers" as const, Icon: IconCustomers, label: he ? "לקוחות" : "Customers" },
    { key: "hours" as const, Icon: IconClock, label: he ? "שעות פעילות" : "Store hours" },
    { key: "banners" as const, Icon: IconImage, label: he ? "באנרים ומבצעים" : "Banners & promos" },
    { key: "branding" as const, Icon: IconTag, label: he ? "שם ולוגו" : "Name & logo" },
    { key: "delivery" as const, Icon: IconDelivery, label: he ? "משלוחים" : "Delivery" },
    { key: "payments" as const, Icon: IconCard, label: he ? "תשלומים" : "Payments" },
    { key: "products" as const, Icon: IconBox, label: he ? "מוצרים" : "Products" },
    { key: "notifications" as const, Icon: IconBell, label: he ? "התראות" : "Notifications" },
    { key: "settings" as const, Icon: IconGear, label: he ? "הגדרות וצבעים" : "Settings & colors" },
  ];

  const emailRecipients = recipients.filter((r) => r.channel === "email");
  const waRecipients = recipients.filter((r) => r.channel === "whatsapp");

  // נגזרות: סטטיסטיקה + לקוחות (מתוך ההזמנות)
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const todayKey = new Date().toDateString();
  const todayCount = orders.filter((o) => new Date(o.created_at).toDateString() === todayKey).length;

  // לקוחות אתר מ-ODOO + סינון לפי סניף
  const branchTags = [...new Set(webCustomers.flatMap((c) => c.branches))].sort();
  const custFiltered = webCustomers.filter(
    (c) =>
      (custBranch === "all" || c.branches.includes(custBranch)) &&
      (custSource === "all" || c.source === custSource),
  );

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
            <n.Icon className="w-[18px] h-[18px] flex-none" />
            {n.label}
          </button>
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
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: he ? "סה״כ הזמנות" : "Total orders", val: String(orders.length) },
                { label: he ? "הזמנות היום" : "Orders today", val: String(todayCount) },
                { label: he ? "הכנסות" : "Revenue", val: formatTHB(totalRevenue) },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-line rounded-xl p-3 text-center shadow-sm">
                  <div className="text-xl font-extrabold text-wine">{s.val}</div>
                  <div className="text-[11px] text-ink/55 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            {orders.length === 0 ? (
              <p className="text-ink/40 text-sm">{he ? "אין הזמנות עדיין." : "No orders yet."}</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white border border-line rounded-xl p-4 shadow-sm">

                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div>
                        <Link
                          href={`/${locale}/manager/orders/${o.id}`}
                          className="font-extrabold text-wine hover:underline"
                        >
                          {o.order_name || "—"}
                        </Link>
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          <IconClock className="w-3.5 h-3.5" /> {o.scheduled_for}
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
                    {o.notes && (
                      <div className="text-[11px] text-ink/50 mt-2">
                        <span className="font-bold">{he ? "הערה:" : "Note:"}</span> {o.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {section === "customers" && (
          <section>
            <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
              <h2 className="text-xl font-extrabold text-wine">{he ? "לקוחות" : "Customers"}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={custSource}
                  onChange={(e) => setCustSource(e.target.value as "all" | "site" | "odoo")}
                  className="border border-line rounded-lg px-2 py-1 text-sm"
                >
                  <option value="all">{he ? "כל המקורות" : "All sources"}</option>
                  <option value="site">{he ? "נוצרו דרך האתר" : "Created via site"}</option>
                  <option value="odoo">{he ? "נמשכו מ-ODOO" : "From ODOO"}</option>
                </select>
                <select
                  value={custBranch}
                  onChange={(e) => setCustBranch(e.target.value)}
                  className="border border-line rounded-lg px-2 py-1 text-sm"
                >
                  <option value="all">{he ? "כל הסניפים" : "All branches"}</option>
                  {branchTags.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-ink/45">{custFiltered.length}</span>
              </div>
            </div>
            <p className="text-ink/55 text-sm mb-4">
              {he
                ? "כל הלקוחות שנוצרו דרך האתר ב-ODOO (אנשי קשר), עם תג הסניף שממנו הגיעו."
                : "All customers created via the site in ODOO contacts, tagged by origin branch."}
            </p>
            {custFiltered.length === 0 ? (
              <p className="text-ink/40 text-sm">{he ? "אין לקוחות עדיין." : "No customers yet."}</p>
            ) : (
              <div className="bg-white border border-line rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-ink/60 bg-soft">
                      <th className="text-start font-bold p-3">{he ? "שם" : "Name"}</th>
                      <th className="text-start font-bold p-3">{he ? "טלפון" : "Phone"}</th>
                      <th className="text-start font-bold p-3">{he ? "אימייל" : "Email"}</th>
                      <th className="text-start font-bold p-3">{he ? "סניף" : "Branch"}</th>
                      <th className="text-start font-bold p-3">{he ? "נוצר" : "Created"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {custFiltered.map((c) => (
                      <tr key={c.id} className="border-t border-line">
                        <td className="p-3 font-semibold text-ink">
                          {c.name}
                          <span
                            className={`inline-block ms-2 text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                              c.source === "site"
                                ? "bg-brand-green/15 text-brand-green"
                                : "bg-ink/10 text-ink/60"
                            }`}
                          >
                            {c.source === "site" ? (he ? "אתר" : "Site") : "ODOO"}
                          </span>
                        </td>
                        <td className="p-3 text-ink/70">{c.phone || "—"}</td>
                        <td className="p-3 text-ink/70">{c.email || "—"}</td>
                        <td className="p-3">
                          {c.branches.length ? (
                            c.branches.map((b) => (
                              <span
                                key={b}
                                className="inline-block text-[11px] font-bold bg-wine/10 text-wine rounded-full px-2 py-0.5 me-1"
                              >
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-ink/40">—</span>
                          )}
                        </td>
                        <td className="p-3 text-ink/55 text-[12px]">{c.created?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  <SubmitButton
                    className="mt-3 bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover"
                    savedLabel={he ? "נשמר ✓" : "Saved ✓"}
                  >
                    {he ? "שמירה" : "Save"}
                  </SubmitButton>
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

            {/* תצוגת באנרים — הפעלה/כיבוי פר סניף ופר חנות */}
            <div className="bg-white border border-line rounded-xl p-4 mb-5 max-w-lg">
              <h3 className="font-bold text-ink mb-1">
                {he ? "תצוגת באנרים" : "Banner visibility"}
              </h3>
              <p className="text-ink/55 text-[13px] mb-3">
                {he
                  ? "החליטו אם להציג באנרים — לכל הסניף, ולכל חנות בנפרד."
                  : "Choose whether to show banners — for the whole branch, and per store."}
              </p>
              <BannerToggle
                branch={branch}
                storeId="*"
                label={he ? "כל הסניף (ראשי)" : "Whole branch (master)"}
                enabled={bannerSettings["*"] ?? true}
                onLabel={he ? "מוצג" : "Shown"}
                offLabel={he ? "מוסתר" : "Hidden"}
                emphasize
              />
              {brandStores.map((s) => (
                <BannerToggle
                  key={s.id}
                  branch={branch}
                  storeId={s.id}
                  label={he ? s.nameHe : s.nameEn}
                  enabled={bannerSettings[s.id] ?? true}
                  onLabel={he ? "מוצג" : "Shown"}
                  offLabel={he ? "מוסתר" : "Hidden"}
                  dimmed={(bannerSettings["*"] ?? true) === false}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {banners.map((b) => (
                <div key={b.id} className="bg-white border border-line rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image_url} alt={b.title ?? ""} className="w-full h-28 object-cover" />
                  <div className="p-3">
                    {editId === b.id ? (
                      <BannerEditor
                        banner={b}
                        products={products}
                        he={he}
                        onDone={() => setEditId(null)}
                      />
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
              <BannerUploader he={he} branch={branch} products={products} />
            </div>
          </section>
        )}

        {section === "branding" && (
          <section>
            <h2 className="text-xl font-extrabold text-wine mb-1">
              {he ? "שם ולוגו" : "Name & logo"}
            </h2>

            {/* מיתוג הסניף — הפינה העליונה */}
            <h3 className="font-bold text-ink mt-3 mb-1">
              {he ? "לוגו הסניף (פינה עליונה)" : "Branch logo (top corner)"}
            </h3>
            <p className="text-ink/55 text-sm mb-3">
              {he
                ? "שם ולוגו הסניף שיופיעו בפינה העליונה של חזית הסניף (במקום THE KOSHER PLACE / J CAFE PHUKET). השאירו ריק לברירת המחדל."
                : "Branch name and logo shown in the top corner of the storefront (instead of THE KOSHER PLACE / J CAFE PHUKET). Leave blank for the default."}
            </p>
            <BrandingEditor he={he} branch={branch} branding={branding} />

            {/* מיתוג לכל חנות — לשוניות החנויות */}
            <h3 className="font-bold text-ink mt-7 mb-1">
              {he ? "לוגו לכל חנות (לשוניות)" : "Per-store logo (tabs)"}
            </h3>
            <p className="text-ink/55 text-sm mb-3">
              {he
                ? "שם ולוגו לכל חנות בסניף — מוצגים בלשונית החנות בחזית. השאירו ריק לשם המקורי."
                : "Name and logo per store — shown on the store's tab in the storefront. Leave blank to keep the original name."}
            </p>
            {brandStores.length === 0 ? (
              <p className="text-ink/40 text-sm">{he ? "אין חנויות." : "No stores."}</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-3xl">
                {brandStores.map((s) => (
                  <StoreBrandingEditor
                    key={s.id}
                    he={he}
                    branch={branch}
                    store={s}
                    value={storeBranding[s.id] ?? null}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {section === "delivery" && (
          <section>
            <h2 className="text-xl font-extrabold text-wine mb-1">{he ? "משלוחים" : "Delivery"}</h2>
            <p className="text-ink/55 text-sm mb-4">
              {he
                ? "הגדירו את אזורי הכיסוי (היכן שיש משלוח) ואת אופן התמחור — לפי אזור או לפי מרחק."
                : "Set the coverage areas (where you deliver) and how pricing works — by area or by distance."}
            </p>
            <form action={saveDeliveryAction} className="bg-white border border-line rounded-xl p-4 max-w-lg space-y-4">
              <input type="hidden" name="branch" value={branch} />

              {/* אופן התמחור */}
              <div>
                <label className="block text-sm font-bold text-ink/80 mb-2">
                  {he ? "אופן תמחור המשלוח" : "Delivery pricing mode"}
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="pricing_mode"
                      value="zone"
                      defaultChecked={delivery.pricing_mode !== "distance"}
                      className="mt-1 accent-wine"
                    />
                    <span>
                      <b>{he ? "לפי אזור" : "By area"}</b>{" "}
                      <span className="text-ink/55">
                        {he
                          ? "— מחיר קבוע לכל אזור (אזורי כיסוי משתמשים בדמי ברירת המחדל)."
                          : "— a fixed fee per area (coverage areas use the default fee)."}
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="pricing_mode"
                      value="distance"
                      defaultChecked={delivery.pricing_mode === "distance"}
                      className="mt-1 accent-wine"
                    />
                    <span>
                      <b>{he ? "לפי מרחק (ק״מ)" : "By distance (km)"}</b>{" "}
                      <span className="text-ink/55">
                        {he
                          ? "— דמי בסיס + מחיר לכל ק״מ מהסניף, בתוך אזורי הכיסוי."
                          : "— base fee + price per km from the branch, within coverage areas."}
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {(
                [
                  ["base_fee", he ? "דמי משלוח ברירת מחדל (฿)" : "Default fee (฿)", delivery.base_fee],
                  ["per_km", he ? "מחיר לכל ק״מ (฿) — לתמחור לפי מרחק" : "Price per km (฿) — distance mode", delivery.per_km],
                  ["max_km", he ? "מרחק מירבי (ק״מ) — לתמחור לפי מרחק" : "Max distance (km) — distance mode", delivery.max_km],
                  ["free_over", he ? "משלוח חינם מעל (฿, 0=כבוי)" : "Free over (฿, 0=off)", delivery.free_over],
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
              <div>
                <label className="block text-sm text-ink/70 mb-1">
                  {he ? "כתובת לאיסוף עצמי (מוצגת בקופה)" : "Pickup address (shown at checkout)"}
                </label>
                <input
                  name="pickup_address"
                  defaultValue={delivery.pickup_address ?? ""}
                  placeholder={he ? "למשל: רחוב סוקומוויט 123, בנגקוק" : "e.g. 123 Sukhumvit Rd, Bangkok"}
                  className="w-full border border-line rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <SubmitButton
                className="bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover"
                savedLabel={he ? "נשמר ✓" : "Saved ✓"}
              >
                {he ? "שמירה" : "Save"}
              </SubmitButton>
            </form>

            {/* ===== אזורי כיסוי (משלוח פעיל, ללא מחיר) ===== */}
            <h3 className="text-lg font-extrabold text-wine mt-6 mb-1">
              {he ? "אזורי כיסוי (משלוח פעיל)" : "Coverage areas (delivery active)"}
            </h3>
            <p className="text-ink/55 text-sm mb-3">
              {he
                ? "אזורים גדולים בתאילנד שבהם המשלוח פעיל — ללא מחיר (משתמשים בדמי ברירת המחדל / לפי מרחק). למשל: בנגקוק, פאטאיה, קנצ׳נבורי."
                : "Large areas in Thailand where delivery is active — no per-area price (use default / distance). E.g. Bangkok, Pattaya, Kanchanaburi."}
            </p>
            <div className="bg-white border border-line rounded-xl p-4 max-w-lg space-y-2">
              {zones.filter((z) => z.coverage_only).length === 0 ? (
                <p className="text-ink/40 text-sm">
                  {he ? "לא הוגדרו אזורי כיסוי." : "No coverage areas yet."}
                </p>
              ) : (
                zones
                  .filter((z) => z.coverage_only)
                  .map((z) => (
                    <div key={z.id} className="flex items-center justify-between gap-2 border-b border-line/60 pb-2">
                      <div>
                        <span className="font-bold text-sm">{z.name}</span>
                        {z.zip && <span className="text-ink/45 text-xs ms-2">{z.zip}</span>}
                      </div>
                      <form action={deleteZoneAction}>
                        <input type="hidden" name="id" value={z.id} />
                        <button className="text-xs text-red-500 font-bold">{he ? "מחק" : "Delete"}</button>
                      </form>
                    </div>
                  ))
              )}
              <form action={addZoneAction} className="flex gap-2 items-end pt-2 flex-wrap">
                <input type="hidden" name="branch" value={branch} />
                <input type="hidden" name="coverage_only" value="1" />
                <div>
                  <label className="block text-[11px] text-ink/55">{he ? "אזור (גוגל)" : "Area (Google)"}</label>
                  <ZoneAreaField he={he} />
                </div>
                <div>
                  <label className="block text-[11px] text-ink/55">{he ? "מיקוד (אופציונלי)" : "Zip (optional)"}</label>
                  <input
                    name="zip"
                    placeholder="10110"
                    className="border border-line rounded-lg px-2 py-1.5 text-sm w-24"
                  />
                </div>
                <button className="bg-wine text-white font-bold rounded-lg px-3 py-1.5 text-sm">
                  {he ? "הוסף אזור כיסוי" : "Add coverage area"}
                </button>
              </form>
            </div>

            {/* ===== מחיר לפי אזור ספציפי ===== */}
            <h3 className="text-lg font-extrabold text-wine mt-6 mb-1">
              {he ? "מחיר לפי אזור ספציפי" : "Per-area pricing"}
            </h3>
            <p className="text-ink/55 text-sm mb-3">
              {he
                ? "אזורים עם דמי משלוח קבועים משלהם (פעיל כשאופן התמחור הוא ״לפי אזור״)."
                : "Areas with their own fixed delivery fee (used when pricing mode is “By area”)."}
            </p>
            <div className="bg-white border border-line rounded-xl p-4 max-w-lg space-y-2">
              {zones.filter((z) => !z.coverage_only).length === 0 ? (
                <p className="text-ink/40 text-sm">
                  {he ? "לא הוגדרו אזורים מתומחרים." : "No priced areas yet."}
                </p>
              ) : (
                zones
                  .filter((z) => !z.coverage_only)
                  .map((z) => (
                    <div key={z.id} className="flex items-center justify-between gap-2 border-b border-line/60 pb-2">
                      <div>
                        <span className="font-bold text-sm">{z.name}</span>
                        {z.zip && <span className="text-ink/45 text-xs ms-2">{z.zip}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-wine font-bold text-sm">{formatTHB(z.fee)}</span>
                        <form action={deleteZoneAction}>
                          <input type="hidden" name="id" value={z.id} />
                          <button className="text-xs text-red-500 font-bold">{he ? "מחק" : "Delete"}</button>
                        </form>
                      </div>
                    </div>
                  ))
              )}
              <form action={addZoneAction} className="flex gap-2 items-end pt-2 flex-wrap">
                <input type="hidden" name="branch" value={branch} />
                <input type="hidden" name="coverage_only" value="0" />
                <div>
                  <label className="block text-[11px] text-ink/55">{he ? "אזור (גוגל)" : "Area (Google)"}</label>
                  <ZoneAreaField he={he} />
                </div>
                <div>
                  <label className="block text-[11px] text-ink/55">{he ? "מיקוד" : "Zip"}</label>
                  <input
                    name="zip"
                    placeholder="10110"
                    className="border border-line rounded-lg px-2 py-1.5 text-sm w-24"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-ink/55">{he ? "דמי משלוח (฿)" : "Fee (฿)"}</label>
                  <input
                    name="fee"
                    type="number"
                    defaultValue={0}
                    className="border border-line rounded-lg px-2 py-1.5 text-sm w-20"
                  />
                </div>
                <button className="bg-wine text-white font-bold rounded-lg px-3 py-1.5 text-sm">
                  {he ? "הוסף אזור מתומחר" : "Add priced area"}
                </button>
              </form>
            </div>
            <p className="text-[11px] text-ink/45 mt-2">
              {he
                ? "💡 לקוח מחוץ לכל אזורי הכיסוי/המתומחרים — המשלוח נחסם. בחירת אזור עם השלמה אוטומטית מ-Google (מוגבל לתאילנד)."
                : "💡 Customers outside every coverage/priced area are blocked. Area picker uses Google autocomplete (Thailand only)."}
            </p>
          </section>
        )}

        {section === "notifications" && (
          <section>
            <h2 className="text-xl font-extrabold text-wine mb-1">
              {he ? "התראות הזמנה" : "Order notifications"}
            </h2>
            <p className="text-ink/55 text-sm mb-5">
              {he
                ? "כשנכנסת הזמנה חדשה לסניף זה, נשלחת אוטומטית הודעה לכל הנמענים שמוגדרים כאן — בלבד."
                : "When a new order comes into this branch, every recipient listed here is notified automatically — and only them."}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-3xl">
              {/* אימייל */}
              <div className="bg-white border border-line rounded-xl p-4">
                <h3 className="font-bold text-ink mb-1 flex items-center gap-2">
                  <IconMail className="w-5 h-5 text-wine" /> {he ? "כתובות אימייל" : "Email addresses"}
                </h3>
                <p className="text-ink/55 text-[13px] mb-3">
                  {he ? "מקבלים מייל עם פירוט ההזמנה." : "Receive an email with the order details."}
                </p>
                <div className="space-y-2 mb-3">
                  {emailRecipients.length === 0 ? (
                    <p className="text-ink/40 text-sm">{he ? "לא הוגדרו כתובות." : "No addresses yet."}</p>
                  ) : (
                    emailRecipients.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 border-b border-line/60 pb-2"
                      >
                        <span className="text-sm text-ink break-all">{r.value}</span>
                        <form action={deleteRecipientAction} className="flex-none">
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-xs text-red-500 font-bold">
                            {he ? "הסר" : "Remove"}
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>
                <form action={addRecipientAction} className="flex gap-2 items-end flex-wrap">
                  <input type="hidden" name="branch" value={branch} />
                  <input type="hidden" name="channel" value="email" />
                  <input
                    name="value"
                    type="email"
                    required
                    placeholder={he ? "name@example.com" : "name@example.com"}
                    className="flex-1 min-w-[10rem] border border-line rounded-lg px-3 py-2 text-sm"
                  />
                  <button className="bg-wine text-white font-bold rounded-lg px-3 py-2 text-sm hover:bg-wine-hover">
                    {he ? "הוסף אימייל" : "Add email"}
                  </button>
                </form>
              </div>

              {/* וואטסאפ */}
              <div className="bg-white border border-line rounded-xl p-4">
                <h3 className="font-bold text-ink mb-1 flex items-center gap-2">
                  <IconChat className="w-5 h-5 text-wine" /> {he ? "מספרי וואטסאפ" : "WhatsApp numbers"}
                </h3>
                <p className="text-ink/55 text-[13px] mb-3">
                  {he
                    ? "מקבלים הודעת וואטסאפ עם פירוט ההזמנה. הזינו מספר בפורמט בינלאומי."
                    : "Receive a WhatsApp message with the order details. Enter an international number."}
                </p>
                <div className="space-y-2 mb-3">
                  {waRecipients.length === 0 ? (
                    <p className="text-ink/40 text-sm">{he ? "לא הוגדרו מספרים." : "No numbers yet."}</p>
                  ) : (
                    waRecipients.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 border-b border-line/60 pb-2"
                      >
                        <span className="text-sm text-ink" dir="ltr">{r.value}</span>
                        <form action={deleteRecipientAction} className="flex-none">
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-xs text-red-500 font-bold">
                            {he ? "הסר" : "Remove"}
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>
                <form action={addRecipientAction} className="flex gap-2 items-end flex-wrap">
                  <input type="hidden" name="branch" value={branch} />
                  <input type="hidden" name="channel" value="whatsapp" />
                  <input
                    name="value"
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="+972501234567"
                    className="flex-1 min-w-[10rem] border border-line rounded-lg px-3 py-2 text-sm"
                  />
                  <button className="bg-wine text-white font-bold rounded-lg px-3 py-2 text-sm hover:bg-wine-hover">
                    {he ? "הוסף מספר" : "Add number"}
                  </button>
                </form>
              </div>
            </div>

            <p className="text-[11px] text-ink/45 mt-3 max-w-3xl">
              {he
                ? "💡 שליחת אימייל פעילה דרך Resend (לאחר אימות דומיין — לכל נמען). שליחת וואטסאפ מחייבת חיבור ספק (Twilio) — עד אז המספרים נשמרים אך ההודעה לא נשלחת."
                : "💡 Email is sent via Resend (after domain verification — to any recipient). WhatsApp requires a provider (Twilio) — until connected, numbers are saved but messages are not sent."}
            </p>
          </section>
        )}

        {section === "payments" && (
          <section>
            <h2 className="text-xl font-extrabold text-wine mb-1">{he ? "שיטות תשלום" : "Payment methods"}</h2>
            <p className="text-ink/55 text-sm mb-4">
              {he
                ? "בחרו אילו אמצעי תשלום יוצגו ללקוח בקופה — ספציפי לסניף זה."
                : "Choose which payment methods customers see at checkout — for this branch."}
            </p>
            <PaymentEditor branch={branch} he={he} payment={payment} />
          </section>
        )}

        {section === "products" && (
          <section>
            <h2 className="text-xl font-extrabold text-wine mb-1">{he ? "מוצרים" : "Products"}</h2>
            <p className="text-ink/55 text-sm mb-4">
              {he
                ? "חסימת מוצרים מהצגה בחנות הסניף — חיפוש לפי שם או קוד מק״ט, מעל ODOO וללא קשר למלאי."
                : "Block products from this branch's store — search by name or reference, above ODOO and regardless of stock."}
            </p>
            <ProductBlocker branch={branch} he={he} blocked={blockedProducts} products={products} />
          </section>
        )}

        {section === "settings" && (
          <section>
            <h2 className="text-xl font-extrabold text-wine mb-1">{he ? "הגדרות וצבעים" : "Settings & colors"}</h2>
            <p className="text-ink/55 text-sm mb-4">
              {he
                ? "ערכת הצבעים של חזית הסניף. בחרו ערכה מוכנה או צבעים אישיים — בשמירה כל החנות תתעדכן."
                : "The branch storefront color palette. Pick a preset or custom colors — saving recolors the whole store."}
            </p>
            <ThemeEditor branch={branch} he={he} theme={theme} />
          </section>
        )}
      </main>
    </div>
  );
}

function BannerToggle({
  branch,
  storeId,
  label,
  enabled,
  onLabel,
  offLabel,
  emphasize,
  dimmed,
}: {
  branch: number;
  storeId: string;
  label: string;
  enabled: boolean;
  onLabel: string;
  offLabel: string;
  emphasize?: boolean;
  dimmed?: boolean;
}) {
  return (
    <form
      action={setBannerEnabledAction}
      className={`flex items-center justify-between gap-3 py-2 ${
        emphasize ? "border-b border-line mb-1" : "border-b border-line/40 last:border-0"
      }`}
    >
      <span
        className={`text-sm ${emphasize ? "font-bold text-ink" : "text-ink/80"} ${
          dimmed ? "opacity-40" : ""
        }`}
      >
        {label}
      </span>
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="store_id" value={storeId} />
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <button
        type="submit"
        title={dimmed ? "" : undefined}
        className={`inline-flex items-center gap-1.5 h-7 rounded-full px-3 text-xs font-bold border transition ${
          enabled
            ? "bg-brand-green/15 text-brand-green border-brand-green/40 hover:bg-brand-green/25"
            : "bg-ink/5 text-ink/50 border-line hover:bg-ink/10"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${enabled ? "bg-brand-green" : "bg-ink/30"}`}
        />
        {enabled ? onLabel : offLabel}
      </button>
    </form>
  );
}
