"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { useCart } from "@/lib/cart/CartContext";
import { branchHref } from "@/lib/branch-slugs";
import { LangMenu } from "./LangMenu";
import { AccountMenu } from "./AccountMenu";
import { FavoritesMenu } from "./FavoritesMenu";
import { CartDrawer } from "./CartDrawer";
import { IconCart } from "./Icons";

interface BranchInfo {
  slug: string;
  nameHe: string | null;
  nameEn: string | null;
  taglineHe: string | null;
  taglineEn: string | null;
  logoUrl: string | null;
}

// הדר לדפי Auth/Checkout — מציג את הסניף הנוכחי (לוגו+שם), שפה, מועדפים ועגלה.
export function AuthHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const he = locale === "he";
  const { count, branchCompany } = useCart();
  const [info, setInfo] = useState<BranchInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/branch/info?company=${branchCompany}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setInfo(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [branchCompany]);

  const brandName = (he ? info?.nameHe : info?.nameEn)?.trim() || dict.brand.name;
  const brandTagline = (he ? info?.taglineHe : info?.taglineEn)?.trim() || dict.brand.tagline;
  // לוגו → חנות הסניף הנוכחי (דטרמיניסטי לפי branchCompany, לא תלוי ב-info שנמשך בצד-לקוח)
  const homeHref = branchHref(locale, branchCompany);

  return (
    <>
      <header className="flex items-center justify-between gap-4 px-4 sm:px-7 py-3 bg-white border-b border-line">
        {/* logo + branch name */}
        <Link href={homeHref} className="leading-none flex-none flex items-center gap-2.5">
          {info?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.logoUrl}
              alt={brandName}
              className="h-11 w-11 rounded-lg object-cover flex-none"
            />
          )}
          <span>
            <span className="block font-brand text-lg sm:text-2xl font-bold text-ink leading-none">{brandName}</span>
            <span className="block text-[9px] sm:text-[11px] tracking-[2px] text-wine font-bold mt-0.5">
              {brandTagline}
            </span>
          </span>
        </Link>

        {/* nav */}
        <nav className="ms-auto flex items-center gap-4 sm:gap-5 text-sm text-ink/80">
          <LangMenu locale={locale} />
          <AccountMenu locale={locale} loginLabel={dict.header.login} />
          <FavoritesMenu locale={locale} />
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative flex items-center gap-1.5 hover:text-wine"
          >
            <IconCart className="w-6 h-6" />
            <span className="hidden sm:inline">{he ? "עגלה" : "Cart"}</span>
            {count > 0 && (
              <span className="absolute -top-2 -end-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
                {count}
              </span>
            )}
          </button>
        </nav>
      </header>
      <CartDrawer locale={locale} dict={dict} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
