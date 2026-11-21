"use client";

import { useRouter } from "next/navigation";
import type { SpecialtyItem } from "@/types/specialty";
import { useI18n } from "@/lib/i18n";
import { badgeStyle, cardStyle, iconLetter, linkStyle } from "@/lib/tint";
import { specialtyName } from "@/lib/specialtyNames";

function track() {
  void fetch("/api/specialties/track", { method: "POST", credentials: "same-origin" });
}

export default function SpecialtyCard({ item }: { item: SpecialtyItem }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [sheetsLink, notesLink] = item.links;

  return (
    <div
      className="h-[5cm] w-full overflow-hidden rounded-lg border border-line p-1.5 text-start sm:h-[4cm] sm:w-[4cm]"
      style={cardStyle(item.code)}
    >
      <button
        type="button"
        onClick={() => router.push(`/specialty/${item.id}`)}
        className="block w-full text-start"
      >
        <span dir="ltr" className="block truncate text-[11px] font-mono font-semibold text-primary-deep">
          {item.code}
        </span>
        <h2 className="mt-1 flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold"
            style={badgeStyle(item.code)}
          >
            {iconLetter(item.code)}
          </span>
          <span className="min-w-0 flex-1 line-clamp-2">{specialtyName(item, locale)}</span>
        </h2>
      </button>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {sheetsLink && (
          <a
            href={sheetsLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={track}
            className="text-[12px] font-medium hover:underline"
            style={linkStyle(item.code)}
          >
            {t("linkSheets")}
          </a>
        )}
        {notesLink && (
          <a
            href={notesLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={track}
            className="text-[12px] font-medium hover:underline"
            style={linkStyle(item.code)}
          >
            {t("linkNotes")}
          </a>
        )}
      </div>
    </div>
  );
}
