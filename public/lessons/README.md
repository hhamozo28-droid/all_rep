# ملفات الدروس — رابط مباشر

هذا المجلد يحتوي ملفات الدروس (PDF / Word) للتخصصات. الملفات تُخدَم مباشرة على نطاق المنصة، ويمكن نسخ رابطها وإضافته إلى `specialties.links`.

## رابط الرفع
https://github.com/hhamozo28-droid/all_rep/upload/main?path=public/lessons

المستودع: https://github.com/hhamozo28-droid/all_rep — الفرع: `main`

## رابط التحميل المباشر
بعد رفع الملف على `main` (ينتظر النشر التلقائي على Vercel دقائق):

```
https://allrep-theta.vercel.app/lessons/<CODE>/<اسم-الملف>
```

أو فوراً من GitHub بدون انتظار النشر:

```
https://raw.githubusercontent.com/hhamozo28-droid/all_rep/main/public/lessons/<CODE>/<اسم-الملف>
```

## صفحات فهرس المجلد (للتمرير)
لكل تخصص توجد صفحة `index.html` داخل `public/lessons/<CODE>/`، ويمكن مشاركة رابط المجلد نفسه:

```
https://allrep-theta.vercel.app/lessons/<CODE>/
```

## التخصصات المنشورة حالياً
- `TAV0701` — 32 ملف (PDF/DOCX) — https://allrep-theta.vercel.app/lessons/TAV0701/
- `TAV06Q`, `THC0701`, `THC0702` — قيد التنزيل (روابط GoFile مباشرة).

## تفضيلات التسمية
استخدم أسماء عربية/لاتينية واضحة. إن احتوى الاسم مسافات أو أحرف عربية، انسخ الرابط من شريط المتصفح بعد فتح الملف (سيكون مُرمّزاً تلقائياً).

## الاستخدام
ضع **رابط التحميل المباشر** في حقل رابط الدرس داخل التخصص (لوحة الإدارة / `specialties.links`). عند ضغط الرابط من التطبيق أو الموقع يُحمّل الملف مباشرة (بدون صفحة مشاركة مثل gofile).

## المزامنة مع قاعدة البيانات
استخدم `scripts/sync-lessons-db.mjs` (وضع `replace` افتراضياً) لاستبدال روابط ZIP بروابط الملفات. راجع `--dry-run` و`--scan-only` و`--input-manifest`.

## التخزين (R2)
الملفات النهائية (حوالي 13 GB لـ 54 تخصصًا) تُخزَّن في Cloudflare R2. Vercel يعيد توجيه `/lessons/:code/:file` إلى R2، لذا يبقى الرابط العام على `https://allrep-theta.vercel.app/lessons/...`.
