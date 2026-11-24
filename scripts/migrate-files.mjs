import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import dotenv from "dotenv";
dotenv.config({ path: process.env.DORDOC_ENV_FILE ?? ".env" });
import pg from "pg";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

/**
 * One-off migration: GoFile links -> private S3 + hosted_files metadata.
 *
 * Usage:
 *   node scripts/migrate-files.mjs --template
 *   node scripts/migrate-files.mjs --links-file=C:\path\direct-links.json --limit 3
 *   node scripts/migrate-files.mjs --probe
 *   node scripts/migrate-files.mjs --guides-only
 *
 * Credentials are read from .env / environment and are never printed.
 */

const args = new Set(process.argv.slice(2));
const probe = args.has("--probe");
const guidesOnly = args.has("--guides-only");
const template = args.has("--template");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const linksFileArg = process.argv.find((a) => a.startsWith("--links-file="));
const linksFile = linksFileArg ? linksFileArg.slice("--links-file=".length) : null;
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const TEMPLATE_PATH = process.env.DORDOC_LINKS_TEMPLATE ?? "C:\\Users\\mizou\\Desktop\\dordoc-direct-links.json";

const region = process.env.AWS_REGION?.trim();
const bucket = process.env.S3_BUCKET?.trim();
const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
const endpoint = process.env.S3_ENDPOINT?.trim() || null;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "1";
const prefix = (process.env.S3_KEY_PREFIX ?? "dordoc").replace(/^\/+|\/+$/g, "");
const encryption = () => (endpoint ? {} : { ServerSideEncryption: "AES256" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
if (!probe && !template && (!region || !bucket || !accessKeyId || !secretAccessKey)) {
  console.error("AWS_REGION / S3_BUCKET / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are required");
  process.exit(1);
}

const s3 = region && bucket && accessKeyId && secretAccessKey
  ? new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;
const fullKey = (key) => (prefix ? `${prefix}/${key}` : key);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function goFileDirectLinks(url) {
  const match = url.match(/gofile\.io\/d\/([A-Za-z0-9]+)/i);
  if (!match) return [url];
  const premiumToken = process.env.GOFILE_TOKEN?.trim();
  const res = await fetch(`https://api.gofile.io/contents/${match[1]}?page=1&pageSize=100`, {
    headers: {
      Accept: "application/json",
      ...(premiumToken ? { Authorization: `Bearer ${premiumToken}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`gofile api ${res.status}`);
  const json = await res.json();
  if (json.status !== "ok") throw new Error(`gofile status ${json.status}`);
  const data = json.data ?? {};
  const children = Object.values(data.children ?? {});
  const files = children.filter((c) => c?.type === "file" && c?.directLink);
  if (files.length === 0 && data.directLink) files.push(data);
  if (files.length === 0) throw new Error("gofile: no direct link");
  files.sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0));
  return files.map((f) => ({
    url: f.directLink,
    name: f.name || "file",
    size: Number(f.size) || 0,
  }));
}

async function downloadToFile(url, target) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const hash = createHash("sha256");
  let size = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(res.body), counter, createWriteStream(target));
  return { size, sha256: hash.digest("hex") };
}

async function uploadLocalFile(key, file, contentType) {
  await new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: fullKey(key),
      Body: createReadStream(file),
      ContentType: contentType,
      ...encryption(),
    },
    queueSize: 4,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  }).done();
}

function slug(value) {
  return String(value)
    .split(/\s+/)[0]
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 40);
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    if (template) {
      const { rows } = await client.query(
        "SELECT id, code, links FROM specialties ORDER BY idx",
      );
      const entries = [];
      for (const row of rows) {
        (row.links ?? []).forEach((source, linkIndex) => {
          entries.push({
            id: row.id,
            code: row.code,
            linkIndex,
            name: "",
            url: "",
            source,
          });
        });
      }
      await fs.writeFile(TEMPLATE_PATH, JSON.stringify(entries, null, 2), "utf8");
      console.log(`template: ${entries.length} entries -> ${TEMPLATE_PATH}`);
      return;
    }

    let directMap = null;
    if (linksFile) {
      const parsed = JSON.parse(await fs.readFile(linksFile, "utf8"));
      if (!Array.isArray(parsed)) throw new Error("links file must be a JSON array");
      directMap = new Map();
      for (const entry of parsed) {
        if (!entry || !entry.id || !Number.isInteger(entry.linkIndex)) continue;
        if (typeof entry.url !== "string" || !/^https?:\/\//i.test(entry.url.trim())) continue;
        directMap.set(`${entry.id}:${entry.linkIndex}`, {
          url: entry.url.trim(),
          name: typeof entry.name === "string" ? entry.name : "",
        });
      }
      console.log(`direct links loaded: ${directMap.size}`);
    }

    if (guidesOnly) {
      const { rows: guides } = await client.query(
        "SELECT id, path, file_name, size FROM guides ORDER BY uploaded_at",
      );
      console.log(`guides: ${guides.length}`);
      let done = 0;
      for (const guide of guides) {
        if (done >= limit) break;
        const exists = await client.query(
          "SELECT 1 FROM hosted_files WHERE kind='guide' AND item_id=$1",
          [guide.id],
        );
        if (exists.rowCount) {
          console.log(`  skip guide ${guide.id}`);
          continue;
        }
        const res = await fetch(
          `https://raw.githubusercontent.com/hhamozo28-droid/all_rep/main/${guide.path}`,
        );
        if (!res.ok) throw new Error(`github ${res.status} for ${guide.path}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: fullKey(guide.path),
            Body: buffer,
            ContentType: "application/pdf",
            ...encryption(),
          }),
        );
        await client.query(
          `INSERT INTO hosted_files (kind, item_id, object_key, size_bytes, mime_type, sha256, file_name)
           VALUES ('guide', $1, $2, $3, 'application/pdf', $4, $5)
           ON CONFLICT (kind, item_id, coalesce(link_index, -1)) DO NOTHING`,
          [guide.id, guide.path, buffer.length, createHash("sha256").update(buffer).digest("hex"), guide.file_name],
        );
        done += 1;
        console.log(`  migrated guide ${guide.id} (${buffer.length} bytes)`);
      }
      return;
    }

    const { rows } = await client.query(
      "SELECT id, code, links FROM specialties ORDER BY idx",
    );
    let links = 0;
    for (const row of rows) {
      for (const url of row.links ?? []) if (typeof url === "string") links += 1;
    }
    console.log(`specialties: ${rows.length}, links: ${links}`);

    if (probe) {
      const first = (rows.find((r) => (r.links ?? []).length)?.links ?? [])[0];
      if (!first) {
        console.log("probe: no links found");
        return;
      }
      const targets = await goFileDirectLinks(first);
      const head = await fetch(targets[0].url, { method: "HEAD", redirect: "follow" });
      console.log(
        JSON.stringify({
          probe: "ok",
          files: targets.length,
          headStatus: head.status,
          contentLength: head.headers.get("content-length"),
          contentType: head.headers.get("content-type"),
        }),
      );
      return;
    }

    await client.query(`
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
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS hosted_files_item_idx
      ON hosted_files (kind, item_id, coalesce(link_index, -1))
    `);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dordoc-migrate-"));
    let migrated = 0;
    let failed = 0;

    for (const row of rows) {
      const rawLinks = (row.links ?? []).filter((u) => typeof u === "string");
      for (let index = 0; index < rawLinks.length; index += 1) {
        if (migrated >= limit) break;
        const existing = await client.query(
          "SELECT 1 FROM hosted_files WHERE kind='specialty' AND item_id=$1 AND link_index=$2",
          [row.id, index],
        );
        if (existing.rowCount) continue;

        const local = path.join(tmpDir, `${randomUUID()}.bin`);
        let uploaded = false;
        for (let attempt = 1; attempt <= 3 && !uploaded; attempt += 1) {
          try {
            let target;
            const direct = directMap?.get(`${row.id}:${index}`);
            if (direct) {
              let name = direct.name;
              if (!name) {
                try {
                  name = decodeURIComponent(new URL(direct.url).pathname.split("/").pop() || "file");
                } catch {
                  name = "file";
                }
              }
              target = { url: direct.url, name };
            } else {
              if (!process.env.GOFILE_TOKEN?.trim()) {
                throw new Error("no direct link in file and GOFILE_TOKEN is not set");
              }
              target = (await goFileDirectLinks(rawLinks[index]))[0];
            }
            const meta = await downloadToFile(target.url, local);
            const ext = path.extname(target.name).slice(0, 8) || ".zip";
            const objectKey = `specialties/${slug(row.code)}/${index}-${meta.sha256.slice(0, 10)}${ext}`;
            await uploadLocalFile(objectKey, local, "application/octet-stream");
            await client.query(
              `INSERT INTO hosted_files (kind, item_id, link_index, object_key, size_bytes, mime_type, sha256, file_name)
               VALUES ('specialty', $1, $2, $3, $4, 'application/octet-stream', $5, $6)`,
              [row.id, index, objectKey, meta.size, meta.sha256, target.name],
            );
            uploaded = true;
            migrated += 1;
            console.log(
              `  ok ${slug(row.code)} #${index + 1} ${(meta.size / 1024 / 1024).toFixed(1)}MB`,
            );
          } catch (error) {
            if (attempt === 3) {
              failed += 1;
              console.error(`  FAIL ${slug(row.code)} #${index + 1}: ${error.message}`);
            } else {
              await sleep(1500 * attempt);
            }
          } finally {
            await fs.unlink(local).catch(() => {});
          }
        }
      }
    }
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    console.log(`migrated=${migrated} failed=${failed}`);
    if (failed > 0) process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
