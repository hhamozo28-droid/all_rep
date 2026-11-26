# -*- coding: utf-8 -*-
"""Flowchart generator per skill 'مهارة - بناء دياغرام التمارين والمحتوى'.
2 diagrams per lesson: theory steps flow + case decision flow.
Renders with mermaid-cli (Chromium handles Arabic). QC: ratio h/w <= 2.1 (RL fallback).
"""
import os, json, subprocess, concurrent.futures as cf
from PIL import Image

SUBJ = json.load(open("/home/user/pipeline/ele0701_subjects.json", encoding="utf-8"))
FDIR = "/home/user/pipeline/flows"
PDIR = "/home/user/pipeline/memo_imgs/flow"
os.makedirs(FDIR, exist_ok=True)
os.makedirs(PDIR, exist_ok=True)

INIT = ('%%{init: {"theme":"base","themeVariables":{"fontFamily":"IBM Plex Sans Arabic, DejaVu Sans",'
        '"fontSize":"22px","primaryColor":"#F2EFE7","primaryTextColor":"#222B33","primaryBorderColor":"#22414A",'
        '"lineColor":"#B5733A","tertiaryColor":"#FCF0E4"},'
        '"flowchart":{"curve":"basis","nodeSpacing":34,"rankSpacing":42}}}%%')

CLS = ("classDef start fill:#1F4E79,color:#ffffff,stroke:#14375A;\n"
       "classDef proc fill:#F2F6FB,color:#222B33,stroke:#22414A;\n"
       "classDef dec fill:#FDE7CE,color:#7A4A00,stroke:#B5733A;\n"
       "classDef io fill:#FCF0E4,color:#222B33,stroke:#B5733A;\n")

