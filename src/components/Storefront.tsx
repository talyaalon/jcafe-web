"use client";

import { useMemo, useState } from "react";
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
}

type SortKey = "featured" | "newest" | "nameAsc" | "priceLow" | "priceHigh";

export function Storefront({
  locale,
  dict,
  data,
}: {
  locale: Locale;
  dict: Dictionary;
  data: StoreBundle[];
}) {
  const [activeStoreId, setActiveStoreId] = useState(data[0]?.store.id ?? "");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [selected, setSelected] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { addItem, count } = useCart();
  const stores = data.map((d) => d.store);
  const bundle = data.find((d) => d.store.id === activeStoreId) ?? data[0];

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
      />

      {/* store tabs — centered, underline active (Figma style) */}
      <div className="shrink-0 bg-white border-b border-line flex justify-center gap-6 sm:gap-10 px-4 overflow-x-auto no-scrollbar">
        {stores.map((s) => (
          <button
            key={s.id}
            onClick={() => switchStore(s.id)}
            className={`shrink-0 font-tabs font-extrabold text-[14px] tracking-[0.15px] uppercase py-3.5 whitespace-nowrap border-b-[3px] -mb-px transition ${
              s.id === activeStoreId
                ? "text-wine border-wine"
                : "text-label/60 border-transparent hover:text-label"
            }`}
          >
            {sName(s)}
          </button>
        ))}
      </div>

      {/* banners — visible when no category filter (All) */}
      {activeCat === null && (
        <div className="shrink-0 px-4 sm:px-7 pt-4">
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
        </div>
      )}

      {/* category pills */}
      <div className="shrink-0 flex gap-2 px-4 sm:px-7 py-3 overflow-x-auto no-scrollbar border-b border-line bg-white">
        <Pill active={activeCat === null} onClick={() => setActiveCat(null)}>
          {dict.filters.all}
        </Pill>
        {bundle?.categories.map((c) => (
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

