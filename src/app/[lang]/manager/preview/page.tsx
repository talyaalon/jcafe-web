import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { isAdmin } from "@/lib/admin/session";
import { getBranches, getBranchData } from "@/lib/odoo/branches";
import { applyStoreBranding } from "@/lib/odoo/branding";
import {
  getActiveBanners,
  getStoreOpenStatus,
  getBranchBranding,
  getStoreBranding,
  getBannerSettings,
  getBlockedProductIds,
  getBlockedCategoryKeys,
} from "@/lib/supabase/data";
import { getThresholdMap } from "@/lib/category/thresholds";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import { BranchSelect } from "@/components/manager/BranchSelect";
import { MaintenanceToggle } from "@/components/manager/MaintenanceToggle";
import { Storefront, type StoreBundle } from "@/components/Storefront";

export default async function ManagerPreview({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ company?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const he = locale === "he";

  if (!(await isAdmin())) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f6f8] p-4">
        <ManagerLogin locale={locale} next={`/${locale}/manager/preview`} title={he ? "כניסת מנהל" : "Manager login"} />
      </div>
    );
  }

  const dict = await getDictionary(locale);
  const branches = await getBranches();
  const { company } = await searchParams;
  const requested = Number(company);
  const current =
    branches.find((b) => b.companyId === requested)?.companyId ??
    branches.find((b) => b.companyId === 14)?.companyId ?? // Phuket כברירת מחדל
    branches[0]?.companyId ??
    0;

  const rawBundles = current ? await getBranchData(current) : [];
  // הוספת סטטוס פתוח/סגור לכל חנות (לפי שעות הסניף)
  const bundles0 = (await Promise.all(
    rawBundles.map(async (b) => ({
      ...b,
      open: (await getStoreOpenStatus(b.store.id)).open,
    })),
  )) as StoreBundle[];
  const storeBranding = current ? await getStoreBranding(current) : {};
  const bundles = applyStoreBranding(bundles0, storeBranding, locale);
  // אכיפת חסימות (כמו באתר האמיתי) — מוצרים וקטגוריות חסומים מוסתרים גם בתצוגה המקדימה
  const [blockedIds, blockedCats, thresholds] = await Promise.all([
    getBlockedProductIds(current),
    getBlockedCategoryKeys(current),
    getThresholdMap(current),
  ]);
  const data =
    blockedIds.size || blockedCats.size || thresholds.size
      ? bundles.map((d) => ({
          ...d,
          products: d.products.filter((p) => {
            if (blockedIds.has(String(p.id).split("|")[0])) return false;
            if (blockedCats.has(`cat:${p.storeId}:${p.categoryId}`)) return false;
            const th = thresholds.get(`${p.storeId}:${p.categoryId}`);
            if (th != null && p.qtyAvailable != null && p.qtyAvailable <= th) return false;
            return true;
          }),
        }))
      : bundles;
  const banners = await getActiveBanners(current);
  const bannerSettings = current ? await getBannerSettings(current) : {};
  const bb = current ? await getBranchBranding(current) : null;
  const branding = bb
    ? {
        name: he ? bb.name_he : bb.name_en,
        tagline: he ? bb.tagline_he : bb.tagline_en,
        logoUrl: bb.logo_url,
      }
    : null;
  const branchName = branches.find((b) => b.companyId === current)?.name ?? "";

  return (
    <div className="min-h-screen bg-[#f7f6f8] flex flex-col">
      <header className="bg-wine text-white flex items-center justify-between gap-3 px-4 sm:px-6 py-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/manager`} className="text-sm border border-gold-soft rounded-lg px-3 py-1">
            ← {he ? "ניהול" : "Manager"}
          </Link>
          <span className="font-extrabold">{he ? "תצוגת אתר — סניף" : "Site preview — Branch"}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MaintenanceToggle he={he} />
          <BranchSelect
            locale={locale}
            current={current}
            branches={branches.map((b) => ({ companyId: b.companyId, name: b.name, count: b.configs.length }))}
          />
        </div>
      </header>

      <div className="bg-soft border-b border-line px-4 sm:px-6 py-2 text-sm text-ink/70">
        {he ? "מציג כעת:" : "Showing:"} <b className="text-wine">{branchName}</b> ·{" "}
        {bundles.length} {he ? "חנויות" : "stores"}
      </div>

      <div className="flex-1">
        {bundles.length === 0 ? (
          <p className="p-10 text-center text-ink/50">
            {he ? "אין חנויות פעילות בסניף זה." : "No active stores for this branch."}
          </p>
        ) : (
          <Storefront
            key={current}
            locale={locale}
            dict={dict}
            data={data}
            banners={banners}
            branch={current}
            branding={branding}
            bannerSettings={bannerSettings}
          />
        )}
      </div>
    </div>
  );
}
