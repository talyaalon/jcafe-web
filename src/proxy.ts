import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18n } from "@/i18n/config";

// Proxy (לשעבר middleware ב-Next ≤15): מפנה נתיב ללא קידומת שפה ל-/he או /en.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = i18n.locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocale) return;

  const accept = (request.headers.get("accept-language") ?? "").toLowerCase();
  const locale = accept.startsWith("en") ? "en" : i18n.defaultLocale;

  request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // לרוץ על כל הנתיבים פרט ל-_next, api, וקבצים סטטיים (עם נקודה).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
