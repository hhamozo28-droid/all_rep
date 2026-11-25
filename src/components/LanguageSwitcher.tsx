"use client";

import { useI18n, type Locale, LOCALES } from "@/lib/i18n";
import { IconGlobe } from "./icons";

export default function LanguageSwitcher({
  onLocalChange,
  compact = false,
}: {
  onLocalChange?: (locale: Locale) => void;
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-1.5 py-1">
        <IconGlobe width={12} height={12} aria-hidden="true" className="text-primary" />
        <select
          aria-label={t("language")}
          title={t("language")}
          value={locale}
          onChange={(event) => {
            const next = event.target.value as Locale;
            setLocale(next);
            onLocalChange?.(next);
          }}
          className="bg-transparent text-xs text-ink outline-none"
        >
          {LOCALES.map((item) => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>
      </span>
    );
  }

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
