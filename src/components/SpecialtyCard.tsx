"use client";

import { useRouter } from "next/navigation";
import DownloadLink from "@/components/DownloadLink";
import { useDownloadStatus } from "@/components/DownloadStatusProvider";
import type { SpecialtyItem } from "@/types/specialty";
import { useI18n } from "@/lib/i18n";
import { badgeStyle, cardStyle, iconLetter } from "@/lib/tint";
import { specialtyName } from "@/lib/specialtyNames";

export default function SpecialtyCard({ item }: { item: SpecialtyItem }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { canDownload, remaining } = useDownloadStatus();
  const [sheetsLink, notesLink] = item.links;
  const code = item.code.split(/\s+/)[0] || item.code;

  return (
    <div
      className="h-[5cm] w-full overflow-hidden rounded-lg border border-line p-1.5 text-start sm:h-[4cm] sm:w-[4cm]"
      style={cardStyle(item.code)}
    >
      <button
        type="button"
        onClick={() => router.push(`/specialty/${item.id}`)}
        className="block w-full text-start"
      >
        <span dir="ltr" className="block truncate text-[11px] font-mono font-semibold text-primary-deep">
          {code}
        </span>
        <h2 className="mt-1 flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold"
            style={badgeStyle(item.code)}
          >
            {iconLetter(item.code)}
          </span>
          <span className="min-w-0 flex-1 line-clamp-2">{specialtyName(item, locale)}</span>
        </h2>
      </button>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {sheetsLink && <DownloadLink href={sheetsLink} label={t("linkSheets")} className="text-[12px] text-blue" />}
        {notesLink && <DownloadLink href={notesLink} label={t("linkNotes")} className="text-[12px] text-blue" />}
      </div>
      {!canDownload ? (
        <p className="mt-1.5 text-[11px] font-medium text-danger">{t("downloadLimitMessage")}</p>
      ) : remaining !== null && remaining > 0 ? (
        <p className="mt-1.5 text-[11px] text-brown">
          {t("downloadsRemainingLabel").replace("%d", String(remaining))}
        </p>
      ) : null}
    </div>
  );
}
