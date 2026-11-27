import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { specialties } from "@/db/schema";
import AppShell from "@/components/AppShell";
import SpecialtyDetail from "@/components/SpecialtyDetail";
import { getSessionState } from "@/lib/auth";
import { serializeSpecialty } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function SpecialtyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await getSessionState();
  if (s.status === "none") redirect("/login");
  if (s.status === "other-device") redirect("/login?kicked=1");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const rows = await db
    .select()
    .from(specialties)
    .where(eq(specialties.id, id))
    .limit(1);
  if (rows.length === 0) notFound();

  return (
    <AppShell
      user={{
        email: s.user.email,
        language: s.user.language,
        downloads: s.user.downloads,
        downloadLimit: s.user.downloadLimit,
      }}
    >
      <SpecialtyDetail item={serializeSpecialty(rows[0], { includeOtherLinks: true })} />
    </AppShell>
  );
}
