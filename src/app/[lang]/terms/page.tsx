import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { AuthShell } from "@/components/AuthShell";
import { LegalDoc } from "@/components/LegalDoc";
import { getTerms } from "@/lib/legal/content";

export const metadata: Metadata = {
  title: "Terms & Conditions · J-Cafe",
  description: "Terms & Conditions for ordering from J Cafe (The Kosher Place), Thailand.",
};

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  return (
    <AuthShell locale={locale} dict={dict}>
      <LegalDoc doc={getTerms(locale === "he")} />
    </AuthShell>
  );
}
