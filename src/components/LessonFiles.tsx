"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAppOnlyDownloads } from "@/lib/appOnlyClient";
import { ApiError, api, formatDate } from "@/lib/client";
import { useDownloadStatus } from "@/components/DownloadStatusProvider";
import { useI18n } from "@/lib/i18n";

type LessonItem = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  downloads: number;
  uploadedAt: string;
};

export default function LessonFiles({ code }: { code: string }) {
  const { t, locale } = useI18n();
  const appOnly = useAppOnlyDownloads();
  const { refresh } = useDownloadStatus();
  const [items, setItems] = useState<LessonItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api<{ ok: boolean; lessons: LessonItem[] }>(
        `/api/lesson-files?code=${encodeURIComponent(code)}`,
        { cache: "no-store" },
      );
      setItems(data.lessons);
    } catch {
      setItems([]);
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(lesson: LessonItem) {
    setBusyId(lesson.id);
    setMessage("");
    try {
      const grant = await api<{ url: string }>(
        `/api/lesson-files/${encodeURIComponent(lesson.id)}/track`,
        { method: "POST", credentials: "same-origin" },
      );
      const response = await fetch(grant.url, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(response.status, body as Record<string, unknown> | null);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = lesson.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      await refresh();
    } catch (cause) {
      if (cause instanceof ApiError && cause.body?.error === "maintenance") {
        setMessage(t("maintenanceMessage"));
      } else if (cause instanceof ApiError && cause.status === 403) {
        setMessage(t("downloadLimitMessage"));
      } else if (cause instanceof ApiError && cause.status === 410) {
        setMessage(t("linkUsed"));
      } else {
        setMessage(t("error"));
      }
      await refresh().catch(() => {});
    } finally {
      setBusyId(null);
    }
  }

  if (!items || items.length === 0) return null;
  const number = new Intl.NumberFormat(locale);

  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="font-semibold text-ink">{t("lessonFilesSection")}</h2>
      <p className="mt-1 text-sm text-soft">{t("oneTimeHint")}</p>
      {message && <p role="alert" className="mt-2 text-sm text-danger">{message}</p>}
      {appOnly && (
        <p className="mt-3 rounded-md bg-paper px-3 py-2 text-sm font-semibold text-primary" dir="auto">
          {t("appOnlyNotice")} ·{" "}
          <Link href="/download" className="underline">{t("androidApp")}</Link>
        </p>
      )}
      <ol className="mt-3 divide-y divide-line">
        {items.map((lesson) => (
          <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink" dir="auto">{lesson.title}</span>
              <span className="block text-xs text-soft">
                {number.format(lesson.size)} · {formatDate(lesson.uploadedAt, locale)}
              </span>
            </span>
            {appOnly ? (
              <Link href="/download" className="shrink-0 rounded-md border border-line px-3 py-2 text-sm font-semibold text-primary hover:bg-paper">
                {t("androidApp")}
              </Link>
            ) : (
              <button
                type="button"
                disabled={busyId === lesson.id}
                onClick={() => void download(lesson)}
                className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-50"
              >
                {t("download")}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
