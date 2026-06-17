"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

// הדר פשוט לדפי Auth / Checkout: לוגו + About ▾ | EN ▾ | Login.
export function SimpleHeader({
  locale,
  dict,
  minimal = false,
}: {
  locale: Locale;
  dict: Dictionary;
  minimal?: boolean;
}) {
  const pathname = usePathname();
  const other: Locale = locale === "he" ? "en" : "he";
  const otherHref = pathname.replace(/^\/(he|en)/, `/${other}`) || `/${other}`;

  return (
    <header className="flex items-center justify-between px-4 sm:px-8 py-3.5 bg-white border-b border-line">
      <Link href={`/${locale}`} className="leading-none">
        <span className="block text-2xl font-extrabold text-ink">{dict.brand.name}</span>
        <span className="block text-[8px] tracking-[3px] text-wine font-bold">
          {dict.brand.tagline}
        </span>
      </Link>
      {!minimal && (
        <nav className="flex items-center gap-4 text-sm text-ink/80">
          <span className="hidden sm:inline cursor-pointer hover:text-wine">{dict.header.about} ▾</span>
          <Link href={otherHref} className="hover:text-wine font-medium">
            {other === "en" ? "EN" : "עב"} ▾
          </Link>
          <Link href={`/${locale}/login`} className="flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-full bg-gold/20 grid place-items-center">👤</span>
            {dict.header.login}
          </Link>
        </nav>
      )}
    </header>
  );
}
