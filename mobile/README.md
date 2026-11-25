# منصة دروسي — تطبيق أندرويد (Flutter)

تطبيق أندرويد رسمي لمنصة دروسي، يعيد استخدام نفس واجهات الـ API الخاصة بالموقع
(`https://allrep-theta.vercel.app`):

- تسجيل الدخول بنفس الحساب (كوكي `dl_session` محفوظ محلياً).
- تبويب **التخصصات**: بطاقات التخصصات مع مخططات الدروس ومذكرات الدروس.
- تبويب **الدليل البيداغوجي للمتربص**: فتح/تحميل ملفات PDF.
- كل ملف يُفتح عبر رابط تحميل **لمحاولة واحدة** ولفترة قصيرة؛ الروابط الخام
  لم تعد تُرسل إلى التطبيق أو المتصفح.
- كل فتح أو تحميل يخصم من رصيد الحساب، وعند النفاد تظهر رسالة
  «التحميل محدود من المسؤول».
- قائمة الحساب: تسجيل الخروج أو **حذف الحساب** (تعطيل فوري، والحذف النهائي
  من لوحة الإدارة فقط، والبريد لا يُسجَّل مرة أخرى أبداً).

> **ملاحظة:** المشروع كامل وجاهز للبناء، ويشمل مجلد `android/` المُولّد
> وإعدادات الاسم والإذن والتوقيع. سكربت `setup.ps1` يعيد التهيئة بأمان عند
> الحاجة (مثلاً بعد تثبيت Flutter على جهاز جديد).

---

## 1. المتطلبات

| الأداة | الإصدار |
| --- | --- |
| Flutter SDK | 3.24 أو أحدث (يفضّل آخر إصدار مستقر) |
| Android Studio | آخر إصدار (يأتي معه Android SDK و JDK) |
| Android SDK | API 34 أو أحدث |
| جهاز/محاكي أندرويد | API 21+ |

تثبيت Flutter على Windows:
<https://docs.flutter.dev/get-started/install/windows/mobile>

بعد التثبيت تأكد من:

```powershell
flutter doctor
```

يجب أن تظهر علامة ✓ أمام Flutter و Android toolchain.

---

## 2. الإعداد الأولي

من داخل مجلد `mobile`:

```powershell
.\setup.ps1
```

يقوم السكربت بـ:

1. `flutter create --platforms=android` لإنشاء مجلد `android/` إن لم يكن
   موجوداً (مع الحفاظ على ملفات `lib/` و`pubspec.yaml` و`README.md`).
2. `flutter pub get`.
3. إضافة إذن `INTERNET` إلى `AndroidManifest.xml`.
4. ضبط اسم التطبيق الظاهر: **منصة دروسي**.
5. ضبط `applicationId` إلى `com.hamzachoaib.dordoc` (غيّره قبل أول نشر إن أردت).
6. توليد أيقونة التطبيق من `assets/icon.png`.
7. `flutter analyze`.

إذا ظهر خطأ صلاحيات عند تشغيل السكربت:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

---

## 3. التشغيل

```powershell
flutter devices          # للتأكد من رؤية الهاتف/المحاكي
flutter run
```

### تجربة محلية مقابل خادم Next.js

شغّل الموقع محلياً ثم:

```powershell
flutter run --dart-define=API_BASE=http://10.0.2.2:3000
```

- `10.0.2.2` هو عنوان جهاز الكمبيوتر من داخل محاكي أندرويد.
- على هاتف حقيقي استخدم عنوان IP للكمبيوتر على نفس الشبكة، مثل
  `http://192.168.1.10:3000`.
- الاتصال بـ HTTP (غير مشفّر) يحتاج إضافة
  `android:usesCleartextTraffic="true"` مؤقتاً إلى وسم `<application>` في
  `android/app/src/main/AndroidManifest.xml`. **لا تتركه في نسخة النشر.**

---

## 4. بناء نسخة التوزيع

```powershell
.\setup.ps1 -Build
```

أو يدوياً:

```powershell
flutter build apk --release
flutter build appbundle --release
```

المخرجات:

- APK للتوزيع المباشر (رابط تحميل):
  `build\app\outputs\flutter-apk\app-release.apk`
- حزمة Google Play:
  `build\app\outputs\bundle\release\app-release.aab`

---

## 4.1 ملفات جاهزة على هذا الجهاز

- **APK موقّع** (للتوزيع المباشر): `public/downloads/dordoc-1.5.0.apk`
  ويُخدم عبر الصفحة `https://allrep-theta.vercel.app/download`.
- **AAB موقّع** (لـ Google Play):
  `build/app/outputs/bundle/release/app-release.aab`
  ونسخة جاهزة على سطح المكتب: `dordoc-1.5.0.aab`.
- **مفتاح التوقيع**: `%USERPROFILE%\dordoc-keys\dordoc-release.jks`.
- **كلمات المفتاح**: `android/key.properties` (مستثنى من git — لا ترفعه).
- **بصمة الشهادة SHA-256**:
  `23322dace33cc6f6b52271f3322f9d9ac3927102f79502e83545fb0acd82bc4b`.

> احتفظ بنسخة احتياطية من ملف `.jks` ومن `key.properties` في مكان آمن خارج
> الجهاز. فقدانهما يمنع تحديث التطبيق على Google Play بنفس الهوية (يمكن طلب
> إعادة تعيين مفتاح الرفع من Play Console، لكن الأفضل تجنّب ذلك).

---

## 5. التوقيع (مهم قبل التوزيع)

بدون إعداد التوقيع، يوقّع Flutter نسخة release بمفتاح debug، وهذا **غير صالح
لـ Google Play** ولا يسمح بتحديثات لاحقة متسقة. أنشئ مفتاح إصدار واحداً
واستخدمه للتوزيع المباشر ولـ Play معاً:

