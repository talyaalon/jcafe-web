import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { AuthShell } from "@/components/AuthShell";
import { AccountView } from "@/components/AccountView";

export default async function AccountPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  return (
    <AuthShell locale={locale} dict={dict}>
      <AccountView locale={locale} dict={dict} />
    </AuthShell>
  );
}
