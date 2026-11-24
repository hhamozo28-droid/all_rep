"use client";

import { useState, type MouseEvent } from "react";
import { useDownloadStatus } from "@/components/DownloadStatusProvider";
import { ApiError, api } from "@/lib/client";
import { IconDownload } from "@/components/icons";
import { useI18n } from "@/lib/i18n";

type Props = {
  specialtyId: string;
  linkIndex: number;
  label: string;
  className?: string;
};

type GrantResponse = { url: string };

export default function DownloadLink({ specialtyId, linkIndex, label, className = "" }: Props) {
  const { t } = useI18n();
  const { canDownload, refresh } = useDownloadStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!canDownload || busy) return;
    setBusy(true);
    setError("");
    const tab = window.open("", "_blank");
    if (tab) {
      try {
        tab.opener = null;
      } catch {
        /* ignore */
      }
    }
    try {
      const grant = await api<GrantResponse>("/api/specialties/track", {
        method: "POST",
        body: JSON.stringify({ specialtyId, linkIndex }),
      });
      if (tab) tab.location.assign(grant.url);
      else window.location.assign(grant.url);
      await refresh();
    } catch (cause) {
      tab?.close();
      if (cause instanceof ApiError && cause.status === 403) setError(t("downloadLimitMessage"));
      else if (cause instanceof ApiError && cause.status === 410) setError(t("linkUsed"));
      else setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  const shared = busy ? `opacity-60 ${className}` : className;

  if (error) {
    return (
      <span role="alert" className={`text-[10px] font-semibold text-danger ${className}`}>
        {error}
      </span>
    );
  }

  if (!canDownload) {
    return (
      <a
        role="button"
        aria-disabled="true"
        tabIndex={-1}
        className={`cursor-not-allowed text-black opacity-70 ${shared}`}
      >
        {label}
      </a>
    );
  }

  return (
    <a href="#" onClick={open} className={`hover:underline ${shared}`}>
      <IconDownload className="mr-1 inline h-3 w-3 align-[-1px]" />
      {label}
    </a>
  );
}
