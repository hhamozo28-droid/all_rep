import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import Home from "@/components/Home";
import { getSessionState } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const s = await getSessionState();
  if (s.status === "none") redirect("/login");
  if (s.status === "other-device") redirect("/login?kicked=1");

  return (
    <AppShell user={{ email: s.user.email, language: s.user.language }}>
      <Home />
    </AppShell>
  );
}
