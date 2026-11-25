import { desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { notificationReads, notifications } from "@/db/schema";

export async function ensureNotificationTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      message text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE CASCADE`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notification_reads (
      user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      read_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, notification_id)
    )
  `);
}

/** userId omitted = broadcast; provided = private message for that account. */
export async function createNotification(message: string, userId?: string | null): Promise<void> {
  const clean = String(message ?? "").trim().slice(0, 500);
  if (!clean) return;
  await ensureNotificationTables();
  await db.insert(notifications).values({ message: clean, userId: userId ?? null });
}

export type UserNotification = {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export async function listNotifications(userId: string): Promise<UserNotification[]> {
  await ensureNotificationTables();
  const [rows, reads] = await Promise.all([
    db.select().from(notifications)
      .where(or(isNull(notifications.userId), eq(notifications.userId, userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(50),
    db.select({ notificationId: notificationReads.notificationId })
      .from(notificationReads)
      .where(eq(notificationReads.userId, userId)),
  ]);
  const readIds = new Set(reads.map((r) => r.notificationId));
  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    read: readIds.has(row.id),
  }));
}

export async function markNotificationsRead(userId: string): Promise<void> {
  await ensureNotificationTables();
  const rows = await db.select({ id: notifications.id }).from(notifications)
    .where(or(isNull(notifications.userId), eq(notifications.userId, userId)));
  if (rows.length === 0) return;
  await db.insert(notificationReads).values(
    rows.map((row) => ({ userId, notificationId: row.id })),
  ).onConflictDoNothing();
}
