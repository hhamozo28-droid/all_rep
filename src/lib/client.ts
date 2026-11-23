export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem("dl_device_id");
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("dl_device_id", id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown> | null,
  ) {
    super(`API ${status}`);
  }
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(path, {
    ...init,
    headers: isFormData
      ? (init?.headers as HeadersInit | undefined)
      : { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* not json */
  }
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

/** GET with service-worker offline fallback (used for the specialties list). */
export async function apiWithOffline<T>(
  path: string,
): Promise<{ data: T; offline: boolean }> {
  try {
    return { data: await api<T>(path), offline: false };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw e;
    if (typeof caches !== "undefined") {
      const cached = await caches.match(path).catch(() => null);
      if (cached) {
        const data = (await cached.json()) as T;
        return { data, offline: true };
      }
    }
    throw e;
  }
}

export function formatMb(mb: number, locale: string): string {
  if (!mb || mb <= 0) return "—";
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  if (mb >= 1024) return `${nf.format(mb / 1024)} GB`;
  return `${nf.format(mb)} MB`;
}

export function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar" : locale, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
