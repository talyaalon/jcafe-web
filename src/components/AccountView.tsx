"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatTHB } from "@/lib/format";
import { useAuth } from "@/lib/auth/AuthContext";
import { useFavorites } from "@/lib/favorites/FavoritesContext";
import { useCart, type CartItem, type CartStoreRef } from "@/lib/cart/CartContext";
import { branchHref, COMPANY_SLUG } from "@/lib/branch-slugs";
import { supabaseBrowser } from "@/lib/supabase/client";
import { findPhuketStore } from "@/lib/odoo/phuket";
import type { Product } from "@/lib/odoo/types";
import {
  getBranchProfile,
  withBranchProfile,
  type SavedAddress,
} from "@/lib/account/profile";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { PrintReceiptButton } from "./staff/PrintReceiptButton";
import { IconBox, IconGear, IconStore, IconCart } from "./Icons";

type Section = "dashboard" | "orders" | "favorites" | "details";

interface AcctItem {
  name: string;
  qty: number;
  price?: number;
  storeName: string;
  storeId: string;
  templateId?: number;
}
interface AcctOrder {
  order_name: string | null;
  created_at: string;
  company: number | null;
  method: string | null;
  total: number;
  delivery_fee?: number | null;
  address?: string | null;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  scheduled_for?: string | null;
  notes?: string | null;
  items: AcctItem[];
}

function storeRefFor(p: Product): CartStoreRef {
  const s = findPhuketStore(p.storeId);
  return s
    ? { id: s.id, nameHe: s.nameHe, nameEn: s.nameEn, emoji: s.emoji }
    : { id: p.storeId, nameHe: p.storeId, nameEn: p.storeId, emoji: "" };
}

