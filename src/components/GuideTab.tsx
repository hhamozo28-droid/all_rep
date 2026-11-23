"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api, formatDate } from "@/lib/client";
import { useI18n } from "@/lib/i18n";

type GuideItem = {
  id: string;
  path: string;
  title: string;
  fileName: string;
  size: number;
  downloads: number;
  uploadedAt: string;
};

export default function GuideTab() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<GuideItem[] | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [limitMsg, setLimitMsg] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ ok: boolean; guides: GuideItem[] }>("/api/guides", { cache: "no-store" });
      setItems(data.guides);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openGuide(id: string, download = false) {
    setBusyId(id);
    setLimitMsg(false);
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      await api(`/api/guides/${encodeURIComponent(id)}/track`, { method: "POST", credentials: "same-origin" });
      const url = `/api/guides/${encodeURIComponent(id)}/file${download ? "?download=1" : ""}`;
      if (tab) {
        tab.location = url;
      }
    } catch (e) {
      tab?.close();
      if (e instanceof ApiError && e.status === 403) setLimitMsg(true);
    } finally {
      setBusyId(null);
    }
  }

  if (items === null) return <p className="rounded-lg border border-line bg-white p-5 text-sm text-soft">{t("loading")}</p>;
  if (error) return <p className="rounded-lg border border-line bg-white p-5 text-sm text-danger">{t("error")}</p>;
  if (items.length === 0) return <p className="rounded-lg border border-line bg-white p-5 text-sm text-soft">{t("guidesEmpty")}</p>;

  return (
    <section className="mt-3 rounded-lg border border-line bg-white p-4">
      {limitMsg && <p role="alert" className="mb-2 text-sm text-danger">{t("downloadLimitMessage")}</p>}
      <div className="grid gap-2">
        {items.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2 first:border-t-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink" dir="ltr">{g.title}</p>
              <p className="text-xs text-soft">
                {new Intl.NumberFormat(locale).format(g.size)} · {formatDate(g.uploadedAt, locale)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busyId === g.id}
                onClick={() => void openGuide(g.id, false)}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-50"
              >
                {t("guideOpen")}
              </button>
              <button
                type="button"
                disabled={busyId === g.id}
                onClick={() => void openGuide(g.id, true)}
                className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-primary hover:bg-paper disabled:opacity-50"
              >
                {t("guideDownload")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
