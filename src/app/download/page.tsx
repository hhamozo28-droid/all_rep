import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "تحميل تطبيق أندرويد — منصة دروسي",
  description:
    "حمّل تطبيق منصة دروسي لأندرويد: التخصصات والدليل البيداغوجي للمتربص، مع نفس حساب المنصة.",
};

const APK = "/downloads/dordoc-1.5.5.apk";

export default function DownloadPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-primary hover:underline">
        ← العودة إلى المنصة
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <Image
          src="/icons/icon-192.png"
          alt="منصة دروسي"
          width={72}
          height={72}
          className="rounded-2xl"
        />
        <div>
          <h1 className="text-2xl font-extrabold text-ink">تطبيق منصة دروسي</h1>
          <p className="mt-1 text-sm text-soft">التخصصات والدليل البيداغوجي للمتربص</p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">الإصدار 1.5.5</p>
            <p className="mt-1 text-xs text-soft">أندرويد 7.0 أو أحدث · ملف APK</p>
          </div>
          <a
            href={APK}
            download
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-deep"
          >
            تحميل التطبيق
          </a>
        </div>
        <p className="mt-3 text-xs text-soft">
          بعد التحميل افتح الملف، وإن طلب الهاتف السماح بالتثبيت من مصادر غير
          معروفة ففعّل الإذن مؤقتاً ثم أكمِل التثبيت.
        </p>
      </div>

      <section className="mt-6 rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-extrabold text-ink">Google Play</h2>
        <p className="mt-2 text-sm leading-7 text-soft">
          نسخة Google Play قيد النشر. بعد الموافقة ستجد رابط التطبيق هنا وفي صفحة
          المنصة. يمكنك استخدام نسخة APK الحالية في الانتظار؛ الحساب والرصيد
          نفساهما.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-extrabold text-ink">ماذا يقدّم التطبيق؟</h2>
        <ul className="mt-2 list-disc space-y-1 ps-5 text-sm leading-7 text-soft">
          <li>تصفّح التخصصات ومخططات الدروس ومذكرات الدروس.</li>
          <li>تسجيل الدخول بنفس حساب المنصة (الحسابات تُنشأ من لوحة الإدارة).</li>
          <li>روابط تحميل لمرة واحدة للأدلة وملفات التخصصات — لا تُشارك الروابط.</li>
          <li>فتح روابط التحميل داخل التطبيق تلقائياً عبر deep link عند مشاركتها.</li>
          <li>نفس حساب المنصة ونفس رصيد التحميل الذي يحدده المسؤول.</li>
          <li>حذف الحساب من داخل التطبيق (الحذف النهائي من لوحة الإدارة).</li>
        </ul>
      </section>

      <p className="mt-6 text-xs leading-6 text-soft">
        لاستخدام التطبيق سجّل الدخول بالحساب نفسه. كل فتح أو تحميل يخصم من
        رصيدك، وكل رابط تحميل صالح لمحاولة واحدة فقط ولفترة قصيرة، وعند النفاد
        تظهر رسالة «التحميل محدود من المسؤول».
      </p>

      <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/privacy" className="text-primary hover:underline">
          سياسة الخصوصية
        </Link>
        <Link href="/login" className="text-primary hover:underline">
          تسجيل الدخول
        </Link>
      </div>

      <footer className="mt-10 border-t border-line pt-4 text-xs text-soft">
        حقوق التصميم و النشر والمشاركة للأستاذ حمزة شعيب
      </footer>
    </main>
  );
}
