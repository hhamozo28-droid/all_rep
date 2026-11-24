import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  downloadGrants,
  profiles,
  specialtyDownloads,
} from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Short-lived, single-attempt download capabilities.
 *
 * The raw token is only present in the URL handed to the client. The database
 * keeps a SHA-256 hash, the owning account and a hash of the session cookie.
 * Delivery is rejected unless the presenting browser has the same session
 * cookie, so forwarding the link to somebody else cannot deliver the file.
 */

export const GRANT_TTL_SECONDS = 60;

export type GrantKind = "guide" | "specialty";
export type GrantMode = "open" | "download";
export type GrantRow = typeof downloadGrants.$inferSelect;

export function ensureDownloadTables(): Promise<void> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS hosted_files (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        kind text NOT NULL,
        item_id uuid NOT NULL,
        link_index integer,
        object_key text NOT NULL UNIQUE,
        size_bytes bigint,
        mime_type text,
        sha256 text,
        file_name text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await tx.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS hosted_files_item_idx
      ON hosted_files (kind, item_id, coalesce(link_index, -1))
    `);
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS download_grants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash text NOT NULL UNIQUE,
        user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        session_hash text,
        kind text NOT NULL,
        item_id uuid NOT NULL,
        link_index integer,
        mode text NOT NULL DEFAULT 'open',
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        refunded_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await tx.execute(sql`
      CREATE INDEX IF NOT EXISTS download_grants_user_idx ON download_grants (user_id)
    `);
    await tx.execute(sql`
      CREATE INDEX IF NOT EXISTS download_grants_expires_idx ON download_grants (expires_at)
    `);
  });
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashGrantToken(token: string): string {
  return sha256(token);
}

export async function currentSessionHash(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  return value ? sha256(value) : null;
}

export function grantUrl(token: string): string {
  return `/api/dl/${token}`;
}

export async function createGrant(input: {
  userId: string;
  kind: GrantKind;
  itemId: string;
  linkIndex?: number;
  mode?: GrantMode;
}): Promise<{ token: string; url: string; expiresAt: string }> {
  await ensureDownloadTables();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + GRANT_TTL_SECONDS * 1000);
  const sessionHash = await currentSessionHash();
  await db.insert(downloadGrants).values({
    tokenHash: hashGrantToken(token),
    userId: input.userId,
    sessionHash,
    kind: input.kind,
    itemId: input.itemId,
    linkIndex: input.linkIndex ?? null,
    mode: input.mode ?? "open",
    expiresAt,
  });
  // Opportunistic cleanup of old capabilities; no cron job required.
  await db
    .delete(downloadGrants)
    .where(sql`${downloadGrants.createdAt} < now() - interval '7 days'`);
  return { token, url: grantUrl(token), expiresAt: expiresAt.toISOString() };
}

/**
 * Atomically mark an unused, unexpired grant as used. Returns null when the
 * link was already opened, expired, presented by a different session or
 * never issued. Validation happens BEFORE the atomic update so a forwarded
 * link can never burn the legitimate owner's single attempt.
 */
export async function consumeGrant(
  token: string,
  options: { sessionHash?: string | null; itemId?: string } = {},
): Promise<GrantRow | null> {
  await ensureDownloadTables();
  const [candidate] = await db
    .select()
    .from(downloadGrants)
    .where(eq(downloadGrants.tokenHash, hashGrantToken(token)))
    .limit(1);
  if (!candidate) return null;
  if (candidate.usedAt || candidate.expiresAt <= new Date()) return null;
  if (
    !candidate.sessionHash ||
    !options.sessionHash ||
    candidate.sessionHash !== options.sessionHash
  ) {
    return null;
  }
  if (options.itemId !== undefined && candidate.itemId !== options.itemId) {
    return null;
  }

  const [grant] = await db
    .update(downloadGrants)
    .set({ usedAt: new Date() })
    .where(
      sql`${downloadGrants.tokenHash} = ${hashGrantToken(token)}
        AND ${downloadGrants.usedAt} IS NULL
        AND ${downloadGrants.expiresAt} > now()`,
    )
    .returning();
  return grant ?? null;
}

/** Restore one balance unit when delivery failed before any bytes were sent. */
export async function refundGrant(grant: GrantRow): Promise<void> {
  const [updated] = await db
    .update(downloadGrants)
    .set({ refundedAt: new Date() })
    .where(
      sql`${downloadGrants.id} = ${grant.id} AND ${downloadGrants.refundedAt} IS NULL`,
    )
    .returning({ id: downloadGrants.id });
  if (!updated) return;

  await db
    .update(profiles)
    .set({ downloads: sql`GREATEST(${profiles.downloads} - 1, 0)` })
    .where(eq(profiles.id, grant.userId));

  if (grant.kind === "specialty") {
    await db
      .update(specialtyDownloads)
      .set({ downloads: sql`GREATEST(${specialtyDownloads.downloads} - 1, 0)` })
      .where(
        and(
          eq(specialtyDownloads.userId, grant.userId),
          eq(specialtyDownloads.specialtyId, grant.itemId),
        ),
      );
  }
}
