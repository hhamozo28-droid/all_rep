import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { meta, specialties } from "@/db/schema";
import type { ParsedRow } from "./parseDocx";

type Db = Pick<typeof db, "select" | "insert" | "delete">;

const gofile = (id: string) => `https://gofile.io/d/${id}`;

export const DEMO_SPECIALTIES: ParsedRow[] = [
  {
    idx: 1, code: "PY-101", name: "أساسيات البرمجة بلغة بايثون",
    contentType: "دورات + ملفات", modules: 12, lessons: 46, filesCount: 4,
    sizeMb: 320,
    links: [gofile("Pyt101CoreA"), gofile("Pyt101CoreB"), gofile("Pyt101Labs"), gofile("Pyt101Books")],
  },
  {
    idx: 2, code: "WEB-201", name: "تطوير مواقع الويب الحديثة",
    contentType: "دورات", modules: 18, lessons: 72, filesCount: 4,
    sizeMb: 540,
    links: [gofile("Web201Next"), gofile("Web201React"), gofile("Web201Css"), gofile("Web201Apis")],
  },
  {
    idx: 3, code: "DB-305", name: "قواعد البيانات PostgreSQL",
    contentType: "دروس + تمارين", modules: 10, lessons: 38, filesCount: 3,
    sizeMb: 210,
    links: [gofile("Db305Core"), gofile("Db305Ex"), gofile("Db305Refs")],
  },
  {
    idx: 4, code: "UI-110", name: "تصميم واجهات المستخدم UX/UI",
    contentType: "دورات + قوالب", modules: 8, lessons: 30, filesCount: 5,
    sizeMb: 780,
    links: [gofile("Ui110Basics"), gofile("Ui110Figma"), gofile("Ui110Tokens"), gofile("Ui110TplA"), gofile("Ui110TplB")],
  },
  {
    idx: 5, code: "DS-402", name: "تحليل البيانات والإحصاء",
    contentType: "دورات", modules: 14, lessons: 55, filesCount: 4,
    sizeMb: 415,
    links: [gofile("Ds402Stats"), gofile("Ds402Pandas"), gofile("Ds402Viz"), gofile("Ds402Sets")],
  },
  {
    idx: 6, code: "NET-220", name: "شبكات الحاسوب والأمن السيبراني",
    contentType: "دورات + تقارير", modules: 11, lessons: 44, filesCount: 3,
    sizeMb: 260,
    links: [gofile("Net220Core"), gofile("Net220Sec"), gofile("Net220Reps")],
  },
  {
    idx: 7, code: "ML-501", name: "تعلّم الآلة والذكاء الاصطناعي",
    contentType: "دورات + أبحاث", modules: 16, lessons: 64, filesCount: 4,
    sizeMb: 930,
    links: [gofile("Ml501Intro"), gofile("Ml501Dl"), gofile("Ml501Nlp"), gofile("Ml501Papers")],
  },
  {
    idx: 8, code: "AND-310", name: "تطوير تطبيقات Android",
    contentType: "دورات + مشاريع", modules: 13, lessons: 51, filesCount: 4,
    sizeMb: 620,
    links: [gofile("And310Java"), gofile("And310Kt"), gofile("And310Compose"), gofile("And310Apps")],
  },
  {
    idx: 9, code: "OPS-225", name: "إدارة الأنظمة وتثبيت Linux",
    contentType: "دروس", modules: 9, lessons: 33, filesCount: 3,
    sizeMb: 150,
    links: [gofile("Ops225Linux"), gofile("Ops225Shell"), gofile("Ops225Docker")],
  },
  {
    idx: 10, code: "GRP-150", name: "الرسوم الحاسوبية والتصميم الجرافيكي",
    contentType: "دورات + قوالب", modules: 10, lessons: 40, filesCount: 4,
    sizeMb: 1240,
    links: [gofile("Grp150Ps"), gofile("Grp150Ai"), gofile("Grp150Motion"), gofile("Grp150Fonts")],
  },
];

async function metaValue(tx: Db, key: string): Promise<string | null> {
  const rows = await tx.select().from(meta).where(eq(meta.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

async function metaSet(tx: Db, key: string, value: string): Promise<void> {
  await tx
    .insert(meta)
    .values({ key, value })
    .onConflictDoUpdate({ target: meta.key, set: { value } });
}

export interface CatalogInfo {
  count: number;
  version: number;
  lastUpload: string;
  publishedAt: string | null;
}

export async function getCatalogInfo(): Promise<CatalogInfo> {
  const [countRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(specialties);
  const [latest] = await db
    .select()
    .from(specialties)
    .orderBy(desc(specialties.publishedAt))
    .limit(1);
  const version = Number(await metaValue(db, "catalog_version") ?? "0") || 0;
  return {
    count: countRow?.c ?? 0,
    version,
    lastUpload: (await metaValue(db, "last_upload")) ?? "",
    publishedAt: latest?.publishedAt.toISOString() ?? null,
  };
}

/** Replace the whole catalog and bump the published version. */
export async function replaceCatalog(
  rows: ParsedRow[],
  source: string,
): Promise<number> {
  const now = new Date();
  return db.transaction(async (tx) => {
    const version = (Number(await metaValue(tx, "catalog_version") ?? "0") || 0) + 1;
    await tx.delete(specialties);
    await tx.insert(specialties).values(
      rows.map((r) => ({
        idx: r.idx,
        code: r.code,
        name: r.name,
        contentType: r.contentType,
        modules: r.modules,
        lessons: r.lessons,
        filesCount: r.filesCount,
        sizeMb: String(r.sizeMb),
        links: r.links,
        version,
        publishedAt: now,
      })),
    );
    await metaSet(tx, "catalog_version", String(version));
    await metaSet(tx, "last_upload", source);
    return version;
  });
}

/** First-run convenience: seed demo rows so the catalog is never empty. */
export async function ensureSeeded(): Promise<void> {
  const [countRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(specialties);
  if ((countRow?.c ?? 0) > 0) return;
  await replaceCatalog(DEMO_SPECIALTIES, "demo-seed");
}

export function serializeSpecialty(row: {
  id: string;
  idx: number;
  code: string;
  name: string;
  contentType: string | null;
  modules: number;
  lessons: number;
  filesCount: number;
  sizeMb: string | number;
  links: string[];
  version: number;
  publishedAt: Date;
}) {
  return {
    id: row.id,
    idx: row.idx,
    code: row.code,
    name: row.name,
    contentType: row.contentType,
    modules: row.modules,
    lessons: row.lessons,
    filesCount: row.filesCount,
    sizeMb: Number(row.sizeMb) || 0,
    // Raw external URLs never leave the server. Clients receive opaque
    // indexes and must request a one-attempt grant before downloading.
    links: Array.isArray(row.links) ? row.links.map((_, index) => ({ index })) : [],
    version: row.version,
    publishedAt: row.publishedAt.toISOString(),
  };
}
