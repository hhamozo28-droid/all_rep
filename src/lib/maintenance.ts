import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meta } from "@/db/schema";

/** Admin-controlled maintenance switch for all download endpoints. */
export async function downloadsPaused(): Promise<boolean> {
  const [row] = await db
    .select()
    .from(meta)
    .where(eq(meta.key, "downloadsPaused"))
    .limit(1);
  return row?.value === "1";
}
