# -*- coding: utf-8 -*-
"""Generalized memo builder (all specialties). Import-safe renderers from make_memos_ele.
Usage: python3 make_memos_gen.py CODE SUBJECTS_JSON SPEC_JSON OUTFLOW_DIR
"""
import os, sys, json
sys.path.insert(0, "/home/user/pipeline")
import make_memos_ele as M  # renderers, fonts, styles (module main is guarded)

from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_BREAK, WD_ALIGN_PARAGRAPH

from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak)
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm

CODE = sys.argv[1] if len(sys.argv) > 1 else "AGR0703"
SUBJ = json.load(open(sys.argv[2] if len(sys.argv) > 2 else "/home/user/pipeline/subjects.json", encoding="utf-8"))
SPEC = json.load(open(sys.argv[3] if len(sys.argv) > 3 else f"/home/user/pipeline/spec_kb/{CODE}.json", encoding="utf-8"))
FLOWDIR = sys.argv[4] if len(sys.argv) > 4 else f"/home/user/pipeline/memo_imgs/flow_{CODE}"
OUT = f"/home/user/memo_out_{CODE}"
os.makedirs(OUT, exist_ok=True)

DOM = SPEC.get("dom", {})
PLACE = DOM.get("place", "مكان العمل")
FIELDW = DOM.get("field", "التقنية")
EQUIP = DOM.get("equip", "الأدوات والوسائل التقنية")
SPECNAME = SPEC.get("name_ar", CODE)
KB = SPEC.get("modules", {})
IMGROOT = SPEC.get("img_root", f"/home/user/pipeline/spec_imgs/{CODE}")

GEN_TERMS = [["الكفاءة", "Compétence"], ["الأداء", "Performance"], ["الجودة", "Qualité"],
             ["السلامة", "Sécurité"], ["التوثيق", "Documentation"], ["المنهجية", "Méthodologie"]]

def mod_kb(mc, subj):
    k = dict(KB.get(mc, {}))
    k.setdefault("intro", f"يُعنى هذا المقياس بـ«{subj['name_ar']}» ضمن تخصص {SPECNAME}. يرتكز التكوين على المقاربة بالكفاءة: وضعية مهنية ← بناء المعرفة ← التطبيق ← التقويم، مع ربط كل مفهوم بممارسة ميدانية قابلة للقياس.")
    k.setdefault("terms", GEN_TERMS)
    k.setdefault("facts", [f"يُبنى المقياس على الكفاءة المهنية: {subj.get('competency','')[:90]}.",
                           "تُقاس نتائج التعلم بأدوات أداء موثقة: بطاقة ملاحظة، منتج نهائي، واختبار معرفي."])
    k.setdefault("safety", f"احترم قواعد السلامة المهنية داخل {PLACE} واستعمل المعدات الواقية المناسبة.")
    k.setdefault("steps", ["تحديد المعطيات والوسائل اللازمة", f"تحضير {PLACE} وتنظيم المكان",
                           "التنفيذ وفق المنهجية المهنية", "مراقبة النتائج ومقارنتها بالمعايير",
                           "التوثيق والتسليم النهائي"])
    return k

def words6(t):
    return " ".join(str(t).split()[:6])

