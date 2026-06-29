"use client";

import { useState } from "react";

// כפתור העתקת קישור מלא (origin + path) — לקישורי מלקט וכו'.
export function CopyPath({ path, label, he }: { path: string; label: string; he: boolean }) {
  const [copied, setCopied] = useState(false);
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
      title={he ? "העתק קישור" : "Copy link"}
      className="inline-flex items-center gap-1 text-wine font-bold underline decoration-dotted hover:text-wine-hover"
    >
      🔗 {label}
      <span className="text-[11px] text-brand-green font-bold">
        {copied ? (he ? "✓ הועתק" : "✓ copied") : ""}
      </span>
    </button>
  );
}
