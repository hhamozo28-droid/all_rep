import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { guides, hostedFiles, lessonFiles, specialties } from "@/db/schema";
import {
  type GrantRow,
  consumeGrant,
  currentSessionHash,
  refundGrant,
} from "@/lib/downloadGrants";
import { fetchGuide, fetchLesson, guideMimeType } from "@/lib/githubGuides";
import {
  getObject,
  isS3Configured,
  signedObjectUrl,
  storageHeaders,
} from "@/lib/storage";

function errorResponse(status: number, error: string): NextResponse {
  return NextResponse.json(
    { error },
    {
      status,
      headers: { "Content-Type": "application/json", ...storageHeaders },
    },
  );
}

/**
 * Validate a one-attempt capability and deliver the file exactly once.
 * Called by /api/dl/[token] and by the legacy /api/guides/[id]/file route.
 */
export async function deliverGrant(
  token: string,
  options: { itemId?: string } = {},
): Promise<NextResponse> {
  const sessionHash = await currentSessionHash();
  if (!sessionHash) return errorResponse(410, "link-used-or-expired");
  const grant = await consumeGrant(token, { sessionHash, itemId: options.itemId });
  if (!grant) return errorResponse(410, "link-used-or-expired");
  if (grant.kind === "guide") return deliverGuide(grant);
  if (grant.kind === "lesson") return deliverLesson(grant);
  return deliverSpecialty(grant);
}

async function deliverGuide(grant: GrantRow): Promise<NextResponse> {
  const [guide] = await db.select().from(guides).where(eq(guides.id, grant.itemId)).limit(1);
  if (!guide) {
    await refundGrant(grant);
    return errorResponse(404, "not-found");
  }

  const [hosted] = await db
    .select()
    .from(hostedFiles)
    .where(and(eq(hostedFiles.kind, "guide"), eq(hostedFiles.itemId, grant.itemId)))
    .limit(1);

  let buffer: Buffer | null = null;
  if (hosted && isS3Configured()) {
    buffer = await getObject(hosted.objectKey);
  } else {
    buffer = await fetchGuide(hosted?.objectKey ?? guide.path);
  }
  if (!buffer) {
    await refundGrant(grant);
    return errorResponse(502, "file-unavailable");
  }

  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(guide.fileName)}`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      ...storageHeaders,
      "Content-Type": guideMimeType(guide.fileName),
      "Content-Length": String(buffer.length),
      "Content-Disposition": disposition,
    },
  });
}

async function deliverLesson(grant: GrantRow): Promise<NextResponse> {
  const [lesson] = await db
    .select()
    .from(lessonFiles)
    .where(eq(lessonFiles.id, grant.itemId))
    .limit(1);
  if (!lesson) {
    await refundGrant(grant);
    return errorResponse(404, "not-found");
  }

  const [hosted] = await db
    .select()
    .from(hostedFiles)
    .where(and(eq(hostedFiles.kind, "lesson"), eq(hostedFiles.itemId, grant.itemId)))
    .limit(1);

  let buffer: Buffer | null = null;
  if (hosted && isS3Configured()) {
    buffer = await getObject(hosted.objectKey);
  } else {
    buffer = await fetchLesson(hosted?.objectKey ?? lesson.path);
  }
  if (!buffer) {
    await refundGrant(grant);
    return errorResponse(502, "file-unavailable");
  }

  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(lesson.fileName)}`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      ...storageHeaders,
      "Content-Type": lesson.mimeType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": disposition,
    },
  });
}

async function deliverSpecialty(grant: GrantRow): Promise<NextResponse> {
  const [hosted] = await db
    .select()
    .from(hostedFiles)
    .where(
      and(
        eq(hostedFiles.kind, "specialty"),
        eq(hostedFiles.itemId, grant.itemId),
        eq(hostedFiles.linkIndex, grant.linkIndex ?? -1),
      ),
    )
    .limit(1);

  if (hosted) {
    if (!isS3Configured()) {
      await refundGrant(grant);
      return errorResponse(503, "storage-not-ready");
    }
    const fileName = hosted.fileName ?? `specialty-${grant.linkIndex ?? 0}`;
    const mime = hosted.mimeType ?? "application/octet-stream";
    const url = await signedObjectUrl(hosted.objectKey, fileName, mime);
    return NextResponse.redirect(url, {
      status: 302,
      headers: storageHeaders,
    });
  }

  // Legacy fallback until the catalog migration is complete.
  const [row] = await db
    .select()
    .from(specialties)
    .where(eq(specialties.id, grant.itemId))
    .limit(1);
  const index = grant.linkIndex ?? -1;
  const raw = row?.links?.[index];
  if (!raw || !/^https?:\/\//i.test(raw)) {
    await refundGrant(grant);
    return errorResponse(404, "file-unavailable");
  }
  return NextResponse.redirect(raw, {
    status: 302,
    headers: storageHeaders,
  });
}
