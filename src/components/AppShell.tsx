"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import AdminLink from "./AdminLink";
import IdleLogout from "./IdleLogout";
import LoginDialog from "./LoginDialog";
import { isLocale, useI18n, type Locale } from "@/lib/i18n";
import { IconHome, IconLogout, IconMail, IconTrash, IconX } from "./icons";
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
  const [updateReady, setUpdateReady] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; read: boolean; createdAt: string }[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [popupNotification, setPopupNotification] = useState<{ id: string; message: string } | null>(null);
  const [dismissedNotification, setDismissedNotification] = useState<string | null>(null);
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

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch { /* offline */ }
  }, []);

  useEffect(() => {
    if (user) void loadNotifications();
  }, [user, loadNotifications]);

  useEffect(() => {
    const first = notifications.find((item) => !item.read);
    if (first && first.id !== dismissedNotification) {
      setPopupNotification({ id: first.id, message: first.message });
    }
  }, [notifications, dismissedNotification]);

  const closeNotificationPopup = () => {
    if (!popupNotification) return;
    setDismissedNotification(popupNotification.id);
    setPopupNotification(null);
    void markNotificationsRead();
  };

  const markNotificationsRead = async () => {
    try {
      await fetch("/api/notifications/read", { method: "POST", credentials: "same-origin" });
      await loadNotifications();
    } catch { /* offline */ }
  };

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      }).catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
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
        <div className="mx-auto flex max-w-2xl flex-wrap items-start justify-between gap-3 px-4 py-3">
          <div className="flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.push("/")} aria-label={t("home")} title={t("home")} className="rounded-md border border-line p-1.5 text-primary">
                <IconHome width={16} height={16} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => router.push("/")} className="text-start">
                <span className="block text-lg font-bold text-ink">{t("appName")}</span>
                <span className="block text-xs text-soft">{t("appTagline")}</span>
              </button>
            </div>
            {!user && <AdminLink compact className="mt-0.5" />}
          </div>
          <div className="flex flex-nowrap items-center justify-end gap-1">
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((v) => !v)}
                  aria-label={t("notifications")}
                  className="relative inline-flex items-center rounded-md border border-line px-2 py-1.5 text-xs text-ink"
                >
                  <IconMail width={13} height={13} aria-hidden="true" />
                  {notifications.some((n) => !n.read) && (
                    <span className="absolute -end-1 -top-1 rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                      {notifications.filter((n) => !n.read).length}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute end-0 top-full z-50 mt-2 w-72 rounded-lg border border-line bg-white p-3 shadow-lg">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{t("notifications")}</span>
                      <button
                        type="button"
                        onClick={() => void markNotificationsRead()}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t("markAllRead")}
                      </button>
                    </div>
                    <div className="mt-2 max-h-60 space-y-2 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-soft">{t("noNotifications")}</p>
                      ) : notifications.map((item) => (
                        <div key={item.id} className={`rounded-md border p-2 text-xs ${item.read ? "border-line text-soft" : "border-primary bg-primary-soft text-ink"}`}>
                          {item.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {user && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                aria-label={t("deleteAccount")}
                className="inline-flex items-center gap-1 rounded-md border border-danger px-2 py-1.5 text-xs font-semibold text-danger"
              >
                <IconTrash width={13} height={13} aria-hidden="true" />
                <span className="hidden sm:inline">{t("deleteAccount")}</span>
              </button>
            )}
            <LanguageSwitcher compact onLocalChange={changeLanguage} />
            {installPrompt && (
              <button
                type="button"
                onClick={async () => {
                  await installPrompt.prompt();
                  setInstallPrompt(null);
                }}
                className="rounded-md border border-line px-2 py-1.5 text-xs text-ink"
              >
                {t("install")}
              </button>
            )}
            {user && (
              <button
                type="button"
                onClick={() => void logout()}
                aria-label={t("logout")}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1.5 text-xs text-ink"
              >
                <IconLogout width={13} height={13} aria-hidden="true" />
                <span className="hidden sm:inline">{t("logout")}</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-5">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-4 text-center text-xs text-soft" dir="auto">
        <div className="mb-1 flex flex-wrap items-center justify-center gap-2">
          <Link href="/download" className="hover:text-ink hover:underline">
            {t("androidApp")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" className="hover:text-ink hover:underline">
            {t("privacyPolicy")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/delete-account" className="hover:text-ink hover:underline">
            {t("deleteAccount")}
          </Link>
        </div>
        <div>{t("footerByline")}</div>
      </footer>
      {updateReady && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border border-line bg-white p-4 shadow-lg" role="status">
          <p className="text-sm font-semibold text-ink">{t("newVersionAvailable")}</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUpdateReady(false)}
              className="rounded-md border border-line px-3 py-2 text-sm text-ink"
            >
              {t("adminDeleteCancel")}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              {t("reload")}
            </button>
          </div>
        </div>
      )}
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
      {popupNotification && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="alertdialog" aria-modal="true" aria-labelledby="notification-popup-title">
          <div className="w-full max-w-xs rounded-lg border border-line bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h2 id="notification-popup-title" className="text-sm font-bold text-ink">{t("notifications")}</h2>
              <button
                type="button"
                onClick={closeNotificationPopup}
                aria-label={t("close")}
                className="rounded-md p-1 text-soft hover:bg-paper hover:text-ink"
              >
                <IconX width={14} height={14} aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-7 text-ink">{popupNotification.message}</p>
            <button
              type="button"
              onClick={closeNotificationPopup}
              className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
    </DownloadStatusProvider>
  );
}
