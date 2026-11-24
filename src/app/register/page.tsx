"use client";

import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AdminLink from "@/components/AdminLink";
import { useI18n } from "@/lib/i18n";

export default function RegisterPage() {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-8">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-ink">{t("appName")}</Link>
        <LanguageSwitcher />
      </div>
      <section className="rounded-lg border border-line bg-white p-5">
        <h1 className="text-xl font-bold text-ink" dir="auto">{t("registrationClosed")}</h1>
        <p className="mt-2 text-sm leading-7 text-soft" dir="auto">
          {t("registrationClosedBody")}
        </p>
        <p className="mt-3 text-sm font-semibold text-primary" dir="auto">
          {t("contactAdmin")}
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-deep"
        >
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
