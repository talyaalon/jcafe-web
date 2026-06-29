import type { Locale } from "@/i18n/config";

// קביעת/שינוי סיסמת המלקט של הסניף הנוכחי (טופס POST רגיל — מנהל בלבד).
export function PickerPasswordEditor({
  locale,
  branch,
  branchName,
  hasPassword,
}: {
  locale: Locale;
  branch: number;
  branchName: string;
  hasPassword: boolean;
}) {
  const he = locale === "he";
  return (
    <form
      method="POST"
      action="/api/manager/picker-password"
      className="bg-white border border-line rounded-xl px-4 py-3 flex flex-wrap items-center gap-2 text-sm"
    >
      <span className="font-bold text-ink">
        🔑 {he ? "סיסמת מלקט לסניף" : "Picker password —"} {branchName}:
      </span>
      <span className={hasPassword ? "text-brand-green font-bold" : "text-amber-600 font-bold"}>
        {hasPassword ? (he ? "מוגדרת" : "set") : he ? "לא מוגדרת" : "not set"}
      </span>
      <input type="hidden" name="branch" value={branch} />
      <input type="hidden" name="lang" value={locale} />
      <input
        type="password"
        name="password"
        placeholder={he ? "סיסמה חדשה (ריק = מחיקה)" : "new password (empty = remove)"}
        className="border border-line rounded-lg px-3 py-1.5 outline-none focus:border-wine min-w-[200px]"
      />
      <button className="bg-wine text-white rounded-lg px-4 py-1.5 font-bold hover:bg-wine-hover">
        {he ? "שמור" : "Save"}
      </button>
    </form>
  );
}
