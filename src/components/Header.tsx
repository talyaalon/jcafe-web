"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { FavoritesMenu } from "./FavoritesMenu";
import { LangMenu } from "./LangMenu";
import { AccountMenu } from "./AccountMenu";

export interface HeaderBrand {
  name?: string | null;
  tagline?: string | null;
  logoUrl?: string | null;
  href?: string;
}

export function Header({
  locale,
  dict,
  search,
  onSearch,
  cartCount,
  onCartClick,
  brand,
}: {
  locale: Locale;
  dict: Dictionary;
  search: string;
  onSearch: (value: string) => void;
  cartCount: number;
  onCartClick: () => void;
  brand?: HeaderBrand;
}) {
  const brandName = brand?.name?.trim() || `${dict.brand.name} Phuket`;
  const brandTagline = brand?.tagline?.trim() || dict.brand.tagline;
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 sm:px-7 py-3 bg-white border-b border-line">
      {/* logo */}
      <Link href={brand?.href ?? `/${locale}`} className="order-1 leading-none flex-none flex items-center gap-2.5">
        {brand?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt={brandName}
            className="h-11 w-11 rounded-lg object-cover flex-none"
          />
        )}
        <span>
          <span className="block text-2xl font-extrabold text-ink leading-none">{brandName}</span>
          <span className="block text-[11px] tracking-[2px] text-wine font-bold mt-0.5">
            {brandTagline}
          </span>
        </span>
      </Link>

      {/* search — מובייל: שורה נפרדת ברוחב מלא מתחת ללוגו/ניווט; דסקטופ: בשורה */}
      <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:max-w-xl flex items-stretch border border-line rounded-lg overflow-hidden focus-within:border-wine">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={dict.header.search}
          className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
        />
        <span className="px-3 grid place-items-center bg-soft text-ink/40">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
      </div>

      {/* nav */}
      <nav className="order-2 sm:order-3 ms-auto flex items-center gap-4 sm:gap-5 text-sm text-ink/80">
        <LangMenu locale={locale} />
        <AccountMenu locale={locale} loginLabel={dict.header.login} />
        <FavoritesMenu locale={locale} />
        <button onClick={onCartClick} className="relative flex items-center gap-1.5 hover:text-wine">
          <span className="text-lg">🛒</span>
          <span className="hidden sm:inline">{locale === "he" ? "עגלה" : "Cart"}</span>
          {cartCount > 0 && (
            <span className="absolute -top-2 -end-2 min-w-[18px] h-[18px] px-1 rounded-full bg-wine text-white text-[10px] font-bold grid place-items-center">
              {cartCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
}
