import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";
import { adminResponseHeaders, rejectCrossOriginWrite } from "@/lib/admin-http";
import { db } from "@/db";
import { guides, hostedFiles, specialties } from "@/db/schema";
import { ensureDownloadTables } from "@/lib/downloadGrants";
import { isS3Configured, presignedPutUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXT_RE = /\.(zip|rar|7z|pdf|docx?|xlsx?|pptx?|txt|csv)$/i;

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: adminResponseHeaders });

function objectKey(kind: string, label: string, linkIndex: number | undefined, fileName: string): string {
  const ext = (fileName.match(EXT_RE)?.[1] ?? "bin").toLowerCase();
  if (kind === "guide") return `guides/${randomUUID()}.${ext}`;
  const slug = String(label).split(/\s+/)[0].replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 40) || "specialty";
  return `specialties/${slug}/${linkIndex ?? 0}-${randomUUID().slice(0, 8)}.${ext}`;
}

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
    fileName?: string;
    contentType?: string;
  } | null;
  const kind = body?.kind;
  const itemId = body?.itemId;
  const linkIndex = body?.linkIndex;
  const fileName = String(body?.fileName ?? "").slice(0, 180);
  if ((kind !== "specialty" && kind !== "guide") || !itemId || !UUID_RE.test(itemId)) {
    return fail("bad-request", 400);
  }
  if (kind === "specialty" && (!Number.isInteger(linkIndex) || (linkIndex as number) < 0)) {
    return fail("bad-request", 400);
  }
  if (!fileName) return fail("bad-request", 400);

  await ensureDownloadTables();
  const existing = await db
    .select({ id: hostedFiles.id })
    .from(hostedFiles)
    .where(
      and(
        eq(hostedFiles.kind, kind),
        eq(hostedFiles.itemId, itemId),
        kind === "specialty"
          ? eq(hostedFiles.linkIndex, linkIndex as number)
          : isNull(hostedFiles.linkIndex),
      ),
    )
    .limit(1);
  if (existing.length > 0) return fail("already-uploaded", 409);

  let label: string;
  if (kind === "specialty") {
    const [row] = await db
      .select({ code: specialties.code })
      .from(specialties)
      .where(eq(specialties.id, itemId))
      .limit(1);
    if (!row) return fail("not-found", 404);
    label = row.code;
  } else {
    const [row] = await db
      .select({ fileName: guides.fileName })
      .from(guides)
      .where(eq(guides.id, itemId))
      .limit(1);
    if (!row) return fail("not-found", 404);
    label = row.fileName;
  }

  const rawType = String(body?.contentType ?? "");
  const contentType = /^[A-Za-z0-9.+-]+\/[A-Za-z0-9.+-]+$/.test(rawType)
    ? rawType
    : "application/octet-stream";
  const key = objectKey(kind, label, linkIndex, fileName);
  const url = await presignedPutUrl(key, contentType);
  return NextResponse.json(
    {
      url,
      key,
      headers: {
        "Content-Type": contentType,
        "x-amz-server-side-encryption": "AES256",
      },
    },
    { headers: adminResponseHeaders },
  );
}
