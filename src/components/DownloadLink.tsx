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
    const tab = window.open("", "_blank", "noopener noreferrer"); // synchronous: popup allowed
    let ok = false;
    try {
      const res = await fetch("/api/specialties/track", { method: "POST", credentials: "same-origin" });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (ok && tab) tab.location.href = href;
    else if (tab) tab.close();
    setBusy(false);
    if (ok) await refresh(); // if the limit was hit, this disables the links immediately
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
