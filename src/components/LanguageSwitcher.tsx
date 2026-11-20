"use client";

import { useI18n, type Locale, LOCALES } from "@/lib/i18n";

export default function LanguageSwitcher({
  onLocalChange,
}: {
  onLocalChange?: (locale: Locale) => void;
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <select
      aria-label={t("language")}
      title={t("language")}
      value={locale}
      onChange={(event) => {
        const next = event.target.value as Locale;
        setLocale(next);
        onLocalChange?.(next);
      }}
      className="rounded-md border border-line bg-white px-2 py-2 text-sm text-ink"
    >
      {LOCALES.map((item) => (
        <option key={item.code} value={item.code}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
