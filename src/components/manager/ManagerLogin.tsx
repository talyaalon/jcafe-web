"use client";

import { useActionState } from "react";
import type { Locale } from "@/i18n/config";
import { loginAction } from "@/app/[lang]/manager/actions";
import { LangMenu } from "@/components/LangMenu";

export function ManagerLogin({
  locale,
  next,
  title,
}: {
  locale: Locale;
  next?: string;
  title?: string;
}) {
  const [state, action, pending] = useActionState(loginAction, null);
  const he = locale === "he";
  return (
    <form action={action} className="bg-white border border-line rounded-2xl p-6 w-full max-w-sm shadow-sm">
      <div className="flex items-center justify-end -mt-1 mb-1 text-ink/70">
        <LangMenu locale={locale} />
      </div>
      <h1 className="text-lg font-extrabold text-wine">
        {title ?? (he ? "כניסת מנהל" : "Manager login")}
      </h1>
      <p className="text-ink/55 text-sm mt-1 mb-4">J Cafe Phuket</p>
      <input type="hidden" name="lang" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block text-sm text-ink/80 mb-1">{he ? "סיסמה" : "Password"}</label>
      <input
        name="password"
        type="password"
        autoFocus
        className="w-full border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-wine"
      />
      {state?.error && (
        <p className="text-red-500 text-xs mt-2">{he ? "סיסמה שגויה" : "Wrong password"}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-wine text-white font-bold rounded-lg py-2.5 mt-4 hover:bg-wine-hover disabled:opacity-60"
      >
        {pending ? "…" : he ? "כניסה" : "Login"}
      </button>
    </form>
  );
}
