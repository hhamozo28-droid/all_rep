# -*- coding: utf-8 -*-
"""ELE0701 كهرباء السيارات — SUBJECTS built from parsed source plans (ele_content.json)."""
import json, re, unicodedata

def purify(s):
    """drop format/private-use chars and leading bullets from extracted text"""
    s = unicodedata.normalize("NFKC", str(s or ""))
    s = "".join(ch for ch in s if unicodedata.category(ch) not in ("Cf", "Co", "Cs", "Cc") or ch == "\n")
    s = re.sub(r'^[\s\u2022\u00b7\u2023\u2043\uf0b7\*\-–—]+', '', s)
    return s.strip()

DATA = json.load(open("/home/user/uploads/new_specialty/ele_content.json", encoding="utf-8"))
YP = json.load(open("/home/user/uploads/new_specialty/yearplan.json", encoding="utf-8"))["yearplan_hours"]
YP.setdefault("MQ9", 62)
KAF = {v["code"]: v for v in DATA["kafaa"].values() if v.get("code")}

def short(t, n=52):
    t = re.sub(r'\s+', ' ', t or '').strip()
    return t[:n] + ('…' if len(t) > n else '')

def clean_lines(s):
    return ' '.join(x.strip() for x in (s or '').split('\n') if x.strip())

GOALS = [
    "أن يستقبل الوضعية المشكلة ويربطها بمكتسباته القبلية.",
    None,  # filled per-lesson with the title
    "أن ينجز التطبيق الموجّه بدقة واحترام منهجية العمل.",
    "أن ينتج إنتاجًا مستقلًا وفق معايير الأداء ويقيّم ذاته.",
    "أن يلخّص المكتسبات ويؤدي الواجب المنزلي.",
]
BG5 = None  # set by driver (plan_lib colors)

SUBJECTS = []
for code in sorted(DATA["modules"], key=lambda c: (c[:2], int(c[2:]))):
    m = DATA["modules"][code]
    k = KAF.get(code, {})
    els = [purify(e) for e in (k.get("elements") or [])]
    name_fr = purify(k.get("name_fr")) or "Module"
    competency_fr = purify(k.get("competency_fr")) or name_fr
    kind = "Qualifiant (MQ)" if code.startswith("MQ") else "Complémentaire (MC)"
    lessons = []
    for l in m["lessons"]:
        n = l["num"]
        lh = l.get("lesson_h") or 4
        tph = 2 if lh >= 4 else 0
        th = lh - tph
        title = purify(l.get("title") or f"الدرس {n}").rstrip('.,،')
        title_fr = purify(els[(n - 1) % len(els)]) if els else f"Leçon {n} — {name_fr}"
        obj = f"في نهاية الحصة يكون المتربص قادرا على {title} وفق المنهجية المهنية ومعايير الجودة."
        space = purify(l.get("space")) or "الورشة"
        tools = purify(l.get("tools")) or "الوسائل التقنية حسب طبيعة الدرس"
        situation = (f"في {space}: وضعية مهنية مرتبطة بـ«{short(title, 40)}» — "
                     f"يعرضها المكوّن أمام المتربصين ويستثير مكتسباتهم القبلية.")
        theory = [
            ("h2", f"1. المفاهيم الأساسية — {short(title, 40)}"),
            ("p", obj),
            ("h2", "2. منهجية الإنجاز والمراحل"),
            ("b", "تحديد العناصر والوسائل التقنية اللازمة للإنجاز."),
            ("b", "اتباع تسلسل العمل المهني واحترام إجراءات السلامة."),
            ("h2", "3. معايير الجودة والسلامة"),
            ("b", "مطابقة الإنتاج لمواصفات الجودة المطلوبة مهنيًا."),
            ("note", "السلامة المهنية شرط أساسي في كل مراحل الإنجاز."),
        ]
        tp = [
            ("h2", f"النشاط التطبيقي (TP) — {short(title, 40)}"),
            ("n", "التحضير للمواد والأجهزة وتنظيم مكان العمل."),
            ("n", "تنفيذ النشاط عمليا تحت إشراف المكوّن مع احترام خطوات الإنجاز."),
            ("n", "مراقبة النتائج وتصحيح الأخطاء وتوثيق الإنتاج."),
        ]
        evaluation = [
            ("h2", f"التقييم التكويني — {short(title, 40)}"),
            ("p", "يُقيَّم المتربص وفق المعايير الآتية:"),
            ("t", ["المعيار", "ممتاز", "مقبول", "يحتاج دعمًا"],
             [["الإنجاز", "دقيق وكامل", "أخطاء جزئية", "غير مطابق"],
              ["السلامة", "يحترم كل القواعد", "احترام جزئي", "لا يحترم"],
              ["التنظيم", "منظم ومرتب", "تنظيم مقبول", "فوضوي"]]),
        ]
        gl = [["الوثائق التقنية", "Documentation technique"],
              ["معايير الأداء", "Critères de performance"],
              ["بطاقة الملاحظة", "Fiche d'observation"],
              ["السلامة المهنية", "Sécurité au travail"]]
        if els:
            gl.append([short(title, 26), short(els[(n - 1) % len(els)], 38)])
        lessons.append({
            "num": n, "th": th, "tph": tph, "type": "Cours+TP",
            "title_fr": short(title_fr, 70), "title_ar": title,
            "objective": obj, "situation": situation, "tools": tools,
            "theory": theory, "tp": tp, "evaluation": evaluation,
            "summary": f"تناول الدرس «{short(title, 40)}» المفاهيم والمنهجية ومعايير الجودة والسلامة.",
            "homework": "إتمام الواجب النظري وتحضير الدرس الموالي.",
            "glossary": gl,
            "_phases": l.get("phases") or [],
            "_space": space,
        })
    competency_ar = purify(m["lessons"][0].get("kafaa") or
                     f"يُتقن المتربص مهارات {m['name_ar']} وفق المقاربة بالكفاءة.")
    SUBJECTS.append({
        "code": code,
        "file": f"ELE0701 كهرباء السيارات/{code} {m['name_ar']}",
        "name_fr": short(name_fr, 70),
        "name_ar": m["name_ar"],
        "cat": kind,
        "competency": competency_ar,
        "competency_fr": short(competency_fr, 90),
        "total_h": YP.get(code, 62),
        "lessons": lessons,
    })

if __name__ == "__main__":
    print(f"SUBJECTS: {len(SUBJECTS)} | lessons: {sum(len(s['lessons']) for s in SUBJECTS)}")
    for s in SUBJECTS:
        print(f"  {s['code']:5} {s['name_ar'][:28]:28} {len(s['lessons']):2} lessons | {s['total_h']}h")
