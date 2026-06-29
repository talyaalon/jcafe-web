import type { Locale } from "@/i18n/config";

// כניסת מלקט לסניף ספציפי — סיסמת המלקט של אותו סניף (טופס POST רגיל).
export function PickerLogin({
  locale,
  branch,
  branchName,
  error,
}: {
  locale: Locale;
  branch: number;
  branchName: string;
  error?: boolean;
}) {
  const he = locale === "he";
  return (
    <div className="min-h-screen grid place-items-center bg-[#f7f6f8] p-4">
      <form
        method="POST"
        action="/api/picker/login"
        className="bg-white border border-line rounded-2xl p-6 w-full max-w-sm shadow-sm"
      >
        <img
          src="/app-logo.png"
          alt="J Cafe"
          width={72}
          height={72}
          className="mx-auto mb-4 rounded-2xl"
        />
        <h1 className="font-brand text-xl text-wine mb-1 text-center">
          {he ? "כניסת מלקט" : "Picker login"}
        </h1>
        <p className="text-sm text-ink/60 text-center mb-4">{branchName}</p>
        <input type="hidden" name="branch" value={branch} />
        <input type="hidden" name="lang" value={locale} />
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder={he ? "סיסמת המלקט של הסניף" : "Branch picker password"}
          className="w-full border border-line rounded-lg px-3 py-2 mb-3 outline-none focus:border-wine"
        />
        {error && (
          <p className="text-red-600 text-sm mb-2 text-center">
            {he ? "סיסמה שגויה" : "Wrong password"}
          </p>
        )}
        <button className="w-full bg-wine text-white rounded-xl py-2.5 font-bold hover:bg-wine-hover">
          {he ? "כניסה" : "Enter"}
        </button>
      </form>
    </div>
  );
}
