export const i18n = {
  defaultLocale: "en",
  locales: ["he", "en"],
} as const;

export type Locale = (typeof i18n.locales)[number];

export function isLocale(value: string): value is Locale {
  return (i18n.locales as readonly string[]).includes(value);
}

export const dir = (locale: Locale): "rtl" | "ltr" =>
  locale === "he" ? "rtl" : "ltr";
