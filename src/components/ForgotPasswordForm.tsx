"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ForgotPasswordForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.auth;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    await supabaseBrowser.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/${locale}/reset-password`,
    });
    setBusy(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="w-full max-w-md text-center pt-4">
        <h1 className="font-brand text-lg font-extrabold text-ink">{t.forgotTitle}</h1>
        <div className="text-wine text-3xl my-4">➤</div>
        <p className="text-ink/65 text-sm">{t.sentLine1}</p>
        <p className="text-ink/55 text-sm mt-3">{t.sentLine2}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-md shadow-sm">
      <h1 className="font-brand text-lg font-extrabold text-ink">{t.forgotTitle}</h1>
      <p className="text-ink/55 text-sm mt-1 mb-4">{t.forgotSub}</p>

      <label className="block text-sm text-ink/80 mb-1">{t.email}</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.emailPlaceholder}
        className="w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="w-full bg-wine text-white font-bold rounded-lg py-2.5 mt-4 hover:bg-wine-hover disabled:opacity-60"
      >
        {busy ? "…" : t.submit}
      </button>
      <Link
        href={`/${locale}/login`}
        className="block text-center border border-line text-ink/70 rounded-lg py-2.5 mt-2 hover:border-wine"
      >
        {t.backToLogin}
      </Link>
    </div>
  );
}
