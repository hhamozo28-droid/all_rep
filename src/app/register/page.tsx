"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AdminLink from "@/components/AdminLink";
import { useI18n } from "@/lib/i18n";

export default function RegisterPage() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, language: locale }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = String(body?.error ?? "error");
        setError(code === "email-exists" ? t("emailExists") : code === "invalid-email" ? t("invalidEmail") : code === "password-min" ? t("passwordMin") : t("error"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("error"));
    } finally {
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
        {sent ? (
          <>
            <h1 className="text-xl font-bold text-ink" dir="auto">{t("registrationPending")}</h1>
            <p className="mt-2 text-sm leading-7 text-soft" dir="auto">{t("registrationPendingBody")}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-ink" dir="auto">{t("registerTitle")}</h1>
            <p className="mt-1 whitespace-pre-line text-sm text-soft" dir="auto">{t("registerBody")}</p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <label className="block text-sm font-medium text-ink">
                {t("email")}
                <input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2.5 outline-none focus:border-primary" />
              </label>
              <label className="block text-sm font-medium text-ink">
                {t("password")}
                <input type="password" dir="ltr" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2.5 outline-none focus:border-primary" />
              </label>
              {error && <p role="alert" className="text-sm text-danger">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60">
                {busy ? t("loading") : t("register")}
              </button>
            </form>
          </>
        )}
        <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-primary hover:underline">
          {t("login")}
        </Link>
      </section>
      <AdminLink className="mt-4 self-center" />
      <footer className="mt-6 text-center text-xs text-soft" dir="auto">
        {t("footerByline")}
      </footer>
    </main>
  );
}
