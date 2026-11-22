"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AdminLink from "@/components/AdminLink";
import { useI18n } from "@/lib/i18n";
import { ApiError, api, getDeviceId } from "@/lib/client";

export default function RegisterPage() {
  const router = useRouter();
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
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password, deviceId: getDeviceId(), language: locale }),
      });
      router.replace("/?welcome=1");
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) setError(t("emailExists"));
      else if (cause instanceof ApiError && cause.status === 400) setError(t("passwordMin"));
      else setError(t("error"));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-8">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-ink">{t("appName")}</Link>
        <LanguageSwitcher />
      </div>
      <section className="rounded-lg border border-line bg-white p-5">
        <h1 className="text-xl font-bold text-ink">{t("registerTitle")}</h1>
        <p className="mt-1 text-sm text-soft">{t("registerBody")}</p>
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
                autoComplete="new-password"
                minLength={6}
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
            className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? t("loading") : t("register")}
          </button>
        </form>
        <p className="mt-4 text-sm text-soft">
          {t("haveAccount")} {" "}
          <Link href="/login" className="font-semibold text-primary">{t("login")}</Link>
        </p>
      </section>
      <AdminLink className="mt-4 self-center" />
    </main>
  );
}
