"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DownloadLink from "@/components/DownloadLink";
import { useDownloadStatus } from "@/components/DownloadStatusProvider";
import { formatDate, formatMb } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import type { SpecialtyItem } from "@/types/specialty";
import { badgeStyle, iconLetter } from "@/lib/tint";
import { specialtyName } from "@/lib/specialtyNames";

export default function SpecialtyDetail({ item }: { item: SpecialtyItem }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const number = new Intl.NumberFormat(locale);
  const { canDownload, remaining } = useDownloadStatus();
  const showCount = (value: number) => (value > 0 ? number.format(value) : "/");
  const otherLinks = item.otherLinks ?? [];
  const folders = [...new Set(otherLinks.map((link) => link.folder))].sort((a, b) => {
    const order = ["المخططات", "المذكرات"];
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  const [activeFolder, setActiveFolder] = useState(folders[0] ?? "");
  const currentFolder = folders.includes(activeFolder) ? activeFolder : folders[0] ?? "";
  const shownLinks = otherLinks.filter((link) => link.folder === currentFolder);
  const details = [
    [`${t("modules")}`, showCount(item.modules)],
    [`${t("lessons")}`, showCount(item.lessons)],
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
        <div className="mt-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white"
            style={badgeStyle(item.code)}
          >
            {iconLetter(item.code)}
          </span>
          <h1 className="text-xl font-bold text-ink">{specialtyName(item, locale)}</h1>
        </div>
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
        <p className="mt-1 text-sm text-soft">{t("oneTimeHint")}</p>
        {!canDownload && (
          <p role="status" className="mt-4 text-sm text-danger">
            {t("downloadLimitMessage")}
          </p>
        )}
        {item.links.length === 0 ? (
          <p className="mt-4 text-sm text-soft">{t("noResults")}</p>
        ) : (
          <ol className="mt-3 divide-y divide-line">
            {item.links.map((link) => (
              <li key={link.index} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate text-sm text-soft">
                  {link.index + 1}.{" "}
                  {link.name ??
                    (link.index === 0
                      ? t("linkSheets")
                      : link.index === 1
                        ? t("linkNotes")
                        : t("hostedFile"))}
                </span>
                <DownloadLink
                  specialtyId={item.id}
                  linkIndex={link.index}
                  label={t("download")}
                  className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-deep"
                />
              </li>
            ))}
          </ol>
        )}
        {canDownload && remaining !== null && remaining > 0 && (
          <p className="mt-3 text-sm text-brown">{t("downloadsRemainingLabel").replace("%d", String(remaining))}</p>
        )}
      </section>

      {otherLinks.length > 0 && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-semibold text-ink">{t("otherLinksTitle")}</h2>
          <p className="mt-1 text-sm text-soft">{t("otherLinksHint")}</p>
          <div className="mt-3 flex flex-wrap gap-1.5 border-b border-line" role="tablist">
            {folders.map((folder) => (
              <button
                key={folder}
                type="button"
                role="tab"
                aria-selected={currentFolder === folder}
                onClick={() => setActiveFolder(folder)}
                className={`rounded-t-lg border-b-2 pb-2 text-sm font-medium ${
                  currentFolder === folder
                    ? "border-primary text-ink"
                    : "border-transparent text-soft hover:text-ink"
                }`}
              >
                {folder} ({number.format(otherLinks.filter((link) => link.folder === folder).length)})
              </button>
            ))}
          </div>
          <ol className="mt-3 divide-y divide-line">
            {shownLinks.map((link) => (
              <li key={link.url} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate text-sm text-soft" dir="auto">
                  {link.name.includes("/") ? link.name.split("/").pop() : link.name}
                </span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md border border-line px-3 py-2 text-sm font-semibold text-primary hover:bg-paper"
                >
                  {t("download")}
                </a>
              </li>
            ))}
          </ol>
          {shownLinks.length === 0 && (
            <p className="mt-3 text-sm text-soft">{t("noResults")}</p>
          )}
        </section>
      )}
    </div>
  );
}
