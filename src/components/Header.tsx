"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { FavoritesMenu } from "./FavoritesMenu";
import { LangMenu } from "./LangMenu";
import { AccountMenu } from "./AccountMenu";

export function Header({
  locale,
  dict,
  search,
  onSearch,
  cartCount,
  onCartClick,
}: {
  locale: Locale;
  dict: Dictionary;
  search: string;
  onSearch: (value: string) => void;
  cartCount: number;
  onCartClick: () => void;
}) {
  return (
    <header className="flex items-center gap-4 px-4 sm:px-7 py-3 bg-white border-b border-line">
      {/* logo */}
      <Link href={`/${locale}`} className="leading-none flex-none">
        <span className="block text-2xl font-extrabold text-ink">{dict.brand.name} Phuket</span>
        <span className="block text-[11px] tracking-[2px] text-wine font-bold">
          {dict.brand.tagline}
        </span>
      </Link>

      {/* search */}
      <div className="flex-1 max-w-xl flex items-stretch border border-line rounded-lg overflow-hidden focus-within:border-wine">
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
      <nav className="ms-auto flex items-center gap-4 sm:gap-5 text-sm text-ink/80">
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
