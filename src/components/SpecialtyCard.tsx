"use client";

import { useRouter } from "next/navigation";
import type { SpecialtyItem } from "@/types/specialty";
import { useI18n } from "@/lib/i18n";

const linkClass =
  "inline-block border-b-2 border-dashed border-primary font-medium text-primary hover:text-primary-deep";

export default function SpecialtyCard({ item }: { item: SpecialtyItem }) {
  const router = useRouter();
  const { t } = useI18n();
  const [sheetsLink, notesLink] = item.links;

  return (
    <div className="w-full rounded-lg border border-line bg-white p-4 text-start hover:border-primary">
      <button
        type="button"
        onClick={() => router.push(`/specialty/${item.id}`)}
        className="w-full text-start"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span dir="ltr" className="font-mono text-sm font-semibold text-primary-deep">
            {item.code}
          </span>
        </div>
        <h2 className="mt-1 text-base font-semibold text-ink">{item.name}</h2>
      </button>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {sheetsLink && (
          <a
            href={sheetsLink}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {t("linkSheets")}
          </a>
        )}
        {notesLink && (
          <a
            href={notesLink}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {t("linkNotes")}
          </a>
        )}
      </div>
    </div>
  );
}
