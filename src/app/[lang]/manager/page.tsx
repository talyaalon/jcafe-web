import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin/session";
import { getStoreHours, getAllBanners } from "@/lib/supabase/data";
import { phuketStores } from "@/lib/odoo/phuket";
import { ManagerLogin } from "@/components/manager/ManagerLogin";
import {
  saveStoreHoursAction,
  addBannerAction,
  deleteBannerAction,
  toggleBannerAction,
  logoutAction,
} from "./actions";

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"];

export default async function ManagerPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const he = locale === "he";

  if (!(await isAdmin())) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f6f8] p-4">
        <ManagerLogin locale={locale} />
      </div>
    );
  }

  const days = he ? DAY_NAMES_HE : DAY_NAMES_EN;
  const banners = await getAllBanners();
  const hoursByStore = await Promise.all(
    phuketStores.map(async (s) => ({ store: s, hours: await getStoreHours(s.id) })),
  );

  return (
    <div className="min-h-screen bg-[#f7f6f8]">
      {/* top bar */}
      <header className="bg-wine text-white flex items-center justify-between px-6 py-3">
        <div className="font-extrabold">J Cafe — {he ? "ניהול" : "Manager"}</div>
        <form action={logoutAction}>
          <input type="hidden" name="lang" value={locale} />
          <button className="text-sm border border-gold-soft rounded-lg px-3 py-1">
            {he ? "התנתקות" : "Logout"}
          </button>
        </form>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* ===== Store hours ===== */}
        <section>
          <h2 className="text-xl font-extrabold text-wine mb-3">
            {he ? "שעות פעילות" : "Store hours"}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {hoursByStore.map(({ store, hours }) => (
              <form
                key={store.id}
                action={saveStoreHoursAction}
                className="bg-white border border-line rounded-xl p-4"
              >
                <input type="hidden" name="store_id" value={store.id} />
                <h3 className="font-bold text-ink mb-2">{he ? store.nameHe : store.nameEn}</h3>
                <div className="space-y-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                    const row = hours.find((h) => h.day_of_week === d);
                    return (
                      <div key={d} className="flex items-center gap-2 text-sm">
                        <span className="w-8 text-ink/60">{days[d]}</span>
                        <input
                          type="time"
                          name={`open_${d}`}
                          defaultValue={row?.open_time ?? ""}
                          className="border border-line rounded px-2 py-1 w-28"
                        />
                        <span className="text-ink/40">–</span>
                        <input
                          type="time"
                          name={`close_${d}`}
                          defaultValue={row?.close_time ?? ""}
                          className="border border-line rounded px-2 py-1 w-28"
                        />
                        <label className="flex items-center gap-1 text-ink/60 ms-auto">
                          <input type="checkbox" name={`closed_${d}`} defaultChecked={row?.closed ?? false} />
                          {he ? "סגור" : "Closed"}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <button className="mt-3 bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover">
                  {he ? "שמירה" : "Save"}
                </button>
              </form>
            ))}
          </div>
        </section>

        {/* ===== Banners ===== */}
        <section>
          <h2 className="text-xl font-extrabold text-wine mb-3">{he ? "באנרים" : "Banners"}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {banners.map((b) => (
              <div key={b.id} className="bg-white border border-line rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image_url} alt={b.title ?? ""} className="w-full h-28 object-cover" />
                <div className="p-3">
                  <div className="font-bold text-sm text-ink truncate">{b.title || "—"}</div>
                  <div className="text-[11px] text-ink/45 truncate">{b.image_url}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <form action={toggleBannerAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="active" value={String(b.active)} />
                      <button
                        className={`text-xs font-bold rounded-lg px-3 py-1 border ${b.active ? "border-brand-green text-brand-green" : "border-line text-ink/50"}`}
                      >
                        {b.active ? (he ? "פעיל" : "Active") : he ? "כבוי" : "Off"}
                      </button>
                    </form>
                    <form action={deleteBannerAction} className="ms-auto">
                      <input type="hidden" name="id" value={b.id} />
                      <button className="text-xs font-bold text-red-500 border border-red-200 rounded-lg px-3 py-1">
                        {he ? "מחק" : "Delete"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form action={addBannerAction} className="bg-white border border-line rounded-xl p-4 space-y-2 max-w-lg">
            <h3 className="font-bold text-ink">{he ? "הוספת באנר" : "Add banner"}</h3>
            <input name="image_url" required placeholder={he ? "קישור לתמונה (URL)" : "Image URL"} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            <input name="title" placeholder={he ? "כותרת (אופציונלי)" : "Title (optional)"} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            <input name="link" placeholder={he ? "קישור בלחיצה (אופציונלי)" : "Link (optional)"} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            <input name="sort" type="number" defaultValue={0} placeholder="Sort" className="w-24 border border-line rounded-lg px-3 py-2 text-sm" />
            <button className="bg-wine text-white font-bold rounded-lg px-4 py-2 text-sm hover:bg-wine-hover block">
              {he ? "הוסף" : "Add"}
            </button>
          </form>
          <p className="text-[12px] text-ink/50 mt-2">
            {he
              ? "כתיבות (שמירת שעות/באנרים) דורשות מפתח SUPABASE_SERVICE_ROLE_KEY ב-.env.local."
              : "Writes require SUPABASE_SERVICE_ROLE_KEY in .env.local."}
          </p>
        </section>
      </div>
    </div>
  );
}
