import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { hostedFiles } from "@/db/schema";
import { ensureDownloadTables } from "@/lib/downloadGrants";
import { deleteGuide, uploadGuide } from "@/lib/githubGuides";
import {
  deleteObject,
  isS3Configured,
  putObject,
} from "@/lib/storage";

function safeFileName(name: string): string {
  const cleaned = name
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[\s_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  const stem = cleaned || "guide";
  return `${stem}.pdf`;
}

export async function storeGuideFile(
  name: string,
  buffer: Buffer,
): Promise<{ path: string; sha: string; size: number; fileName: string; storage: "s3" | "github" }> {
  const fileName = safeFileName(name);
  const path = `guides/${randomUUID()}.pdf`;

  if (isS3Configured()) {
    const sha = createHash("sha256").update(buffer).digest("hex");
    await putObject(path, buffer, "application/pdf");
    return { path, sha, size: buffer.length, fileName, storage: "s3" };
  }

  const uploaded = await uploadGuide(fileName, buffer);
  return { ...uploaded, storage: "github" };
}

export async function registerHostedGuide(input: {
  guideId: string;
  objectKey: string;
  size: number;
  sha: string;
  fileName: string;
}): Promise<void> {
  await ensureDownloadTables();
  await db.insert(hostedFiles).values({
    kind: "guide",
    itemId: input.guideId,
    linkIndex: null,
    objectKey: input.objectKey,
    sizeBytes: input.size,
    mimeType: "application/pdf",
    sha256: input.sha,
    fileName: input.fileName,
  });
}

export async function removeGuideFile(input: {
  guideId: string;
  path: string;
  sha: string;
}): Promise<void> {
  await ensureDownloadTables();
  const [hosted] = await db
    .select()
    .from(hostedFiles)
    .where(and(eq(hostedFiles.kind, "guide"), eq(hostedFiles.itemId, input.guideId)))
    .limit(1);

  if (hosted) {
    if (isS3Configured()) await deleteObject(hosted.objectKey);
    await db.delete(hostedFiles).where(eq(hostedFiles.id, hosted.id));
  } else {
    await deleteGuide(input.path, input.sha);
  }
}
