"use client";

import { useState } from "react";

export function CopyLink({ locale, slug }: { locale: string; slug: string | number }) {
  const [copied, setCopied] = useState(false);
  // קישור ציבורי ניטרלי-שפה: נוחת באנגלית (ברירת המחדל) דרך ה-redirect, והלקוח יכול להחליף לעברית.
  const path = `/s/${slug}`;
  const copy = () => {
    const url = typeof window !== "undefined" ? window.location.origin + path : path;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <button
      onClick={copy}
      title={locale === "he" ? "העתק קישור ציבורי" : "Copy public link"}
      className="inline-flex items-center gap-1 text-wine font-bold underline decoration-dotted hover:text-wine-hover"
    >
      🔗 {path}
      <span className="text-[11px] text-brand-green font-bold">
        {copied ? (locale === "he" ? "✓ הועתק" : "✓ copied") : ""}
      </span>
    </button>
  );
}
