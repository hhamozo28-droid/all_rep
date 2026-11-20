import type { Metadata } from "next";
import { cookies } from "next/headers";
import AdminPanel from "@/components/AdminPanel";
import { ADMIN_COOKIE, isAdminConfigured, isAuthorizedAdmin, usingDefaultAdminPassword } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "لوحة الإدارة | روابط التحميل", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ state?: string | string[] }> }) {
  const [jar, query] = await Promise.all([cookies(), searchParams]);
  // Only the signed, unexpired HttpOnly cookie can open the panel. URL flags are messages only.
  const authorized = isAuthorizedAdmin(jar.get(ADMIN_COOKIE)?.value);
  const configured = isAdminConfigured();
  const notice = !configured ? "adminNotConfigured"
    : query.state === "invalid" ? "wrongPassword"
    : query.state === "verify" ? "adminCookieBlocked"
    : query.state === "expired" ? "adminSessionExpired"
    : null;
  return <AdminPanel authorized={authorized} configured={configured} showDemoHint={usingDefaultAdminPassword()} notice={authorized ? null : notice} />;
}
