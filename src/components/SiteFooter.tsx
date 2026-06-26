import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

// Footer מלא (כהה) — אתר, Auth ודפי תוכן.
export function SiteFooter({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const he = locale === "he";
  type FooterLink = { label: string; href?: string };
  const cols: { title: string; links: FooterLink[] }[] = [
    { title: dict.footer.about, links: [{ label: he ? "אודות J Cafe" : "About Jcafe" }] },
    {
      title: dict.footer.services,
      links: (he
        ? ["איסוף עצמי", "קייטרינג כשר", "קבוצות תיירים", "משלוחים"]
        : ["Take away", "Kosher Catering", "Travel Groups", "Delivery"]
      ).map((label) => ({ label })),
    },
    {
      title: dict.footer.policy,
      links: [
        { label: he ? "מדיניות מסחר" : "Business policy" },
        { label: he ? "מדיניות פרטיות" : "Privacy policy", href: `/${locale}/privacy` },
        { label: he ? "תקנון שימוש" : "Terms of service", href: `/${locale}/terms` },
      ],
    },
    {
      title: dict.footer.connect,
      links: (he ? ["אימייל", "מצא אותנו"] : ["Email", "Find us"]).map((label) => ({ label })),
    },
  ];

  return (
    <footer className="bg-wine-dark text-gold-soft mt-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 px-7 py-10 text-sm max-w-6xl mx-auto">
        <div className="col-span-2 md:col-span-1">
          <div className="text-white font-extrabold text-xl">{dict.brand.name}</div>
          <div className="text-[8px] tracking-[3px] text-gold">{dict.brand.tagline}</div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-white font-bold mb-3">{c.title}</h4>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.href ? (
                    <Link
                      href={l.href}
                      className="text-gold-soft/80 hover:text-white text-[13px] cursor-pointer"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a className="text-gold-soft/80 hover:text-white text-[13px] cursor-pointer">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 flex items-center justify-between px-7 py-3 max-w-6xl mx-auto text-[11px]">
        <div className="flex gap-3 text-base">
          <span>📷</span>
          <span>📘</span>
        </div>
        <span>{dict.footer.rights}</span>
      </div>
    </footer>
  );
}
