#!/usr/bin/env node
/**
 * Sync Archive.org lesson files into `specialties.other_links`.
 *
 * `specialties.links` keeps the original GoFile share links. Every file
 * uploaded to Archive.org is stored in `other_links` and shown on the site
 * under the "other links" tab. No middleware or Vercel rewrite is involved.
 *
 * Usage (from the repository root):
 *   node scripts/sync-lessons-db.mjs --dry-run
 *   node scripts/sync-lessons-db.mjs --dry-run --codes=TAV0701,THC0701
 *   node scripts/sync-lessons-db.mjs --yes --backup=backup.json
 *
 * Required: DATABASE_URL in .env.local / .env / environment.
 * Never prints the connection string.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import dotenv from "dotenv";

dotenv.config({ path: process.env.DORDOC_ENV_FILE ?? ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const pg = (await import("pg")).default;

const DEFAULTS = {
  dir: "public/lessons",
  baseUrl: process.env.LESSONS_BASE_URL ?? "https://allrep-theta.vercel.app/lessons",
  mode: "replace",
  extensions: ".pdf,.docx",
  backup: null,
  manifest: null,
};

function parseArgs(argv) {
  const out = { _: [] };
  for (const raw of argv) {
    if (!raw.startsWith("--")) {
      out._.push(raw);
      continue;
    }
    const body = raw.slice(2);
    const eq = body.indexOf("=");
    if (eq === -1) out[body] = true;
    else out[body.slice(0, eq)] = body.slice(eq + 1);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const dir = path.resolve(String(args.dir ?? DEFAULTS.dir));
const baseUrl = String(args["base-url"] ?? DEFAULTS.baseUrl).replace(/\/+$/, "");
const mode = String(args.mode ?? DEFAULTS.mode).toLowerCase();
const dryRun = Boolean(args["dry-run"]);
const scanOnly = Boolean(args["scan-only"]);
const autoYes = Boolean(args.yes);
const allowEmpty = Boolean(args["allow-empty"]);
const deleteHosted = !args["no-delete-hosted"];
const requestedCodes = args.codes
  ? String(args.codes)
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  : null;
const extensions = new Set(
  String(args.ext ?? args.extensions ?? DEFAULTS.extensions)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);
const backupPath = args.backup
  ? path.resolve(String(args.backup))
  : path.resolve(`lessons-links-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
const manifestPath = args.manifest ? path.resolve(String(args.manifest)) : null;
const inputManifestPath = args["input-manifest"] ? path.resolve(String(args["input-manifest"])) : null;

if (!["replace", "append"].includes(mode)) {
  console.error("--mode must be replace or append");
  process.exit(1);
}
if (!process.env.DATABASE_URL && !scanOnly) {
  console.error(
    [
      "DATABASE_URL is not set.",
      "Add it to .env.local (never commit that file), for example:",
      "  DATABASE_URL=postgresql://user:password@host/db?sslmode=require",
      "Then run this script again.",
    ].join("\n"),
  );
  process.exit(1);
}

function encodePath(relativePath) {
  return relativePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function folderOf(name, url) {
  const value = String(name ?? "");
  if (/مذكرات/.test(value)) return "المذكرات";
  if (/مخططات/.test(value)) return "المخططات";
  try {
    const first = decodeURIComponent(new URL(String(url)).pathname.split("/")[3] ?? "");
    if (first === "المخططات" || first === "المذكرات") return first;
  } catch {
    /* ignore */
  }
  return "المذكرات";
}

function fileNameOf(name) {
  const value = String(name ?? "");
  return value.includes("/") ? value.split("/").pop() ?? value : value;
}

async function collectFiles(root, urlPrefix) {
  const files = [];
  async function walk(current, relative) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!extensions.has(ext)) continue;
      if (/^(index|readme)\.(html?|md)$/i.test(entry.name)) continue;
      const stat = await fs.stat(full);
      files.push({
        relativePath: rel,
        name: entry.name,
        ext,
        bytes: stat.size,
        url: `${urlPrefix}/${encodePath(rel)}`,
      });
    }
  }
  await walk(root, "");
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "ar"));
  return files;
}

async function discoverCodes() {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const codes = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (entry.name === "README.md") continue;
    codes.push(entry.name.toUpperCase());
  }
  return codes.sort();
}

function formatMb(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

function linkBaseName(url) {
  try {
    const pathname = new URL(url).pathname;
    const last = decodeURIComponent(pathname.split("/").filter(Boolean).pop() ?? "");
    return last;
  } catch {
    return "";
  }
}

function summarize(rows) {
  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    files: row.files.length,
    totalBytes: row.totalBytes,
    gofileLinks: row.oldLinks.length,
    archiveLinks: row.finalOtherLinks.length,
    sizeMb: row.newSizeMb,
    examples: row.files.slice(0, 3).map((f) => f.name),
  }));
}

