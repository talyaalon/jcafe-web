"use client";

import { useRef, useState } from "react";
import type { Locale } from "@/i18n/config";

// שורת סיסמה לסניף — שדה עם עין (הצג/הסתר) + כפתור העתקה + שמירה (POST רגיל).
function PasswordRow({
  locale,
  branch,
  branchName,
  current,
}: {
  locale: Locale;
  branch: number;
  branchName: string;
  current: string;
}) {
  const he = locale === "he";
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const copy = () => {
    const val = ref.current?.value ?? "";
    if (!val) return;
    navigator.clipboard?.writeText(val).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <form
      method="POST"
      action="/api/manager/picker-password"
      className="flex flex-wrap items-center gap-2 py-2.5 border-b border-line/60"
    >
      <span className="w-36 font-bold text-ink truncate">{branchName}</span>
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="lang" value={locale} />
      <input
        ref={ref}
        name="password"
        type={show ? "text" : "password"}
        defaultValue={current}
        placeholder={he ? "ללא סיסמה" : "no password"}
        className="border border-line rounded-lg px-3 py-1.5 text-sm outline-none focus:border-wine min-w-[180px]"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        title={he ? "הצג/הסתר" : "Show/hide"}
        className="border border-line rounded-lg px-2.5 py-1.5 text-sm hover:bg-soft"
      >
        {show ? "🙈" : "👁️"}
      </button>
      <button
        type="button"
        onClick={copy}
        title={he ? "העתק" : "Copy"}
        className="border border-line rounded-lg px-2.5 py-1.5 text-sm hover:bg-soft"
      >
        📋
      </button>
      <button
        type="submit"
        className="bg-wine text-white rounded-lg px-4 py-1.5 text-sm font-bold hover:bg-wine-hover"
      >
        {he ? "שמור" : "Save"}
      </button>
      {copied && (
        <span className="text-[11px] text-brand-green font-bold">
          {he ? "✓ הועתק" : "✓ copied"}
        </span>
      )}
    </form>
  );
}

export function PasswordsTab({
  locale,
  branches,
  passwords,
}: {
  locale: Locale;
  branches: { companyId: number; name: string }[];
  passwords: Record<string, string>;
}) {
  return (
    <div className="bg-white border border-line rounded-xl p-4 max-w-2xl">
      <h3 className="font-bold text-ink mb-3">
        {locale === "he" ? "סיסמאות מלקט (לפי סניף)" : "Picker passwords (per branch)"}
      </h3>
      {branches.map((b) => (
        <PasswordRow
          key={b.companyId}
          locale={locale}
          branch={b.companyId}
          branchName={b.name}
          current={passwords[String(b.companyId)] ?? ""}
        />
      ))}
    </div>
  );
}
