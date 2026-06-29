import { COMPANY_SLUG } from "@/lib/branch-slugs";

// manifest דינמי למלקט per-סניף — כך שהתקנה למסך הבית (PWA אנדרואיד) של מלקט סניף
// תיפתח על אותו סניף בלבד (ולא על "כל הסניפים"). כל סניף = אפליקציה נפרדת (id ייחודי).
export function GET(req: Request) {
  const company = Number(new URL(req.url).searchParams.get("company")) || 0;
  const slug = company ? (COMPANY_SLUG[company] ?? String(company)) : "";
  const label = slug ? slug.replace(/^\w/, (c) => c.toUpperCase()) : "";
  const start = company ? `/en/picker?company=${company}` : "/en/picker";

  const manifest = {
    id: start,
    name: label ? `J Cafe מלקט — ${label}` : "J Cafe — מלקט",
    short_name: label ? `מלקט ${label}` : "מלקט",
    description: "מסך ליקוט הזמנות — J Cafe",
    start_url: start,
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f7f6f8",
    theme_color: "#861e74",
    icons: [
      { src: "/app-logo.png", sizes: "225x225", type: "image/png", purpose: "any" },
      { src: "/app-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
