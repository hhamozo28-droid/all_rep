import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonFiles } from "@/db/schema";
import { getSessionState } from "@/lib/auth";
import { normalizeSpecialtyCode } from "@/lib/lessonStorage";
import { ensureLessonFilesTable } from "@/lib/specialtyStats";
import { storageHeaders } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ ok: false, reason: s.status }, { status: 401, headers: storageHeaders });
  }
  const code = normalizeSpecialtyCode(new URL(request.url).searchParams.get("code") ?? "");
  if (!code) {
    return NextResponse.json({ ok: false }, { status: 400, headers: storageHeaders });
  }
  await ensureLessonFilesTable();
  const rows = await db
    .select()
    .from(lessonFiles)
    .where(eq(lessonFiles.specialtyCode, code))
    .orderBy(asc(lessonFiles.uploadedAt), asc(lessonFiles.title));
  return NextResponse.json(
    {
      ok: true,
      lessons: rows.map((row) => ({
        id: row.id,
        title: row.title,
        fileName: row.fileName,
        mimeType: row.mimeType,
        size: row.size,
        downloads: row.downloads,
        uploadedAt: row.uploadedAt.toISOString(),
      })),
    },
    { headers: storageHeaders },
  );
}
