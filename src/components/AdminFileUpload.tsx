"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ApiError, api } from "@/lib/client";

type SpecialtyEntry = {
  id: string;
  code: string;
  linkIndex: number;
  source: string;
  fileName: string;
  size: number | null;
  hosted: boolean;
};

type GuideEntry = {
  id: string;
  title: string;
  fileName: string;
  size: number | null;
  hosted: boolean;
};

type Manifest = {
  ok: boolean;
  configured: boolean;
  specialtyEntries: SpecialtyEntry[];
  guideEntries: GuideEntry[];
  totals: { specialty: number; specialtyDone: number; guide: number; guideDone: number };
};

type SignedUpload = {
  url: string;
  key: string;
  headers: Record<string, string>;
};

const errors: Record<string, string> = {
  "unauthorized": "انتهت صلاحية جلسة الإدارة — سجّل الدخول من جديد.",
  "storage-not-configured": "التخزين الخاص غير مهيأ بعد.",
  "already-uploaded": "هذا الملف مُسجّل مسبقاً.",
  "not-found": "العنصر غير موجود في قاعدة البيانات.",
  "object-not-found": "لم يصل الملف إلى التخزين — أعد المحاولة.",
  "empty-object": "الملف فارغ.",
};

function errorText(cause: unknown): string {
  if (cause instanceof ApiError) {
    const code = typeof cause.body?.error === "string" ? cause.body.error : "";
    return errors[code] ?? `تعذّر الرفع (${cause.status}).`;
  }
  if (cause instanceof Error && cause.message.startsWith("put-failed")) {
    return "فشل رفع الملف إلى التخزين — تحقق من إعدادات CORS.";
  }
  return "حدث خطأ غير متوقع.";
}

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function mb(size: number | null): string {
  return size === null ? "—" : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

const rowKey = (kind: string, id: string, linkIndex?: number) =>
  `${kind}:${id}:${linkIndex ?? "guide"}`;

export default function AdminFileUpload() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setManifest(await api<Manifest>("/api/admin/files/manifest", { cache: "no-store" }));
    } catch {
      setError("تعذّر تحميل قائمة الملفات.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function pick(key: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  }

  async function upload(kind: "specialty" | "guide", id: string, linkIndex?: number) {
    const key = rowKey(kind, id, linkIndex);
    const file = files[key];
    if (!file || busy) return;
    setBusy(key);
    setError("");
    try {
      const signed = await api<SignedUpload>("/api/admin/files/upload-url", {
        method: "POST",
        body: JSON.stringify({
          kind,
          itemId: id,
          ...(linkIndex === undefined ? {} : { linkIndex }),
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      const put = await fetch(signed.url, {
        method: "PUT",
        headers: signed.headers,
        body: file,
      });
      if (!put.ok) throw new Error(`put-failed-${put.status}`);
      await api("/api/admin/files/register", {
        method: "POST",
        body: JSON.stringify({
          kind,
          itemId: id,
          ...(linkIndex === undefined ? {} : { linkIndex }),
          key: signed.key,
          fileName: file.name,
        }),
      });
      await load();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(null);
    }
  }

  if (!manifest) {
    return <p className="rounded-lg border border-line bg-white p-5 text-sm text-soft">جارٍ التحميل…</p>;
  }

  const { totals } = manifest;
  const total = totals.specialty + totals.guide;
  const done = totals.specialtyDone + totals.guideDone;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  if (!manifest.configured) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Link href="/admin" className="text-sm font-semibold text-primary hover:underline">← العودة للوحة الإدارة</Link>
        <section className="mt-5 rounded-lg border border-line bg-white p-5">
          <h1 className="text-lg font-bold text-ink">رفع ملفات التخصصات والأدلة</h1>
          <p className="mt-3 text-sm text-soft">
            التخزين الخاص غير مهيأ بعد. أضف المتغيرات التالية في Vercel ثم حدّث الصفحة:
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-paper p-3 text-xs text-ink" dir="ltr">
            {`AWS_REGION
S3_BUCKET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_KEY_PREFIX`}
          </pre>
          <p className="mt-3 text-sm text-soft">
            واسمح في إعدادات الـBucket بال origin الخاص بالمنصة مع الطرق PUT وGET وHEAD.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/admin" className="text-sm font-semibold text-primary hover:underline">← العودة للوحة الإدارة</Link>
      <h1 className="mt-5 text-xl font-bold text-ink">رفع ملفات التخصصات والأدلة</h1>
      <p className="mt-2 text-sm text-soft">
        تُرفع الملفات مباشرة إلى التخزين الخاص ولا تظهر روابطها للمتصفح. اختر الملف ثم اضغط رفع.
      </p>

      <section className="mt-4 rounded-lg border border-line bg-white p-4">
        <div className="flex items-center justify-between text-sm font-semibold text-ink">
          <span>التقدّم</span>
          <span>{done} / {total} ({percent}%)</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-paper">
          <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-soft">
          التخصصات: {totals.specialtyDone} / {totals.specialty} — الأدلة: {totals.guideDone} / {totals.guide}
        </p>
      </section>

      {error && <p role="alert" className="mt-4 rounded-lg border border-danger bg-white p-3 text-sm text-danger">{error}</p>}

      <section className="mt-6 rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-ink">ملفات التخصصات ({totals.specialty})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-soft">
                <th className="py-2">#</th>
                <th className="py-2">التخصص</th>
                <th className="py-2">الرابط الأصلي</th>
                <th className="py-2">الحالة</th>
                <th className="py-2">الملف</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {manifest.specialtyEntries.map((entry, index) => {
                const key = rowKey("specialty", entry.id, entry.linkIndex);
                return (
                  <tr key={key} className="border-t border-line align-middle">
                    <td className="py-2 pl-2 text-soft">{index + 1}</td>
                    <td className="py-2 pl-2" dir="ltr">{entry.code} #{entry.linkIndex + 1}</td>
                    <td className="py-2 pl-2 text-xs text-soft" dir="ltr">{host(entry.source)}</td>
                    <td className="py-2 pl-2 text-xs">
                      {entry.hosted ? <span className="font-semibold text-primary">مستضاف · {mb(entry.size)}</span> : <span className="text-soft">مطلوب</span>}
                    </td>
                    <td className="py-2 pl-2">
                      <input
                        type="file"
                        aria-label={`ملف ${entry.code} ${entry.linkIndex + 1}`}
                        onChange={(event) => pick(key, event)}
                        className="w-full text-xs"
                        disabled={entry.hosted || busy === key}
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        disabled={entry.hosted || busy === key || !files[key]}
                        onClick={() => void upload("specialty", entry.id, entry.linkIndex)}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        {busy === key ? "جارٍ…" : "رفع"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-4">
        <h2 className="font-semibold text-ink">الأدلة البيداغوجية ({totals.guide})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-soft">
                <th className="py-2">الدليل</th>
                <th className="py-2">الحالة</th>
                <th className="py-2">الملف</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {manifest.guideEntries.map((entry) => {
                const key = rowKey("guide", entry.id);
                return (
                  <tr key={key} className="border-t border-line align-middle">
                    <td className="py-2 pl-2" dir="ltr">{entry.title || entry.fileName}</td>
                    <td className="py-2 pl-2 text-xs">
                      {entry.hosted ? <span className="font-semibold text-primary">مستضاف · {mb(entry.size)}</span> : <span className="text-soft">مطلوب</span>}
                    </td>
                    <td className="py-2 pl-2">
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        aria-label={`ملف ${entry.title}`}
                        onChange={(event) => pick(key, event)}
                        className="w-full text-xs"
                        disabled={entry.hosted || busy === key}
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        disabled={entry.hosted || busy === key || !files[key]}
                        onClick={() => void upload("guide", entry.id)}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        {busy === key ? "جارٍ…" : "رفع"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
