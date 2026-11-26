# -*- coding: utf-8 -*-
"""Generate ELE0701 lesson plans (M9-1 style) — source-faithful phase rows."""
import sys, os
sys.path.insert(0, "/home/user/pipeline")
import run_plans
from content_ele import SUBJECTS
from plan_lib import LIGHT_YELLOW, LIGHT_BLUE, LIGHT_GREEN, LIGHT_ORANGE

OUT = "/home/user/ELE0701 كهرباء السيارات"
IMGDIR = "/home/user/pipeline/plan_images"

ELE_IMGS = {
    "MQ1": {n: ["pl_ele_battery.png", "pl_ele_multimeter.png"] for n in range(1, 17)},
    "MQ2": {n: ["pl_ele_alternator.png", "pl_ele_multimeter.png"] for n in range(1, 17)},
    "MQ3": {n: ["pl_ele_lighting.png", "pl_ele_symbols.png"] for n in range(1, 17)},
    "MQ4": {n: ["pl_ele_ignition.png", "pl_ele_symbols.png"] for n in range(1, 17)},
    "MQ5": {n: ["pl_ele_injection.png", "pl_ele_multimeter.png"] for n in range(1, 17)},
    "MQ6": {n: ["pl_ele_symbols.png", "pl_ele_safety.png"] for n in range(1, 17)},
    "MQ7": {n: ["pl_ele_symbols.png", "pl_ele_safety.png"] for n in range(1, 17)},
    "MQ8": {n: ["pl_ele_ac.png", "pl_ele_safety.png"] for n in range(1, 17)},
    "MQ9": {n: ["pl_ele_maintenance.png", "pl_ele_safety.png"] for n in range(1, 17)},
    "MC1": {n: ["pl_ele_safety.png"] for n in range(1, 9)},
    "MC2": {n: ["pl_ele_safety.png"] for n in range(1, 9)},
    "MC3": {n: ["pl_ele_multimeter.png"] for n in range(1, 9)},
    "MC4": {n: ["pl_ele_battery.png", "pl_ele_symbols.png"] for n in range(1, 8)},
    "MC5": {n: ["pl_ele_injection.png", "pl_ele_symbols.png"] for n in range(1, 9)},
    "MC6": {n: ["pl_ele_maintenance.png"] for n in range(1, 8)},
    "MC7": {n: ["pl_ele_symbols.png"] for n in range(1, 8)},
    "MC8": {n: ["pl_ele_multimeter.png"] for n in range(1, 8)},
    "MC9": {n: ["pl_ele_safety.png"] for n in range(1, 9)},
    "MC10": {n: ["pl_ele_safety.png"] for n in range(1, 9)},
}

def fmt_dur(v):
    if not v: return "—"
    h = int(v); mf = round((v - h) * 60)
    if h and mf: return f"{h} سا {mf} د"
    if h: return f"{h} سا"
    return f"{mf} د"

BGS5 = [LIGHT_YELLOW, LIGHT_BLUE, LIGHT_GREEN, LIGHT_ORANGE, "#EFE7F6"]

def make_rows_src(l, liens):
    rows, bgs = [], []
    phs = l.get("_phases") or []
    title = l["title_ar"]
    space = l.get("_space") or "الورشة"
    tools = str(l.get("tools") or "الوسائل التقنية")[:34]
    goals = [
        "أن يستقبل الوضعية المشكلة ويربطها بمكتسباته القبلية.",
        f"أن يشرح مضمون «{title[:40]}» ويوظّفه في وضعيات مهنية.",
        "أن ينجز التطبيق الموجّه بدقة واحترام منهجية العمل.",
        "أن ينتج إنتاجًا مستقلًا وفق معايير الأداء ويقيّم ذاته.",
        "أن يلخّص المكتسبات ويؤدي الواجب المنزلي.",
    ]
    contents = [
        f"• الوضعية المشكلة: {title[:45]}\n• استحضار المكتسبات القبلية",
        f"• {title[:48]}\n• المفاهيم والخطوات الأساسية\n• معايير الجودة والسلامة",
        f"• التطبيق الموجّه: {title[:42]}\n• إنجاز النشاط خطوة بخطوة",
        f"• الإنتاج المستقل وفق بطاقة الأداء\n• {title[:42]}",
        "• الخلاصة ومناقشة الأخطاء الشائعة\n• الواجب المنزلي",
    ]
    evals = ["أسئلة شفهية وملاحظة", "ملاحظة ومطابقة للمعيار", "شبكة ملاحظة مرحلية",
             "مطابقة المنتج للمواصفات", "تقييم ختامي"]
    for i in range(5):
        ph = phs[i] if i < len(phs) else {}
        do = " ".join((ph.get("ev_do") or "").split("\n")) or "يعرض المحتوى ويوجّه النقاش."
        stu = " ".join((ph.get("ev_stu") or "").split("\n")) or "ينجز المطلوب تحت الإشراف."
        rows.append([
            str(i + 1), goals[i], liens, contents[i],
            fmt_dur(ph.get("dur")),
            f"المكوّن: {do}\nالمتّكوّن: {stu}",
            tools, "01", space, ph.get("eval") or evals[i],
        ])
        bgs.append(BGS5[i])
    return rows, bgs

run_plans.make_rows = make_rows_src
run_plans.LESSON_IMGS = ELE_IMGS

def main():
    only = sys.argv[1:] or None
    for subj in SUBJECTS:
        if only and subj["code"] not in only:
            continue
        name = f"{subj['code']} {subj['name_ar']} - مخططات الدروس"
        os.makedirs(OUT, exist_ok=True)
        docx_path = os.path.join(OUT, name + ".docx")
        pdf_path = os.path.join(OUT, name + ".pdf")
        print(f"===== {subj['code']} ({len(subj['lessons'])} lessons)")
        run_plans.build_docx(subj, docx_path)
        print("DOCX OK:", name + ".docx")
        run_plans.build_pdf(subj, pdf_path)
        print("PDF  OK:", name + ".pdf")
    print("ALL ELE PLANS DONE")

if __name__ == "__main__":
    main()
