import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders } from "@/lib/admin-http";
import { db } from "@/db";
import { guides, hostedFiles, specialties } from "@/db/schema";
import { ensureDownloadTables } from "@/lib/downloadGrants";
import { isS3Configured } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Admin-only list of every file that must be hosted, with its current state. */
export async function GET() {
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) {
    return NextResponse.json({ ok: false }, { status: 401, headers: adminResponseHeaders });
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      {
        ok: true,
        configured: false,
        specialtyEntries: [],
        guideEntries: [],
        totals: { specialty: 0, specialtyDone: 0, guide: 0, guideDone: 0 },
      },
      { headers: adminResponseHeaders },
    );
  }

  await ensureDownloadTables();
  const [rows, hostedRows, guideRows, hostedGuides] = await Promise.all([
    db
      .select({ id: specialties.id, code: specialties.code, links: specialties.links })
      .from(specialties)
      .orderBy(asc(specialties.idx), asc(specialties.id)),
    db.select().from(hostedFiles).where(eq(hostedFiles.kind, "specialty")),
    db
      .select({ id: guides.id, title: guides.title, fileName: guides.fileName })
      .from(guides)
      .orderBy(asc(guides.uploadedAt), asc(guides.title)),
    db.select().from(hostedFiles).where(eq(hostedFiles.kind, "guide")),
  ]);

  const hosted = new Map(hostedRows.map((row) => [`${row.itemId}:${row.linkIndex}`, row]));
  const specialtyEntries = rows.flatMap((row) =>
    (row.links ?? []).map((source, linkIndex) => {
      const done = hosted.get(`${row.id}:${linkIndex}`) ?? null;
      return {
        id: row.id,
        code: row.code,
        linkIndex,
        source: typeof source === "string" ? source : "",
        fileName: done?.fileName ?? "",
        size: done?.sizeBytes ?? null,
        hosted: Boolean(done),
      };
    }),
  );

  const guideHosted = new Map(hostedGuides.map((row) => [row.itemId, row]));
  const guideEntries = guideRows.map((row) => {
    const done = guideHosted.get(row.id) ?? null;
    return {
      id: row.id,
      title: row.title,
      fileName: row.fileName,
      size: done?.sizeBytes ?? null,
      hosted: Boolean(done),
    };
  });

  return NextResponse.json(
    {
      ok: true,
      configured: true,
      specialtyEntries,
      guideEntries,
      totals: {
        specialty: specialtyEntries.length,
        specialtyDone: specialtyEntries.filter((entry) => entry.hosted).length,
        guide: guideEntries.length,
        guideDone: guideEntries.filter((entry) => entry.hosted).length,
      },
    },
    { headers: adminResponseHeaders },
  );
}
