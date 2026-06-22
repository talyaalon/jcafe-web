"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCart } from "@/lib/cart/CartContext";
import { branchHref } from "@/lib/branch-slugs";
import { IconAccount } from "./Icons";

export function AccountMenu({ locale, loginLabel }: { locale: Locale; loginLabel: string }) {
  const { user, displayName, signOut } = useAuth();
  const { branchCompany } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const he = locale === "he";

  if (!user) {
    return (
      <Link href={`/${locale}/login`} className="flex items-center gap-1.5 hover:text-wine">
        <IconAccount className="w-6 h-6" />
        <span className="hidden sm:inline">{loginLabel}</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 hover:text-wine">
        <span className="w-7 h-7 rounded-full bg-wine text-white grid place-items-center text-xs font-bold">
          {(displayName[0] || "U").toUpperCase()}
        </span>
        <span className="hidden sm:inline max-w-[120px] truncate">{displayName}</span>
        <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-2 w-48 bg-white border border-line rounded-lg shadow-xl z-50 overflow-hidden">
            <Link
              href={`/${locale}/account`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-soft text-ink/80"
            >
              <span className="text-wine">🪪</span> {he ? "החשבון שלי" : "My Account"}
            </Link>
            <button
              onClick={async () => {
                await signOut();
                setOpen(false);
                router.push(branchHref(locale, branchCompany));
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-soft text-ink/80 border-t border-line"
            >
              <span className="text-wine">➡️</span> {he ? "התנתקות" : "Logout"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
