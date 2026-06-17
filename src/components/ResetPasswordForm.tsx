"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

export function ResetPasswordForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.auth;
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const input =
    "w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine";

  if (done) {
    return (
      <div className="bg-white border border-line rounded-2xl p-8 w-full max-w-md text-center shadow-sm">
        <h1 className="text-lg font-extrabold text-ink">{t.passwordChanged}</h1>
        <div className="text-wine text-2xl my-3">✓</div>
        <p className="text-ink/60 text-sm mb-5">{t.changedThanks}</p>
        <Link
          href={`/${locale}`}
          className="block bg-wine text-white font-bold rounded-lg py-2.5 hover:bg-wine-hover"
        >
          {t.goToJcafe}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-md shadow-sm">
      <h1 className="text-lg font-extrabold text-ink mb-4">{t.resetTitle}</h1>
      <label className="block text-sm text-ink/80 mb-1">{t.newPassword}</label>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={input} />
      <label className="block text-sm text-ink/80 mb-1 mt-3">{t.confirmNewPassword}</label>
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className={input}
      />
      <button
        onClick={() => setDone(true)}
        className="w-full bg-wine text-white font-bold rounded-lg py-2.5 mt-4 hover:bg-wine-hover"
      >
        {t.submit}
      </button>
    </div>
  );
}
