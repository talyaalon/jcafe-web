import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { AuthShell } from "@/components/AuthShell";
import { OrderDetailView } from "@/components/OrderDetailView";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ lang: string; name: string }>;
}) {
  const { lang, name } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  return (
    <AuthShell locale={locale} dict={dict}>
      <OrderDetailView locale={locale} dict={dict} name={decodeURIComponent(name)} />
    </AuthShell>
  );
}
