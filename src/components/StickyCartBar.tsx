"use client";

import type { Locale } from "@/i18n/config";
import { useCart } from "@/lib/cart/CartContext";
import { formatTHB } from "@/lib/format";

// סרגל דביק למובייל/טאבלט — מופיע ברגע שיש פריט בסל; פותח את הסל הנשלף.
export function StickyCartBar({ locale, onClick }: { locale: Locale; onClick: () => void }) {
  const { count, subtotal } = useCart();
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-wine text-white flex items-center justify-between px-5 py-3.5 font-bold shadow-[0_-4px_16px_rgba(0,0,0,0.18)]"
    >
      <span className="bg-white/20 rounded-md px-2.5 py-0.5 text-sm">{count}</span>
      <span>{locale === "he" ? "צפייה בעגלה" : "View basket"}</span>
      <span>{formatTHB(subtotal)}</span>
    </button>
  );
}
