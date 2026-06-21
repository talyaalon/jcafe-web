"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Store, Category, Product } from "@/lib/odoo/types";
import { Header } from "./Header";
import { ProductCard } from "./ProductCard";
import { ProductRowCard } from "./ProductRowCard";
import { ProductModal } from "./ProductModal";
import { CartPanel } from "./CartPanel";
import { SiteFooter } from "./SiteFooter";
import { StickyCartBar } from "./StickyCartBar";
import { CartDrawer } from "./CartDrawer";
import { useCart, type CartStoreRef } from "@/lib/cart/CartContext";

export interface StoreBundle {
  store: Store;
  categories: Category[];
  products: Product[];
  open?: boolean;
}

export interface Banner {
  id: number;
  title: string | null;
  image_url: string;
  link: string | null;
  product_id?: string | null;
}

type SortKey = "featured" | "newest" | "nameAsc" | "priceLow" | "priceHigh";

export interface StoreBranding {
  name?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
}

export function Storefront({
  locale,
  dict,
  data,
  banners = [],
  branch = 14,
  branding,
  bannerSettings = {},
}: {
  locale: Locale;
  dict: Dictionary;
  data: StoreBundle[];
  banners?: Banner[];
  branch?: number;
  branding?: StoreBranding | null;
  bannerSettings?: Record<string, boolean>;
}) {
  const [activeStoreId, setActiveStoreId] = useState(data[0]?.store.id ?? "");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // ברירת מחדל: מיון אלפביתי א→ת (לפי השם המוצג), כך שב"הכל" המוצרים מסודרים.
  const [sort, setSort] = useState<SortKey>("nameAsc");
  const [selected, setSelected] = useState<Product | null>(null);

  // פתיחת חלון המוצר המקושר לבאנר (לפי מזהה בסיס)
  const openBannerProduct = (pid: string) => {
    for (const d of data) {
      const p = d.products.find((x) => String(x.id).split("|")[0] === pid);
      if (p) {
        setSelected(p);
        return;
      }
    }
  };
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { addItem, count, setBranchCompany } = useCart();
  // עדכון הסניף הפעיל בעגלה לפי הסטורפרונט שנצפה (לצורך הזמנה נכונה)
  useEffect(() => {
    setBranchCompany(branch);
  }, [branch, setBranchCompany]);
  const stores = data.map((d) => d.store);
  const openMap = new Map(data.map((d) => [d.store.id, d.open ?? true]));
  const bundle = data.find((d) => d.store.id === activeStoreId) ?? data[0];
  const activeClosed = bundle ? openMap.get(bundle.store.id) === false : false;

  const storeRef = (p: Product): CartStoreRef => {
    const s = stores.find((st) => st.id === p.storeId);
    return {
      id: p.storeId,
      nameHe: s?.nameHe ?? "",
      nameEn: s?.nameEn ?? "",
      emoji: s?.emoji ?? "",
    };
  };
  const addProduct = (p: Product, qty = 1) => addItem(p, storeRef(p), qty);

  const sName = (s: Store) => (locale === "he" ? s.nameHe : s.nameEn);
  const cName = (c: Category) => (locale === "he" ? c.nameHe : c.nameEn);

  const products = useMemo(() => {
    let list = bundle ? [...bundle.products] : [];
    if (activeCat) list = list.filter((p) => p.categoryId === activeCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) => p.nameHe.includes(search.trim()) || p.nameEn.toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case "nameAsc":
        list.sort((a, b) =>
          locale === "he"
            ? a.nameHe.localeCompare(b.nameHe, "he")
            : a.nameEn.localeCompare(b.nameEn),
        );
        break;
      case "priceLow":
        list.sort((a, b) => a.price - b.price);
        break;
      case "priceHigh":
        list.sort((a, b) => b.price - a.price);
        break;
      case "featured":
        list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
        break;
      default:
        break;
    }
    return list;
  }, [bundle, activeCat, search, sort, locale]);

  function switchStore(id: string) {
    setActiveStoreId(id);
    setActiveCat(null);
    setSearch("");
  }

  const activeStore = bundle?.store;

  return (
    <div className="flex flex-col min-h-full">
      <Header
        locale={locale}
        dict={dict}
        search={search}
        onSearch={setSearch}
        cartCount={count}
        onCartClick={() => setDrawerOpen(true)}
        brand={
          branding
            ? { name: branding.name, tagline: branding.tagline, logoUrl: branding.logoUrl }
            : undefined
        }
      />

      {/* store tabs — centered, underline active (Figma style) */}
      <div className="shrink-0 bg-white border-b border-line flex justify-center gap-6 sm:gap-10 px-4 overflow-x-auto no-scrollbar">
        {stores.map((s) => (
          <button
            key={s.id}
            onClick={() => switchStore(s.id)}
            className={`shrink-0 inline-flex items-center gap-2 font-tabs font-extrabold text-[14px] tracking-[0.15px] uppercase py-3.5 whitespace-nowrap border-b-[3px] -mb-px transition ${
              s.id === activeStoreId
                ? "text-wine border-wine"
                : "text-label/60 border-transparent hover:text-label"
            }`}
          >
            {s.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logo} alt="" className="h-6 w-6 rounded object-cover" />
            )}
            {sName(s)}
            {openMap.get(s.id) === false && (
              <span className="ms-1 text-[10px] font-bold text-red-500">
                ({locale === "he" ? "סגור" : "Closed"})
              </span>
            )}
          </button>
        ))}
      </div>

      {activeClosed && (
        <div className="shrink-0 px-4 sm:px-7 pt-3">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[13px] rounded-lg px-4 py-2">
            {locale === "he"
              ? "החנות סגורה כעת. ניתן להוסיף מוצרים לסל ולהזמין למועד מאוחר יותר."
              : "This store is closed now. You can still add items and order for later."}
          </div>
        </div>
      )}

      {/* banners — visible when no category filter (All), ומופעלים לסניף+לחנות */}
      {activeCat === null &&
        (bannerSettings["*"] ?? true) &&
        (bannerSettings[activeStoreId] ?? true) && (
        <div className="shrink-0 px-4 sm:px-7 pt-4">
          {banners.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {banners.slice(0, 3).map((b) => {
                const inner = (
                  <>
                    {/* object-contain — מציג את התמונה המלאה בלי חיתוך (בכל הגדלים) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image_url} alt={b.title ?? ""} className="w-full h-full object-contain" />
                    {b.title && (
                      <span className="absolute bottom-2 start-3 bg-black/45 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                        {b.title}
                      </span>
                    )}
                  </>
                );
                const cls =
                  "relative block w-full text-start h-28 sm:h-44 rounded-2xl overflow-hidden border border-line bg-soft";
                if (b.product_id) {
                  return (
                    <button key={b.id} onClick={() => openBannerProduct(b.product_id!)} className={cls}>
                      {inner}
                    </button>
                  );
                }
                return (
                  <a key={b.id} href={b.link ?? undefined} className={cls}>
                    {inner}
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 sm:h-44 rounded-2xl bg-[#ece9f1] grid place-items-center text-white border border-line"
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="opacity-80">
                    <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5Z" />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* category pills */}
      <div className="shrink-0 flex gap-2 px-4 sm:px-7 py-3 overflow-x-auto no-scrollbar border-b border-line bg-white">
        <Pill active={activeCat === null} onClick={() => setActiveCat(null)}>
          {dict.filters.all}
        </Pill>
        {bundle?.categories
          .filter((c) => bundle.products.some((p) => p.categoryId === c.id))
          .map((c) => (
          <Pill key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
            {cName(c)}
          </Pill>
        ))}
      </div>

      {/* breadcrumb + sort */}
      <div className="shrink-0 flex justify-between items-center px-4 sm:px-7 pt-3 text-[13px] text-ink/60">
        <div>
          {dict.breadcrumb.home} ›{" "}
          <b className="text-wine">{activeStore ? sName(activeStore) : dict.breadcrumb.all}</b>
        </div>
        <label className="flex items-center gap-1">
          {dict.sort.label}:
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="bg-transparent text-wine font-bold outline-none cursor-pointer"
          >
            <option value="featured">{dict.sort.featured}</option>
            <option value="newest">{dict.sort.newest}</option>
            <option value="nameAsc">{dict.sort.nameAsc}</option>
            <option value="priceLow">{dict.sort.priceLow}</option>
            <option value="priceHigh">{dict.sort.priceHigh}</option>
          </select>
        </label>
      </div>

      {/* main grid + cart */}
      <main className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 px-4 sm:px-7 py-4 flex-1">
        {activeStore?.type === "grocery" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 content-start">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                locale={locale}
                dict={dict}
                onAdd={addProduct}
                onOpen={setSelected}
              />
            ))}
            {products.length === 0 && (
              <p className="text-ink/50 col-span-full py-10 text-center">—</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {(bundle?.categories ?? [])
              .map((c) => ({ cat: c, list: products.filter((p) => p.categoryId === c.id) }))
              .filter((s) => s.list.length > 0)
              .map(({ cat, list }) => (
                <section key={cat.id}>
                  <h3 className="font-extrabold text-ink text-lg mb-3">{cName(cat)}</h3>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {list.map((p) => (
                      <ProductRowCard
                        key={p.id}
                        product={p}
                        locale={locale}
                        dict={dict}
                        onOpen={setSelected}
                      />
                    ))}
                  </div>
                </section>
              ))}
            {products.length === 0 && <p className="text-ink/50 py-10 text-center">—</p>}
          </div>
        )}
        <CartPanel locale={locale} dict={dict} />
      </main>

      <SiteFooter dict={dict} locale={locale} />
      <div className="h-16 lg:hidden" />
      <StickyCartBar locale={locale} onClick={() => setDrawerOpen(true)} />

      <CartDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locale={locale}
        dict={dict}
      />

      {selected && (
        <ProductModal
          product={selected}
          locale={locale}
          dict={dict}
          onClose={() => setSelected(null)}
          onAdd={addProduct}
        />
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] border ${
        active ? "bg-wine text-white border-wine" : "bg-white text-ink/60 border-line"
      }`}
    >
      {children}
    </button>
  );
}

