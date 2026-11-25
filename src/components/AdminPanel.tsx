"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ApiError, api, formatDate } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { CHUNK_SIZE, MAX_DIRECT_UPLOAD, MAX_GUIDE_FILE_BYTES, MAX_LESSON_FILE_BYTES } from "@/lib/uploadLimits";
import type { CatalogInfo } from "@/lib/seed";

interface Props {
  authorized: boolean;
  configured: boolean;
  showDemoHint: boolean;
  notice: string | null;
}

type Summary = { state: "loading" | "error" } | { state: "ready"; info: CatalogInfo };
type Published = { count: number; version: number; warnings: string[] };
type ProfileRow = {
  id: string;
  email: string;
  passwordHash: string;
  plainPassword: string | null;
  language: string;
  blocked: boolean;
  approved: boolean;
  downloads: number;
  downloadLimit: number | null;
  deletedAt: string | null;
  createdAt: string;
};

type AdminStats = {
  ok: boolean;
  total: number;
  totalAccounts: number;
  blockedCount: number;
  exhaustedCount: number;
  activeCount: number;
  topSpecialty: { code: string; name: string; downloads: number } | null;
  topAccount: { email: string; downloads: number } | null;
};

type AdminSettings = { theme: string; fontStyle: string; welcomeMessage: string };
type AdminLessonRow = {
  id: string;
  specialtyCode: string;
  path: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  downloads: number;
  uploadedAt: string;
};
type AdminGuideRow = {
  id: string;
  path: string;
  title: string;
  fileName: string;
  size: number;
  downloads: number;
  uploadedAt: string;
};

const buttonClass = "w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-deep disabled:opacity-50";
const fileErrors: Record<string, string> = {
  "bad-file": "badFile", "empty-file": "unreadable", unreadable: "unreadable",
  "file-too-big": "fileTooBig", "no-table": "noTable", "no-rows": "noRows",
  "catalog-unavailable": "adminPublishUnavailable",
};

