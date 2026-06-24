import type { NextConfig } from "next";

// ברירת המחדל של האתר היא אנגלית (i18n.defaultLocale = "en").
// אין middleware ונתיבים בלי שפה נופלים ל-404, לכן ה-redirects האלה
// מנתבים כל כניסה ללא קידומת שפה אל גרסת האנגלית. /he/... עדיין עובד למי שרוצה עברית.
const nextConfig: NextConfig = {
  async redirects() {
    const paths = ["manager", "picker", "s", "account", "login", "register", "checkout"];
    return paths.map((p) => ({
      source: `/${p}/:path*`,
      destination: `/en/${p}/:path*`,
      permanent: false,
    }));
  },
};

export default nextConfig;
