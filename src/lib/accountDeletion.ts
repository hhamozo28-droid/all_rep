import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Self-healing DDL for the permanent-deletion tombstone. Emails kept here can
 * never be registered again, even after the admin removes the profile row.
 */
export async function ensureDeletedAccountsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS deleted_accounts (
      email text PRIMARY KEY,
      deleted_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}
