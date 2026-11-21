import * as cheerio from "cheerio";
import mammoth from "mammoth";

export interface ParsedRow {
  idx: number;
  code: string;
  name: string;
  contentType: string | null;
  modules: number;
  lessons: number;
  filesCount: number;
  sizeMb: number;
  links: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  warnings: string[];
}

export class DocxParseError extends Error {
  constructor(
    public code: "empty-file" | "unreadable" | "no-table" | "no-rows",
    message: string,
  ) {
    super(message);
  }
}

const AR_DIGITS = "٠١٣٤٥٧٨٩";
const FA_DIGITS = "۰۱۳۴۵۷۸۹";

function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (ch) => {
    const i = AR_DIGITS.indexOf(ch);
    if (i !== -1) return String(i);
    const j = FA_DIGITS.indexOf(ch);
    return j !== -1 ? String(j) : ch;
  });
}

function toInt(s: string | undefined): number {
  if (!s) return 0;
  const n = parseInt(normalizeDigits(s).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseSizeMb(text: string): number {
  const m = normalizeDigits(text).match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB|KB)/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  switch (m[2].toUpperCase()) {
    case "TB":
      return n * 1024 * 1024;
    case "GB":
      return n * 1024;
    case "MB":
      return n;
    default:
      return n / 1024;
  }
}

const HEADER_WORDS = [
  "code", "الرمز", "الرقم", "idx", "#", "name", "الاسم", "التخصص",
  "type", "النوع", "المحتوى", "modules", "الوحدات", "وحدات", "lessons",
  "الدروس", "دروس", "size", "الحجم", "files", "الملفات", "ملفات",
  "links", "روابط", "رابط",
];

export async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  if (!buffer.length) throw new DocxParseError("empty-file", "empty-file");

  let html: string;
  try {
    const result = await mammoth.convertToHtml({ buffer });
    html = result.value;
  } catch {
    throw new DocxParseError("unreadable", "unreadable");
  }

  const $ = cheerio.load(html);
  const table = $("table").first();
  if (!table.length) throw new DocxParseError("no-table", "no-table");

  const trs = table.find("tr").toArray();
  const rows: ParsedRow[] = [];
  const warnings: string[] = [];
  let rowNum = 0;

  for (const tr of trs) {
    const cells = $(tr).children("td, th").toArray();
    if (cells.length === 0) continue;
    const texts = cells.map((c) => $(c).text().replace(/\s+/g, " ").trim());

    const linksCell = cells[6] ?? cells[cells.length - 1];
    const linksFromAnchors = $(linksCell)
      .find("a")
      .map((_, a) => ($(a).attr("href") ?? "").trim())
      .get()
      .filter((h) => h.startsWith("http"));

    if (texts.every((t) => !t) && linksFromAnchors.length === 0) continue;
    rowNum += 1;

    // Skip a header row (e.g. "#" | "الرمز" | "الاسم" ...)
    const headerHits = texts
      .slice(0, 2)
      .filter((t) => t && HEADER_WORDS.includes(t.toLowerCase())).length;
    if (headerHits >= 2) continue;

    const code = normalizeDigits(texts[1] ?? "").trim().toUpperCase();
    if (!code) {
      warnings.push(`row-${rowNum}: no-code`);
      continue;
    }

    const rawLinks =
      linksFromAnchors.length > 0
        ? linksFromAnchors
        : $(linksCell).text().match(/https?:\/\/[^\s<>"']+/g) ?? [];
    const links = [...new Set(rawLinks.map((l) => l.replace(/[)\].,;]+$/, "")))];

    if (cells.length !== 7) {
      warnings.push(`row-${rowNum}: cols-${cells.length}`);
    }

    const rowText = texts.join(" ");
    const pickCount = (re: RegExp): number => toInt(rowText.match(re)?.[1]);
    const modules =
      toInt(texts[4]) ||
      pickCount(/(?:الوحدات|وحدات|modules)\s*[:=]?\s*(\d+)/i) ||
      pickCount(/(\d+)\s*(?:الوحدات|وحدات|modules)/i);
    const lessons =
      toInt(texts[5]) ||
      pickCount(/(?:الدروس|دروس|lessons)\s*[:=]?\s*(\d+)/i) ||
      pickCount(/(\d+)\s*(?:الدروس|دروس|lessons)/i);

    rows.push({
      idx: toInt(texts[0]) || rows.length + 1,
      code,
      name: (texts[2] ?? "").trim() || code,
      contentType: (texts[3] ?? "").trim() || null,
      modules,
      lessons,
      filesCount: links.length,
      sizeMb:
        Math.round(parseSizeMb(texts.join(" ") + " " + $(linksCell).text()) * 100) /
        100,
      links,
    });
  }

  if (rows.length === 0) throw new DocxParseError("no-rows", "no-rows");
  return { rows, warnings: warnings.slice(0, 30) };
}