> على هذا الجهاز المفتاح موجود بالفعل (انظر 4.1)؛ الأوامر التالية للتوثيق أو
> لإعادة الإنشاء على جهاز آخر. لا تُعد إنشاء المفتاح فوق ملف موجود.

```powershell
# احفظ الملف خارج المستودع (لا ترفعه إلى GitHub أبداً)
New-Item -ItemType Directory -Force "$HOME\dordoc-keys" | Out-Null
keytool -genkeypair -v -keystore "$HOME\dordoc-keys\dordoc-release.jks" `
  -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias dordoc
```

أنشئ `android/key.properties`:

```properties
storePassword=كلمة_سر_المخزن
keyPassword=كلمة_سر_المفتاح
keyAlias=dordoc
storeFile=C:/Users/اسم_المستخدم/dordoc-keys/dordoc-release.jks
```

المشروع مُعدّ مسبقاً لقراءة إعداد التوقيع من `android/key.properties`
تلقائياً (انظر `android/app/build.gradle.kts`). يكفي إنشاء الملف أعلاه ثم:

```powershell
flutter build appbundle --release
```

> بدون `key.properties` يستخدم البناء مفتاح debug (مناسب للتجربة فقط، وليس
> للنشر على Google Play).

احتفظ بنسخة احتياطية آمنة من ملف `.jks` وكلماته؛ فقدانه يعني عدم القدرة على
تحديث التطبيق على Play.

---

## 6. النشر على Google Play

1. أنشئ حساب Google Play Console (رسوم تسجيل لمرة واحدة).
2. أنشئ تطبيقاً جديداً باسم **منصة دروسي**، اللغة الافتراضية العربية.
3. ارفع `app-release.aab` في مسار **Production → Create new release**.
4. أكمل النماذج الإلزامية:
   - **App access**: التطبيق يتطلب تسجيل دخول، لذا أضف حساب اختبار مع كلمة
     مروره وخطوات الدخول.
   - **Data safety**: البريد الإلكتروني، كلمة المرور، معرّف الجهاز، وسجل
     التحميلات — تُجمع لأغراض إدارة الحساب والأمان، ولا تُشارك مع أطراف ثالثة.
   - **Privacy policy**: `https://allrep-theta.vercel.app/privacy`
   - **Content rating** و**Target audience** و**Ads** (لا إعلانات).
5. الأصول المطلوبة:
   - أيقونة 512×512 PNG (متوفرة: `assets/icon.png`).
   - Feature graphic 1024×500.
   - لقطات شاشة للهاتف (على الأقل 2).
   - وصف قصير (80 حرفاً) ووصف كامل.
6. أرسل للمراجعة. بعد الموافقة سيظهر التطبيق على Play.

### توزيع مباشر (APK)

يمكنك في نفس الوقت نشر `app-release.apk` على موقعك أو Google Drive. استخدم
**نفس مفتاح التوقيع** المستخدم في Play حتى يستطيع المستخدمون الانتقال بين
النسختين دون إلغاء تثبيت. أضف رابط التحميل في صفحة المنصة إن أردت.

---

## 7. بنية المشروع

```
mobile/
├── pubspec.yaml               التبعيات والأيقونة
├── setup.ps1                  إعداد أندرويد + الفحص + البناء
├── assets/icon.png            أيقونة التطبيق (نفس هوية PWA)
└── lib/
    ├── main.dart              MaterialApp عربي RTL + بوابة الجلسة
    ├── api.dart               عميل HTTP وكوكي dl_session
    ├── strings.dart           نصوص الواجهة العربية
    └── screens/
        ├── login_screen.dart  «أهلا بك زميلي»
        └── home_screen.dart   التخصصات + الدليل + الرصيد + الحساب
```

---

## 8. ملاحظات فنية

- الجلسة: الخادم يسمح بجلسة واحدة لكل حساب؛ التطبيق يحفظ كوكي `dl_session`
  ويعيد إرساله، وأي 401 يعيد المستخدم إلى شاشة الدخول.
- الرصيد: `GET /api/downloads/status`، ويُحدَّث بعد كل عملية.
- فتح الدليل: `POST /api/guides/{id}/track` ثم
  `GET /api/guides/{id}/file`. التحميل يحفظ نسخة داخل مجلد التطبيق ويفتحها
  عبر `open_filex`؛ الفتح يستخدم مجلداً مؤقتاً.
- روابط التخصصات: `POST /api/specialties/track` ثم فتح الرابط في المتصفح.
- حذف الحساب: `POST /api/auth/delete`، ثم مسح الكوكي والعودة لشاشة الدخول.
- التطبيق أندرويد فقط حالياً؛ لدعم iOS لاحقاً شغّل
  `flutter create --platforms=ios .` وأضف إعدادات التوقيع.

---

## 9. استكشاف الأخطاء

| المشكلة | الحل |
| --- | --- |
| `flutter` غير معروف | أعد فتح PowerShell بعد التثبيت أو أضف `flutter\bin` إلى PATH |
| تعذّر الاتصال بالخادم | تحقق من الإنترنت، ومن `API_BASE` عند التجربة المحلية |
| `401` بعد فتح التطبيق | انتهت الجلسة — سجّل الدخول من جديد |
| «التحميل محدود من المسؤول» | استهلك الحساب رصيده؛ يرفعه المسؤول من لوحة الإدارة |
| فشل فتح PDF | تأكد من وجود تطبيق قارئ PDF على الجهاز |
| خطأ `com.example` في Play | شغّل `setup.ps1` لضبط `applicationId` |
