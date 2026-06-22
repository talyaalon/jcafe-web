import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, type Locale } from "@/i18n/config";
import { CheckoutForm } from "@/components/CheckoutForm";
import { StripeProvider } from "@/components/StripeProvider";
import { parseBranchId } from "@/lib/resolve-branch-from-request";
import { COMPANY_SLUG } from "@/lib/branch-slugs";

const VALID_COMPANY_IDS = Object.keys(COMPANY_SLUG).map(Number);

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  // סבב 2ג-3a: fail-closed — אין checkout בלי סניף. ה-Cookie (jcafe_branch_v2,
  // persistent מ-3a-cookie) הוא מקור-האמת בצד-שרת; חסר/לא-חוקי → 404.
  // העגלה ב-localStorage שורדת את ה-404 (CartProvider ב-layout נשאר mounted).
  const branch = parseBranchId((await cookies()).get("jcafe_branch_v2")?.value, VALID_COMPANY_IDS);
  if (branch == null) notFound();

  const dict = await getDictionary(locale);

  return (
    <StripeProvider>
      <CheckoutForm locale={locale} dict={dict} />
    </StripeProvider>
  );
}
