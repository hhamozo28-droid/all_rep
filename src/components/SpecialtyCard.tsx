"use client";

import { useRouter } from "next/navigation";
import { formatMb, type SpecialtyItem } from "@/types/specialty";
import { useI18n } from "@/lib/i18n";

export default function SpecialtyCard({ item }: { item: SpecialtyItem }) {
  const router = useRouter();
  const { t, locale } = useI18n();

  return (
    <button
      type="button"
      onClick={() => router.push(`/specialty/${item.id}`)}
      className="w-full rounded-lg border border-line bg-white p-4 text-start hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span dir="ltr" className="font-mono text-sm font-semibold text-primary-deep">
          {item.code}
        </span>
        {item.contentType && <span className="text-xs text-soft">{item.contentType}</span>}
      </div>
      <h2 className="mt-1 text-base font-semibold text-ink">{item.name}</h2>
      <p className="mt-2 text-xs text-soft">
        {new Intl.NumberFormat(locale).format(item.modules)} {t("modules")} · {" "}
        {new Intl.NumberFormat(locale).format(item.lessons)} {t("lessons")} · {" "}
        {new Intl.NumberFormat(locale).format(item.filesCount)} {t("files")} · {" "}
        {formatMb(item.sizeMb, locale)}
      </p>
    </button>
  );
}
