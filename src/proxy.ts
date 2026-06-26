import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18n } from "@/i18n/config";
import { BRANCH_SLUGS, COMPANY_SLUG } from "@/lib/branch-slugs";
import { resolveBranchFromRequest } from "@/lib/resolve-branch-from-request";
import { getMaintenanceOn } from "@/lib/site/maintenance";

// שם ה-Cookie נבדל מ-localStorage הקיים (jcafe_branch) כדי לא להתבלבל ביניהם.
const BRANCH_COOKIE = "jcafe_branch_v2";
const VALID_COMPANY_IDS = Object.keys(COMPANY_SLUG).map(Number);
const STORE_PATH_RE = /^\/(?:he|en)\/s\/[^/?#]+/;

// נתיבים שלעולם לא נחסמים ע"י "מצב בנייה" (צוות + דף הבנייה עצמו):
// המנהל נכנס דרך /manager (כולל /manager/preview לבדיקה), המלקט דרך /picker.
const MAINT_ALLOW_RE = /^\/(?:he|en)\/(?:manager|picker|maintenance)(?:\/|$)/;

// הדומיין הראשי מייצג סניף בנגקוק בלבד — שורש הדומיין (וקידומת-שפה עירומה)
// מפנה לחנות בנגקוק. שאר הסניפים נשארים על קישורי ה-vercel.app הרגילים.
const PRIMARY_HOSTS = ["jcafekosher.com", "www.jcafekosher.com"];
const PRIMARY_BRANCH_SLUG = "bangkok";

// Proxy (לשעבר middleware ב-Next ≤15): מפנה נתיב ללא קידומת שפה ל-/he או /en.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = i18n.locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  const host = (request.headers.get("host") ?? "").toLowerCase();
  const isPrimary = PRIMARY_HOSTS.includes(host);

  // ===== לוגיקת redirect-השפה הקיימת (+ הדומיין הראשי → בנגקוק) =====
  if (!hasLocale) {
    const accept = (request.headers.get("accept-language") ?? "").toLowerCase();
    const locale = accept.startsWith("en") ? "en" : i18n.defaultLocale;

    // הדומיין הראשי = סניף בנגקוק: השורש מפנה ישירות לחנות בנגקוק.
    request.nextUrl.pathname = isPrimary
      ? `/${locale}/s/${PRIMARY_BRANCH_SLUG}`
      : `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // ===== "מצב בנייה" (additive) — הציבור מופנה לדף בנייה; הצוות עובר חופשי. =====
  // fail-open: getMaintenanceOn מחזיר false בכל תקלה ⇒ האתר לעולם לא נחסם בטעות.
  if (!MAINT_ALLOW_RE.test(pathname) && (await getMaintenanceOn())) {
    const locale = pathname.split("/")[1] || i18n.defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/maintenance`;
    url.search = "";
    return NextResponse.rewrite(url);
  }

  // ===== הדומיין הראשי = בנגקוק: קידומת-שפה עירומה (/he, /en) → חנות בנגקוק. =====
  if (isPrimary && (pathname === "/he" || pathname === "/en")) {
    const locale = pathname.slice(1);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/s/${PRIMARY_BRANCH_SLUG}`;
    return NextResponse.redirect(url);
  }

  // ===== סבב 2א (additive) — אך ורק על /{lang}/s/{branch}: =====
  // כותבים Cookie httpOnly עם הסניף שב-URL, כך ש-2ב יוכל לקרוא אותו ב-SSR.
  // כל נתיב אחר עם קידומת שפה ממשיך בדיוק כמו קודם (pass-through, בלי Cookie).
  if (STORE_PATH_RE.test(pathname)) {
    const branch = resolveBranchFromRequest(pathname, undefined, {
      validCompanyIds: VALID_COMPANY_IDS,
      slugToId: BRANCH_SLUGS,
    });
    if (branch != null) {
      const res = NextResponse.next();
      res.cookies.set(BRANCH_COOKIE, String(branch), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // סבב 2ג-3a: Cookie persistent (~שנה) — סניף נשמר בין sessions, כך
        // שמשתמש חוזר עם עגלה שמורה לא נחסם ע"י שומר ה-checkout (2ג-3a-guard).
        maxAge: 60 * 60 * 24 * 365,
      });
      return res;
    }
  }

  // נתיב עם שפה שאינו /s/ (או /s/ עם סניף לא-חוקי) — pass-through זהה לקוד הקודם.
  return;
}

export const config = {
  // לרוץ על כל הנתיבים פרט ל-_next, api, וקבצים סטטיים (עם נקודה).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
