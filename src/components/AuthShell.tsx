"use client";

import type { Provider } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AuthHeader } from "./AuthHeader";
import { SiteFooter } from "./SiteFooter";

// מעטפת לדפי Auth: הדר פשוט + תוכן ממורכז + Footer מלא.
export function AuthShell({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <AuthHeader locale={locale} dict={dict} />
      <main className="flex-1 flex items-start justify-center px-4 py-12 bg-[#f7f6f8]">
        {children}
      </main>
      <SiteFooter locale={locale} dict={dict} />
    </div>
  );
}

export function SocialButtons({ dict }: { dict: Dictionary }) {
  const t = dict.auth;
  const oauth = (provider: Provider) =>
    supabaseBrowser.auth.signInWithOAuth({
      provider,
      options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
  const btns: { icon: string; label: string; color: string; provider: Provider }[] = [
    { icon: "G", label: t.continueGoogle, color: "#4285F4", provider: "google" },
  ];
  return (
    <div className="space-y-2.5">
      {btns.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={() => oauth(b.provider)}
          className="w-full flex items-center justify-center gap-3 border border-line rounded-lg py-2.5 text-sm font-medium hover:bg-soft"
        >
          <span className="font-bold" style={{ color: b.color }}>
            {b.icon}
          </span>
          {b.label}
        </button>
      ))}
    </div>
  );
}
