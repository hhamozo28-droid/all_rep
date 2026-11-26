"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAppOnlyDownloads } from "@/lib/appOnlyClient";
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

type GrantResponse = { url: string };

export default function GuideTab() {
  const { t, locale } = useI18n();
  const appOnly = useAppOnlyDownloads();
  const [items, setItems] = useState<GuideItem[] | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [limitMsg, setLimitMsg] = useState(false);
  const [linkMsg, setLinkMsg] = useState("");

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

  async function openGuide(guide: GuideItem, download: boolean) {
    setBusyId(guide.id);
    setLimitMsg(false);
    setLinkMsg("");
    try {
      const grant = await api<GrantResponse>(`/api/guides/${encodeURIComponent(guide.id)}/track`, {
        method: "POST",
        body: JSON.stringify({ mode: download ? "download" : "open" }),
      });
      // Fetch the file once through the single-attempt link, then hand the
      // bytes to the browser locally so PDF viewers cannot issue extra requests.
      const response = await fetch(grant.url, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(response.status, body as Record<string, unknown> | null);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = guide.fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      } else {
        const tab = window.open(objectUrl, "_blank");
        if (tab) tab.opener = null;
        else window.location.assign(objectUrl);
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60_000);
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.body?.error === "maintenance") setLinkMsg(t("maintenanceMessage"));
      else if (cause instanceof ApiError && cause.status === 403) setLimitMsg(true);
      else if (cause instanceof ApiError && cause.status === 410) setLinkMsg(t("linkUsed"));
      else setLinkMsg(t("error"));
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
      {linkMsg && <p role="alert" className="mb-2 text-sm text-danger">{linkMsg}</p>}
      {appOnly && (
        <p className="mb-3 rounded-md bg-paper px-3 py-2 text-sm font-semibold text-primary" dir="auto">
          {t("appOnlyNotice")} · {" "}
          <Link href="/download" className="underline">{t("androidApp")}</Link>
        </p>
      )}
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
              {appOnly ? (
                <Link href="/download" className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-primary hover:bg-paper">
                  {t("androidApp")}
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busyId === g.id}
                    onClick={() => void openGuide(g, false)}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-deep disabled:opacity-50"
                  >
                    {t("guideOpen")}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === g.id}
                    onClick={() => void openGuide(g, true)}
                    className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-primary hover:bg-paper disabled:opacity-50"
                  >
                    {t("guideDownload")}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
