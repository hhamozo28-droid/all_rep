import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "حذف الحساب — منصة دروسي",
  description:
    "كيف تطلب حذف حسابك في منصة دروسي (الموقع وتطبيق أندرويد)، وما البيانات التي تُحذف وما يبقى منها.",
};

const section = "mt-8";
const heading = "text-lg font-extrabold text-ink";
const body = "mt-2 space-y-2 text-sm leading-7 text-soft";

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-primary hover:underline">
        ← العودة إلى المنصة
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-ink">حذف الحساب</h1>
      <p className="mt-1 text-xs text-soft">آخر تحديث: 24 نوفمبر 2026</p>

      <p className={`${body} mt-4`}>
        يمكنك تعطيل حسابك وحذفه في أي وقت، من الموقع أو من تطبيق أندرويد، دون
        الحاجة إلى مراسلة أحد. توضّح هذه الصفحة الخطوات وما يحدث للبيانات.
      </p>

      <section className={section}>
        <h2 className={heading}>1. الحذف من التطبيق أو الموقع</h2>
        <ol className={`${body} list-decimal ps-5`}>
          <li>سجّل الدخول إلى حسابك.</li>
          <li>
            من الموقع: افتح قائمة الحساب ثم اختر <strong>«حذف الحساب»</strong>.
            من تطبيق أندرويد: اضغط أيقونة الحساب أعلى الشاشة ثم{" "}
            <strong>«حذف الحساب»</strong>.
          </li>
          <li>أكّد العملية.</li>
        </ol>
        <p className={body}>
          يُعطَّل الحساب فوراً ويتوقف تسجيل الدخول إليه، وتُنهى جلستك الحالية.
        </p>
      </section>

      <section className={section}>
        <h2 className={heading}>2. ماذا يحدث بعد ذلك؟</h2>
        <ul className={`${body} list-disc ps-5`}>
          <li>
            يظهر الحساب في لوحة الإدارة بشارة «محذوف ذاتياً»، ويبقى مسؤول
            المنصة قادراً على مراجعة الطلب.
          </li>
          <li>
            يُنفّذ الحذف النهائي مسؤول المنصة. عندها تُحذف بيانات الحساب
            (كلمة المرور، اللغة، الرصيد، سجل التحميلات، معرّف الجهاز).
          </li>
          <li>
            يبقى <strong>البريد الإلكتروني وحده</strong> في سجل خاص يمنع إعادة
            التسجيل به مستقبلاً، ولا يُستخدم لأي غرض آخر.
          </li>
          <li>لا يمكن استرجاع الحساب بعد الحذف النهائي.</li>
        </ul>
      </section>

      <section className={section}>
        <h2 className={heading}>3. إذا لم تستطع الدخول</h2>
        <p className={body}>
          إن نسيت كلمة المرور أو تعذّر عليك الدخول، تواصل مع مسؤول المنصة عبر
          بيانات الاتصال المنشورة في صفحة التطبيق على Google Play أو داخل
          المنصة، واذكر البريد الإلكتروني لحسابك. سيُطلب منك تأكيد ملكية البريد
          قبل تنفيذ الحذف حفاظاً على أمان الحساب.
        </p>
      </section>

      <section className={section}>
        <h2 className={heading}>4. البيانات التي لا نحذفها</h2>
        <p className={body}>
          نحتفظ بالبريد الإلكتروني (بصيغة سجل منع إعادة التسجيل) فقط، إضافة إلى
          السجلات التقنية المجهولة اللازمة لأمن الخدمة. لا نحتفظ بأي بيانات
          تعليمية أو شخصية أخرى بعد اكتمال الحذف النهائي.
        </p>
      </section>

      <section className={section}>
        <h2 className={heading}>English summary</h2>
        <p className={body}>
          You can delete your Dordoc account at any time from the account menu
          in the website or the Android app. Deleting disables the account
          immediately and ends the session. The platform administrator then
          performs permanent deletion, after which account data (password,
          language, download balance/history, device identifier) is removed.
          Only the email address is retained, solely to prevent re-registration.
          If you cannot sign in, contact the platform administrator using the
          developer contact details on the Google Play listing and confirm
          ownership of the email address. Deletion is irreversible.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
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
