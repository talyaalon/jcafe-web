"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

const LANGS = [
  { code: "en", flag: "🇺🇸", label: "English (US)" },
  { code: "he", flag: "🇮🇱", label: "עברית" },
];

export function LangMenu({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hrefFor = (code: string) => pathname.replace(/^\/(he|en)/, `/${code}`) || `/${code}`;
  const current = LANGS.find((l) => l.code === locale) ?? LANGS[0];

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 hover:text-wine">
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-2 w-44 bg-white border border-line rounded-lg shadow-xl z-50 overflow-hidden">
            {LANGS.map((l) => (
              <Link
                key={l.code}
                href={hrefFor(l.code)}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-soft ${
                  l.code === locale ? "bg-wine/5 text-wine font-bold" : "text-ink/80"
                }`}
              >
                <span>{l.flag}</span> {l.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
