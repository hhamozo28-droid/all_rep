import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminFileUpload from "@/components/AdminFileUpload";
import { ADMIN_COOKIE, isAuthorizedAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "رفع ملفات التخصصات | منصة دروسي",
  robots: { index: false, follow: false },
};

export default async function UploadFilesPage() {
  const jar = await cookies();
  if (!isAuthorizedAdmin(jar.get(ADMIN_COOKIE)?.value)) redirect("/admin");
  return <AdminFileUpload />;
}
