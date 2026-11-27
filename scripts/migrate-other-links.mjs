#!/usr/bin/env node
/**
 * One-off migration: move Archive file links out of `specialties.links` into
 * the new `other_links` column, and restore the original GoFile links for the
 * specialties that were synced directly to Archive earlier.
 *
 * Usage (from the repository root):
 *   node scripts/migrate-other-links.mjs --dry-run
 *   node scripts/migrate-other-links.mjs --yes
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: process.env.DORDOC_ENV_FILE ?? ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const pg = (await import("pg")).default;

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const autoYes = args.has("--yes");

const manifestPath = path.resolve("manifests/all.json");
const oldBackupPath =
  process.env.OLD_BACKUP ??
  "D:\\allrep\\db-backup-direct-archive.json";
const backupPath =
  process.env.NEW_BACKUP ??
  "D:\\allrep\\db-backup-before-other-links.json";

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const oldBackup = JSON.parse(await fs.readFile(oldBackupPath, "utf8"));

const oldLinksByCode = new Map();
for (const row of oldBackup.specialties ?? []) {
  const code = String(row.code ?? "").toUpperCase().split(/\s+/)[0];
  if (Array.isArray(row.oldLinks)) oldLinksByCode.set(code, row.oldLinks);
}

function folderOf(entry) {
  const name = String(entry?.name ?? "");
  const url = String(entry?.url ?? "");
  if (/مخططات/.test(name)) return "المخططات";
  if (/مذكرات/.test(name)) return "المذكرات";
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    const first = decodeURIComponent(segments[3] ?? "");
    if (first === "المخططات" || first === "المذكرات") return first;
  } catch {
    /* ignore */
  }
  return "المذكرات";
}

function fileNameOf(entry) {
  const name = String(entry?.name ?? "");
  if (!name.includes("/")) return name;
  return name.split("/").pop() ?? name;
}

const updates = [];
for (const [code, entries] of Object.entries(manifest.codes ?? {})) {
  if (!Array.isArray(entries)) continue;
  const key = code.toUpperCase().split(/\s+/)[0];
  const otherLinks = entries
    .filter((entry) => /^https:\/\/archive\.org\/download\//.test(String(entry?.url ?? "")))
    .map((entry) => ({
      name: fileNameOf(entry),
      folder: folderOf(entry),
      url: String(entry.url),
    }));
  updates.push({
    code: key,
    otherLinks,
    restoreLinks: oldLinksByCode.get(key) ?? null,
  });
}

if (updates.length === 0) {
  console.error("No Archive codes found in manifest");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows: columnRows } = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_name = 'specialties' AND column_name = 'other_links' LIMIT 1`,
  );
  const hasOtherLinks = columnRows.length > 0;
  const { rows } = await client.query(
    hasOtherLinks
      ? "SELECT id, code, links, other_links FROM specialties ORDER BY idx"
      : "SELECT id, code, links, NULL::jsonb AS other_links FROM specialties ORDER BY idx",
  );
  const byCode = new Map();
  for (const row of rows) {
    const key = String(row.code).toUpperCase().split(/\s+/)[0];
    byCode.set(key, row);
  }

  const plan = [];
  for (const update of updates) {
    const row = byCode.get(update.code);
    if (!row) {
      console.error(`Specialty not found in DB: ${update.code}`);
      process.exit(1);
    }
    plan.push({
      id: row.id,
      code: row.code,
      oldLinks: row.links,
      newLinks: update.restoreLinks ?? row.links,
      otherLinks: update.otherLinks,
      hadOtherLinks: Array.isArray(row.other_links) ? row.other_links.length : 0,
    });
  }

  console.table(
    plan.map((p) => ({
      code: p.code,
      oldLinks: Array.isArray(p.oldLinks) ? p.oldLinks.length : 0,
      newLinks: Array.isArray(p.newLinks) ? p.newLinks.length : 0,
      otherLinks: p.otherLinks.length,
      folders: [...new Set(p.otherLinks.map((l) => l.folder))].join("+"),
    })),
  );

  const backup = {
    generatedAt: new Date().toISOString(),
    specialties: plan.map((p) => ({
      id: p.id,
      code: p.code,
      links: p.oldLinks,
      other_links: p.hadOtherLinks ? [] : [],
      restoredLinks: p.newLinks,
      newOtherLinks: p.otherLinks,
    })),
  };

  if (dryRun) {
    console.log("Dry run: no database changes were made.");
    process.exit(0);
  }
  if (!autoYes) {
    console.error("Pass --yes to apply, or --dry-run to preview.");
    process.exit(1);
  }

  await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Backup: ${backupPath}`);

  await client.query("BEGIN");
  try {
    await client.query(`
      ALTER TABLE specialties
      ADD COLUMN IF NOT EXISTS other_links jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    for (const p of plan) {
      await client.query(
        `UPDATE specialties
            SET links = $1::jsonb,
                other_links = $2::jsonb,
                version = version + 1
          WHERE id = $3`,
        [
          JSON.stringify(p.newLinks ?? []),
          JSON.stringify(p.otherLinks),
          p.id,
        ],
      );
    }

    const { rows: metaRows } = await client.query(
      "SELECT value FROM meta WHERE key = 'catalog_version' LIMIT 1",
    );
    const nextVersion = (Number(metaRows[0]?.value ?? 0) || 0) + 1;
    await client.query(
      `INSERT INTO meta (key, value) VALUES ('catalog_version', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [String(nextVersion)],
    );
    await client.query("COMMIT");
    console.log(`Committed. catalog_version=${nextVersion}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  const verify = await client.query(
    `SELECT code,
            jsonb_array_length(links) AS gofile_links,
            jsonb_array_length(other_links) AS archive_links
       FROM specialties
      WHERE id = ANY($1::uuid[])
      ORDER BY code`,
    [plan.map((p) => p.id)],
  );
  console.table(verify.rows);
} finally {
  await client.end();
}
