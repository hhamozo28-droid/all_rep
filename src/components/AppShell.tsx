"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import AdminLink from "./AdminLink";
import IdleLogout from "./IdleLogout";
import LoginDialog from "./LoginDialog";
import { isLocale, useI18n, type Locale } from "@/lib/i18n";
import DownloadStatusProvider from "./DownloadStatusProvider";

interface Props {
  children: ReactNode;
  user?: { email: string; language: string; downloads?: number; downloadLimit?: number | null } | null;
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function AppShell({ children, user }: Props) {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const syncedLanguage = useRef<string | null>(null);

  useEffect(() => {
    if (
      user &&
      isLocale(user.language) &&
      user.language !== locale &&
      syncedLanguage.current !== user.language
    ) {
      syncedLanguage.current = user.language;
      setLocale(user.language);
    }
  }, [user, locale, setLocale]);

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  const changeLanguage = (next: Locale) => {
    setLocale(next);
    if (user) {
      fetch("/api/auth/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: next }),
      }).catch(() => {});
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/");
  };

  const deleteAccount = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/auth/delete", { method: "POST", credentials: "same-origin" });
      if (!res.ok) throw new Error("delete failed");
      router.replace("/login");
    } catch {
      setDeleteBusy(false);
    }
  };

  return (
    <DownloadStatusProvider
      initial={{ downloads: user?.downloads ?? 0, downloadLimit: user?.downloadLimit ?? null }}
    >
    <div className="min-h-dvh">
      <IdleLogout />
      <LoginDialog />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col items-start gap-0.5">
            <button type="button" onClick={() => router.push("/")} className="text-start">
              <span className="block text-lg font-bold text-ink">{t("appName")}</span>
              <span className="block text-xs text-soft">{t("appTagline")}</span>
            </button>
            <AdminLink compact className="mt-0.5" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher onLocalChange={changeLanguage} />
            {installPrompt && (
              <button
                type="button"
                onClick={async () => {
                  await installPrompt.prompt();
                  setInstallPrompt(null);
                }}
                className="rounded-md border border-line px-3 py-2 text-sm text-ink"
              >
                {t("install")}
              </button>
            )}
            {user && (
              <>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-md border border-line px-3 py-2 text-sm text-ink"
                >
                  {t("logout")}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="rounded-md border border-danger px-3 py-2 text-sm text-danger"
                >
                  {t("deleteAccount")}
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-5">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-4 text-center text-xs text-soft" dir="auto">
        <Link href="/privacy" className="mb-1 inline-block hover:text-ink hover:underline">
          {t("privacyPolicy")}
        </Link>
        <div>{t("footerByline")}</div>
      </footer>
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="w-full max-w-sm rounded-lg border border-line bg-white p-5">
            <h2 id="delete-account-title" className="text-lg font-bold text-ink">{t("deleteAccount")}</h2>
            <p className="mt-2 text-sm text-soft">{t("deleteAccountConfirm")}</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteBusy}
                className="rounded-md border border-line px-3 py-2 text-sm text-ink disabled:opacity-50"
              >
                {t("adminDeleteCancel")}
              </button>
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={deleteBusy}
                className="rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleteBusy ? t("loading") : t("deleteAccount")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DownloadStatusProvider>
  );
}
