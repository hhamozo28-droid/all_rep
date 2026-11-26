#!/usr/bin/env node
/**
 * Build a small static index page inside each `public/lessons/<CODE>/`
 * folder so the folder URL itself can be shared with students.
 *
 * Usage:
 *   node scripts/build-lessons-index.mjs
 *   node scripts/build-lessons-index.mjs --codes=TAV0701,THC0701
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const args = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const body = a.slice(2);
      const eq = body.indexOf("=");
      return eq === -1 ? [body, true] : [body.slice(0, eq), body.slice(eq + 1)];
    }),
);

const dir = path.resolve(String(args.get("dir") ?? "public/lessons"));
const requested = args.get("codes")
  ? String(args.get("codes"))
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  : null;

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const encodePath = (rel) =>
  rel
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

const formatSize = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} م.ب`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} ك.ب`;
  return `${bytes} بايت`;
};

async function collect(root) {
  const files = [];
  async function walk(current, rel) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full, nextRel);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (![".pdf", ".docx", ".doc"].includes(ext)) continue;
      if (entry.name === "index.html") continue;
      const stat = await fs.stat(full);
      files.push({ rel: nextRel, name: entry.name, bytes: stat.size, ext });
    }
  }
  await walk(root, "");
  files.sort((a, b) => a.rel.localeCompare(b.rel, "ar"));
  return files;
}

async function build(code) {
  const root = path.join(dir, code);
  const stat = await fs.stat(root).catch(() => null);
  if (!stat?.isDirectory()) return null;
  const files = await collect(root);
  if (files.length === 0) return null;
  const total = files.reduce((sum, f) => sum + f.bytes, 0);
  const rows = files
    .map(
      (file, index) => `<tr>
        <td class="num">${index + 1}</td>
        <td class="name"><a href="${encodePath(file.rel)}">${esc(file.name)}</a></td>
        <td class="meta">${formatSize(file.bytes)}</td>
        <td class="meta"><a class="btn" href="${encodePath(file.rel)}" download>تحميل</a></td>
      </tr>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(code)} — ملفات الدروس</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f6f7f9; color: #1f2937; font-family: "Segoe UI", Tahoma, Arial, sans-serif; }
  main { max-width: 960px; margin: 0 auto; padding: 28px 16px 48px; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; box-shadow: 0 4px 18px rgba(15,23,42,.05); }
  h1 { margin: 0 0 6px; font-size: 1.45rem; }
  p { margin: 0; color: #6b7280; font-size: .95rem; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
  .badge { background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 4px 10px; font-size: .8rem; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th, td { text-align: right; padding: 10px 8px; border-bottom: 1px solid #eef0f3; vertical-align: middle; }
  th { color: #6b7280; font-size: .8rem; font-weight: 600; }
  td.name { font-size: .92rem; }
  td.name a { color: #111827; text-decoration: none; }
  td.name a:hover { text-decoration: underline; }
  td.num { width: 44px; color: #9ca3af; font-size: .8rem; }
  td.meta { width: 110px; color: #6b7280; font-size: .85rem; white-space: nowrap; }
  .btn { display: inline-block; background: #4f46e5; color: #fff !important; text-decoration: none; border-radius: 8px; padding: 5px 12px; font-size: .8rem; font-weight: 700; }
  .btn:hover { background: #4338ca; }
  footer { margin-top: 18px; color: #9ca3af; font-size: .8rem; text-align: center; }
  @media (max-width: 560px) { td.meta { width: 86px; } .card { padding: 14px; } }
</style>
</head>
<body>
<main>
  <div class="card">
    <h1>${esc(code)} — ملفات الدروس</h1>
    <p>يمكنك تحميل أي ملف مباشرة من القائمة أدناه.</p>
    <div class="badges">
      <span class="badge">${files.length} ملف</span>
      <span class="badge">${formatSize(total)}</span>
    </div>
    <table>
      <thead><tr><th>#</th><th>اسم الملف</th><th>الحجم</th><th>التحميل</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </div>
  <footer>روابط الملفات مباشرة وآمنة للاستخدام في التطبيق والموقع.</footer>
</main>
</body>
</html>
`;
  await fs.writeFile(path.join(root, "index.html"), html, "utf8");
  return { code, files: files.length, total };
}

const codes = requested ?? (await fs.readdir(dir, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && !e.name.startsWith("."))
  .map((e) => e.name.toUpperCase())
  .sort();

const results = [];
for (const code of codes) {
  const result = await build(code);
  if (result) results.push(result);
}
if (results.length === 0) {
  console.error("No lesson folders with PDF/DOCX files were found.");
  process.exit(1);
}
console.table(
  results.map((r) => ({
    code: r.code,
    files: r.files,
    sizeMb: Math.round((r.total / 1024 / 1024) * 10) / 10,
  })),
);
