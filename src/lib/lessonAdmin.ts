import { db } from "@/db";
import { lessonFiles } from "@/db/schema";
import {
  normalizeSpecialtyCode,
  registerHostedLessonFile,
  storeLessonFile,
} from "@/lib/lessonStorage";
import { ensureLessonFilesTable } from "@/lib/specialtyStats";

/** Shared final step for direct and chunked lesson uploads. */
export async function persistLessonFile(input: {
  specialtyCode: string;
  name: string;
  buffer: Buffer;
}) {
  await ensureLessonFilesTable();
  const stored = await storeLessonFile(input.name, input.buffer);
  const [row] = await db
    .insert(lessonFiles)
    .values({
      specialtyCode: normalizeSpecialtyCode(input.specialtyCode),
      title: stored.fileName.replace(/\.(pdf|docx)$/i, ""),
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      size: stored.size,
      path: stored.path,
      sha: stored.sha,
    })
    .returning();
  if (!row) throw new Error("insert-failed");
  if (stored.storage === "s3") {
    await registerHostedLessonFile({
      lessonId: row.id,
      objectKey: stored.path,
      size: stored.size,
      sha: stored.sha,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
    });
  }
  return row;
}
