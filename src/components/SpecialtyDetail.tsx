"use client";

import { useRouter } from "next/navigation";
import { formatDate, formatMb } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import type { SpecialtyItem } from "@/types/specialty";

function host(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function track() {
  void fetch("/api/specialties/track", { method: "POST", credentials: "same-origin" });
}

export default function SpecialtyDetail({ item }: { item: SpecialtyItem }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const number = new Intl.NumberFormat(locale);

  const details = [
    [`${t("modules")}`, number.format(item.modules)],
    [`${t("lessons")}`, number.format(item.lessons)],
    [`${t("files")}`, number.format(item.filesCount)],
    [`${t("size")}`, formatMb(item.sizeMb, locale)],
  ];

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="text-sm text-primary">
        ← {t("back")}
      </button>

      <section className="rounded-lg border border-line bg-white p-5">
        <p dir="ltr" className="font-mono text-sm font-semibold text-primary-deep text-start">
          {item.code}
        </p>
        <h1 className="mt-1 text-xl font-bold text-ink">{item.name}</h1>
        {item.contentType && <p className="mt-1 text-sm text-soft">{item.contentType}</p>}
        <div className="mt-4 grid grid-cols-2 gap-y-3 border-t border-line pt-4 text-sm">
          {details.map(([label, value]) => (
            <div key={label}>
              <p className="text-soft">{label}</p>
              <p className="font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-soft">
          {t("published")}: {formatDate(item.publishedAt, locale)}
        </p>
      </section>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="font-semibold text-ink">{t("linksTitle")}</h2>
        <p className="mt-1 text-sm text-soft">{t("openHint")}</p>
        {item.links.length === 0 ? (
          <p className="mt-4 text-sm text-soft">{t("noResults")}</p>
        ) : (
          <ol className="mt-3 divide-y divide-line">
            {item.links.map((url, index) => (
              <li key={`${url}-${index}`} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate text-sm text-soft" dir="ltr">
                  {index + 1}. {host(url)}
                </span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={track}
                  className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white"
                >
                  {t("download")}
                </a>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
