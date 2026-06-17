import type { Metadata } from "next";
import { Heebo, Nunito_Sans } from "next/font/google";
import "../globals.css";
import { i18n, isLocale, dir, type Locale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { CartProvider } from "@/lib/cart/CartContext";
import { FavoritesProvider } from "@/lib/favorites/FavoritesContext";

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

  return (
    <html
      lang={locale}
      dir={dir(locale)}
      className={`${heebo.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-soft text-ink">
        <CartProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
