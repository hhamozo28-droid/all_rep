"use client";

import { useEffect, useState } from "react";

/** Mirrors the APP_ONLY_DOWNLOADS flag exposed on <html> by the root layout. */
export function useAppOnlyDownloads(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(document.documentElement.dataset.appOnly === "1");
  }, []);
  return enabled;
}
