"use client";

import { useState } from "react";

// תמונת מוצר קטנה לעגלה/סיכום, עם fallback אם אין תמונה.
export function CartThumb({ src, alt }: { src?: string; alt: string }) {
  const [ok, setOk] = useState(true);
  if (src && ok) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setOk(false)}
        className="w-12 h-12 rounded-md object-contain bg-white border border-line flex-none"
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-md bg-gradient-to-b from-cream to-gold-soft/40 grid place-items-center text-wine/50 flex-none">
      🛍️
    </div>
  );
}
