import { sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";

/**
 * Atomically consume one download for a user. Returns true when the account
 * was within its limit and is now (at most) at the limit; false when the
 * account is already exhausted (`download_limit` reached or 0 remaining).
 */
export async function consumeUserDownload(userId: string): Promise<boolean> {
  const [row] = await db
    .update(profiles)
    .set({ downloads: sql`${profiles.downloads} + 1` })
    .where(
      sql`(${profiles.id} = ${userId})
        AND (${profiles.downloadLimit} IS NULL OR ${profiles.downloads} < ${profiles.downloadLimit})`,
    )
    .returning({ id: profiles.id });
  return Boolean(row);
}
