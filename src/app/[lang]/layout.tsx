import type { Metadata } from "next";
import { Heebo, Nunito_Sans } from "next/font/google";
import "../globals.css";
import { i18n, isLocale, dir, type Locale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CartProvider } from "@/lib/cart/CartContext";
import { FavoritesProvider } from "@/lib/favorites/FavoritesContext";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { COMPANY_SLUG } from "@/lib/branch-slugs";
import { parseBranchId } from "@/lib/resolve-branch-from-request";

const VALID_COMPANY_IDS = Object.keys(COMPANY_SLUG).map(Number);

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "J-Cafe — THE KOSHER PLACE",
  description: "חנות אונליין ומסעדה כשרה בפוקט · Kosher online shop & restaurant, Phuket",
};

export function generateStaticParams() {
  return i18n.locales.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  // 2ב — זריעת הסניף מ-Cookie (שנכתב ע"י proxy על /s/[branch]) ל-CartProvider.
  // additive: אם אין Cookie תקין → undefined → CartProvider נופל ל-14/localStorage כמו היום.
  const branchCookie = (await cookies()).get("jcafe_branch_v2")?.value;
  const initialBranch = parseBranchId(branchCookie, VALID_COMPANY_IDS) ?? undefined;

  return (
    <html
      lang={locale}
      dir={dir(locale)}
      className={`${heebo.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-soft text-ink">
        <AuthProvider>
          <CartProvider initialBranch={initialBranch}>
            <FavoritesProvider>{children}</FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
