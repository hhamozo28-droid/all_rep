"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AdminLink from "@/components/AdminLink";
import { useI18n } from "@/lib/i18n";
import { ApiError, api, getDeviceId } from "@/lib/client";
import { IconDot } from "@/components/icons";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password, deviceId: getDeviceId(), language: locale }),
      });
      sessionStorage.setItem("dl_fresh_login", "1");
      router.replace("/");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401 && cause.body?.error === "account-deleted") {
        setError(t("accountDeleted"));
      } else if (cause instanceof ApiError && cause.status === 401 && cause.body?.error === "blocked") {
        setError(t("blocked"));
      } else if (cause instanceof ApiError && cause.status === 401 && cause.body?.error === "pending-approval") {
        setError(t("pendingApproval"));
      } else {
        setError(cause instanceof ApiError && cause.status === 401 ? t("wrongCredentials") : t("error"));
      }
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-8">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-ink">{t("appName")}</Link>
        <LanguageSwitcher />
      </div>

      {params.get("kicked") === "1" && (
        <p className="mb-3 rounded-md bg-danger-soft p-3 text-sm text-danger">{t("kicked")}</p>
      )}
      {params.get("idle") === "1" && (
        <p className="mb-3 rounded-md bg-accent-soft p-3 text-sm text-ink" role="status">{t("idleLoggedOut")}</p>
      )}

      <section className="relative rounded-lg border border-line bg-white p-5">
        <h1 className="text-xl font-bold text-ink">{t("loginTitle")}</h1>
        <p className="mt-1 whitespace-pre-line text-sm text-soft">{t("loginBody")}</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-ink">
            {t("email")}
            <input
              type="email"
              dir="ltr"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2.5 outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            {t("password")}
            <span className="mt-1 block">
              <input
                type={passwordVisible ? "text" : "password"}
                dir="ltr"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-line bg-white px-3 py-2.5 outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((v) => !v)}
                aria-label={passwordVisible ? t("hidePassword") : t("showPassword")}
                aria-pressed={passwordVisible}
                className="mt-1.5 flex items-center gap-2 text-xs font-medium text-primary"
              >
                {passwordVisible ? "\u{1F441}\u{1F6D1}" : "\u{1F441}"}
                {passwordVisible ? t("hidePassword") : t("showPassword")}
              </button>
            </span>
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-deep disabled:opacity-60"
          >
            {busy ? t("loading") : t("login")}
          </button>
        </form>
        <span
          aria-hidden="true"
          className="absolute -end-3 top-1/2 -translate-y-1/2 pointer-events-none text-black opacity-[0.12]"
        >
          <IconDot className="h-8 w-8" />
        </span>
        <p className="mt-4 text-sm text-soft" dir="auto">
          {t("noAccount")} {" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">{t("register")}</Link>
        </p>
      </section>
      <AdminLink className="mt-4 self-center" />
      <footer className="mt-6 text-center text-xs text-soft" dir="auto">
        <div className="mb-2 rounded-md bg-primary-soft px-3 py-2 text-xs font-bold text-primary-deep">
          {t("appPrompt")} {" "}
          <Link href="/download" className="underline">
            {t("downloadApp")}
          </Link>
        </div>
        <div className="mb-1 flex flex-wrap items-center justify-center gap-2">
          <Link href="/privacy" className="font-semibold text-primary hover:underline">
            {t("privacyPolicy")}
          </Link>
        </div>
        <div>{t("footerByline")}</div>
      </footer>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
