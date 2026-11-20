# روابط التحميل

مشروع Next.js + PostgreSQL يعرض كتالوج التخصصات (specialties) مع روابط التحميل، ويعمل كتطبيق PWA.

## التشغيل المحلي

1. ثبت التبعيات:

   ```sh
   npm install
   ```

2. اعمل نسخة من `.env.example` لـ `.env` واملأ `DATABASE_URL`:

   ```sh
   cp .env.example .env
   ```

3. تأكد من تشغيل PostgreSQL محليًا، ثم أنشئ جداول قاعدة البيانات عبر drizzle (مخططها في `drizzle.config.json`):

   ```sh
   npx drizzle-kit push
   ```

4. شغّل التطبيق:

   ```sh
   npm run dev
   ```

   ثم افتح [http://localhost:3000](http://localhost:3000).

5. لوحة الإدارة: افتح عنوان `/admin` وأدخل كلمة المرور من `ADMIN_PASSWORD` في ملف `.env`.

> عند أول استدعاء لـ `/api/specialties` تُعبأ تلقائيًا 10 تخصصات تجريبية (`DEMO_SPECIALTIES`) إن كان الجدول فارغًا.

## متغيرات البيئة (`.env`)

| المتغير | مطلوب | الوصف |
| --- | --- | --- |
| `DATABASE_URL` | نعم | رابط قاعدة PostgreSQL (مثال: `postgresql://postgres:postgres@127.0.0.1:5432/app_db`) |
| `ADMIN_PASSWORD` | لاستخدام `/admin` | كلمة مرور المسؤول |
| `SESSION_SECRET` | اختياري | سر توقيع جلسات المستخدمين (قيمة افتراضية داخلية) |
| `ADMIN_SECRET` | اختياري | مفتاح توقيع التوكن الإداري (يستخدم `ADMIN_PASSWORD` بديلاً له إن لم يُعطى) |
| `ADMIN_DEMO_PASSWORD` | اختياري | كلمة مرور تجريبية (لا تعمل في بيئة `production`) |
| `COOKIE_SECURE` | اختياري | `1` لتعليم كوكيز الجلسة Secure (مفعّل تلقائيًا عبر HTTPS) |

## الأوامر

- `npm run dev` — تشغيل بيئة التطوير
- `npm run build` — بناء للإنتاج
- `npm run start` — تشغيل البناء
- `npm run typecheck` — فحص الأنواع (`tsc --noEmit`)
- `npm run lint` — فحص ESLint

## الهيكل

- `src/app/` — صفحات App Router (`/`, `/login`, `/register`, `/admin`, `/specialty/[id]` ومسارات `api/`)
- `src/components/` — مكونات الواجهة (Home, SpecialtyCard, SpecialtyDetail, AdminPanel, …)
- `src/lib/` — auth, admin-auth, admin-http, client, i18n, locales, parseDocx, seed
- `src/db/` — schema.ts (drizzle) + index.ts (pool)
- `src/types/` — أنواع التخصصات
- `public/` — manifest.json + sw.js + أيقونات PWA

## على GitHub

المستودع: https://github.com/hhamozo28-droid/all_rep (فرع `main`).
