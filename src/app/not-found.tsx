"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-ink">{t("pageNotFound")}</h1>
      <p className="mt-2 text-sm text-soft">{t("pageNotFoundBody")}</p>
      <Link href="/" className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
        {t("home")}
      </Link>
    </main>
  );
}