def lesson_blocks_gen(subj, l, mod, mc, ft_path, fc_path, ci_path):
    terms = set()
    for a, b in mod["terms"]:
        terms.add(a); terms.add(b)
    title = l["title_ar"]
    title_fr = l.get("title_fr") or ""
    lh = (l.get("th") or 2) + (l.get("tph") or 2)
    B = []
    B.append(("title", f"مذكرة الدرس {l['num']} — {title}"))
    B.append(("table", ["البيان", "التفاصيل"], [
        ["المقياس", f"{mc} — {subj['name_ar']}"],
        ["الدرس", title],
        ["بالفرنسية", title_fr],
        ["المدة", f"{lh} ساعة (نظري {l.get('th',2)} + تطبيقي {l.get('tph',2)})"],
        ["الكفاءة", (subj.get("competency") or "")[:110]],
    ]))
    B.append(("h2", "الأهداف التعلمية"))
    B.append(("p", "في نهاية هذا الدرس يكون المتربص قادرًا على:"))
    for o in [f"شرح مضمون «{title}» وربطه بمجال {subj['name_ar']} بدقة.",
              "تطبيق منهجية العمل المهنية وفق تسلسل الإنجاز المعتمد.",
              f"استعمال {EQUIP} بشكل صحيح وآمن.",
              "التمييز بين الأداء المطابق وغير المطابق وطرق معالجة الفوارق.",
              "تقييم نتيجة العمل وفق معايير الجودة والسلامة وتوثيقها."]:
        B.append(("b", o))
    B.append(("h2", "المكتسبات القبلية والوسائل"))
    B.append(("p", f"المكتسبات القبلية: المفاهيم الأساسية لـ{subj['name_ar']}، قراءة الوثائق التقنية، قواعد السلامة العامة."))
    B.append(("p", f"الوسائل والمعدات: {l.get('tools') or EQUIP}، بطاقات الملاحظة، الوثائق والمخططات التقنية، أدوات القياس حسب النشاط."))
    B.append(("facts", mod["facts"]))
    B.append(("h2", f"1. المحتوى النظري الموسّع — {title}"))
    B.append(("p", f"{mod['intro']} ويتمحور هذا الدرس حول «{title}» الذي يمثل محورًا عمليًا من محوريات المقياس."))
    B.append(("p", f"أولًا — الإطار المفاهيمي: يندرج «{title}» ضمن منظومة {subj['name_ar']} التي تربط المعرفة النظرية بالتطبيق الميداني. فالمفهوم النظري يجيب عن سؤال «لماذا؟»، بينما الإجراء الميداني يجيب عن «كيف؟»، والكفاءة المهنية هي القدرة على الجمع بينهما بذكاء وسرعة في بيئة {PLACE}. من هذا المنطلق، يتعلم المتربص في هذا الدرس كيف يحلّل الظاهرة أو الوضعية المرتبطة بـ«{title}»، ثم كيف يترجم تحليله إلى خطوات إنجاز قابلة للقياس والتحقق."))
    B.append(("table", ["المصطلح", "المقابل بالفرنسية"], mod["terms"]))
    B.append(("p", f"ثانيًا — التفاصيل التقنية: لكل عنصر من عناصر «{title}» وظيفة محددة ومعيار أداء قابل للفحص. عند التدخل المهني نبدأ دائمًا بالفحص الأولي، ثم القياس أو الملاحظة الميدانية، ثم المقارنة بالقيم أو المعايير المرجعية، وأخيرًا الحكم: إنجاز، ضبط، أو إعادة. هذه المنهجية تختصر الوقت وتمنع الأخطاء المتكررة، وهي ما يميّز الحرفي المدرّب عن المجرّب."))
    B.append(("p", f"ثالثًا — ربط المعارف: يتصل هذا الدرس مباشرة بمراحل العمل في {PLACE}، وبمعايير الجودة المعمول بها، وبقواعد التوثيق المهني. فكل تدخل ناجح يُقاس بثلاثة معايير: مطابقة الإنجاز للمواصفة، سلامة العامل والبيئة، ورضا المستفيد عن الخدمة."))
    B.append(("p", "يُترجم كل إجراء في هذا الدرس إلى مسار واضح: مدخلات ← معالجة ← مراجعة ← توثيق. اقرأ المخطط التدفقي أدناه قبل الخوض في التفاصيل."))
    B.append(("flowt", ft_path))
    B.append(("h2", "2. منهجية الإنجاز"))
    _i = 0
    for s in mod["steps"]:
        _i += 1
        B.append(("n", _i, s))
    _i += 1
    B.append(("n", _i, f"تنفيذ العمل الخاص بـ«{title}» وفق التسلسل السابق مع التحقق في كل مرحلة."))
    _i += 1
    B.append(("n", _i, "توثيق النتائج في بطاقة التدخل وإعلام المكوّن بالملاحظات."))
    B.append(("h2", "3. السلامة المهنية"))
    B.append(("note", mod["safety"]))
    for s in [f"ارتدِ المعدات الواقية قبل بدء أي تدخل داخل {PLACE}.",
              "أبقِ مكان العمل منظمًا ونظيفًا طوال مدة النشاط.",
              "اطلب المساعدة عند التعامل مع الأوزان الثقيلة أو المواد الخطرة."]:
        B.append(("b", s))
    B.append(("h2", "4. حالة مهنية تطبيقية"))
    B.append(("p", f"يصل إلى {PLACE} مستفيد يطلب خدمة مرتبطة بـ«{title}». يستقبله الحرفي باحتراف: يستمع إلى الطلب، يسجل الملاحظات، ثم يبدأ الفحص المنهجي — معاينة، قياس أو اختبار، مقارنة بالمعايير — قبل أن يقترح الحل والتكلفة. بعد الموافقة ينجز العمل، ثم يختبر النتيجة تحت ظروف حقيقية، ويوثّق كل شيء في بطاقة التدخل ويسلّم المنتج أو الخدمة مع شرح مختصر للعمل المنجز. هذا السيناريو هو جوهر الخدمة المهنية الحديثة."))
    B.append(("flowc", fc_path))
    B.append(("imgc", ci_path))
    B.append(("h2", "5. تمارين محلولة (6 تمارين)"))
    ex = [
     (f"التمرين 1 — تعريف: عرّف «{title}» واذكر أهميته في مقياس {subj['name_ar']}.",
      f"الحل: «{title}» مفهوم/إجراء تقني يندرج ضمن مقياس {subj['name_ar']}، ويتضمن مجموعة من الإجراءات والمعايير التي تُنجز في ظروف {PLACE}. أهميته: يبني كفاءة مباشرة يحتاجها سوق العمل، ويربط المعرفة النظرية بالإنجاز الميداني القابل للقياس."),
     ("التمرين 2 — ترتيب: رتّب مراحل الإنجاز المهني لهذا الدرس.",
      "الحل: (1) تحديد المعطيات وجمع المعلومات، (2) تحضير الوسائل وتنظيم المكان، (3) التنفيذ وفق المنهجية، (4) مراقبة النتائج ومقارنتها بالمعايير، (5) التصحيح عند الحاجة، (6) التوثيق والتسليم."),
     (f"التمرين 3 — تشخيص: في {PLACE} ظهر انحراف في الأداء المرتبط بـ«{title}». ما خطوات المعالجة؟",
      "الحل: (1) المعاينة وتحديد مجال الانحراف، (2) جمع المعطيات وقياس المؤشرات، (3) المقارنة بالمعايير المرجعية، (4) تحديد السبب الجذري، (5) تنفيذ التصحيح، (6) إعادة الاختبار وتوثيق النتيجة."),
     ("التمرين 4 — حساب: أنتجت ورشة 240 وحدة في 6 أيام عمل، 8 ساعات يوميًا. احسب الإنتاج في الساعة، ثم الإنتاج المتوقع في 10 أيام.",
      "الحل: ساعات العمل = 6 × 8 = 48 ساعة. الإنتاج في الساعة = 240 ÷ 48 = 5 وحدات/ساعة. في 10 أيام = 10 × 8 × 5 = 400 وحدة. (التحقق: 400 ÷ (10×8) = 5 ✓)"),
     ("التمرين 5 — صح أم خطأ: (أ) يجوز تجاوز إجراءات السلامة عند استعجال العمل. (ب) التوثيق جزء لا يتجزأ من الكفاءة المهنية. (ج) معايير الجودة اختيارية في الإنتاج الصغير.",
      "الحل: (أ) خطأ — السلامة أولوية مطلقة ولا تُستثنى بأي ظرف. (ب) صحيح — التوثيق يثبت الأداء ويحمي الطرفين. (ج) خطأ — المعايير ملزمة مهما كان حجم الإنتاج."),
     ("التمرين 6 — حالة مهنية: مستفيد يشكو من جودة الخدمة. كيف تتعامل معه؟",
      "الحل: أستمع إليه باهتمام، وأفحص العمل المنجز بموضوعية، وأشرح له سبب الخلل إن وُجد، وأقدم الحل في أجل محدد مع الحفاظ على حقه في المتابعة، وأوثّق الشكوى والمعالجة في سجل الجودة."),
    ]
    for q, a in ex:
        B.append(("p", q))
        B.append(("a", a))
    B.append(("h2", "6. سير الحصة"))
    rows = []
    phs = l.get("_phases") or []
    names = ["الانطلاق — وضعية مشكلة", "البناء — نظري/عملي", "التطبيق الموجّه",
             "الإنتاج المستقل والتقييم", "الإنهاء"]
    durs = ["30 د", "1 سا 30", "1 سا", "45 د", "15 د"]
    for i in range(5):
        ph = phs[i] if i < len(phs) else {}
        ev = " ".join((ph.get("ev_do") or "يعرض المحتوى ويوجّه النقاش.").split("\n"))
        rows.append([str(i + 1), names[i], durs[i], ev[:75]])
    B.append(("table", ["#", "المرحلة", "المدة", "نشاط المكوّن"], rows))
    B.append(("h2", "7. التقويم"))
    B.append(("table", ["المعيار", "ممتاز", "مقبول", "يحتاج دعمًا"], [
        ["المعرفة", "يشرح المفاهيم بدقة", "شرح جزئي", "لا يشرح"],
        ["الإنجاز", "دقيق وكامل", "أخطاء جزئية", "غير مطابق"],
        ["السلامة", "يحترم كل القواعد", "احترام جزئي", "لا يحترم"],
        ["التنظيم", "منظم وموثّق", "تنظيم مقبول", "فوضوي"],
    ]))
    B.append(("p", "تقويم ذاتي: هل أستطيع شرح الفرق بين المفهوم النظري والإجراء الميداني؟ هل أعرف المعايير المرجعية الأساسية؟ هل طبّقت قواعد السلامة دون مراقبة؟"))
    B.append(("h2", "الخلاصة والواجب"))
    B.append(("p", f"تناول الدرس «{title}» المفاهيم والمنهجية ومعايير الجودة والسلامة، مع ستة تمارين محلولة وحالة مهنية ترسّخ الكفاءة المستهدفة."))
    B.append(("p", "الواجب المنزلي: (1) أعد كتابة مراحل الإنجاز في دفترك مع رسم توضيحي بسيط. (2) ابحث عن معلومة تقنية إضافية تتعلق بالدرس واذكر مصدرها."))
    B.append(("table", (["المصطلح بالعربية", "English"] if CODE == "TAV06Q" else ["المصطلح", "Français"]), mod["terms"][:5]))
    return B

