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
      user_id text NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      specialty_id text NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
      downloads integer NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, specialty_id)
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
