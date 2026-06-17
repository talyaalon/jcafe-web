"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatTHB } from "@/lib/format";
import { useAuth } from "@/lib/auth/AuthContext";
import { useFavorites } from "@/lib/favorites/FavoritesContext";
import { supabaseBrowser } from "@/lib/supabase/client";

type Section = "dashboard" | "orders" | "favorites" | "details";

interface OrderRow {
  id: string;
  odoo_name: string | null;
  total: number;
  item_count: number;
  status: string;
  created_at: string;
}

export function AccountView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const a = dict.account;
  const router = useRouter();
  const { user, displayName, loading, signOut } = useAuth();
  const { favorites, toggle } = useFavorites();
  const [section, setSection] = useState<Section>("dashboard");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const he = locale === "he";

  // הגנה: לא מחובר → לכניסה
  useEffect(() => {
    if (!loading && !user) router.replace(`/${locale}/login`);
  }, [loading, user, locale, router]);

  // היסטוריית הזמנות (RLS — רק של המשתמש)
  useEffect(() => {
    if (!user) return;
    supabaseBrowser
      .from("orders")
      .select("id,odoo_name,total,item_count,status,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as OrderRow[]) ?? []));
  }, [user]);

  if (loading || !user) {
    return <div className="max-w-5xl mx-auto w-full px-4 py-16 text-center text-ink/50">…</div>;
  }

  const nav: { key: Section; label: string }[] = [
    { key: "dashboard", label: a.dashboard },
    { key: "orders", label: a.orders },
    { key: "favorites", label: he ? "מועדפים" : "Favorites" },
    { key: "details", label: a.accountDetails },
  ];
  const fieldRO = "w-full bg-soft border border-line rounded-md px-3 py-2.5 text-sm text-ink/70";
  const label = "block text-sm text-ink/70 mb-1";

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const logout = async () => {
    await signOut();
    router.push(`/${locale}`);
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-extrabold text-wine text-center mb-8">{a.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* sidebar */}
        <aside className="border border-line rounded-lg overflow-hidden h-fit bg-white">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              className={`w-full text-start px-4 py-3 text-sm border-b border-line transition ${
                section === n.key ? "bg-soft text-wine font-bold" : "text-ink/70 hover:bg-soft/60"
              }`}
            >
              {n.label}
            </button>
          ))}
          <button onClick={logout} className="block w-full text-start px-4 py-3 text-sm text-ink/70 hover:bg-soft/60">
            {a.logout}
          </button>
        </aside>

        {/* content */}
        <section className="border border-line rounded-lg p-6 bg-white">
          {section === "dashboard" && (
            <div className="text-sm leading-relaxed">
              <p className="mb-3">
                {a.hello} <b className="text-wine">{displayName}</b>
              </p>
              <p className="text-ink/70">{a.dashIntro}</p>
            </div>
          )}

          {section === "orders" && (
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                <p className="text-ink/50 text-sm">{he ? "אין הזמנות עדיין." : "No orders yet."}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-ink/60">
                      <th className="text-start font-bold py-2">{a.order}</th>
                      <th className="text-start font-bold py-2">{a.date}</th>
                      <th className="text-start font-bold py-2">{a.status}</th>
                      <th className="text-start font-bold py-2">{a.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t border-line">
                        <td className="py-3 font-bold text-wine">{o.odoo_name || "—"}</td>
                        <td className="py-3 text-ink/70">{fmtDate(o.created_at)}</td>
                        <td className="py-3 text-ink/70">{a.processing}</td>
                        <td className="py-3 text-ink/70">
                          {formatTHB(o.total)} {a.forItems.replace("{n}", String(o.item_count))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {section === "favorites" && (
            <div>
              {favorites.length === 0 ? (
                <p className="text-ink/50 text-sm">{he ? "אין מועדפים עדיין." : "No favorites yet."}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {favorites.map((p) => (
                    <div key={p.id} className="border border-line rounded-lg overflow-hidden bg-white">
                      <div className="h-28 bg-white grid place-items-center p-2">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-2xl text-wine/40">🛍️</span>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="text-[13px] leading-tight line-clamp-2">
                          {he ? p.nameHe : p.nameEn}
                        </div>
                        <div className="font-bold text-wine text-sm mt-1">{formatTHB(p.price)}</div>
                        <button
                          onClick={() => toggle(p)}
                          className="text-[11px] text-red-500 font-bold mt-1"
                        >
                          {he ? "הסר ♥" : "Remove ♥"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === "details" && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className={label}>{a.displayName}</label>
                <input defaultValue={displayName} className={fieldRO} readOnly />
              </div>
              <div>
                <label className={label}>{a.emailAddr}</label>
                <input defaultValue={user.email ?? ""} className={fieldRO} readOnly />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
