"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { useAuth } from "@/lib/auth/AuthContext";

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
  const pathname = usePathname();
  const { user, displayName } = useAuth();
  const other: Locale = locale === "he" ? "en" : "he";
  const otherHref = pathname.replace(/^\/(he|en)/, `/${other}`) || `/${other}`;

  return (
    <header className="flex items-center gap-4 px-4 sm:px-7 py-3 bg-white border-b border-line">
      {/* logo */}
      <Link href={`/${locale}`} className="leading-none flex-none">
        <span className="block text-2xl font-extrabold text-ink">{dict.brand.name} Phuket</span>
        <span className="block text-[8px] tracking-[3px] text-wine font-bold">
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
        <span className="px-3 grid place-items-center bg-soft text-wine">🔍</span>
      </div>

      {/* nav */}
      <nav className="ms-auto flex items-center gap-4 sm:gap-5 text-sm text-ink/80">
        <span className="hidden sm:inline cursor-pointer hover:text-wine">{dict.header.about} ▾</span>
        <Link href={otherHref} className="hover:text-wine font-medium">
          {other === "en" ? "EN" : "עב"} ▾
        </Link>
        <Link
          href={`/${locale}/${user ? "account" : "login"}`}
          className="flex items-center gap-1.5 hover:text-wine"
        >
          <span className="text-lg">👤</span>
          <span className="hidden sm:inline">
            {user ? displayName || (locale === "he" ? "החשבון שלי" : "Account") : dict.header.login}
          </span>
        </Link>
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