# per-module short steps + case nodes (<= 6 words per node)
FL = {
 "MC1": {"steps": ["تحديد مهارات كهربائي السيارات", "التعريف بمراحل التكوين", "تنظيم الورشة والأدوات", "إعداد خطة التعلم", "الاندماج والتواصل المهني"],
   "q": "الخطة مطابقة للبرنامج؟", "fix": "تعديل الخطة والمراجعة"},
 "MC2": {"steps": ["جمع معلومات المنتج والخدمة", "قراءة الفاتورة والضمان", "التحقق من المواصفات", "متابعة الخدمة بعد البيع", "معالجة الشكوى إداريًا"],
   "q": "الفاتورة كاملة البيانات؟", "fix": "استكمال الوثائق والاعتماد"},
 "MC3": {"steps": ["تحديد المعطيات والوحدات", "اختيار العلاقة المناسبة", "إجراء الحساب بدقة", "المقارنة بالقيمة المرجعية", "توثيق القيم المقاسة"],
   "q": "النتيجة مطابقة للمرجع؟", "fix": "إعادة الحساب وتصحيح القياس"},
 "MC4": {"steps": ["رسم الدائرة وعناصرها", "حساب المقاومة المكافئة", "حساب التيارات والجهود", "التحقق بالملتيميتر", "توثيق النتائج"],
   "q": "القياس مطابق للنظري؟", "fix": "تتبع العطل في الدائرة"},
 "MC5": {"steps": ["قراءة رمز المكوّن", "الفحص بالملتيميتر", "استبدال المكوّن المعطوب", "إعادة اختبار الدائرة", "توثيق القيم قبل وبعد"],
   "q": "المكوّن ضمن المواصفة؟", "fix": "استبدال المكوّن بمعتمد"},
 "MC6": {"steps": ["التعريف بالضفيرة وأقسامها", "تتبع الدائرة بالمخطط", "فحص الوصلات والتلامسات", "استبدال العناصر التالفة", "اختبار الوظائف"],
   "q": "التوصيل سليم وثابت؟", "fix": "إصلاح الوصلة أو المصهر"},
 "MC7": {"steps": ["تحديد نوع المخطط ورموزه", "تتبّع دائرة التغذية", "تتبّع دائرة الإرجاع", "مطابقة المخطط بالواقع", "تدوين الملاحظات"],
   "q": "المسار مطابق للمخطط؟", "fix": "تصحيح التوصيل حسب المخطط"},
 "MC8": {"steps": ["تهيئة جهاز التشخيص", "قراءة الأكواد وتفكيكها", "البحث في قاعدة البيانات", "توثيق التقرير وحفظه", "مسح الأكواد بعد الإصلاح"],
   "q": "الأكواد تشير لعطل؟", "fix": "تنفيذ الإصلاح الموصى به"},
 "MC9": {"steps": ["تحديد المخاطر المهنية", "استخدام المعدات الواقية", "تنظيم الطوارئ والإخلاء", "تصريف النفايات وفق القواعد", "مراجعة خطة الوقاية"],
   "q": "الإجراءات مطابقة للقانون؟", "fix": "تصحيح المخالفة فورًا"},
 "MC10": {"steps": ["تحليل عرض العمل", "إعداد سيرة ذاتية مخصصة", "التحضير لأسئلة المقابلة", "المتابعة بعد المقابلة", "تحديث قاعدة المهارات"],
   "q": "الطلب مطابق للشروط؟", "fix": "تحسين الملف وإعادة الإرسال"},
 "MQ1": {"steps": ["فحص البطارية والجهد", "فحص سحب البادئ", "فحص الملف المغناطيسي", "فحص البندكس والحذافة", "اختبار التشغيل النهائي"],
   "q": "الجهد 12.4–12.7V؟", "fix": "شحن البطارية أو تغييرها"},
 "MQ2": {"steps": ["قياس الجهد الساكن", "القياس عند التشغيل", "فحص الحزام والبكرات", "فحص الديودات والمنظم", "اختبار التحمل بالأحمال"],
   "q": "الشحن 13.8–14.5V؟", "fix": "استبدال المنظّم أو الديودات"},
 "MQ3": {"steps": ["تحديد نوع العطل أولًا", "فحص التغذية والإرجاع", "استبدال العنصر التالف", "ضبط الأضواء بالجهاز", "اختبار الإنارة كلها"],
   "q": "الدائرة تغذي المصباح؟", "fix": "إصلاح المصهر أو المرحل"},
 "MQ4": {"steps": ["قراءة أكواد الأعطال", "فحص البواجي والفجوة", "فحص ملفات الإشعال", "فحص التوقيت والكاشف", "جولة اختبار نهائية"],
   "q": "الشرارة ضمن المعيار؟", "fix": "ضبط الفجوة أو تغيير البواجي"},
 "MQ5": {"steps": ["قراءة البيانات الحية", "فحص ضغط الوقود", "فحص الحاقنات والمقاومة", "فحص الحساسات والمقارنات", "اختبار القيادة والتوثيق"],
   "q": "المقاومة 11–17Ω؟", "fix": "تنظيف الحاقن أو تغييره"},
 "MQ6": {"steps": ["تشخيص نطاق العطل", "فحص التغذية والإشارات", "استبدال المحرّك أو الوحدة", "اختبار القفل المركزي", "برمجة المفتاح الجديد"],
   "q": "المحرّك يستجيب للمفتاح؟", "fix": "تغيير المحرّك أو الوحدة"},
 "MQ7": {"steps": ["قراءة مخطط التوصيل", "توصيل التغذية والمفاتيح", "توصيل السماعات بالقطبية", "عزل الوصلات وتنظيمها", "الضبط والاختبار الصوتي"],
   "q": "الصوت واضح بكل السماعات؟", "fix": "تصحيح التوصيل أو السماعة"},
 "MQ8": {"steps": ["قياس ضغطي الدائرة", "كشف التسريبات", "التفريغ بالجهاز", "التعبئة بالكمية المحددة", "اختبار التبريد والتوثيق"],
   "q": "الضغط المنخفض سليم؟", "fix": "كشف التسريب وإصلاحه"},
 "MQ9": {"steps": ["تحديد العطل بالاختبار", "تتبّع الضفيرة والوصلات", "استبدال المحرّك أو المفتاح", "اختبار الوظيفة كاملة", "تنظيف وتنظيم الضفيرة"],
   "q": "الوظيفة عادت كاملة؟", "fix": "إعادة الفحص والتوصيل"},
}

def words6(t):
    w = str(t).split()
    return " ".join(w[:6])