/** Small centered modal used for every destructive admin action. */
function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-xs rounded-lg border border-line bg-white p-4 shadow-xl">
        <h3 id="confirm-title" className="text-sm font-bold text-ink">{title}</h3>
        <p className="mt-2 text-xs leading-6 text-soft">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
          >
            {t("adminDeleteCancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel({ authorized, configured, showDemoHint, notice }: Props) {
  const { t, locale } = useI18n();
  const n = (value: number) => new Intl.NumberFormat(locale).format(value);
  const input = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<Summary>({ state: "loading" });
  const [revision, setRevision] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const [published, setPublished] = useState<Published | null>(null);
  const [users, setUsers] = useState<ProfileRow[] | null>(null);
  const [usersError, setUsersError] = useState(false);
  const [guides, setGuides] = useState<AdminGuideRow[] | null>(null);
  const [guideFiles, setGuideFiles] = useState<File[]>([]);
  const [guideProgress, setGuideProgress] = useState(0);
  const [uploadKind, setUploadKind] = useState<"links" | "guide">("links");
  const [guideUploading, setGuideUploading] = useState(false);
  const [guideAdded, setGuideAdded] = useState(false);
  const [guideError, setGuideError] = useState("");
  const [guideDeleted, setGuideDeleted] = useState(false);
  const [guideDeleteTarget, setGuideDeleteTarget] = useState<string | null>(null);
  const [guideDeleteBusy, setGuideDeleteBusy] = useState(false);
  const [lessons, setLessons] = useState<AdminLessonRow[] | null>(null);
  const [lessonCodes, setLessonCodes] = useState<string[]>([]);
  const [lessonCode, setLessonCode] = useState("");
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [lessonUploading, setLessonUploading] = useState(false);
  const [lessonAdded, setLessonAdded] = useState(false);
  const [lessonError, setLessonError] = useState("");
  const [lessonDeleted, setLessonDeleted] = useState(false);
  const [lessonDeleteTarget, setLessonDeleteTarget] = useState<string | null>(null);
  const [lessonDeleteBusy, setLessonDeleteBusy] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [adminPwVisible, setAdminPwVisible] = useState(false);
  const [addError, setAddError] = useState("");
  const [added, setAdded] = useState(false);
  const [blockBusy, setBlockBusy] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ id: string; blocked: boolean } | null>(null);
  const [approveBusy, setApproveBusy] = useState<string | null>(null);
  const [approvedMsg, setApprovedMsg] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deletedMsg, setDeletedMsg] = useState(false);
  const [limitBusy, setLimitBusy] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<AdminSettings>({ theme: "default", fontStyle: "default", welcomeMessage: "" });
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [quotaAmount, setQuotaAmount] = useState(3);
  const [quotaBusy, setQuotaBusy] = useState(false);
  const [quotaMsg, setQuotaMsg] = useState("");
  const [resetQuotaBusy, setResetQuotaBusy] = useState(false);
  const [quotaUserBusy, setQuotaUserBusy] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  useEffect(() => {
    if (!authorized) return;
    api<AdminSettings>("/api/admin/settings", { cache: "no-store" })
      .then(setSettings)
      .catch(() => {});
    api<AdminStats>("/api/admin/stats", { cache: "no-store" })
      .then((res) => {
        if (res.ok) setStats(res);
      })
      .catch(() => {});
  }, [authorized]);

  const changeSetting = (field: keyof AdminSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    void api("/api/admin/settings", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ [field]: value }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (!authorized) return;
    if (new URL(location.href).searchParams.has("state")) {
      history.replaceState(history.state, "", "/admin");
    }
    const onRestore = (event: PageTransitionEvent) => { if (event.persisted) location.reload(); };
    window.addEventListener("pageshow", onRestore);
    return () => window.removeEventListener("pageshow", onRestore);
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    api<CatalogInfo>("/api/admin/check", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then((info) => {
        if (typeof info?.count !== "number") throw new Error("Catalog summary unavailable");
        if (active) setSummary({ state: "ready", info });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) location.replace("/admin?state=expired");
        else setSummary({ state: "error" });
      })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [authorized, revision]);

  function refreshSummary() {
    setSummary({ state: "loading" });
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    api<ProfileRow[]>("/api/admin/users", { cache: "no-store", credentials: "same-origin" })
      .then((rows) => { if (active) setUsers(rows); })
      .catch(() => { if (active) setUsersError(true); });
    return () => { active = false; };
  }, [authorized]);

  async function setBlocked(id: string, blocked: boolean) {
    setBlockBusy(id);
    try {
      await api("/api/admin/users/block", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ id, blocked }),
      });
      setUsers((rows) => rows?.map((row) => (row.id === id ? { ...row, blocked } : row)) ?? null);
    } catch {
      // keep the list as-is
    } finally {
      setBlockBusy(null);
    }
  }

  async function approveAccount(id: string) {
    setApproveBusy(id);
    setApprovedMsg(false);
    try {
      await api("/api/admin/accounts/approve", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ id }),
      });
      setUsers((rows) => rows?.map((row) => (row.id === id ? { ...row, approved: true } : row)) ?? null);
      setApprovedMsg(true);
    } catch {
      // keep the list as-is
    } finally {
      setApproveBusy(null);
    }
  }

  async function sendNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notifyMessage.trim() || notifyBusy) return;
    setNotifyBusy(true);
    setNotifySent(false);
    try {
      await api("/api/admin/notifications", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ message: notifyMessage.trim() }),
      });
      setNotifyMessage("");
      setNotifySent(true);
    } catch {
      // keep the message
    } finally {
      setNotifyBusy(false);
    }
  }

  async function increaseQuotaAll() {
    if (quotaBusy || quotaAmount <= 0) return;
    setQuotaBusy(true);
    setQuotaMsg("");
    try {
      const data = await api<{ ok: boolean; affected: number }>("/api/admin/accounts/quota", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ amount: quotaAmount }),
      });
      setQuotaMsg(`${t("quotaAdded")}: ${data.affected}`);
    } catch {
      setQuotaMsg(t("error"));
    } finally {
      setQuotaBusy(false);
    }
  }

  async function resetQuotaAll() {
    if (resetQuotaBusy) return;
    setResetQuotaBusy(true);
    setQuotaMsg("");
    try {
      const data = await api<{ ok: boolean; affected: number }>("/api/admin/accounts/quota-reset", {
        method: "POST",
        credentials: "same-origin",
      });
      setUsers((rows) => rows?.map((row) => ({ ...row, downloadLimit: 3 })) ?? null);
      setQuotaMsg(`${t("resetQuotaAll")}: ${data.affected}`);
    } catch {
      setQuotaMsg(t("error"));
    } finally {
      setResetQuotaBusy(false);
    }
  }

  async function increaseQuotaUser(id: string) {
    if (quotaUserBusy || quotaAmount <= 0) return;
    setQuotaUserBusy(id);
    try {
      await api("/api/admin/accounts/quota-user", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ id, amount: quotaAmount }),
      });
      setUsers((rows) => rows?.map((row) => (
        row.id === id && row.downloadLimit !== null
          ? { ...row, downloadLimit: row.downloadLimit + quotaAmount }
          : row
      )) ?? null);
    } catch {
      // keep the list as-is
    } finally {
      setQuotaUserBusy(null);
    }
  }

  async function sendBulkEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emailBusy || !emailSubject.trim() || !emailBody.trim()) return;
    setEmailBusy(true);
    setEmailMsg("");
    try {
      const data = await api<{ ok: boolean; count: number }>("/api/admin/email", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ subject: emailSubject, text: emailBody }),
      });
      setEmailMsg(`${t("emailSent")}: ${data.count}`);
      setEmailSubject("");
      setEmailBody("");
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.body?.error : null;
      setEmailMsg(code === "email-not-configured" ? t("emailNotConfigured") : t("error"));
    } finally {
      setEmailBusy(false);
    }
  }

  async function removeAccount(id: string) {
    setDeleteTarget(null);
    setDeleteBusy(true);
    setDeletedMsg(false);
    try {
      await api("/api/admin/users/delete", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ id }),
      });
      setUsers((rows) => rows?.filter((row) => row.id !== id) ?? null);
      setDeletedMsg(true);
    } catch {
      api<ProfileRow[]>("/api/admin/users", { cache: "no-store", credentials: "same-origin" })
        .then(setUsers)
        .catch(() => {});
    } finally {
      setDeleteBusy(false);
    }
  }

  async function refreshGuides() {
    try {
      const data = await api<{ ok: boolean; guides: AdminGuideRow[] }>("/api/admin/guides", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (data.ok) setGuides(data.guides);
    } catch {
      // keep the list as-is
    }
  }

  async function uploadGuide() {
    const files = guideFiles;
    if (files.length === 0 || guideUploading) return;
    setGuideUploading(true);
    setGuideProgress(0);
    setGuideError("");
    setGuideAdded(false);
    setGuideDeleted(false);
    const units = files.map((file) => Math.max(1, Math.ceil(file.size / CHUNK_SIZE)));
    const totalUnits = units.reduce((sum, value) => sum + value, 0);
    let doneUnits = 0;
    const bump = () => {
      doneUnits += 1;
      setGuideProgress(Math.round((doneUnits / totalUnits) * 100));
    };
    try {
      for (const selected of files) {
        if (selected.size <= MAX_DIRECT_UPLOAD) {
          const form = new FormData();
          form.set("file", selected);
          await api("/api/admin/guides/upload", {
            method: "POST",
            credentials: "same-origin",
            body: form,
          });
          bump();
        } else {
          // Big files go through small staging parts (< platform body limit),
          // then the server reassembles them and uploads to GitHub.
          const sessionId = crypto.randomUUID();
          for (let index = 0, offset = 0; offset < selected.size; offset += CHUNK_SIZE, index += 1) {
            const slice = selected.slice(offset, Math.min(offset + CHUNK_SIZE, selected.size));
            await api(`/api/admin/guides/upload/chunk?sessionId=${sessionId}&index=${index}`, {
              method: "POST",
              credentials: "same-origin",
              body: slice,
            });
            bump();
          }
          await api("/api/admin/guides/upload/complete", {
            method: "POST",
            credentials: "same-origin",
            body: JSON.stringify({ sessionId, fileName: selected.name, size: selected.size }),
          });
        }
      }
      setGuideFiles([]);
      setGuideProgress(100);
      setGuideAdded(true);
      void refreshGuides();
    } catch {
      setGuideError("error");
    } finally {
      setGuideUploading(false);
    }
  }

  async function deleteGuideRow(id: string) {
    setGuideDeleteBusy(true);
    setGuideDeleted(false);
    try {
      await api("/api/admin/guides/delete", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ id }),
      });
      void refreshGuides();
    } catch {
      // keep the list as-is
    } finally {
      setGuideDeleteBusy(false);
      setGuideDeleteTarget(null);
    }
  }

  async function refreshLessons() {
    try {
      const data = await api<{ ok: boolean; lessons: AdminLessonRow[] }>("/api/admin/lessons", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (data.ok) setLessons(data.lessons);
      const codes = await api<{ ok: boolean; codes: string[] }>("/api/admin/lessons/codes", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (codes.ok) setLessonCodes(codes.codes);
    } catch {
      // keep the list as-is
    }
  }

  async function uploadLessonFile() {
    const selected = lessonFile;
    if (!selected || !lessonCode || lessonUploading) return;
    setLessonUploading(true);
    setLessonError("");
    setLessonAdded(false);
    setLessonDeleted(false);
    try {
      if (selected.size <= MAX_DIRECT_UPLOAD) {
        const form = new FormData();
        form.set("file", selected);
        form.set("specialtyCode", lessonCode);
        await api("/api/admin/lessons/upload", {
          method: "POST",
          credentials: "same-origin",
          body: form,
        });
      } else {
        const sessionId = crypto.randomUUID();
        for (let index = 0, offset = 0; offset < selected.size; offset += CHUNK_SIZE, index += 1) {
          const slice = selected.slice(offset, Math.min(offset + CHUNK_SIZE, selected.size));
          await api(`/api/admin/lessons/upload/chunk?sessionId=${sessionId}&index=${index}`, {
            method: "POST",
            credentials: "same-origin",
            body: slice,
          });
        }
        await api("/api/admin/lessons/upload/complete", {
          method: "POST",
          credentials: "same-origin",
          body: JSON.stringify({
            sessionId,
            fileName: selected.name,
            specialtyCode: lessonCode,
          }),
        });
      }
      setLessonFile(null);
      setLessonAdded(true);
      void refreshLessons();
    } catch (error) {
      const code = error instanceof ApiError ? String(error.body?.error ?? "") : "";
      setLessonError(code === "file-too-big" ? "fileTooBig" : code === "bad-file" ? "badLessonFile" : "error");
    } finally {
      setLessonUploading(false);
    }
  }

  async function deleteLessonRow(id: string) {
    setLessonDeleteBusy(true);
    setLessonDeleted(false);
    try {
      await api("/api/admin/lessons/delete", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ id }),
      });
      setLessonDeleted(true);
      void refreshLessons();
    } catch {
      // keep the list as-is
    } finally {
      setLessonDeleteBusy(false);
      setLessonDeleteTarget(null);
    }
  }

  useEffect(() => {
    if (!authorized) return;
    void refreshGuides();
    void refreshLessons();
  }, [authorized]);

  async function setLimit(id: string, limit: number | null) {
    setLimitBusy(id);
    try {
      await api("/api/admin/accounts/limit", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ id, limit }),
      });
      setUsers((rows) => rows?.map((row) => (row.id === id ? { ...row, downloadLimit: limit } : row)) ?? null);
    } catch {
      // keep the list as-is
    } finally {
      setLimitBusy(null);
    }
  }

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addEmail.trim() || !addPassword) return;
    setAdded(false);
    setAddError("");
    try {
      await api("/api/admin/accounts/new", {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ email: addEmail.trim(), password: addPassword }),
      });
      setAddEmail("");
      setAddPassword("");
      setAdded(true);
      api<ProfileRow[]>("/api/admin/users", { cache: "no-store", credentials: "same-origin" })
        .then(setUsers)
        .catch(() => {});
    } catch (cause) {
      const body = cause instanceof ApiError ? cause.body : null;
      const key = body?.error === "email-exists" ? "emailExists"
        : body?.error === "invalid-email" ? "invalidEmail"
        : body?.error === "email-not-real" ? "emailNotReal"
        : body?.error === "password-min" ? "passwordMin"
        : "error";
      setAddError(t(key));
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || publishing) return;
    setPublishing(true);
    setErrorKey("");
    setPublished(null);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", credentials: "same-origin", body: data });
      if (response.status === 401) { location.replace("/admin?state=expired"); return; }
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setErrorKey(fileErrors[result?.error] || "error");
        return;
      }
      setPublished({ count: result.count, version: result.version, warnings: result.warnings || [] });
      setFile(null);
      if (input.current) input.current.value = "";
      refreshSummary();
    } catch {
      setErrorKey("error");
    } finally {
      setPublishing(false);
    }
  }

  const stat = (label: string, value: ReactNode): { label: string; value: ReactNode } => ({ label, value });
  const statItems: Array<{ label: string; value: ReactNode }> = stats
    ? [
        stat(t("adminStatsTotalAccounts"), <b className="font-semibold text-danger">{n(stats.totalAccounts)}</b>),
        stat(t("adminStatsBlocked"), <b className="font-semibold text-danger">{n(stats.blockedCount)}</b>),
        stat(t("adminStatsExhausted"), <b className="font-semibold text-danger">{n(stats.exhaustedCount)}</b>),
        stat(t("adminStatsActive"), <b className="font-semibold text-danger">{n(stats.activeCount)}</b>),
        stat(t("adminStatsTotal"), <b className="font-semibold text-danger">{n(stats.total)}</b>),
        ...(stats.topSpecialty
          ? [stat(
              t("adminStatsTopSpecialty"),
              <>
                {`${stats.topSpecialty.code} — ${stats.topSpecialty.name} (`}
                <b className="font-semibold text-danger">{n(stats.topSpecialty.downloads)}</b>
                {")"}
              </>,
            )]
          : []),
        ...(stats.topAccount
          ? [stat(
              t("adminStatsTopAccount"),
              <>
                {stats.topAccount.email}{" ("}
                <b className="font-semibold text-danger">{n(stats.topAccount.downloads)}</b>
                {")"}
              </>,
            )]
          : []),
      ]
    : [];

  const switchUploadKind = (kind: "links" | "guide") => {
    setUploadKind(kind);
    setPublished(null);
    setErrorKey("");
    setFile(null);
    setGuideFiles([]);
    setGuideProgress(0);
    setGuideError("");
    setGuideAdded(false);
    setGuideDeleted(false);
    setGuideDeleteTarget(null);
    setGuideUploading(false);
    setLessonFile(null);
    setLessonError("");
    setLessonAdded(false);
    setLessonDeleted(false);
    setLessonDeleteTarget(null);
    setLessonUploading(false);
  };

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">{t("adminTitle")}</h1>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="text-sm text-primary hover:underline">{t("home")}</Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <LanguageSwitcher compact />
          {authorized && (
            <form method="post" action="/api/admin/logout">
              <button type="submit" className="text-xs text-soft hover:text-ink">{t("logout")}</button>
            </form>
          )}
        </div>
      </header>

      {!authorized ? (
        <section className="rounded-lg border border-line bg-card p-5">
          <h2 className="mb-3 font-semibold text-ink">{t("appName")}</h2>
          <p className="mb-4 text-sm text-soft">{t("adminSignInHelp")}</p>
          <form method="post" action="/api/admin/login" className="space-y-3">
            <label htmlFor="admin-password" className="block text-sm font-medium text-ink">
              {t("adminPassword")}
              <span className="mt-1 block">
                <input id="admin-password" name="password" type={adminPwVisible ? "text" : "password"} dir="ltr" required
                  autoComplete="current-password" disabled={!configured}
                  aria-invalid={notice === "wrongPassword"} aria-describedby={notice ? "admin-notice" : undefined}
                  className="w-full rounded-md border border-line bg-white px-3 py-2.5 outline-none focus:border-primary" />
                <button type="button" onClick={() => setAdminPwVisible((v) => !v)}
                  aria-label={adminPwVisible ? t("hidePassword") : t("showPassword")} aria-pressed={adminPwVisible}
                  disabled={!configured}
                  className="mt-1.5 flex items-center gap-2 text-xs font-medium text-primary">
                  {adminPwVisible ? "\u{1F441}\u{1F6D1}" : "\u{1F441}"}
                  {adminPwVisible ? t("hidePassword") : t("showPassword")}
                </button>
              </span>
            </label>
            {notice && (
              <div id="admin-notice" role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
                {t(notice)}
                {notice === "adminCookieBlocked" && (
                  <a href="/admin" target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold underline">{t("openAdminTab")}</a>
                )}
              </div>
            )}
            <button type="submit" disabled={!configured}
              className="flex items-center gap-3 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-primary opacity-60 transition-colors hover:opacity-100 hover:bg-paper">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {t("unlock")}
            </button>
          </form>
          {showDemoHint && <p className="mt-3 text-xs text-soft">{t("adminHint")}</p>}
        </section>
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-card p-4" aria-label={t("adminUploadKindTitle")}>
            <h2 className="font-semibold text-ink">{t("adminUploadKindTitle")}</h2>
            <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                aria-pressed={uploadKind === "links"}
                onClick={() => switchUploadKind("links")}
                className={uploadKind === "links"
                  ? "rounded-md bg-primary px-4 py-2.5 font-semibold text-white"
                  : "rounded-md border border-line bg-card px-4 py-2.5 font-semibold text-primary hover:bg-paper"}
              >
                {t("adminUploadKindLinks")}
              </button>
              <button
                type="button"
                aria-pressed={uploadKind === "guide"}
                onClick={() => switchUploadKind("guide")}
                className={uploadKind === "guide"
                  ? "rounded-md bg-primary px-4 py-2.5 font-semibold text-white"
                  : "rounded-md border border-line bg-card px-4 py-2.5 font-semibold text-primary hover:bg-paper"}
              >
                {t("adminUploadKindGuide")}
              </button>

            </div>
          </section>

          {uploadKind === "links" && (
          <section className="rounded-lg border border-line bg-card p-4">
            <h2 className="font-semibold text-ink"><label htmlFor="word-file">{t("uploadFile")}</label></h2>
            <p id="upload-format" className="mt-1 text-sm text-soft">{t("uploadHint")}</p>
            <form onSubmit={publish}>
              <input ref={input} id="word-file" name="file" type="file" disabled={publishing} aria-describedby="upload-format"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const selected = event.target.files?.[0] || null;
                  const invalid = selected && (!selected.name.toLowerCase().endsWith(".docx") ? "badFile" : selected.size > 15 * 1024 * 1024 ? "fileTooBig" : "");
                  setErrorKey(invalid || ""); setPublished(null); setFile(invalid ? null : selected);
                }}
                className="mt-4 block w-full text-sm text-ink file:me-3 file:rounded-md file:border-0 file:bg-paper file:px-3 file:py-2 file:font-medium" />
              {errorKey && <p role="alert" className="mt-3 text-sm text-danger">{t(errorKey)}</p>}
              {published && (
                <div role="status" className="mt-3 text-sm text-success">
                  <p>{t("uploadSuccess")}</p>
                  {published.warnings.length > 0 && <details className="mt-2 text-soft"><summary>{t("uploadedWarn")}</summary><ul>{published.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details>}
                </div>
              )}
              <button type="submit" disabled={!file || publishing} className={`mt-4 ${buttonClass}`}>{publishing ? t("uploading") : t("upload")}</button>
            </form>
          </section>
          )}

          {uploadKind === "guide" && (
          <section className="rounded-lg border border-line bg-card p-4">
            <h2 className="font-semibold text-ink"><label htmlFor="guide-file">{t("adminGuidesSection")}</label></h2>
            <form onSubmit={(event) => { event.preventDefault(); void uploadGuide(); }} className="mt-3 flex items-center gap-2">
              <input id="guide-file" name="file" type="file" multiple accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required disabled={guideUploading}
                onChange={(event) => {
                  const picked = Array.from(event.target.files ?? []);
                  const invalid = picked.find((file) => !/\.(pdf|docx)$/i.test(file.name) || file.size > MAX_GUIDE_FILE_BYTES);
                  if (invalid) {
                    setGuideError(!/\.(pdf|docx)$/i.test(invalid.name) ? "badPdfFile" : "fileTooBig");
                    setGuideFiles([]);
                    return;
                  }
                  setGuideError("");
                  setGuideFiles(picked);
                }}
                className="block min-w-0 flex-1 text-sm text-ink file:me-3 file:rounded-md file:border-0 file:bg-paper file:px-3 file:py-2 file:font-medium" />
              <button type="submit" disabled={guideFiles.length === 0 || guideUploading} className={`shrink-0 ${buttonClass}`}>
                {guideUploading ? t("uploading") : t("upload")}
              </button>
            </form>
            {guideUploading && (
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-valuenow={guideProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-success transition-all duration-200"
                  style={{ width: `${guideProgress}%` }}
                />
              </div>
            )}
            {guideFiles.length > 0 && !guideUploading && (
              <p className="mt-2 text-xs text-soft">{guideFiles.length} {t("files")}</p>
            )}
            {guideError && <p role="alert" className="mt-2 text-sm text-danger">{t(guideError)}</p>}
            {guideAdded && !guideError && <p className="text-sm text-success">{t("uploadSuccess")}</p>}
            {guideDeleted && <p className="mt-2 text-sm text-success">{t("adminGuidesDeleted")}</p>}
            {guides === null ? (
              <p className="mt-3 text-sm text-soft">{t("loading")}</p>
            ) : guides.length === 0 ? (
              <p className="mt-3 text-sm text-soft">{t("adminGuidesNoFiles")}</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-right text-xs font-semibold text-soft">
                      <th className="py-2 pl-3 font-medium">{t("adminGuidesPath")}</th>
                      <th className="py-2 text-center font-medium">{t("name")}</th>
                      <th className="py-2 text-center font-medium">{t("size")}</th>
                      <th className="py-2 pl-3 font-medium">{t("adminTableActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guides.map((g) => (
                      <tr key={g.id} className="border-t border-line">
                        <td className="py-2 pl-3 text-ink" dir="ltr" title={g.path}>{g.path}</td>
                        <td className="py-2 text-center text-soft">{g.title}</td>
                        <td className="py-2 text-center text-soft">{n(g.size)}</td>
                        <td className="py-2 pl-3 text-end">
                          <button type="button" onClick={() => setGuideDeleteTarget(g.id)} disabled={guideDeleteBusy}
                            className="font-medium text-danger hover:underline disabled:opacity-50">
                            {t("adminGuidesDeleteOk")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {guideDeleteTarget && (
              <ConfirmDialog
                title={t("adminGuidesDeleteTitle")}
                body={t("adminGuidesDeleteConfirm")}
                confirmLabel={t("adminGuidesDeleteOk")}
                busy={guideDeleteBusy}
                onCancel={() => setGuideDeleteTarget(null)}
                onConfirm={() => void deleteGuideRow(guideDeleteTarget)}
              />
            )}
          </section>
          )}

          <section className="rounded-lg border border-line bg-card p-4">
            <details id="admin-settings">
              <summary className="cursor-pointer select-none font-semibold text-ink">{t("adminSettings")}</summary>
              {stats && statItems.length > 0 && (
                <p className="mt-3 text-sm text-soft">
                  {statItems.map((item, i) => (
                    <span key={i}>
                      {i > 0 ? " · " : null}
                      {item.label} {item.value}
                    </span>
                  ))}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="block text-sm font-medium text-ink">
                  {t("adminFontStyle")}
                  <select
                    value={settings.fontStyle}
                    onChange={(event) => changeSetting("fontStyle", event.target.value)}
                    aria-label={t("adminFontStyle")}
                    className="mt-1 w-auto rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-primary"
                  >
                    <option value="default">{t("fontStyleDefault")}</option>
                    <option value="compact">{t("fontStyleCompact")}</option>
                    <option value="large">{t("fontStyleLarge")}</option>
                    <option value="expanded">{t("fontStyleExpanded")}</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-ink">
                  {t("appTheme")}
                  <select
                    value={settings.theme}
                    onChange={(event) => changeSetting("theme", event.target.value)}
                    aria-label={t("appTheme")}
                    className="mt-1 w-auto rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-primary"
                  >
                    <option value="default">{t("themeDefault")}</option>
                    <option value="white-black">{t("themeWhiteBlack")}</option>
                    <option value="red-purple">{t("themeRedPurple")}</option>
                    <option value="brown-shiny">{t("themeBrownShiny")}</option>
                  </select>
                </label>
              </div>
              <label className="mt-3 block text-sm font-medium text-ink">
                {t("adminWelcomeLabel")}
                <textarea
                  value={settings.welcomeMessage}
                  maxLength={500}
                  placeholder={t("adminWelcomePlaceholder")}
                  onChange={(event) => changeSetting("welcomeMessage", event.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </label>

              <div className="mt-4 rounded-md border border-line bg-paper p-3">
                <label className="block text-sm font-medium text-ink">
                  {t("quotaAmount")}
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={quotaAmount}
                    onChange={(event) => setQuotaAmount(Math.max(1, Math.min(1000, Number(event.target.value) || 1)))}
                    className="mt-1 w-24 rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-primary"
                  />
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void increaseQuotaAll()}
                    disabled={quotaBusy}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {quotaBusy ? t("loading") : t("increaseQuotaAll")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetQuotaAll()}
                    disabled={resetQuotaBusy}
                    className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
                  >
                    {resetQuotaBusy ? t("loading") : t("resetQuotaAll")}
                  </button>
                </div>
                {quotaMsg && <p className="mt-2 text-sm text-success">{quotaMsg}</p>}
              </div>

              <form onSubmit={sendBulkEmail} className="mt-3 space-y-2">
                <h3 className="text-sm font-semibold text-ink">{t("emailBroadcast")}</h3>
                <label className="block text-sm font-medium text-ink">
                  {t("emailSubject")}
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block text-sm font-medium text-ink">
                  {t("emailBody")}
                  <textarea
                    rows={3}
                    required
                    value={emailBody}
                    onChange={(event) => setEmailBody(event.target.value)}
                    className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <button type="submit" disabled={emailBusy || !emailSubject.trim() || !emailBody.trim()} className={buttonClass}>
                  {emailBusy ? t("loading") : t("sendEmail")}
                </button>
                {emailMsg && <p className="text-sm text-soft">{emailMsg}</p>}
              </form>

              <form onSubmit={sendNotification} className="mt-3 space-y-2">
                <label className="block text-sm font-medium text-ink">
                  {t("sendNotification")}
                  <textarea
                    value={notifyMessage}
                    maxLength={500}
                    rows={2}
                    required
                    placeholder={t("notificationPlaceholder")}
                    onChange={(event) => setNotifyMessage(event.target.value)}
                    className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <button type="submit" disabled={notifyBusy || !notifyMessage.trim()} className={buttonClass}>
                  {notifyBusy ? t("loading") : t("sendNotification")}
                </button>
                {notifySent && <p className="text-sm text-success">✓</p>}
              </form>

              <form onSubmit={addAccount} className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-ink">
                    {t("email")}
                    <input
                      type="email"
                      dir="ltr"
                      required
                      value={addEmail}
                      onChange={(event) => setAddEmail(event.target.value)}
                      className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="block text-sm font-medium text-ink">
                    {t("password")}
                    <input
                      type="password"
                      dir="ltr"
                      minLength={6}
                      required
                      value={addPassword}
                      onChange={(event) => setAddPassword(event.target.value)}
                      className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
                {addError && <p role="alert" className="text-sm text-danger">{addError}</p>}
                {added && !addError && <p className="text-sm text-success">{t("adminAccountAdded")}</p>}
                <button type="submit" className={buttonClass}>{t("adminAddAccount")}</button>
              </form>

              {users === null ? (
                <p className="mt-3 text-sm text-soft">{t("loading")}</p>
              ) : usersError ? (
                <p className="mt-3 text-sm text-danger">{t("error")}</p>
              ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-right text-xs font-semibold text-soft">
                      <th className="py-2 pl-3 font-medium">{t("email")}</th>
                      <th className="py-2 pl-3 font-medium">{t("adminTablePassword")}</th>
                      <th className="py-2 text-center font-medium">{t("adminTableDownloads")}</th>
                      <th className="py-2 text-center font-medium">{t("adminLimit")}</th>
                      <th className="py-2 pl-3 font-medium">{t("adminTableActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((row) => (
                      <tr key={row.id} className="border-t border-line">
                        <td className="py-2 pl-3 text-ink">
                          {row.email}
                          {row.deletedAt && (
                            <span className="ms-2 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger">
                              {t("adminDeletedSelf")}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pl-3 font-mono text-xs text-soft" dir="ltr" title={row.passwordHash}>
                          {row.plainPassword ?? "—"}
                        </td>
                        <td className="py-2 text-center text-soft">{n(row.downloads)}</td>
                        <td className="py-2 text-center">
                          <select
                            value={row.downloadLimit ?? ""}
                            onChange={(event) => setLimit(row.id, event.target.value === "" ? null : Number(event.target.value))}
                            disabled={row.deletedAt !== null || limitBusy === row.id}
                            aria-label={t("adminLimit")}
                            className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-primary disabled:opacity-50"
                          >
                            <option value="">{t("adminLimitUnlimited")}</option>
                            <option value="3">{t("adminLimit3")}</option>
                            <option value="10">{t("adminLimit10")}</option>
                            <option value="20">{t("adminLimit20")}</option>
                            <option value="50">{t("adminLimit50")}</option>
                            <option value="150">{t("adminLimit150")}</option>
                          </select>
                        </td>
                        <td className="py-2 pl-3 text-end">
                          <div className="flex items-center justify-end gap-2">
                            {row.deletedAt === null && (
                              <button
                                type="button"
                                onClick={() => void increaseQuotaUser(row.id)}
                                disabled={quotaUserBusy === row.id}
                                className="font-semibold text-primary hover:underline disabled:opacity-50"
                              >
                                {t("increaseQuota")}
                              </button>
                            )}
                            {!row.approved && row.deletedAt === null && (
                              <button
                                type="button"
                                onClick={() => void approveAccount(row.id)}
                                disabled={approveBusy === row.id}
                                className="font-semibold text-success hover:underline disabled:opacity-50"
                              >
                                {t("approveAccount")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setBlockTarget({ id: row.id, blocked: !row.blocked })}
                              disabled={row.deletedAt !== null || blockBusy === row.id}
                              className="font-medium text-primary hover:underline disabled:opacity-50"
                            >
                              {row.blocked ? t("adminUnblock") : t("adminBlock")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row.id)}
                              disabled={deleteBusy}
                              className="font-medium text-danger hover:underline disabled:opacity-50"
                            >
                              {t("adminDelete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
              {approvedMsg && (
                <p className="mt-3 text-sm text-success">{t("approveAccount")} ✓</p>
              )}
              {deletedMsg && (
                <p className="mt-3 text-sm text-success">{t("adminDeleted")}</p>
              )}
              {deleteTarget && (
                <ConfirmDialog
                  title={t("adminDeleteTitle")}
                  body={t("adminDeleteConfirm")}
                  confirmLabel={t("adminDelete")}
                  busy={deleteBusy}
                  onCancel={() => setDeleteTarget(null)}
                  onConfirm={() => void removeAccount(deleteTarget)}
                />
              )}
              {blockTarget && (
                <ConfirmDialog
                  title={blockTarget.blocked ? t("adminBlock") : t("adminUnblock")}
                  body={blockTarget.blocked ? t("blockConfirm") : t("unblockConfirm")}
                  confirmLabel={blockTarget.blocked ? t("adminBlock") : t("adminUnblock")}
                  busy={blockBusy === blockTarget.id}
                  onCancel={() => setBlockTarget(null)}
                  onConfirm={() => {
                    const target = blockTarget;
                    setBlockTarget(null);
                    void setBlocked(target.id, target.blocked);
                  }}
                />
              )}
            </details>
          </section>
        </div>
      )}
    </main>
  );
}
