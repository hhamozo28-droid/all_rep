"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "dl_fresh_login";

/**
 * Dialog shown right after a successful login: "عدد التحميلات المتاحة"
 * (available downloads, from the /api/downloads/status endpoint).
 */
export default function LoginDialog() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<string>("");

  useEffect(() => {
    if (!sessionStorage.getItem(STORAGE_KEY)) return;
    sessionStorage.removeItem(STORAGE_KEY);
    let cancelled = false;
    fetch("/api/downloads/status", { credentials: "same-origin" })
      .then((res) => res.json().catch(() => null))
      .then((data) => {
        if (cancelled) return;
        if (!data || data.reason) return;
        const { downloads, downloadLimit } = data;
        setAvailable(
          downloadLimit == null ? t("unlimited") : String(Math.max(0, downloadLimit - downloads)),
        );
        setOpen(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
    >
      <div className="w-72 rounded-lg border border-line bg-card p-5 text-center text-sm shadow-lg">
        <p id="login-dialog-title" className="text-base font-semibold text-ink">
          {t("downloadsAvailable")}
        </p>
        <p className="mt-2 text-2xl font-bold text-primary" dir="ltr">
          {available}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 rounded-md bg-primary px-5 py-2 font-semibold text-white hover:bg-primary-deep"
        >
          {t("dialogOk")}
        </button>
      </div>
    </div>
  );
}
