import Link from "next/link";
import { redirect } from "next/navigation";
import { appOnlyDownloadsEnabled } from "@/lib/appOnly";

export const dynamic = "force-dynamic";

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export default async function DeepLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-8 text-center">
        <h1 className="text-lg font-bold text-ink">رابط التحميل غير صالح</h1>
        <Link href="/" className="mt-4 font-semibold text-primary hover:underline">
          العودة إلى المنصة
        </Link>
      </main>
    );
  }

  // Before the app-only flag is enabled, keep deep links usable from a browser.
  if (!appOnlyDownloadsEnabled()) redirect(`/api/dl/${token}`);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-8">
      <section className="rounded-lg border border-line bg-white p-5 text-center">
        <h1 className="text-lg font-bold text-ink">التحميل داخل التطبيق فقط</h1>
        <p className="mt-2 text-sm leading-7 text-soft" dir="auto">
          افتح هذا الرابط من تطبيق منصة دروسي على هاتفك. إذا لم يكن التطبيق
          مثبتاً، ثبّته أولاً ثم افتح الرابط مرة أخرى.
        </p>
        <a
          href={`dordoc://dl/${token}`}
          className="mt-5 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-deep"
        >
          فتح في تطبيق أندرويد
        </a>
        <div className="mt-3">
          <Link href="/download" className="text-sm font-semibold text-primary hover:underline">
            تحميل التطبيق
          </Link>
        </div>
      </section>
      <footer className="mt-6 text-center text-xs text-soft" dir="auto">
        حقوق التصميم و النشر والمشاركة للأستاذ حمزة شعيب
      </footer>
    </main>
  );
}
