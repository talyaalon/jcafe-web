import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Coming soon · J Cafe",
  robots: { index: false, follow: false },
};

// דף "האתר בבנייה" — מוצג לציבור כשמתג התחזוקה דלוק (ה-proxy עושה rewrite לכאן).
export default async function MaintenancePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const he = (lang as Locale) === "he";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-wine to-wine-dark text-white px-6">
      <div className="text-center max-w-md">
        <img
          src="/jcafe-online-logo.png"
          alt="J Cafe Online — Kosher Shoppe"
          width={170}
          height={170}
          className="mx-auto mb-6 rounded-2xl shadow-lg"
        />
        <h1 className="font-brand text-3xl sm:text-4xl mb-3">
          {he ? "האתר בבנייה" : "Site under construction"}
        </h1>
        <p className="text-gold-soft/90 text-base leading-7">
          {he
            ? "אנחנו עובדים על משהו טעים וכשר. נחזור בקרוב — תודה על הסבלנות!"
            : "We're working on something delicious & kosher. We'll be back soon — thanks for your patience!"}
        </p>
      </div>
    </main>
  );
}
