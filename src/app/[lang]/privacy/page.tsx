import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { AuthShell } from "@/components/AuthShell";
import { LegalDoc } from "@/components/LegalDoc";
import { getPrivacy } from "@/lib/legal/content";

export const metadata: Metadata = {
  title: "Privacy Policy · J-Cafe",
  description: "How J Cafe (The Kosher Place) collects and protects your personal data under Thailand's PDPA.",
};

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  return (
    <AuthShell locale={locale} dict={dict}>
      <LegalDoc doc={getPrivacy(locale === "he")} />
    </AuthShell>
  );
}
