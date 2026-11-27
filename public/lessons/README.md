# ملفات الدروس — التخزين النهائي على Internet Archive

هذا المجلد مخصص لتنزيل/فك ضغط ملفات الدروس (PDF / DOCX) قبل رفعها. **التخزين النهائي على Internet Archive**، وليس على Vercel.

## مخطط الروابط في قاعدة البيانات

| الحقل | المحتوى | الظهور في المنصة |
|---|---|---|
| `specialties.links` | روابط GoFile الأصلية (مخططات / مذكرات) | قسم «روابط التحميل» |
| `specialties.other_links` | روابط الملفات المرفوعة على Archive | تبويب «روابط أخرى» أسفل قسم GoFile |

الروابط في `other_links` عامة ومباشرة:
```
https://archive.org/download/<code-lower>/<المجلد>/<اسم-الملف>
```
لا يوجد `middleware` ولا إعادة توجيه عبر Vercel؛ Vercel يستضيف الواجهة والـ API فقط.

## رفع ملف جديد

1. ضع الملفات داخل `public/lessons/<CODE>/المخططات/` و`public/lessons/<CODE>/المذكرات/`.
2. ارفعها إلى Internet Archive عبر `D:\allrep\tools\upload-archive.mjs` (المفتاح: `<code-lower>/<المجلد>/<الملف>`).
3. حدّث `manifests/all.json` ثم شغّل:
   ```
   node scripts/sync-lessons-db.mjs --input-manifest=manifests/all.json --codes=<CODE> --dry-run
   node scripts/sync-lessons-db.mjs --input-manifest=manifests/all.json --codes=<CODE> --yes --backup=<file>
   ```
   السكربت يكتب في `other_links` ولا يمس `links`.

## التخصصات المنشورة حالياً

- `AGR0703` — https://archive.org/details/agr0703
- `AGR0713` — https://archive.org/details/agr0713
- `AGR0716` — https://archive.org/details/agr0716
- `AGR09Q` — https://archive.org/details/agr09q
- `AGR33Q` — https://archive.org/details/agr33q
- `ART0702` — https://archive.org/details/art0702
- `ART0711` — https://archive.org/details/art0711
- `BTP0701` — https://archive.org/details/btp0701
- `BTP0703` — https://archive.org/details/btp0703
- `BTP0705` — https://archive.org/details/btp0705
- `BTP0715` — https://archive.org/details/btp0715
- `BTP0722` — https://archive.org/details/btp0722
- `BTP1214` — https://archive.org/details/btp1214
- `INT0701P` — https://archive.org/details/int0701p
- `TAV06Q` — https://archive.org/details/tav06q
- `TAV0701` — https://archive.org/details/tav0701
- `THC0701` — https://archive.org/details/thc0701

## تفضيلات التسمية

استخدم أسماء عربية/لاتينية واضحة. تبقى الأسماء العربية كما هي في Archive، والروابط مُرمّزة UTF-8 تلقائياً.

## ملاحظة

الروابط المباشرة على Archive يمكن نسخها ومشاركتها، لذا لا تمر عبر نظام التحميل لمرة واحدة الخاص بـ GoFile.
