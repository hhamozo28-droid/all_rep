"use client";

import { useState, type MouseEvent } from "react";
import { useDownloadStatus } from "@/components/DownloadStatusProvider";

/**
 * A gated download link. When the account has reached its admin-set limit,
 * the anchor is non-clickable and the parent shows the
 * "download limited by admin" message. When allowed, clicking tracks one
 * download first (atomic on the server) and only then opens the tab; the
 * server may have reached the limit in the meantime, in which case nothing
 * opens and the links disable themselves.
 */
export default function DownloadLink({
  href,
  label,
  className = "",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const { canDownload, refresh } = useDownloadStatus();
  const [busy, setBusy] = useState(false);

  async function open(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!canDownload || busy) return;
    setBusy(true);
    // Open synchronously in the user gesture; "noopener" makes window.open
    // return null, so sever the opener after instead.
    const tab = window.open("", "_blank");
    if (!tab) {
      setBusy(false);
      return;
    }
    try {
      tab.opener = null;
    } catch {
      /* ignore when the target is not writable */
    }
    let ok = false;
    try {
      const res = await fetch("/api/specialties/track", { method: "POST", credentials: "same-origin" });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (ok) tab.location.assign(href);
    else tab.close();
    setBusy(false);
    if (ok) await refresh(); // a hit at the limit now disables the links immediately
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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={open}
      className={`hover:underline ${shared}`}
    >
      {label}
    </a>
  );
}