export function AccountView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const a = dict.account;
  const he = locale === "he";
  const router = useRouter();
  const { user, displayName, loading, signOut } = useAuth();
  const { favorites, toggle } = useFavorites();
  const { branchCompany, addItem, replaceCart } = useCart();
  const [section, setSection] = useState<Section>("dashboard");
  const [orders, setOrders] = useState<AcctOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [openOrder, setOpenOrder] = useState<AcctOrder | null>(null);

  const branchName =
    branchCompany != null
      ? (COMPANY_SLUG[branchCompany] ?? "").replace(/^\w/, (c) => c.toUpperCase())
      : "";

  // לשונית מבוקשת מה-URL (?tab=favorites) — בלי useSearchParams כדי לא לאלץ רינדור-לקוח לעמוד
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "favorites" || t === "orders" || t === "details" || t === "dashboard") {
      setSection(t as Section);
    }
  }, []);

  // הגנה: לא מחובר → לכניסה
  useEffect(() => {
    if (!loading && !user) router.replace(`/${locale}/login`);
  }, [loading, user, locale, router]);

  // הזמנות המשתמש, מסוננות לסניף הנוכחי (endpoint מאובטח שמעשיר מ-pos_orders)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    setLoadingOrders(true);
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (alive) setLoadingOrders(false);
        return;
      }
      const q = branchCompany ? `?company=${branchCompany}` : "";
      const res = await fetch(`/api/account/orders${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (alive) {
        setOrders((j.orders as AcctOrder[]) ?? []);
        setLoadingOrders(false);
      }
    })().catch(() => {
      if (alive) setLoadingOrders(false);
    });
    return () => {
      alive = false;
    };
  }, [user, branchCompany]);

  if (loading || !user) {
    return <div className="max-w-5xl mx-auto w-full px-4 py-16 text-center text-ink/50">…</div>;
  }

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const methodLabel = (m: string | null) =>
    m === "delivery" ? (he ? "משלוח" : "Delivery") : he ? "איסוף" : "Pickup";

  const logout = async () => {
    await signOut();
    router.push(branchHref(locale, branchCompany));
  };

  // הוספת מועדף לסל (בסניף הנוכחי)
  const addFav = (p: Product) => {
    if (branchCompany == null) {
      router.push(branchHref(locale, branchCompany));
      return;
    }
    addItem(p, storeRefFor(p), 1);
  };

  // הזמנה חוזרת — עגלה חדשה של אותו סניף עם פריטי ההזמנה
  const reorder = (o: AcctOrder) => {
    if (o.company == null) return;
    const items: CartItem[] = o.items.map((it) => ({
      product: {
        id: String(it.templateId ?? it.name),
        storeId: it.storeId,
        categoryId: "",
        nameHe: it.name,
        nameEn: it.name,
        price: it.price ?? 0,
        qtyAvailable: null,
        isKitchen: it.storeId !== "grocery",
        isFeatured: false,
      },
      qty: it.qty,
      store: { id: it.storeId, nameHe: it.storeName, nameEn: it.storeName, emoji: "" },
      branch: o.company as number,
    }));
    replaceCart(o.company, items);
    router.push(branchHref(locale, o.company));
  };

  const nav: { key: Section; label: string; Icon: typeof IconStore }[] = [
    { key: "dashboard", label: a.dashboard, Icon: IconStore },
    { key: "orders", label: a.orders, Icon: IconBox },
    { key: "favorites", label: he ? "מועדפים" : "Favorites", Icon: HeartIcon },
    { key: "details", label: a.accountDetails, Icon: IconGear },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-wine">{a.title}</h1>
          {branchName && (
            <p className="text-sm text-ink/55 mt-1 flex items-center gap-1.5">
              <IconStore className="w-4 h-4 text-wine/70" /> {branchName}
            </p>
          )}
        </div>
        <p className="text-sm text-ink/70">
          {a.hello} <b className="text-wine">{displayName}</b>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-6">
        {/* sidebar */}
        <aside className="border border-line rounded-2xl overflow-hidden h-fit bg-white">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              className={`w-full flex items-center gap-3 text-start px-4 py-3 text-sm border-b border-line transition ${
                section === n.key
                  ? "bg-wine/5 text-wine font-bold"
                  : "text-ink/70 hover:bg-soft/60"
              }`}
            >
              <n.Icon className="w-[18px] h-[18px]" />
              {n.label}
            </button>
          ))}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 text-start px-4 py-3 text-sm text-ink/70 hover:bg-soft/60"
          >
            <LogoutIcon className="w-[18px] h-[18px]" />
            {a.logout}
          </button>
        </aside>

        {/* content */}
        <section className="min-w-0">
          {section === "dashboard" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <DashCard
                Icon={IconBox}
                value={String(orders.length)}
                label={he ? "הזמנות בסניף זה" : "Orders at this branch"}
                onClick={() => setSection("orders")}
              />
              <DashCard
                Icon={HeartIcon}
                value={String(favorites.length)}
                label={he ? "מועדפים" : "Favorites"}
                onClick={() => setSection("favorites")}
              />
              <div className="sm:col-span-2 border border-line rounded-2xl p-5 bg-white text-sm text-ink/70 leading-relaxed">
                {a.dashIntro}
              </div>
            </div>
          )}

          {section === "orders" && (
            <div className="border border-line rounded-2xl bg-white overflow-hidden">
              {loadingOrders ? (
                <p className="p-8 text-center text-ink/40 text-sm">…</p>
              ) : orders.length === 0 ? (
                <p className="p-8 text-center text-ink/50 text-sm">
                  {he ? "אין הזמנות בסניף זה עדיין." : "No orders at this branch yet."}
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {orders.map((o) => (
                    <li
                      key={o.order_name}
                      className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 flex-wrap"
                    >
                      <div className="min-w-0">
                        <button
                          onClick={() => setOpenOrder(o)}
                          className="font-extrabold text-wine hover:underline"
                        >
                          {o.order_name || "—"}
                        </button>
                        <div className="text-[12px] text-ink/55 mt-0.5">
                          {fmtDate(o.created_at)} · {methodLabel(o.method)} ·{" "}
                          {o.items.reduce((s, i) => s + i.qty, 0)} {he ? "פריטים" : "items"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{formatTHB(o.total)}</span>
                        <button
                          onClick={() => setOpenOrder(o)}
                          className="text-xs font-bold border border-line rounded-lg px-3 py-1.5 hover:border-wine text-ink/70"
                        >
                          {a.view}
                        </button>
                        <button
                          onClick={() => reorder(o)}
                          className="text-xs font-bold rounded-lg px-3 py-1.5 bg-wine text-white hover:bg-wine-hover inline-flex items-center gap-1.5"
                        >
                          <IconCart className="w-4 h-4" />
                          {he ? "הזמנה חוזרת" : "Reorder"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {section === "favorites" && (
            <div>
              {favorites.length === 0 ? (
                <p className="text-ink/50 text-sm p-6 border border-line rounded-2xl bg-white text-center">
                  {he ? "אין מועדפים עדיין." : "No favorites yet."}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {favorites.map((p) => (
                    <div
                      key={p.id}
                      className="border border-line rounded-2xl overflow-hidden bg-white flex flex-col"
                    >
                      <div className="h-28 bg-soft grid place-items-center p-2">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <IconStore className="w-8 h-8 text-wine/25" />
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <div className="text-[13px] leading-tight line-clamp-2 min-h-[2.4em]">
                          {he ? p.nameHe : p.nameEn}
                        </div>
                        <div className="font-bold text-wine text-sm mt-1">{formatTHB(p.price)}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => addFav(p)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-wine text-white text-[12px] font-bold rounded-lg py-1.5 hover:bg-wine-hover"
                          >
                            <IconCart className="w-4 h-4" />
                            {he ? "לסל" : "Add"}
                          </button>
                          <button
                            onClick={() => toggle(p)}
                            aria-label={he ? "הסר ממועדפים" : "Remove favorite"}
                            className="w-8 h-8 grid place-items-center rounded-lg border border-line text-wine hover:bg-soft"
                          >
                            <HeartIcon className="w-4 h-4" filled />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === "details" && (
            <DetailsTab
              he={he}
              a={a}
              branchCompany={branchCompany}
              defaultName={displayName}
              email={user.email ?? ""}
            />
          )}
        </section>
      </div>

      {openOrder && (
        <OrderModal
          he={he}
          a={a}
          order={openOrder}
          branchName={branchName}
          locale={locale}
          methodLabel={methodLabel}
          fmtDate={fmtDate}
          onClose={() => setOpenOrder(null)}
          onReorder={() => {
            reorder(openOrder);
            setOpenOrder(null);
          }}
        />
      )}
    </div>
  );
}

// ===== order detail modal =====
function OrderModal({
  he,
  a,
  order,
  branchName,
  locale,
  methodLabel,
  fmtDate,
  onClose,
  onReorder,
}: {
  he: boolean;
  a: Dictionary["account"];
  order: AcctOrder;
  branchName: string;
  locale: Locale;
  methodLabel: (m: string | null) => string;
  fmtDate: (iso: string) => string;
  onClose: () => void;
  onReorder: () => void;
}) {
  const subtotal = order.items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 bg-wine text-white px-5 py-3 sticky top-0">
          <span className="font-extrabold">
            {order.order_name || "—"}{" "}
            <span className="text-white/70 text-sm font-normal">· {fmtDate(order.created_at)}</span>
          </span>
          <button onClick={onClose} aria-label={he ? "סגירה" : "Close"} className="text-2xl leading-none px-2">
            ✕
          </button>
        </div>

        <div className="p-5">
          <div className="text-sm text-ink/70 mb-3 space-y-0.5">
            <div>
              {he ? "אופן" : "Method"}: <b className="text-ink">{methodLabel(order.method)}</b>
            </div>
            {order.method === "delivery" && order.address && (
              <div>
                {he ? "כתובת" : "Address"}: <b className="text-ink">{order.address}</b>
              </div>
            )}
            {branchName && (
              <div>
                {he ? "סניף" : "Branch"}: <b className="text-ink">{branchName}</b>
              </div>
            )}
          </div>

          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((it, idx) => (
              <li key={idx} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="text-ink">{it.name}</span>{" "}
                  <span className="text-ink/45">×{it.qty}</span>
                  <span className="block text-[11px] text-ink/45">{it.storeName}</span>
                </span>
                <span className="font-semibold text-ink whitespace-nowrap">
                  {formatTHB((it.price ?? 0) * it.qty)}
                </span>
              </li>
            ))}
          </ul>

          <div className="text-sm mt-3 space-y-1">
            <div className="flex justify-between text-ink/70">
              <span>{he ? "סכום ביניים" : "Subtotal"}</span>
              <span>{formatTHB(subtotal)}</span>
            </div>
            {!!order.delivery_fee && (
              <div className="flex justify-between text-ink/70">
                <span>{he ? "דמי משלוח" : "Delivery"}</span>
                <span>{formatTHB(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-wine text-base pt-1">
              <span>{a.total}</span>
              <span>{formatTHB(order.total)}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button
              onClick={onReorder}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-wine text-white font-bold rounded-xl py-3 hover:bg-wine-hover"
            >
              <IconCart className="w-5 h-5" />
              {he ? "הזמנה חוזרת" : "Reorder"}
            </button>
            <PrintReceiptButton
              order={{
                order_name: order.order_name,
                created_at: order.created_at,
                customer_name: order.customer_name,
                phone: order.phone,
                email: order.email,
                method: order.method,
                address: order.address,
                scheduled_for: order.scheduled_for,
                notes: order.notes,
                total: order.total,
                delivery_fee: order.delivery_fee,
                items: order.items.map((i) => ({
                  name: i.name,
                  qty: i.qty,
                  price: i.price,
                  storeName: i.storeName,
                })),
              }}
              branchName={branchName || "J Cafe"}
              logoUrl={null}
              locale={locale}
              className="inline-flex items-center justify-center gap-2 border-2 border-wine text-wine font-bold rounded-xl px-4 py-3 text-sm hover:bg-wine hover:text-white transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== details + addresses tab =====
function DetailsTab({
  he,
  a,
  branchCompany,
  defaultName,
  email,
}: {
  he: boolean;
  a: Dictionary["account"];
  branchCompany: number | null;
  defaultName: string;
  email: string;
}) {
  const { user } = useAuth();
  const initial = getBranchProfile(user?.user_metadata, branchCompany);
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [addresses, setAddresses] = useState<SavedAddress[]>(initial.addresses ?? []);
  const [draft, setDraft] = useState<SavedAddress>({ id: "", addr1: "", addr2: "", city: "", postcode: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const field = "w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine";
  const label = "block text-sm text-ink/70 mb-1";

  const addDraft = () => {
    if (!draft.addr1.trim()) return;
    const id = (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
    setAddresses((prev) => [
      ...prev,
      { ...draft, id, isDefault: prev.length === 0 },
    ]);
    setDraft({ id: "", addr1: "", addr2: "", city: "", postcode: "" });
  };
  const removeAddr = (id: string) =>
    setAddresses((prev) => {
      const next = prev.filter((x) => x.id !== id);
      if (next.length && !next.some((x) => x.isDefault)) next[0].isDefault = true;
      return [...next];
    });
  const setDefault = (id: string) =>
    setAddresses((prev) => prev.map((x) => ({ ...x, isDefault: x.id === id })));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const baseMeta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      let data: Record<string, unknown> = { ...baseMeta, name };
      if (branchCompany != null) {
        data = withBranchProfile(data, branchCompany, { phone, addresses });
      }
      await supabaseBrowser.auth.updateUser({ data });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-line rounded-2xl bg-white p-5 sm:p-6 space-y-5 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>{a.displayName}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>{a.emailAddr}</label>
          <input
            value={email}
            readOnly
            className="w-full bg-soft border border-line rounded-lg px-3 py-2.5 text-sm text-ink/60"
          />
        </div>
      </div>
      <div>
        <label className={label}>{he ? "טלפון" : "Phone"}</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          className={field}
        />
      </div>

      {/* addresses */}
      <div>
        <h3 className="font-bold text-ink mb-2">{he ? "הכתובות שלי" : "My addresses"}</h3>
        {addresses.length === 0 ? (
          <p className="text-sm text-ink/50 mb-3">{he ? "אין כתובות שמורות." : "No saved addresses."}</p>
        ) : (
          <ul className="space-y-2 mb-3">
            {addresses.map((ad) => (
              <li
                key={ad.id}
                className="flex items-start justify-between gap-3 border border-line rounded-xl p-3"
              >
                <div className="text-sm min-w-0">
                  <div className="text-ink">
                    {ad.addr1}
                    {ad.addr2 ? `, ${ad.addr2}` : ""}
                  </div>
                  <div className="text-[12px] text-ink/50">
                    {[ad.city, ad.postcode].filter(Boolean).join(" · ")}
                  </div>
                  {ad.isDefault && (
                    <span className="inline-block mt-1 text-[11px] font-bold text-brand-green">
                      ✓ {he ? "ברירת מחדל" : "Default"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-none">
                  {!ad.isDefault && (
                    <button
                      onClick={() => setDefault(ad.id)}
                      className="text-[11px] font-bold text-wine hover:underline"
                    >
                      {he ? "קבע כברירת מחדל" : "Set default"}
                    </button>
                  )}
                  <button
                    onClick={() => removeAddr(ad.id)}
                    className="text-[11px] text-ink/40 hover:text-red-500"
                  >
                    {he ? "הסר" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* add address */}
        <div className="border border-dashed border-line rounded-xl p-3 space-y-2">
          <label className={label}>{he ? "הוסף כתובת" : "Add address"}</label>
          <AddressAutocomplete
            value={draft.addr1}
            onChange={(v) => setDraft((d) => ({ ...d, addr1: v }))}
            placeholder={he ? "התחילי להקליד כתובת…" : "Start typing an address…"}
            className={field}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={draft.addr2 ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, addr2: e.target.value }))}
              placeholder={he ? "דירה / קומה" : "Apt / floor"}
              className={field}
            />
            <input
              value={draft.postcode ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, postcode: e.target.value }))}
              placeholder={he ? "מיקוד" : "Postcode"}
              className={field}
            />
          </div>
          <button
            onClick={addDraft}
            disabled={!draft.addr1.trim()}
            className="text-sm font-bold border border-wine text-wine rounded-lg px-4 py-2 hover:bg-wine hover:text-white transition disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-wine"
          >
            + {he ? "הוסף כתובת" : "Add address"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-wine text-white font-bold rounded-xl px-6 py-2.5 hover:bg-wine-hover disabled:opacity-60"
        >
          {saving ? "…" : a.saveChanges}
        </button>
        {saved && <span className="text-sm font-bold text-brand-green">✓ {he ? "נשמר" : "Saved"}</span>}
      </div>
      {branchCompany == null && (
        <p className="text-[12px] text-amber-700">
          {he
            ? "טלפון וכתובות נשמרים לפי סניף — פתחי קודם חנות של סניף כדי לשמור אותם."
            : "Phone & addresses are saved per branch — open a branch store first to save them."}
        </p>
      )}
    </div>
  );
}

// ===== small UI helpers =====
function DashCard({
  Icon,
  value,
  label,
  onClick,
}: {
  Icon: (p: { className?: string }) => ReactNode;
  value: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="border border-line rounded-2xl bg-white p-5 text-start hover:border-wine transition flex items-center gap-4"
    >
      <span className="w-11 h-11 rounded-xl bg-wine/10 text-wine grid place-items-center">
        <Icon className="w-6 h-6" />
      </span>
      <span>
        <span className="block text-2xl font-extrabold text-ink leading-none">{value}</span>
        <span className="block text-sm text-ink/60 mt-1">{label}</span>
      </span>
    </button>
  );
}

function HeartIcon({ className = "w-5 h-5", filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function LogoutIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 12H4M8 8l-4 4 4 4M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" />
    </svg>
  );
}
