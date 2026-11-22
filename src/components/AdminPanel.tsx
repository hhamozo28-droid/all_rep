"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ApiError, api, formatDate } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
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
  downloads: number;
  downloadLimit: number | null;
  createdAt: string;
};
const buttonClass = "w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-deep disabled:opacity-50";
const fileErrors: Record<string, string> = {
  "bad-file": "badFile", "empty-file": "unreadable", unreadable: "unreadable",
  "file-too-big": "fileTooBig", "no-table": "noTable", "no-rows": "noRows",
  "catalog-unavailable": "adminPublishUnavailable",
};

export default function AdminPanel({ authorized, configured, showDemoHint, notice }: Props) {
  const { t, locale } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<Summary>({ state: "loading" });
  const [revision, setRevision] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const [published, setPublished] = useState<Published | null>(null);
  const [users, setUsers] = useState<ProfileRow[] | null>(null);
  const [usersError, setUsersError] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addError, setAddError] = useState("");
  const [added, setAdded] = useState(false);
  const [blockBusy, setBlockBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deletedMsg, setDeletedMsg] = useState(false);
  const [limitBusy, setLimitBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authorized) return;
    if (new URL(location.href).searchParams.has("state")) {
      history.replaceState(history.state, "", "/admin");
    }
    // Revalidate server-side permissions when restoring a page from browser history.
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
      // refresh the list from the server to show the true state
      api<ProfileRow[]>("/api/admin/users", { cache: "no-store", credentials: "same-origin" })
        .then(setUsers)
        .catch(() => {});
    } finally {
      setDeleteBusy(false);
    }
  }

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

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">{t("adminTitle")}</h1>
          <Link href="/" className="text-sm text-primary hover:underline">{t("home")}</Link>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {authorized && (
            <form method="post" action="/api/admin/logout">
              <button type="submit" className="text-sm text-soft hover:text-ink">{t("logout")}</button>
            </form>
          )}
        </div>
      </header>

      {!authorized ? (
        <section className="rounded-lg border border-line bg-card p-5">
          <p className="mb-4 text-sm text-soft">{t("adminSignInHelp")}</p>
          <form method="post" action="/api/admin/login" className="space-y-3">
            <label htmlFor="admin-password" className="block text-sm font-medium text-ink">
              {t("adminPassword")}
              <input id="admin-password" name="password" type="password" dir="ltr" required
                autoComplete="current-password" disabled={!configured}
                aria-invalid={notice === "wrongPassword"} aria-describedby={notice ? "admin-notice" : undefined}
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2.5 outline-none focus:border-primary" />
            </label>
            {notice && (
              <div id="admin-notice" role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
                {t(notice)}
                {notice === "adminCookieBlocked" && (
                  <a href="/admin" target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold underline">{t("openAdminTab")}</a>
                )}
              </div>
            )}
            <button type="submit" disabled={!configured} className={buttonClass}>{t("unlock")}</button>
          </form>
          {showDemoHint && <p className="mt-3 text-xs text-soft">{t("adminHint")}</p>}
        </section>
      ) : (
        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-card p-4" aria-labelledby="catalog-heading">
            <h2 id="catalog-heading" className="font-semibold text-ink">{t("currentCatalog")}</h2>
            <div aria-live="polite" className="mt-2 text-sm text-soft">
              {summary.state === "loading" && <p>{t("loading")}</p>}
              {summary.state === "error" && (
                <><p>{t("adminCatalogUnavailable")}</p><button type="button" onClick={refreshSummary} className="mt-2 font-medium text-primary underline">{t("retry")}</button></>
              )}
              {summary.state === "ready" && (
                <>
                  <p>{new Intl.NumberFormat(locale).format(summary.info.count)} {t("specialties")} · {t("version")} {summary.info.version}</p>
                  {summary.info.publishedAt && <p className="mt-1 text-xs">{t("published")}: {formatDate(summary.info.publishedAt, locale)}</p>}
                </>
              )}
            </div>
          </section>
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
          <section className="rounded-lg border border-line bg-card p-4">
            <h2 className="font-semibold text-ink">{t("adminAccounts")}</h2>
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
                        <td className="py-2 pl-3 text-ink">{row.email}</td>
                        <td className="py-2 pl-3 font-mono text-xs text-soft" dir="ltr" title={row.passwordHash}>
                          {row.plainPassword ?? "—"}
                        </td>
                        <td className="py-2 text-center text-soft">{new Intl.NumberFormat(locale).format(row.downloads)}</td>
                        <td className="py-2 text-center">
                          <select
                            value={row.downloadLimit ?? ""}
                            onChange={(event) => setLimit(row.id, event.target.value === "" ? null : Number(event.target.value))}
                            disabled={limitBusy === row.id}
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
                            <button
                              type="button"
                              onClick={() => setBlocked(row.id, !row.blocked)}
                              disabled={blockBusy === row.id}
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
            {deletedMsg && (
              <p className="mt-3 text-sm text-success">{t("adminDeleted")}</p>
            )}
            {deleteTarget && (
              <div className="mt-3 rounded-lg border border-line bg-card p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-body">
                <h3 id="delete-account-title" className="font-semibold text-ink">{t("adminDeleteTitle")}</h3>
                <p id="delete-account-body" className="mt-2 text-sm text-ink">{t("adminDeleteConfirm")}</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
                  >
                    {t("adminDeleteCancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAccount(deleteTarget)}
                    disabled={deleteBusy}
                    className="rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t("adminDelete")}
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={addAccount} className="mt-4 space-y-3">
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
          </section>
        </div>
      )}
    </main>
  );
}
