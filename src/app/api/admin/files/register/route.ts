import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { hostedFiles } from "@/db/schema";
import { ensureDownloadTables } from "@/lib/downloadGrants";
import { headObject, isS3Configured } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: adminResponseHeaders });

export async function POST(request: Request) {
  const forbidden = rejectCrossOriginWrite(request);
  if (forbidden) return forbidden;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!isAuthorizedAdmin(cookie)) return fail("unauthorized", 401);
  if (!isS3Configured()) return fail("storage-not-configured", 503);

  const body = (await request.json().catch(() => null)) as {
    kind?: string;
    itemId?: string;
    linkIndex?: number;
    key?: string;
    fileName?: string;
    sha256?: string;
  } | null;
  const kind = body?.kind;
  const itemId = body?.itemId;
  const key = String(body?.key ?? "");
  if ((kind !== "specialty" && kind !== "guide") || !itemId || !UUID_RE.test(itemId)) {
    return fail("bad-request", 400);
  }
  if (kind === "specialty" && (!Number.isInteger(body?.linkIndex) || (body?.linkIndex as number) < 0)) {
    return fail("bad-request", 400);
  }
  if (!key || key.includes("..") || key.startsWith("/") || key.length > 500) {
    return fail("bad-request", 400);
  }

  await ensureDownloadTables();
  const existing = await db
    .select({ id: hostedFiles.id })
    .from(hostedFiles)
    .where(
      and(
        eq(hostedFiles.kind, kind),
        eq(hostedFiles.itemId, itemId),
        kind === "specialty"
          ? eq(hostedFiles.linkIndex, body?.linkIndex as number)
          : isNull(hostedFiles.linkIndex),
      ),
    )
    .limit(1);
  if (existing.length > 0) return fail("already-uploaded", 409);

  const object = await headObject(key);
  if (!object) return fail("object-not-found", 404);
  if (object.size <= 0) return fail("empty-object", 400);

  const sha = typeof body?.sha256 === "string" && /^[a-f0-9]{64}$/i.test(body.sha256)
    ? body.sha256.toLowerCase()
    : null;
  const fileName = String(body?.fileName ?? "").slice(0, 180) || null;

  await db.insert(hostedFiles).values({
    kind,
    itemId,
    linkIndex: kind === "specialty" ? (body?.linkIndex as number) : null,
    objectKey: key,
    sizeBytes: object.size,
    mimeType: object.contentType ?? "application/octet-stream",
    sha256: sha,
    fileName,
  });

  return NextResponse.json({ ok: true, size: object.size }, { headers: adminResponseHeaders });
}