def case_img(n, mc):
    import glob
    from PIL import Image
    cands = []
    for f in sorted(glob.glob(os.path.join(IMGROOT, "c*.jpg")) + glob.glob(os.path.join(IMGROOT, "c*.png"))):
        try:
            Image.open(f).verify()
            if os.path.getsize(f) > 5000:
                cands.append(f)
        except Exception:
            pass
    if not cands:
        return ""
    return cands[(n + sum(ord(c) for c in mc)) % len(cands)]

def build_all():
    made = []
    for subj in SUBJ:
        mc = subj["code"]
        mod = mod_kb(mc, subj)
        base = f"{CODE} {SPECNAME} - مذكرات - {mc} {subj['name_ar']}"
        docx_path = os.path.join(OUT, base + ".docx")
        pdf_path = os.path.join(OUT, base + ".pdf")
        imgs = (SPEC.get("imgs") or {}).get(mc, [])
        rimg = (SPEC.get("real_imgs") or {}).get(mc, "")
        # DOCX
        doc = Document()
        st = doc.styles["Normal"]; st.font.name = M.FONT_DOCX; st.font.size = Pt(12)
        M.docx_header(doc.sections[0])
        M.docx_footer(doc.sections[0], f"{CODE} {SPECNAME} — {mc} {subj['name_ar']} — السنة التكوينية 2026")
        for line, sz, col in [("الجمهورية الجزائرية الديمقراطية الشعبية", 13, M.BLUE),
                              ("وزارة التكوين والتعليم المهنيين", 13, M.BLUE),
                              ("مذكرات الدروس — دليل المكوّن", 16, M.BLUE2),
                              (f"المقياس {mc}: {subj['name_ar']}", 14, M.GOLD)]:
            p = doc.add_paragraph(); M.rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
            M._run(p, line, size=sz, bold=True, color=col)
        p = doc.add_paragraph(); M.rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
        M._run(p, f"التخصص: {SPECNAME} — السنة التكوينية 2026 — عدد الدروس: {len(subj['lessons'])}", size=11, color=M.GRAY)
        if imgs:
            M.add_pic(doc, os.path.join(IMGROOT, imgs[0]), "مخطط توضيحي للوحدة", width=14)
        if rimg and os.path.exists(os.path.join(IMGROOT, rimg)):
            M.add_pic(doc, os.path.join(IMGROOT, rimg), "الواقع المهني — صورة مرجعية", width=12)
        M.h2(doc, "مدخل الوحدة والمعطيات الموثقة")
        M.body(doc, mod["intro"], set(t[0] for t in mod["terms"]))
        M.facts_box(doc, mod["facts"])
        M.table(doc, (["المصطلح بالعربية", "English"] if CODE == "TAV06Q" else ["المصطلح", "Français"]), mod["terms"])
        for l in subj["lessons"]:
            n = int(l["num"])
            ft = os.path.join(FLOWDIR, f"{mc}_{n:02d}_t.png")
            fc = os.path.join(FLOWDIR, f"{mc}_{n:02d}_c.png")
            ci = case_img(n, mc)
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
            M.render_docx(doc, lesson_blocks_gen(subj, l, mod, mc, ft, fc, ci), set(t[0] for t in mod["terms"]) | set(t[1] for t in mod["terms"]), mc)
        doc.save(docx_path)
        # PDF
        pdf = SimpleDocTemplate(pdf_path, pagesize=A4,
                                leftMargin=1.7 * cm, rightMargin=1.7 * cm,
                                topMargin=2.1 * cm, bottomMargin=1.8 * cm)
        story = []
        onpage = M.pdf_onpage(f"{CODE} {SPECNAME} — {mc} {subj['name_ar']}")
        for line in ["الجمهورية الجزائرية الديمقراطية الشعبية", "وزارة التكوين والتعليم المهنيين"]:
            story.append(Paragraph(M.ar(line), M.S2['title']))
        story.append(Spacer(1, 4))
        story.append(Paragraph(M.ar("مذكرات الدروس — دليل المكوّن"), M.S2['sub']))
        story.append(Paragraph(M.ar(f"المقياس {mc}: {subj['name_ar']}"), M.S2['sub']))
        story.append(Paragraph(M.ar(f"التخصص: {SPECNAME} — السنة التكوينية 2026 — عدد الدروس: {len(subj['lessons'])}"), M.S2['cap']))
        story.append(Spacer(1, 8))
        if imgs:
            story.extend(M.pdf_image(os.path.join(IMGROOT, imgs[0]), "مخطط توضيحي للوحدة", max_w=14 * cm))
        if rimg and os.path.exists(os.path.join(IMGROOT, rimg)):
            story.extend(M.pdf_image(os.path.join(IMGROOT, rimg), "الواقع المهني — صورة مرجعية", max_w=11 * cm))
        story.append(Paragraph(M.ar("مدخل الوحدة والمعطيات الموثقة"), M.S2['h2']))
        story.append(M.pdf_hl(mod["intro"], set(t[0] for t in mod["terms"]), M.S2['body']))
        story.append(M.pdf_facts(mod["facts"]))
        story.append(Spacer(1, 5))
        story.append(M.pdf_table((["المصطلح بالعربية", "English"] if CODE == "TAV06Q" else ["المصطلح", "Français"]), mod["terms"]))
        for l in subj["lessons"]:
            n = int(l["num"])
            ft = os.path.join(FLOWDIR, f"{mc}_{n:02d}_t.png")
            fc = os.path.join(FLOWDIR, f"{mc}_{n:02d}_c.png")
            ci = case_img(n, mc)
            story.append(PageBreak())
            M.render_pdf(story, lesson_blocks_gen(subj, l, mod, mc, ft, fc, ci), set(t[0] for t in mod["terms"]) | set(t[1] for t in mod["terms"]), mc)
        pdf.build(story, onFirstPage=onpage, onLaterPages=onpage)
        made += [docx_path, pdf_path]
        print("built:", mc, len(subj["lessons"]), "lessons", flush=True)
    print("TOTAL FILES:", len(made))

if __name__ == "__main__":
    build_all()
