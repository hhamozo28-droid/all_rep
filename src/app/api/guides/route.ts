import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { guides } from "@/db/schema";
import { ensureGuidesTable } from "@/lib/specialtyStats";
import { getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSessionState();
  if (s.status !== "ok") {
    return NextResponse.json({ ok: false, reason: s.status }, { status: 401 });
  }
  await ensureGuidesTable();
  const rows = await db
    .select()
    .from(guides)
    .orderBy(asc(guides.uploadedAt), asc(guides.title));
  return NextResponse.json({
    ok: true,
    guides: rows.map((g) => ({
      id: g.id,
      path: g.path,
      title: g.title,
      fileName: g.fileName,
      size: g.size,
      downloads: g.downloads,
      uploadedAt: g.uploadedAt.toISOString(),
    })),
  });
}
