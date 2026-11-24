import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { hostedFiles, specialties } from "@/db/schema";
import { getSessionState } from "@/lib/auth";
import { consumeUserDownload } from "@/lib/consumeDownload";
import { createGrant, ensureDownloadTables } from "@/lib/downloadGrants";
import { recordSpecialtyDownload } from "@/lib/specialtyStats";
import { storageHeaders } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: storageHeaders });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      specialtyId?: string;
      linkIndex?: number;
    } | null;
    const s = await getSessionState();
    if (s.status !== "ok") return fail("unauthorized", 401);

    const specialtyId = body?.specialtyId;
    const linkIndex = body?.linkIndex;
    if (
      !specialtyId ||
      !UUID_RE.test(specialtyId) ||
      !Number.isInteger(linkIndex) ||
      (linkIndex as number) < 0
    ) {
      return fail("bad-request", 400);
    }

    await ensureDownloadTables();
    const [row] = await db
      .select()
      .from(specialties)
      .where(eq(specialties.id, specialtyId))
      .limit(1);
    if (!row) return fail("not-found", 404);

    const [hosted] = await db
      .select({ id: hostedFiles.id })
      .from(hostedFiles)
      .where(
        and(
          eq(hostedFiles.kind, "specialty"),
          eq(hostedFiles.itemId, specialtyId),
          eq(hostedFiles.linkIndex, linkIndex as number),
        ),
      )
      .limit(1);
    const legacyExists = Array.isArray(row.links) && (linkIndex as number) < row.links.length;
    if (!hosted && !legacyExists) return fail("bad-request", 400);

    const ok = await consumeUserDownload(s.user.id);
    if (!ok) return fail("download-limit", 403);

    await recordSpecialtyDownload(s.user.id, specialtyId);
    const grant = await createGrant({
      userId: s.user.id,
      kind: "specialty",
      itemId: specialtyId,
      linkIndex: linkIndex as number,
      mode: "download",
    });
    return NextResponse.json(
      { ok: true, url: grant.url, expiresAt: grant.expiresAt },
      { headers: storageHeaders },
    );
  } catch {
    return fail("internal", 500);
  }
}