def theory_mmd(mc, title, steps):
    s = steps
    return f"""{INIT}
flowchart TD
  S(["بداية"]) --> A["درس: {words6(title)}"]
  A --> B1["{s[0]}"]
  B1 --> B2["{s[1]}"]
  B2 --> B3["{s[2]}"]
  B3 --> B4["{s[3]}"]
  B4 --> B5["{s[4]}"]
  B5 --> Z(["نهاية"])
{CLS}class S,Z start;
class A,B1,B2,B3,B4,B5 proc;
"""

def case_mmd(mc, title, q, fix):
    return f"""{INIT}
flowchart TD
  S(["بداية"]) --> A["وضعية: {words6(title)}"]
  A --> B["فحص بصري وتتبع الدائرة"]
  B --> C{{"{q}"}}
  C -- نعم --> D["إنهاء الفحص والتوثيق"]
  C -- لا --> E["{fix}"]
  E --> F{{"العطل اختفى؟"}}
  F -- نعم --> G["اختبار التحمل والتسليم"]
  F -- لا --> H["إعادة التشخيص"]
  H --> B
  D --> Z(["نهاية"])
  G --> Z
{CLS}class S,Z start;
class A,B,E,G,H proc;
class C,F dec;
class D io;
"""

def render(mmd_path, png_path, rl=False):
    src = mmd_path
    if rl:
        src = mmd_path.replace(".mmd", "_RL.mmd")
        t = open(mmd_path, encoding="utf-8").read().replace("flowchart TD", "flowchart RL")
        open(src, "w", encoding="utf-8").write(t)
    cmd = ["npx", "--yes", "@mermaid-js/mermaid-cli@11", "-i", src, "-o", png_path, "-b", "white", "-w", "1200"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    return r.returncode == 0 and os.path.exists(png_path)

def ratio(png):
    w, h = Image.open(png).size
    return h / w, w

def main():
    jobs = []
    for subj in SUBJ:
        mc = subj["code"]
        fl = FL.get(mc) or FL["MC4"]
        for l in subj["lessons"]:
            n = int(l["num"])
            for kind, mmd in (("t", theory_mmd(mc, l["title_ar"], fl["steps"])),
                              ("c", case_mmd(mc, l["title_ar"], fl["q"], fl["fix"]))):
                mmd_path = os.path.join(FDIR, f"{mc}_{n:02d}_{kind}.mmd")
                png_path = os.path.join(PDIR, f"{mc}_{n:02d}_{kind}.png")
                open(mmd_path, "w", encoding="utf-8").write(mmd)
                jobs.append((mmd_path, png_path))
    print("mmd files:", len(jobs))
    # warmup (sequential, downloads chromium on first run)
    warm = os.path.join(FDIR, "_warmup.mmd")
    open(warm, "w", encoding="utf-8").write(INIT + '\nflowchart TD\n  A["اختبار"] --> B(["نهاية"])\n')
    okw = render(warm, os.path.join(PDIR, "_warmup.png"))
    print("warmup:", okw)
    fails = []
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        futs = {ex.submit(render, m, p): (m, p) for m, p in jobs}
        for i, f in enumerate(cf.as_completed(futs)):
            m, p = futs[f]
            try:
                if not f.result():
                    fails.append(p)
            except Exception:
                fails.append(p)
            if (i + 1) % 50 == 0:
                print("rendered", i + 1)
    print("first-pass fails:", len(fails))
    # QC: ratio > 2.1 -> retry RL, keep better
    fixed, still = 0, 0
    for mmd_path, png_path in jobs:
        if not os.path.exists(png_path):
            continue
        r, w = ratio(png_path)
        if r > 2.4:  # degenerate TD only; RL acceptable ONLY if balanced
            rl_png = png_path.replace(".png", "_RL.png")
            if render(mmd_path, rl_png, rl=True):
                r2, w2 = ratio(rl_png)
                if 0.35 <= r2 <= 2.1 and abs(r2 - 1) < abs(r - 1):
                    os.replace(rl_png, png_path)
                    fixed += 1
                else:
                    os.remove(rl_png)   # keep tall-but-readable TD
                    still += 1
            else:
                still += 1
    print("RL-fixed:", fixed, "still-tall:", still)
    ok = sum(1 for _, p in jobs if os.path.exists(p))
    print("PNG total:", ok, "/", len(jobs))

if __name__ == "__main__":
    main()
