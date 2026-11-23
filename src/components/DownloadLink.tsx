"use client";

import { useState, type MouseEvent } from "react";
import { useDownloadStatus } from "@/components/DownloadStatusProvider";
import { IconDownload } from "@/components/icons";

type Props = {
  href: string;
  label: string;
  specialtyId?: string;
  className?: string;
};

export default function DownloadLink({ href, label, specialtyId, className = "" }: Props) {
  const { canDownload, refresh } = useDownloadStatus();
  const [busy, setBusy] = useState(false);

  async function open(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!canDownload || busy) return;
    setBusy(true);
    const tab = window.open("", "_blank");
    if (!tab) {
      setBusy(false);
      return;
    }
    try {
      tab.opener = null;
    } catch {
      /* ignore */
    }
    let ok = false;
    try {
      const res = await fetch("/api/specialties/track", {
        method: "POST",
        credentials: "same-origin",
        body: specialtyId ? JSON.stringify({ specialtyId }) : undefined,
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (ok) tab.location.assign(href);
    else tab.close();
    setBusy(false);
    if (ok) await refresh();
  }

  const shared = busy ? `opacity-60 ${className}` : className;
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
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={open} className={`hover:underline ${shared}`}>
      <IconDownload className="mr-1 inline h-3 w-3 align-[-1px]" />
      {label}
    </a>
  );
}
