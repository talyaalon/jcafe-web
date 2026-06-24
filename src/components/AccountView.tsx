"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatTHB } from "@/lib/format";
import { useAuth } from "@/lib/auth/AuthContext";
import { useFavorites } from "@/lib/favorites/FavoritesContext";
import { useCart, type CartStoreRef } from "@/lib/cart/CartContext";
import { useReorder } from "@/lib/cart/use-reorder";
import { branchHref, COMPANY_SLUG } from "@/lib/branch-slugs";
import { supabaseBrowser } from "@/lib/supabase/client";
import { findPhuketStore } from "@/lib/odoo/phuket";
import type { Product } from "@/lib/odoo/types";
import { getBranchProfile, withBranchProfile, type SavedAddress } from "@/lib/account/profile";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { IconBox, IconGear, IconStore, IconCart } from "./Icons";

type Section = "dashboard" | "orders" | "favorites" | "details";

interface AcctItem {
  name: string;
  qty: number;
  price?: number;
  storeName: string;
  storeId: string;
  templateId?: number;
  image?: string;
}
interface AcctOrder {
  order_name: string | null;
  created_at: string;
  company: number | null;
  method: string | null;
  total: number;
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
  const reorder = useReorder(locale);
  const { user, displayName, loading, signOut } = useAuth();
  const { favorites, toggle } = useFavorites();
  const { branchCompany, addItem } = useCart();
  const [section, setSection] = useState<Section>("dashboard");
  const [orders, setOrders] = useState<AcctOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const branchName =
    branchCompany != null
      ? (COMPANY_SLUG[branchCompany] ?? "").replace(/^\w/, (c) => c.toUpperCase())
      : "";

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "favorites" || t === "orders" || t === "details" || t === "dashboard") {
      setSection(t as Section);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace(`/${locale}/login`);
  }, [loading, user, locale, router]);

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

  const addFav = (p: Product) => {
    if (branchCompany == null) {
      router.push(branchHref(locale, branchCompany));
      return;
    }
    addItem(p, storeRefFor(p), 1);
  };

  const nav: { key: Section; label: string; Icon: (p: { className?: string }) => ReactNode }[] = [
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
        <aside className="border border-line rounded-2xl overflow-hidden h-fit bg-white">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              className={`w-full flex items-center gap-3 text-start px-4 py-3 text-sm border-b border-line transition ${
                section === n.key ? "bg-wine/5 text-wine font-bold" : "text-ink/70 hover:bg-soft/60"
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
                    <li key={o.order_name} className="p-4 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/${locale}/account/orders/${encodeURIComponent(o.order_name ?? "")}`}
                            className="font-extrabold text-wine hover:underline"
                          >
                            {o.order_name || "—"}
                          </Link>
                          <div className="text-[12px] text-ink/55 mt-0.5">
                            {fmtDate(o.created_at)} · {methodLabel(o.method)} ·{" "}
                            {o.items.reduce((s, i) => s + i.qty, 0)} {he ? "פריטים" : "items"}
                          </div>
                        </div>
                        <span className="font-bold text-ink whitespace-nowrap">{formatTHB(o.total)}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link
                          href={`/${locale}/account/orders/${encodeURIComponent(o.order_name ?? "")}`}
                          className="flex-1 text-center text-xs font-bold border border-line rounded-lg py-2 hover:border-wine text-ink/70"
                        >
                          {a.view}
                        </Link>
                        <button
                          onClick={() => reorder(o)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg py-2 bg-wine text-white hover:bg-wine-hover"
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
                      <div className="aspect-square w-full bg-soft overflow-hidden grid place-items-center">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <IconStore className="w-8 h-8 text-wine/25" />
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <div className="text-[13px] leading-snug line-clamp-2 min-h-[2.5em] text-ink">
                          {he ? p.nameHe : p.nameEn}
                        </div>
                        <div className="font-bold text-wine text-sm mt-1">{formatTHB(p.price)}</div>
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={() => addFav(p)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-wine text-white text-[12px] font-bold rounded-lg py-2 hover:bg-wine-hover"
                          >
                            <IconCart className="w-4 h-4" />
                            {he ? "לסל" : "Add"}
                          </button>
                          <button
                            onClick={() => toggle(p)}
                            aria-label={he ? "הסר ממועדפים" : "Remove favorite"}
                            className="w-9 h-9 grid place-items-center rounded-lg border border-line text-wine hover:bg-soft flex-none"
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
  const emptyDraft: SavedAddress = { id: "", addr1: "", addr2: "", city: "", postcode: "" };
  const [draft, setDraft] = useState<SavedAddress>(emptyDraft);
  // טופס הוספה פתוח רק כשאין כתובות עדיין, או כשלוחצים "הוסף כתובת נוספת"
  const [showAddForm, setShowAddForm] = useState((initial.addresses ?? []).length === 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const field = "w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine";
  const label = "block text-sm text-ink/70 mb-1";

  // שמירה מיידית ל-user_metadata (פר-סניף) — כך נשמר בין מכשירים לפי החשבון
  const persist = async (addrs: SavedAddress[], ph: string, nm: string) => {
    const baseMeta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    let data: Record<string, unknown> = { ...baseMeta, name: nm };
    if (branchCompany != null) {
      data = withBranchProfile(data, branchCompany, { phone: ph, addresses: addrs });
    }
    await supabaseBrowser.auth.updateUser({ data });
  };

  const commitAddress = async () => {
    if (!draft.addr1.trim()) return;
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    const next = [...addresses, { ...draft, id, isDefault: addresses.length === 0 }];
    setAddresses(next);
    setDraft(emptyDraft);
    setShowAddForm(false);
    await persist(next, phone, name);
  };
  const removeAddr = async (id: string) => {
    const next = addresses.filter((x) => x.id !== id);
    if (next.length && !next.some((x) => x.isDefault)) next[0].isDefault = true;
    setAddresses([...next]);
    if (next.length === 0) setShowAddForm(true);
    await persist(next, phone, name);
  };
  const setDefault = async (id: string) => {
    const next = addresses.map((x) => ({ ...x, isDefault: x.id === id }));
    setAddresses(next);
    await persist(next, phone, name);
  };

  const savePhoneName = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await persist(addresses, phone, name);
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
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={field} />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={savePhoneName}
          disabled={saving}
          className="bg-wine text-white font-bold rounded-xl px-6 py-2.5 hover:bg-wine-hover disabled:opacity-60"
        >
          {saving ? "…" : a.saveChanges}
        </button>
        {saved && <span className="text-sm font-bold text-brand-green">✓ {he ? "נשמר" : "Saved"}</span>}
      </div>

      {/* addresses */}
      <div className="border-t border-line pt-5">
        <h3 className="font-bold text-ink mb-2">{he ? "הכתובות שלי" : "My addresses"}</h3>

        {addresses.length > 0 && (
          <ul className="space-y-2 mb-3">
            {addresses.map((ad) => (
              <li
                key={ad.id}
                className={`flex items-start justify-between gap-3 border rounded-xl p-3 ${
                  ad.isDefault ? "border-wine bg-wine/5" : "border-line"
                }`}
              >
                <div className="text-sm min-w-0">
                  <div className="text-ink font-medium">
                    {ad.addr1}
                    {ad.addr2 ? `, ${ad.addr2}` : ""}
                  </div>
                  {(ad.city || ad.postcode) && (
                    <div className="text-[12px] text-ink/50">
                      {[ad.city, ad.postcode].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {ad.isDefault && (
                    <span className="inline-block mt-1 text-[11px] font-bold text-wine">
                      ✓ {he ? "כתובת ברירת מחדל" : "Default address"}
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

        {showAddForm ? (
          <div className="border border-dashed border-line rounded-xl p-3 space-y-2">
            <label className={label}>
              {addresses.length === 0
                ? he
                  ? "הוסף כתובת"
                  : "Add address"
                : he
                  ? "כתובת נוספת"
                  : "Another address"}
            </label>
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
            <div className="flex gap-2">
              <button
                onClick={commitAddress}
                disabled={!draft.addr1.trim()}
                className="text-sm font-bold bg-wine text-white rounded-lg px-4 py-2 hover:bg-wine-hover disabled:opacity-40"
              >
                {he ? "שמור כתובת" : "Save address"}
              </button>
              {addresses.length > 0 && (
                <button
                  onClick={() => {
                    setDraft(emptyDraft);
                    setShowAddForm(false);
                  }}
                  className="text-sm text-ink/60 rounded-lg px-3 py-2 hover:text-ink"
                >
                  {he ? "ביטול" : "Cancel"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm font-bold border border-wine text-wine rounded-lg px-4 py-2 hover:bg-wine hover:text-white transition"
          >
            + {he ? "הוסף כתובת נוספת" : "Add another address"}
          </button>
        )}
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
