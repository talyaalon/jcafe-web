"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Store, Category, Product } from "@/lib/odoo/types";
import { Header } from "./Header";
import { ProductCard } from "./ProductCard";
import { ProductRowCard } from "./ProductRowCard";
import { ProductModal } from "./ProductModal";
import { CartPanel } from "./CartPanel";
import { BannerCarousel } from "./BannerCarousel";
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
  discount_percent?: number | null;
}

type SortKey = "featured" | "newest" | "nameAsc" | "priceLow" | "priceHigh";

export interface StoreBranding {
  name?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
}

export interface BranchTheme {
  primary_color?: string | null;
  primary_hover?: string | null;
  primary_bright?: string | null;
  accent_color?: string | null;
}

export function Storefront({
  locale,
  dict,
  data,
  banners = [],
  branch,
  branding,
  bannerSettings = {},
  theme,
}: {
  locale: Locale;
  dict: Dictionary;
  data: StoreBundle[];
  banners?: Banner[];
  branch: number;
  branding?: StoreBranding | null;
  bannerSettings?: Record<string, boolean>;
  theme?: BranchTheme | null;
}) {
  // ערכת צבעים פר-סניף — דורסת את משתני ה-CSS של המותג על כל תת-העץ
  const themeStyle = (
    theme && (theme.primary_color || theme.primary_hover || theme.primary_bright || theme.accent_color)
      ? {
          ...(theme.primary_color ? { "--color-wine": theme.primary_color } : {}),
          ...(theme.primary_hover ? { "--color-wine-hover": theme.primary_hover } : {}),
          ...(theme.primary_bright ? { "--color-wine-bright": theme.primary_bright } : {}),
          ...(theme.accent_color ? { "--color-gold": theme.accent_color } : {}),
        }
      : undefined
  ) as CSSProperties | undefined;
  const [activeStoreId, setActiveStoreId] = useState(data[0]?.store.id ?? "");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // מסך קבלת פנים — ריבועי חנויות; לחיצה נכנסת לחנות הנבחרת
  const [showWelcome, setShowWelcome] = useState(true);
  const router = useRouter();

  // רענון פנימי: כשחוזרים ללשונית, מושכים נתונים טריים מהשרת (באנרים/שעות/מיתוג
  // שהמנהל עדכן) בלי איבוד מצב הלקוח (עגלה/חנות פעילה).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router]);
  // ברירת מחדל: מיון אלפביתי א→ת (לפי השם המוצג), כך שב"הכל" המוצרים מסודרים.
  const [sort, setSort] = useState<SortKey>("nameAsc");
  const [selected, setSelected] = useState<Product | null>(null);

  // פתיחת חלון המוצר המקושר לבאנר (לפי מזהה בסיס) — עם הנחת הבאנר אם הוגדרה
  const openBannerProduct = (pid: string, discount = 0) => {
    for (const d of data) {
      const p = d.products.find((x) => String(x.id).split("|")[0] === pid);
      if (p) {
        if (discount > 0) {
          const newPrice = Math.round(p.price * (1 - discount / 100) * 100) / 100;
          setSelected({ ...p, price: newPrice, originalPrice: p.price, discountPercent: discount });
        } else {
          setSelected(p);
        }
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

  // חיפוש בכל חנויות הסניף (לא רק החנות הפעילה)
  const searching = search.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!searching) return [];
    const term = search.trim();
    const q = term.toLowerCase();
    const seen = new Set<string>();
    const list = data
      .flatMap((d) => d.products)
      .filter((p) => {
        if (!(p.nameHe.includes(term) || p.nameEn.toLowerCase().includes(q))) return false;
        if (seen.has(p.id)) return false; // מניעת כפילות (מוצר משותף בכמה חנויות)
        seen.add(p.id);
        return true;
      });
    switch (sort) {
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
        list.sort((a, b) =>
          locale === "he"
            ? a.nameHe.localeCompare(b.nameHe, "he")
            : a.nameEn.localeCompare(b.nameEn),
        );
    }
    return list;
  }, [searching, search, data, sort, locale]);

  function switchStore(id: string) {
    setActiveStoreId(id);
    setActiveCat(null);
    setSearch("");
  }

  function pickStore(id: string) {
    switchStore(id);
    setShowWelcome(false);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  // לחיצה על שם/לוגו הסניף בהדר → חזרה למסך "ברוכים הבאים" עם חנויות הסניף
  function goWelcome() {
    setShowWelcome(true);
    setSearch("");
    setActiveCat(null);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  const activeStore = bundle?.store;

  // ===== מסך קבלת פנים — ריבוע לכל חנות =====
  if (showWelcome) {
    return (
      <div className="flex flex-col min-h-full" style={themeStyle}>
        <Header
          locale={locale}
          dict={dict}
          search={search}
          onSearch={(v) => {
            setSearch(v);
            if (v) setShowWelcome(false);
          }}
          cartCount={count}
          onCartClick={() => setDrawerOpen(true)}
          brand={
            branding
              ? { name: branding.name, tagline: branding.tagline, logoUrl: branding.logoUrl }
              : undefined
          }
        />
        <WelcomeTiles stores={stores} locale={locale} onPick={pickStore} />
        <SiteFooter locale={locale} dict={dict} />
        <CartDrawer locale={locale} dict={dict} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full" style={themeStyle}>
      <Header
        locale={locale}
        dict={dict}
        search={search}
        onSearch={setSearch}
        cartCount={count}
        onCartClick={() => setDrawerOpen(true)}
        onHome={goWelcome}
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

      {/* banners — visible when no category filter (All), ללא חיפוש, ומופעלים לסניף+לחנות */}
      {activeCat === null &&
        !searching &&
        (bannerSettings["*"] ?? true) &&
        (bannerSettings[activeStoreId] ?? true) && (
        <div className="shrink-0 px-4 sm:px-7 pt-4">
          {banners.length > 0 ? (
            <BannerCarousel banners={banners} onProductClick={openBannerProduct} />
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-[12/5] rounded-2xl bg-[#ece9f1] grid place-items-center text-white border border-line"
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
        {searching ? (
          // תוצאות חיפוש מכל חנויות הסניף
          <div>
            <h3 className="font-extrabold text-ink text-lg mb-3">
              {locale === "he" ? "תוצאות חיפוש" : "Search results"}{" "}
              <span className="text-ink/40 text-sm font-normal">({searchResults.length})</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 content-start">
              {searchResults.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  locale={locale}
                  dict={dict}
                  onAdd={addProduct}
                  onOpen={setSelected}
                />
              ))}
              {searchResults.length === 0 && (
                <p className="text-ink/50 col-span-full py-10 text-center">
                  {locale === "he" ? "לא נמצאו מוצרים" : "No products found"}
                </p>
              )}
            </div>
          </div>
        ) : activeStore?.type === "grocery" ? (
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
                        onAdd={addProduct}
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

function WelcomeTiles({
  stores,
  locale,
  onPick,
}: {
  stores: Store[];
  locale: Locale;
  onPick: (id: string) => void;
}) {
  const he = locale === "he";
  // סדר תצוגה מבוקש: מכולת כשרה ← ג'יי קפה ← ג'יי דלי
  const rank = (s: Store) => {
    if (s.type === "grocery") return 0;
    const n = `${s.nameEn} ${s.nameHe}`.toLowerCase();
    if (n.includes("cafe") || n.includes("קפה")) return 1;
    if (n.includes("deli") || n.includes("דלי")) return 2;
    return 3;
  };
  const ordered = [...stores].sort((a, b) => rank(a) - rank(b));

  return (
    <main className="flex-1 flex flex-col bg-soft">
      <div className="flex flex-col flex-1 min-h-[calc(100svh-150px)] max-h-[calc(100svh-120px)] sm:min-h-[calc(100svh-76px)] sm:max-h-none w-full max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-4 sm:py-12">
        <div className="shrink-0 text-center">
          <h1 className="font-tabs font-extrabold text-2xl sm:text-4xl text-ink">
            {he ? "ברוכים הבאים" : "Welcome"}
          </h1>
          <p className="text-ink/50 mt-1.5 text-sm sm:text-base">
            {he ? "בחרו חנות כדי להתחיל בהזמנה" : "Choose a store to start your order"}
          </p>
          <span className="mt-3 inline-block h-1 w-14 rounded-full bg-wine/80" />
        </div>

        <div className="flex-1 min-h-0 mt-2 sm:mt-10 flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:gap-8">
          {ordered.map((s) => {
            const name = he ? s.nameHe : s.nameEn;
            return (
              <button
                key={s.id}
                onClick={() => onPick(s.id)}
                className="group flex-1 min-h-0 sm:flex-none sm:h-96 flex flex-col rounded-2xl overflow-hidden border border-line bg-white shadow-sm hover:shadow-xl hover:border-wine/40 transition text-start"
              >
                {/* תמונה נקייה — ללא שכבת כהות מעל */}
                <div className="relative flex-1 min-h-0 bg-white">
                  {s.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.logo}
                      alt={name}
                      className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-wine to-wine-bright text-5xl text-white/90 transition duration-300 group-hover:scale-110">
                      {s.emoji || (s.type === "grocery" ? "🛒" : "🍳")}
                    </div>
                  )}
                </div>
                {/* פס שם + כפתור — רקע לבן, טקסט כהה */}
                <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-t border-line bg-white">
                  <span className="font-extrabold text-ink text-base sm:text-lg leading-tight line-clamp-1">
                    {name}
                  </span>
                  <span className="flex-none inline-flex items-center gap-1.5 bg-wine text-white font-bold rounded-full px-3.5 py-1.5 text-[13px] shadow-sm group-hover:bg-wine-hover transition">
                    {he ? "להזמנה" : "Order"}
                    <span aria-hidden>{he ? "←" : "→"}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
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
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium border transition ${
        active
          ? "bg-wine text-white border-wine"
          : "bg-white text-ink/85 border-ink/25 hover:border-wine"
      }`}
    >
      {children}
    </button>
  );
}

