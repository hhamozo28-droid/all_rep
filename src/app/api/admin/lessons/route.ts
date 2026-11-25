import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { asc, desc } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders } from "@/lib/admin-http";
import { db } from "@/db";
import { lessonFiles } from "@/db/schema";
import { ensureLessonFilesTable } from "@/lib/specialtyStats";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }
  await ensureLessonFilesTable();
  const rows = await db
    .select()
    .from(lessonFiles)
    .orderBy(desc(lessonFiles.uploadedAt), asc(lessonFiles.specialtyCode));
  return NextResponse.json(
    {
      ok: true,
      lessons: rows.map((row) => ({
        id: row.id,
        specialtyCode: row.specialtyCode,
        path: row.path,
        title: row.title,
        fileName: row.fileName,
        mimeType: row.mimeType,
        size: row.size,
        downloads: row.downloads,
        uploadedAt: row.uploadedAt.toISOString(),
      })),
    },
    { headers: adminResponseHeaders },
  );
}
