"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type DownloadStatus = {
  downloads: number;
  downloadLimit: number | null;
  canDownload: boolean;
  remaining: number | null;
  refresh: () => Promise<void>;
};

const Context = createContext<DownloadStatus | null>(null);

export function useDownloadStatus(): DownloadStatus {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useDownloadStatus must be used inside DownloadStatusProvider");
  return ctx;
}

/**
 * Authoritative-enough view of the account's download budget. The initial
 * values come from the server-rendered user (via AppShell); refresh() pulls
 * the real state, so a limit set by the admin becomes effective when the
 * user returns to the page, clicks/focuses it, or the poll notices (30s).
 */
export default function DownloadStatusProvider({
  initial,
  children,
}: {
  initial: { downloads: number; downloadLimit: number | null };
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState(initial);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/downloads/status", { credentials: "same-origin" });
    if (!res.ok) return;
    const data = (await res.json()) as { downloads: number; downloadLimit: number | null };
    setStatus((prev) => ({ ...prev, downloads: data.downloads, downloadLimit: data.downloadLimit }));
  }, []);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    const interval = setInterval(refreshIfVisible, 30_000);
    return () => {
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      clearInterval(interval);
    };
  }, [refresh]);

  const { downloads, downloadLimit } = status;
  const canDownload = downloadLimit == null || downloads < downloadLimit;
  const remaining = downloadLimit == null ? null : Math.max(0, downloadLimit - downloads);
  const value: DownloadStatus = { downloads, downloadLimit, canDownload, remaining, refresh };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
