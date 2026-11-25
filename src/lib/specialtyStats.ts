import { sql } from "drizzle-orm";
import { db } from "@/db";
import { specialtyDownloads } from "@/db/schema";

/**
 * Per-(user, specialty) download counts for the admin "most-downloaded specialty"
 * statistic. Auto-created so no separate migration step is needed; rows accumulate
 * as downloads happen.
 */
export async function ensureSpecialtyDownloadsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS specialty_downloads (
      user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      specialty_id uuid NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
      downloads integer NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, specialty_id)
    )
  `);
}

export async function ensureGuidesTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS guides (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      path text NOT NULL UNIQUE,
      sha text NOT NULL,
      size integer NOT NULL,
      title text NOT NULL,
      file_name text NOT NULL,
      downloads integer NOT NULL DEFAULT 0,
      uploaded_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

/**
 * Staging table for chunked guide uploads (> MAX_DIRECT_UPLOAD). Each row is
 * one small staging part; `POST /api/admin/guides/upload/complete`
 * reassembles the parts and uploads the guide to GitHub.
 */
export async function ensureGuideUploadChunksTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS guide_upload_chunks (
      session_id text NOT NULL,
      part_index integer NOT NULL,
      data text NOT NULL,
      uploaded_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (session_id, part_index)
    )
  `);
}

export async function ensureLessonFilesTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lesson_files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      specialty_code text NOT NULL,
      title text NOT NULL,
      file_name text NOT NULL,
      mime_type text NOT NULL,
      size integer NOT NULL,
      path text NOT NULL UNIQUE,
      sha text NOT NULL,
      downloads integer NOT NULL DEFAULT 0,
      uploaded_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS lesson_files_code_idx ON lesson_files (specialty_code)
  `);
}

/** Staging table for chunked lesson-file uploads (> MAX_DIRECT_UPLOAD). */
export async function ensureLessonUploadChunksTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lesson_upload_chunks (
      session_id text NOT NULL,
      part_index integer NOT NULL,
      data text NOT NULL,
      uploaded_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (session_id, part_index)
    )
  `);
}

export async function recordSpecialtyDownload(userId: string, specialtyId?: string): Promise<void> {
  if (!specialtyId) return;
  await ensureSpecialtyDownloadsTable();
  await db
    .insert(specialtyDownloads)
    .values({ userId, specialtyId, downloads: 1 })
    .onConflictDoUpdate({
      target: [specialtyDownloads.userId, specialtyDownloads.specialtyId],
      set: { downloads: sql`${specialtyDownloads.downloads} + 1` },
    });
}
