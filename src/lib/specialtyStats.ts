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
