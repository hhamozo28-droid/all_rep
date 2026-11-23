import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Self-healing DDL: apply the profiles.welcome_shown column the first time it
 * is needed, so no separate migration step is required.
 */
export async function ensureWelcomeColumn(): Promise<void> {
  await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS welcome_shown boolean NOT NULL DEFAULT false`);
}