async function main() {
  const exists = await fs.stat(dir).catch(() => null);
  if (!exists?.isDirectory()) {
    console.error(`Lessons directory not found: ${dir}`);
    process.exit(1);
  }

  let inputManifest = null;
  if (inputManifestPath) {
    try {
      inputManifest = JSON.parse(await fs.readFile(inputManifestPath, "utf8"));
    } catch (error) {
      console.error(`Cannot read input manifest: ${error?.message ?? error}`);
      process.exit(1);
    }
  }

  const manifestMap = inputManifest
    ? (inputManifest.codes && typeof inputManifest.codes === "object"
        ? inputManifest.codes
        : inputManifest.code && Array.isArray(inputManifest.files)
          ? { [String(inputManifest.code).toUpperCase()]: inputManifest.files }
          : inputManifest)
    : null;

  const manifestCodes = manifestMap
    ? Object.keys(manifestMap)
        .map((c) => String(c).toUpperCase())
        .filter((c) => Array.isArray(manifestMap[Object.keys(manifestMap).find(k => k.toUpperCase() === c)]))
    : null;

  const codes = requestedCodes ?? manifestCodes ?? (await discoverCodes());
  if (codes.length === 0) {
    console.error(`No specialty codes found (directory or manifest)`);
    process.exit(1);
  }

  if (scanOnly) {
    const scanned = [];
    for (const code of codes) {
      const codeDir = path.join(dir, code);
      const dirExists = await fs.stat(codeDir).catch(() => null);
      if (!dirExists?.isDirectory()) {
        console.error(`Missing folder for ${code}: ${codeDir}`);
        process.exit(1);
      }
      const files = await collectFiles(codeDir, `${baseUrl}/${encodeURIComponent(code)}`);
      scanned.push({
        code,
        files: files.length,
        sizeMb: formatMb(files.reduce((sum, f) => sum + f.bytes, 0)),
        first: files[0]?.name ?? "",
        url: files[0]?.url ?? "",
      });
    }
    console.log(`Directory : ${dir}`);
    console.log(`Base URL  : ${baseUrl}`);
    console.table(scanned);
    if (manifestPath) {
      const manifest = {
        generatedAt: new Date().toISOString(),
        baseUrl,
        mode,
        codes: scanned.map((row) => ({ code: row.code, files: row.files, sizeMb: row.sizeMb })),
      };
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
      console.log(`Manifest  : ${manifestPath}`);
    }
    return;
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows: specialtyRows } = await client.query(
      `SELECT id, code, name, links, other_links, files_count, size_mb, version
         FROM specialties ORDER BY idx`,
    );
    const byCode = new Map();
    for (const row of specialtyRows) {
      const key = String(row.code).toUpperCase().split(/\s+/)[0];
      if (!byCode.has(key)) byCode.set(key, []);
      byCode.get(key).push(row);
    }

    const missing = codes.filter((code) => !byCode.has(code));
    const duplicated = codes.filter((code) => (byCode.get(code)?.length ?? 0) > 1);
    if (missing.length) {
      console.error(`Specialty codes not found in the database: ${missing.join(", ")}`);
      process.exit(1);
    }
    if (duplicated.length) {
      console.error(`Duplicate specialty codes in the database: ${duplicated.join(", ")}`);
      process.exit(1);
    }

    const rows = [];
    for (const code of codes) {
      const specialty = byCode.get(code)[0];
      let files;
      if (manifestMap) {
        const key = Object.keys(manifestMap).find(k => k.toUpperCase() === code);
        const raw = key ? manifestMap[key] : [];
        const names = Array.isArray(raw) ? raw : [];
        files = names.map((entry) => {
          const name = typeof entry === "string" ? entry : String(entry?.name ?? entry?.filename ?? "");
          const bytes = typeof entry === "object" && entry ? Number(entry.bytes ?? entry.size ?? 0) : 0;
          const rawUrl = typeof entry === "object" ? entry.url : "";
          const url = typeof rawUrl === "string" && /^https:\/\/archive\.org\/download\//.test(rawUrl)
            ? rawUrl
            : `${baseUrl}/${encodeURIComponent(code)}/${name.split("/").map(encodeURIComponent).join("/")}`;
          return {
            relativePath: `${code}/${name}`,
            name,
            ext: path.extname(name).toLowerCase(),
            bytes: Number.isFinite(bytes) ? bytes : 0,
            url,
          };
        }).filter((f) => f.name);
      } else {
        const codeDir = path.join(dir, code);
        const dirExists = await fs.stat(codeDir).catch(() => null);
        if (!dirExists?.isDirectory()) {
          console.error(`Missing folder for ${code}: ${codeDir}`);
          process.exit(1);
        }
        files = await collectFiles(codeDir, `${baseUrl}/${encodeURIComponent(code)}`);
      }
      if (files.length === 0 && !allowEmpty) {
        console.error(`No ${[...extensions].join("/")} files found in ${codeDir} (use --allow-empty to skip)`);
        process.exit(1);
      }
      const oldLinks = Array.isArray(specialty.links)
        ? specialty.links.filter((url) => typeof url === "string" && /^https?:\/\//i.test(url))
        : [];
      const oldOtherLinks = Array.isArray(specialty.other_links) ? specialty.other_links : [];
      const newOtherLinks = files.map((f) => ({
        name: fileNameOf(f.name),
        folder: folderOf(f.name, f.url),
        url: f.url,
      }));
      const finalOtherLinks =
        mode === "replace"
          ? newOtherLinks
          : [
              ...oldOtherLinks,
              ...newOtherLinks.filter((link) => !oldOtherLinks.some((old) => old.url === link.url)),
            ];
      const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);
      const newSizeMb = totalBytes > 0
        ? (mode === "replace"
            ? formatMb(totalBytes)
            : Math.round((Number(specialty.size_mb || 0) + formatMb(totalBytes)) * 100) / 100)
        : Number(specialty.size_mb || 0);

      rows.push({
        id: specialty.id,
        code,
        name: specialty.name,
        oldLinks,
        files,
        totalBytes,
        finalLinks: oldLinks,
        finalOtherLinks,
        oldOtherLinks,
        newSizeMb,
        newVersion: Number(specialty.version || 1) + 1,
      });
    }

    console.log(`Directory : ${dir}`);
    console.log(`Base URL  : ${baseUrl}`);
    console.log(`Mode      : ${mode}`);
    console.log(`Codes     : ${codes.join(", ")}`);
    console.table(summarize(rows));

    if (manifestPath) {
      const manifest = {
        generatedAt: new Date().toISOString(),
        baseUrl,
        mode,
        codes: rows.map((row) => ({
          code: row.code,
          id: row.id,
          name: row.name,
          totalBytes: row.totalBytes,
          files: row.files.map((f) => ({
            path: f.relativePath,
            name: f.name,
            bytes: f.bytes,
            url: f.url,
          })),
        })),
      };
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
      console.log(`Manifest  : ${manifestPath}`);
    }

    const backup = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      mode,
      specialties: rows.map((row) => ({
        id: row.id,
        code: row.code,
        oldLinks: row.oldLinks,
        newLinks: row.finalLinks,
        oldOtherLinks: row.oldOtherLinks,
        newOtherLinks: row.finalOtherLinks,
        oldSizeMb: null,
        newSizeMb: row.newSizeMb,
      })),
    };

    if (dryRun) {
      console.log("Dry run: no database changes were made.");
      console.log(`Backup would be written to: ${backupPath}`);
      return;
    }

    if (!autoYes) {
      const rl = createInterface({ input, output });
      const answer = await rl.question(
        `\nApply these changes to ${rows.length} specialties? Type "yes" to continue: `,
      );
      rl.close();
      if (answer.trim().toLowerCase() !== "yes") {
        console.log("Aborted.");
        return;
      }
    }

    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), "utf8");
    console.log(`Backup    : ${backupPath}`);

    await client.query("BEGIN");
    try {
      for (const row of rows) {
        await client.query(
          `UPDATE specialties
              SET other_links = $1::jsonb,
                  files_count = $2,
                  size_mb = $3,
                  version = $4,
                  published_at = now()
            WHERE id = $5`,
          [
            JSON.stringify(row.finalOtherLinks),
            row.finalOtherLinks.length,
            String(row.newSizeMb),
            row.newVersion,
            row.id,
          ],
        );
        if (mode === "replace" && deleteHosted) {
          const deleted = await client.query(
            "DELETE FROM hosted_files WHERE kind = 'specialty' AND item_id = $1",
            [row.id],
          );
          if (deleted.rowCount) {
            console.log(`  removed ${deleted.rowCount} hosted_files row(s) for ${row.code}`);
          }
        }
      }

      const { rows: metaRows } = await client.query(
        "SELECT value FROM meta WHERE key = 'catalog_version' LIMIT 1",
      );
      const nextCatalogVersion = (Number(metaRows[0]?.value ?? 0) || 0) + 1;
      await client.query(
        `INSERT INTO meta (key, value) VALUES ('catalog_version', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [String(nextCatalogVersion)],
      );

      await client.query("COMMIT");
      console.log(`Committed. catalog_version=${nextCatalogVersion}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    const verify = await client.query(
      `SELECT code, files_count, size_mb, version,
              jsonb_array_length(links) AS gofile_links,
              jsonb_array_length(other_links) AS archive_links
         FROM specialties WHERE id = ANY($1::uuid[]) ORDER BY code`,
      [rows.map((row) => row.id)],
    );
    console.log("Verified:");
    console.table(verify.rows);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
