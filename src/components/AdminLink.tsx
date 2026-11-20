"use client";

import { useI18n } from "@/lib/i18n";
import { IconLock } from "./icons";

export default function AdminLink({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  // A document navigation always reads the current admin cookie, not a prefetched gate.
  return (
    <a href="/admin" className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 py-2 text-sm font-medium text-primary-deep hover:border-primary focus-visible:outline-2 focus-visible:outline-primary ${className}`}>
      <IconLock width={15} height={15} aria-hidden="true" />
      {t("adminTitle")}
    </a>
  );
}
