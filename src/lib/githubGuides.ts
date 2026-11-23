import { randomUUID } from "node:crypto";

/**
 * Server-only helper for uploading pedagogical PDF guides to GitHub.
 * The repo, branch and directory are configurable through env vars; all calls
 * happen server-side with the optional fine-grained token. Nothing in this
 * module is ever sent to the browser.
 */

const ownerRepo = (process.env.GITHUB_REPO ?? "hhamozo28-droid/all_rep").trim();
const ownerRepoParts = ownerRepo.split("/").filter(Boolean);
if (ownerRepoParts.length !== 2) throw new Error("GITHUB_REPO must be owner/repo");
const [owner, repo] = ownerRepoParts;
const branch = process.env.GITHUB_BRANCH ?? "main";
const guidesDir = (process.env.GUIDES_DIR ?? "guides").replace(/^\/+|\/+$/g, "");

export const GITHUB_BASE = `https://api.github.com/repos/${ownerRepo}`;

interface GitHubContentsResponse {
  content?: { sha?: string };
  [key: string]: unknown;
}

async function gh<T>(path: string, init?: RequestInit): Promise<T | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "dordoc-admin",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${GITHUB_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    const body = text.slice(0, 200);
    throw new Error(`GitHub error ${res.status}: ${body || res.statusText}`);
  }
  return text ? (JSON.parse(text) as T) : null;
}

function encPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function sanitizeFileName(name: string, fallback = "guide"): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[\s_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .trim();
  return cleaned || fallback;
}

export function isPdfFile(name: string, buffer: Buffer): boolean {
  if (!name.toLowerCase().endsWith(".pdf")) return false;
  if (buffer.length === 0 || buffer.length > 15 * 1024 * 1024) return false;
  return buffer.subarray(0, 5).toString("latin1").startsWith("%PDF-");
}

export async function uploadGuide(
  name: string,
  file: Buffer,
): Promise<{ path: string; sha: string; size: number; fileName: string }> {
  const safeName = sanitizeFileName(name);
  const fileName = /\.pdf$/i.test(safeName) ? safeName : `${safeName}.pdf`;
  const path = `${guidesDir}/${randomUUID()}.pdf`;
  const payload = await gh<GitHubContentsResponse>("/contents/" + encPath(path), {
    method: "PUT",
    body: JSON.stringify({
      message: `add guide: ${safeName}`,
      content: file.toString("base64"),
      branch,
    }),
  });
  const sha = payload?.content?.sha ?? "";
  if (!sha) throw new Error("GitHub did not return a commit sha");
  return { path, sha, size: file.length, fileName };
}

export async function deleteGuide(path: string, sha: string): Promise<void> {
  await gh(`/contents/${encPath(path)}?branch=${encodeURIComponent(branch)}`, {
    method: "DELETE",
    body: JSON.stringify({ sha, message: `delete guide: ${path}` }),
  });
}

export async function fetchGuide(path: string): Promise<Buffer | null> {
  const url = `https://raw.githubusercontent.com/${ownerRepo}/${branch}/${path}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}
