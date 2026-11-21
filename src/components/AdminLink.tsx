"use client";

import { useI18n } from "@/lib/i18n";
import { IconLock } from "./icons";

export default function AdminLink({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useI18n();
  // A document navigation always reads the current admin cookie, not a prefetched gate.
  return (
    <a href="/admin" className={`inline-flex items-center justify-center gap-1.5 rounded-md border focus-visible:outline-2 focus-visible:outline-primary ${className} ${compact ? "min-h-6 bg-transparent px-2 py-1 text-[10px] font-normal text-primary-deep/70 hover:border-primary hover:text-primary-deep" : "min-h-10 bg-primary-soft px-3 py-2 text-sm font-medium text-primary-deep hover:border-primary"}`}>
      <IconLock width={compact ? 11 : 15} height={compact ? 11 : 15} aria-hidden="true" />
      {t("adminTitle")}
    </a>
  );
}
