"use client";

import { useActionState } from "react";
import type { Locale } from "@/i18n/config";
import { loginAction } from "@/app/[lang]/manager/actions";

export function ManagerLogin({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const he = locale === "he";
  return (
    <form action={action} className="bg-white border border-line rounded-2xl p-6 w-full max-w-sm shadow-sm">
      <h1 className="text-lg font-extrabold text-wine">{he ? "כניסת מנהל" : "Manager login"}</h1>
      <p className="text-ink/55 text-sm mt-1 mb-4">J Cafe Phuket</p>
      <input type="hidden" name="lang" value={locale} />
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
