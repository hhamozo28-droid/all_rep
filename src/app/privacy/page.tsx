import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "سياسة الخصوصية — منصة دروسي",
  description:
    "سياسة الخصوصية وحذف الحساب في منصة دروسي: البيانات التي نجمعها، وكيف نستخدمها ونحميها.",
};

const section = "mt-8";
const heading = "text-lg font-extrabold text-ink";
const body = "mt-2 space-y-2 text-sm leading-7 text-soft";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-primary hover:underline">
        ← العودة إلى المنصة
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-ink">سياسة الخصوصية</h1>
      <p className="mt-1 text-xs text-soft">آخر تحديث: 24 نوفمبر 2026</p>

      <p className={`${body} mt-4`}>
        تنطبق هذه السياسة على منصة دروسي (الموقع وتطبيق أندرويد)، وتوضح البيانات
        التي نجمعها، وكيف نستخدمها ونحفظها، وحقوقك في حذف حسابك.
      </p>

      <section className={section}>
        <h2 className={heading}>1. البيانات التي نجمعها</h2>
        <ul className={`${body} list-disc ps-5`}>
          <li>البريد الإلكتروني الذي تسجّل به.</li>
          <li>
            كلمة المرور: تُحفظ بصيغة مشفّرة (hash) للتحقق عند الدخول، ويحتفظ
            مسؤول المنصة بنسخة قابلة للاستعادة لأغراض إدارة الحساب ومساعدتك إذا
            نسيت كلمة المرور. لا يطّلع عليها إلا المسؤول.
          </li>
          <li>اللغة المفضلة (العربية/الإنجليزية/الفرنسية).</li>
          <li>عدد التحميلات التي استهلكتها وحدّ التحميل الذي يحدده المسؤول.</li>
          <li>
            معرّف جهاز عشوائي يُنشأ داخل التطبيق أو المتصفح، ويُستخدم لمنع فتح
            أكثر من جلسة للحساب نفسه.
          </li>
          <li>سجل التحميلات (التخصص أو ملف الدليل) لأغراض الإحصاء وإدارة الرصيد.</li>
          <li>كوكي الجلسة <code dir="ltr">dl_session</code> لإبقائك مسجّل الدخول.</li>
        </ul>
        <p className={body}>
          لا نجمع الموقع الجغرافي، ولا جهات الاتصال، ولا الصور أو الملفات
          الشخصية، ولا نستخدم إعلانات أو أدوات تتبّع تسويقي.
        </p>
      </section>

      <section className={section}>
        <h2 className={heading}>2. كيف نستخدم البيانات</h2>
        <ul className={`${body} list-disc ps-5`}>
          <li>إنشاء حسابك وتسجيل دخولك وتأمين الجلسة.</li>
          <li>تطبيق حدود التحميل التي يضبطها مسؤول المنصة.</li>
          <li>إحصاءات مجمّعة عن التخصصات والملفات الأكثر طلباً.</li>
          <li>منع إساءة الاستخدام والحسابات المتعددة.</li>
          <li>مساعدتك في استعادة حسابك أو حذفه بطلب منك.</li>
        </ul>
      </section>

      <section className={section}>
        <h2 className={heading}>3. المشاركة مع مزوّدي الخدمة</h2>
        <p className={body}>
          لا نبيع بياناتك ولا نشاركها لأغراض تجارية. نستخدم مزوّدي خدمة
          لتشغيل المنصة فقط:
        </p>
        <ul className={`${body} list-disc ps-5`}>
          <li>Vercel لاستضافة الموقع والـ API.</li>
          <li>Neon لقاعدة بيانات الحسابات والإحصاءات.</li>
          <li>GitHub لتخزين ملفات الدليل البيداغوجي (PDF).</li>
        </ul>
        <p className={body}>
          قد تُعالج هذه البيانات خارج بلد إقامتك وفق سياسات هؤلاء المزوّدين.
        </p>
      </section>

      <section className={section}>
        <h2 className={heading}>4. مدة الاحتفاظ وحذف الحساب</h2>
        <p className={body}>
          التفاصيل الكاملة والخطوات متوفرة في صفحة{" "}
          <Link href="/delete-account" className="font-semibold text-primary hover:underline">
            حذف الحساب
          </Link>
          .
        </p>
        <ul className={`${body} list-disc ps-5`}>
          <li>
            يمكنك تعطيل حسابك في أي وقت من داخل الموقع أو التطبيق عبر
            «حذف الحساب». يتوقف الدخول فوراً، وتبقى بيانات الحساب ظاهرة
            لمسؤول المنصة فقط.
          </li>
          <li>
            الحذف النهائي يتم من لوحة الإدارة بناءً على طلبك. عندها تُحذف بيانات
            الحساب، ويبقى البريد الإلكتروني وحده في سجل خاص لمنع إعادة التسجيل
            به مستقبلاً.
          </li>
          <li>لا يمكن استرجاع الحساب بعد الحذف النهائي.</li>
        </ul>
      </section>

      <section className={section}>
        <h2 className={heading}>5. الأمان</h2>
        <p className={body}>
          نستخدم اتصالاً مشفّراً (HTTPS)، وتشفير كلمات المرور للتحقق، وجلسات
          موقّعة، وصلاحيات إدارية منفصلة. مع ذلك، لا يمكن ضمان أمان أي خدمة على
          الإنترنت بنسبة 100%، لذا استخدم كلمة مرور قوية وفريدة.
        </p>
      </section>

      <section className={section}>
        <h2 className={heading}>6. الأطفال</h2>
        <p className={body}>
          المنصة تعليمية موجهة للمتربصين والأساتذة. إذا كان المستخدم قاصراً،
          فيُرجى استخدامها بإشراف ولي الأمر وبموافقته.
        </p>
      </section>

      <section className={section}>
        <h2 className={heading}>7. حقوقك</h2>
        <p className={body}>
          يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها نهائياً عبر التواصل
          مع مسؤول المنصة ببيانات الاتصال المنشورة في صفحة التطبيق على Google
          Play أو داخل المنصة. سنستجيب للطلبات خلال مدة معقولة.
        </p>
      </section>

      <section className={section}>
        <h2 className={heading}>8. تحديثات السياسة</h2>
        <p className={body}>
          قد نحدّث هذه السياسة عند تغيّر الميزات أو المتطلبات القانونية، وسيظهر
          تاريخ آخر تحديث في أعلى الصفحة. استمرارك في استخدام المنصة بعد التحديث
          يعني موافقتك على النسخة المحدّثة.
        </p>
      </section>

      <section className={section}>
        <h2 className={heading}>English summary</h2>
        <p className={body}>
          Dordoc (“منصة دروسي”) collects your email, a password (hashed for
          login, with a recoverable copy kept by the platform administrator for
          account support), your language, download count/limit, a random device
          identifier used to prevent multiple sessions, download history, and the
          session cookie. We do not sell your data or use advertising/tracking.
          Data is processed by Vercel (hosting), Neon (database), and GitHub
          (guide PDF storage). You can disable your account in-app at any time;
          permanent deletion is performed by the administrator, after which the
          email is retained only to prevent re-registration. For privacy
          requests, contact the platform administrator using the contact details
          on the Google Play listing.
        </p>
      </section>

      <footer className="mt-12 border-t border-line pt-4 text-xs text-soft">
        حقوق التصميم و النشر والمشاركة للأستاذ حمزة شعيب
      </footer>
    </main>
  );
}
