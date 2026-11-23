"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SpecialtyCard from "./SpecialtyCard";
import { IconSearch } from "./icons";
import { ApiError, apiWithOffline, formatDate } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import type { CatalogResponse } from "@/types/specialty";

type State =
  | { status: "loading" }
  | { status: "unauthorized" }
  | { status: "error" }
  | { status: "ready"; data: CatalogResponse; offline: boolean };

const normalize = (value: string) => value.toLowerCase().replace(/[\s\-_]/g, "");

const sectorOf = (code: string) => (code.match(/^[A-Za-z]+/) || [])[0] || "";

export default function Home({ published = false, welcome = false }: { published?: boolean; welcome?: boolean }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [state, setState] = useState<State>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await apiWithOffline<CatalogResponse>("/api/specialties");
      setState({ status: "ready", data: result.data, offline: result.offline });
    } catch (error) {
      setState(
        error instanceof ApiError && error.status === 401
          ? { status: "unauthorized" }
          : { status: "error" },
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sectors = useMemo(() => {
    if (state.status !== "ready") return [] as { sector: string; count: number }[];
    const bySector = new Map<string, number>();
    for (const item of state.data.items) {
      const s = sectorOf(item.code);
      if (!s) continue;
      bySector.set(s, (bySector.get(s) ?? 0) + 1);
    }
    return [...bySector.entries()]
      .map(([sector, count]) => ({ sector, count }))
      .sort((a, b) => b.count - a.count || a.sector.localeCompare(b.sector));
  }, [state]);

  const items = useMemo(() => {
    if (state.status !== "ready") return [];
    const base = sector
      ? state.data.items.filter((item) => sectorOf(item.code) === sector)
      : state.data.items;
    const search = normalize(query.trim());
    if (!search) return base;
    return base.filter(
      (item) => normalize(item.code).includes(search) || normalize(item.name).includes(search),
    );
  }, [query, sector, state]);

  if (state.status === "loading") {
    return <p className="py-10 text-center text-sm text-soft">{t("loading")}</p>;
  }

  if (state.status === "unauthorized") {
    return (
      <section className="rounded-lg border border-line bg-white p-5">
        <h1 className="font-semibold">{t("sessionLost")}</h1>
        <p className="mt-1 text-sm text-soft">{t("sessionLostBody")}</p>
        <button
          onClick={() => router.replace("/login")}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          {t("goToLogin")}
        </button>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="rounded-lg border border-line bg-white p-5 text-center">
        <p className="text-sm text-soft">{t("error")}</p>
        <button onClick={() => void load()} className="mt-3 text-sm font-semibold text-primary">
          {t("retry")}
        </button>
      </section>
    );
  }

  const { data, offline } = state;

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('/bg.jpg')] bg-cover bg-center opacity-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-16 top-2 h-48 w-48 rounded-full bg-primary-soft opacity-60 blur-xl sm:top-4"
      />
      {welcome && (
        <section className="mb-4 rounded-lg border border-line bg-card p-4 text-sm text-success" role="status">
          {t("welcomeMessage")}
        </section>
      )}

      {published && (
        <section className="mb-4 rounded-lg border border-line bg-card p-4 text-sm text-success" role="status">
          {t("uploadSuccess")}
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-soft">
        <span>
          {new Intl.NumberFormat(locale).format(data.items.length)} {t("specialties")}
          {data.publishedAt && ` · ${formatDate(data.publishedAt, locale)}`}
        </span>
        <span dir="ltr" className="font-mono text-xs">v{data.version}</span>
      </div>

      {offline && (
        <p className="mb-3 rounded-md bg-accent-soft px-3 py-2 text-sm text-ink">
          {t("offlineNote")}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-soft" aria-hidden="true">
            <IconSearch className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-line bg-white ps-9 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </span>
        {sectors.length > 0 && (
          <select
            value={sector ?? ""}
            onChange={(event) => setSector(event.target.value || null)}
            aria-label={t("sectorFilter")}
            className="w-auto rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">{t("allSectors")}</option>
            {sectors.map((s) => (
              <option key={s.sector} value={s.sector}>
                {s.sector} ({s.count})
              </option>
            ))}
          </select>
        )}
      </div>

      {data.items.length === 0 ? (
        <p className="rounded-lg border border-line bg-white p-5 text-sm text-soft">{t("emptyTitle")}</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-line bg-white p-5 text-sm text-soft">{t("noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,4.6cm)] sm:gap-[1.5cm]">
          {items.map((item) => <SpecialtyCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
