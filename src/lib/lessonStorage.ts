import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { hostedFiles } from "@/db/schema";
import { ensureDownloadTables } from "@/lib/downloadGrants";
import {
  deleteLesson,
  isLessonFile,
  lessonMimeType,
  uploadLesson,
} from "@/lib/githubGuides";
import {
  deleteObject,
  isS3Configured,
  putObject,
} from "@/lib/storage";

/** Specialty codes are compared case-insensitively but stored canonically. */
export function normalizeSpecialtyCode(input: string): string {
  return input.trim().replace(/\s+/g, " ").toUpperCase();
}

function safeFileName(name: string): string {
  const pdf = name.toLowerCase().endsWith(".pdf");
  const stem = name
    .replace(/\.(pdf|docx)$/i, "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[\s_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `${stem || "lesson"}.${pdf ? "pdf" : "docx"}`;
}

export type StoredLesson = {
  path: string;
  sha: string;
  size: number;
  fileName: string;
  mimeType: string;
  storage: "s3" | "github";
};

export function validateLessonFile(name: string, buffer: Buffer): boolean {
  return isLessonFile(name, buffer);
}

export async function storeLessonFile(
  name: string,
  buffer: Buffer,
): Promise<StoredLesson> {
  if (!validateLessonFile(name, buffer)) throw new Error("bad-file");
  const fileName = safeFileName(name);
  const mimeType = lessonMimeType(fileName);
  const ext = mimeType.endsWith("pdf") ? "pdf" : "docx";
  const path = `lessons/${randomUUID()}.${ext}`;

  if (isS3Configured()) {
    const sha = createHash("sha256").update(buffer).digest("hex");
    await putObject(path, buffer, mimeType);
    return { path, sha, size: buffer.length, fileName, mimeType, storage: "s3" };
  }

  const uploaded = await uploadLesson(fileName, buffer);
  return { ...uploaded, mimeType, storage: "github" };
}

export async function registerHostedLessonFile(input: {
  lessonId: string;
  objectKey: string;
  size: number;
  sha: string;
  fileName: string;
  mimeType: string;
}): Promise<void> {
  await ensureDownloadTables();
  await db.insert(hostedFiles).values({
    kind: "lesson",
    itemId: input.lessonId,
    linkIndex: null,
    objectKey: input.objectKey,
    sizeBytes: input.size,
    mimeType: input.mimeType,
    sha256: input.sha,
    fileName: input.fileName,
  });
}

export async function removeLessonFile(input: {
  lessonId: string;
  path: string;
  sha: string;
}): Promise<void> {
  await ensureDownloadTables();
  const [hosted] = await db
    .select()
    .from(hostedFiles)
    .where(and(eq(hostedFiles.kind, "lesson"), eq(hostedFiles.itemId, input.lessonId)))
    .limit(1);

  if (hosted) {
    if (isS3Configured()) await deleteObject(hosted.objectKey);
    await db.delete(hostedFiles).where(eq(hostedFiles.id, hosted.id));
  } else {
    await deleteLesson(input.path, input.sha);
  }
}
