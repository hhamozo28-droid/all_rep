import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { meta, profiles } from "@/db/schema";

const KEY_AUTO = "autoApprove";
const KEY_HOURS = "autoApproveAfterHours";
const KEY_LAST_ADMIN = "lastAdminSeenAt";

/**
 * When the admin enables unattended approval and has not been seen for the
 * configured number of hours, pending registrations older than that window
 * are approved automatically. Returns the number of approved accounts.
 */
export async function maybeAutoApprove(): Promise<number> {
  const [autoRows, hoursRows, lastRows] = await Promise.all([
    db.select().from(meta).where(eq(meta.key, KEY_AUTO)).limit(1),
    db.select().from(meta).where(eq(meta.key, KEY_HOURS)).limit(1),
    db.select().from(meta).where(eq(meta.key, KEY_LAST_ADMIN)).limit(1),
  ]);
  if (autoRows[0]?.value !== "1") return 0;

  const hoursRaw = Number(hoursRows[0]?.value ?? 24);
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 24;
  const lastSeen = lastRows[0]?.value;
  const now = Date.now();
  const lastSeenMs = lastSeen ? Date.parse(lastSeen) : 0;
  if (Number.isFinite(lastSeenMs) && now - lastSeenMs < hours * 3_600_000) {
    return 0;
  }

  const cutoff = new Date(now - hours * 3_600_000).toISOString();
  const approved = await db
    .update(profiles)
    .set({ approved: true })
    .where(
      and(
        eq(profiles.approved, false),
        isNull(profiles.deletedAt),
        lte(profiles.createdAt, new Date(cutoff)),
      ),
    )
    .returning({ id: profiles.id });
  return approved.length;
}
