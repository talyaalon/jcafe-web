import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { i18n } from "@/i18n/config";
import { BRANCH_SLUGS, COMPANY_SLUG } from "@/lib/branch-slugs";
import { resolveBranchFromRequest } from "@/lib/resolve-branch-from-request";

// שם ה-Cookie נבדל מ-localStorage הקיים (jcafe_branch) כדי לא להתבלבל ביניהם.
const BRANCH_COOKIE = "jcafe_branch_v2";
const VALID_COMPANY_IDS = Object.keys(COMPANY_SLUG).map(Number);
const STORE_PATH_RE = /^\/(?:he|en)\/s\/[^/?#]+/;

// Proxy (לשעבר middleware ב-Next ≤15): מפנה נתיב ללא קידומת שפה ל-/he או /en.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = i18n.locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  // ===== לוגיקת redirect-השפה הקיימת — לא נגעתי בה =====
  if (!hasLocale) {
    const accept = (request.headers.get("accept-language") ?? "").toLowerCase();
    const locale = accept.startsWith("en") ? "en" : i18n.defaultLocale;

    request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(request.nextUrl);
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
