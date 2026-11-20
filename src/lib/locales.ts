export type Locale = "ar" | "en" | "fr";

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: "ar", label: "العربية", short: "ع" },
  { code: "en", label: "English", short: "EN" },
  { code: "fr", label: "Français", short: "FR" },
];

export function isLocale(v: string | null | undefined): v is Locale {
  return v === "ar" || v === "en" || v === "fr";
}
