"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { SocialButtons } from "./AuthShell";

export function RegisterForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.auth;
  const router = useRouter();
  const [form, setForm] = useState({ email: "", name: "", password: "", confirm: "" });
  const [alerts, setAlerts] = useState(true);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const input =
    "w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine";

  // TODO: יצירת חשבון אמיתית מול backend. כרגע stub שמפנה לדף הבית.
  const submit = () => router.push(`/${locale}`);

  return (
    <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-md shadow-sm">
      <h1 className="text-lg font-extrabold text-ink mb-4">{t.registerTitle}</h1>

      <SocialButtons dict={dict} />
      <div className="flex items-center gap-3 my-4 text-ink/40 text-xs">
        <span className="flex-1 h-px bg-line" />
        {t.or}
        <span className="flex-1 h-px bg-line" />
      </div>

      <label className="block text-sm text-ink/80 mb-1">{t.email}</label>
      <input value={form.email} onChange={(e) => set("email", e.target.value)} className={input} />

      <label className="block text-sm text-ink/80 mb-1 mt-3">{t.name}</label>
      <input
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder={t.namePlaceholder}
        className={input}
      />

      <label className="block text-sm text-ink/80 mb-1 mt-3">{t.passwordCreate}</label>
      <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className={input} />

      <label className="block text-sm text-ink/80 mb-1 mt-3">{t.confirm}</label>
      <input type="password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} className={input} />

      <label className="flex items-center gap-2 mt-3 text-sm text-ink/70">
        <input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} />
        {t.dealAlerts}
      </label>

      <button
        onClick={submit}
        className="w-full bg-wine text-white font-bold rounded-lg py-2.5 mt-4 hover:bg-wine-hover"
      >
        {t.signMeUp}
      </button>
      <p className="text-[12px] text-ink/55 mt-3 text-center">{t.terms}</p>
      <p className="text-center text-sm text-ink/60 mt-2">
        {t.haveAccount}{" "}
        <Link href={`/${locale}/login`} className="text-wine font-bold">
          {t.loginBtn}
        </Link>
      </p>
    </div>
  );
}
