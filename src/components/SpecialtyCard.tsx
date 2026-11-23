"use client";

import { useRouter } from "next/navigation";
import DownloadLink from "@/components/DownloadLink";
import { useDownloadStatus } from "@/components/DownloadStatusProvider";
import { IconChevronRight } from "@/components/icons";
import type { SpecialtyItem } from "@/types/specialty";
import { formatMb } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { badgeStyle, cardStyle, iconLetter } from "@/lib/tint";
import { specialtyName } from "@/lib/specialtyNames";

export default function SpecialtyCard({ item }: { item: SpecialtyItem }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { canDownload, remaining } = useDownloadStatus();
  const [sheetsLink, notesLink] = item.links;
  const code = item.code.split(/\s+/)[0] || item.code;
  const number = new Intl.NumberFormat(locale);
  const showCount = (value: number) => (value > 0 ? number.format(value) : "/");
  // Numbers sit right next to their titles: "وحدات: 60", "دروس: 134", ...
  const stats: { label: string; value: string }[] = [
    { label: `${t("modules")}:`, value: showCount(item.modules) },
    { label: `${t("lessons")}:`, value: showCount(item.lessons) },
    { label: `${t("files")}:`, value: number.format(item.filesCount) },
    { label: `${t("size")}:`, value: formatMb(item.sizeMb, locale) },
  ];

  return (
    <div
      className="relative flex h-[5.5cm] w-full flex-col overflow-hidden rounded-lg border border-line p-2.5 text-start sm:h-[6.5cm] sm:w-[4.6cm]"
      style={cardStyle(item.code)}
    >
      <div className="flex h-full flex-col">
        <button
          type="button"
          onClick={() => router.push(`/specialty/${item.id}`)}
          className="block flex-1 text-start"
        >
          <span dir="ltr" className="block truncate text-[10px] font-mono font-semibold text-primary-deep">
            {code}
          </span>
          <div className="mt-2 flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold"
              style={badgeStyle(item.code)}
            >
              {iconLetter(item.code)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">
              {specialtyName(item, locale)}
            </span>
          </div>
        </button>
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px]">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="text-soft">{s.label}</span>
              <span className="font-semibold text-ink" dir="ltr">{s.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3">
          {sheetsLink && (
            <DownloadLink href={sheetsLink} label={t("linkSheets")} specialtyId={item.id} />
          )}
          {notesLink && (
            <DownloadLink href={notesLink} label={t("linkNotes")} specialtyId={item.id} />
          )}
        </div>
        {!canDownload ? (
          <p className="mt-2 text-[10px] font-medium text-danger">{t("downloadLimitMessage")}</p>
        ) : remaining !== null && remaining > 0 ? (
          <p className="mt-2 text-[10px] text-brown">
            {t("downloadsRemainingLabel").replace("%d", String(remaining))}
          </p>
        ) : null}
      </div>
      <span className="pointer-events-none absolute end-2.5 bottom-2.5 text-soft" aria-hidden="true">
        <IconChevronRight className="h-4 w-4" />
      </span>
    </div>
  );
}
