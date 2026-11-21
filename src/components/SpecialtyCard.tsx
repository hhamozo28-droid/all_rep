"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { SpecialtyItem } from "@/types/specialty";
import { useI18n } from "@/lib/i18n";

function track() {
  void fetch("/api/specialties/track", { method: "POST", credentials: "same-origin" });
}

/** A stable, readable tint per specialty code — each displayed specialty gets its own background. */
function cardStyle(code: string): CSSProperties {
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  const hue = (hash % 360 + 360) % 360;
  const saturation = 30 + (hash % 40); // 30–69%
  const lightness = 95 + (hash % 3); // 95–97%
  return { backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)` };
}

export default function SpecialtyCard({ item }: { item: SpecialtyItem }) {
  const router = useRouter();
  const { t } = useI18n();
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
        <h2 className="mt-1 line-clamp-2 text-[12px] font-semibold text-ink">{item.name}</h2>
      </button>
      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
        {sheetsLink && (
          <a
            href={sheetsLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={track}
            className="text-[10px] text-primary-deep hover:underline"
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
            className="text-[10px] text-primary-deep hover:underline"
          >
            {t("linkNotes")}
          </a>
        )}
      </div>
    </div>
  );
}
