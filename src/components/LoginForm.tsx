"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { useAuth } from "@/lib/auth/AuthContext";
import { useCart } from "@/lib/cart/CartContext";
import { branchHref } from "@/lib/branch-slugs";
import { safeNextPath } from "@/lib/auth/safe-next";
import { SocialButtons } from "./AuthShell";

export function LoginForm({
  locale,
  dict,
  next,
}: {
  locale: Locale;
  dict: Dictionary;
  next?: string;
}) {
  const t = dict.auth;
  const router = useRouter();
  const { signIn } = useAuth();
  const { branchCompany } = useCart();
  const [mode, setMode] = useState<"choose" | "password">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // ?next= (למשל חזרה לתשלום אם הגיעו מה-checkout), מאומת כנתיב פנימי
  const safe = safeNextPath(next, locale);
  const registerHref = `/${locale}/register${safe ? `?next=${encodeURIComponent(safe)}` : ""}`;

  const submit = async () => {
    setErr("");
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      setErr(locale === "he" ? "אימייל או סיסמה שגויים" : "Invalid email or password");
      return;
    }
    // אחרי התחברות — חוזרים ל-next (אם תקף) אחרת לחנות הסניף הנוכחי (לא לאזור האישי)
    router.push(safe ?? branchHref(locale, branchCompany));
  };

  return (
    <div className="bg-white border border-line rounded-2xl p-6 w-full max-w-md shadow-sm">
      <h1 className="text-lg font-extrabold text-ink mb-4">{t.loginTitle}</h1>

      {mode === "choose" ? (
        <>
          <SocialButtons dict={dict} />
          <div className="flex items-center gap-3 my-4 text-ink/40 text-xs">
            <span className="flex-1 h-px bg-line" />
            {t.or}
            <span className="flex-1 h-px bg-line" />
          </div>
          <label className="block text-sm text-ink/80 mb-1">{t.email}</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
          />
          <button
            onClick={() => setMode("password")}
            className="w-full bg-wine text-white font-bold rounded-lg py-2.5 mt-4 hover:bg-wine-hover"
          >
            {t.continueEmail}
          </button>
          <p className="text-center text-sm text-ink/60 mt-4">
            {t.noAccount}{" "}
            <Link href={registerHref} className="text-wine font-bold">
              {t.signup}
            </Link>
          </p>
        </>
      ) : (
        <>
          <label className="block text-sm text-ink/80 mb-1">{t.email}</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
          />
          <label className="block text-sm text-ink/80 mb-1 mt-3">{t.password}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
          />
          {err && <p className="text-red-600 text-xs mt-3">{err}</p>}
          <button
            onClick={submit}
            disabled={busy}
            className="w-full bg-wine text-white font-bold rounded-lg py-2.5 mt-4 hover:bg-wine-hover disabled:opacity-60"
          >
            {busy ? "…" : t.loginBtn}
          </button>
          <Link
            href={`/${locale}/forgot-password`}
            className="block text-center border border-line text-ink/70 rounded-lg py-2.5 mt-2 hover:border-wine"
          >
            {t.forgot}
          </Link>
        </>
      )}
    </div>
  );
}
