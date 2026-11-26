# -*- coding: utf-8 -*-
"""Universal builder: one combined memo file per subject (DOCX + PDF), named after the subject.
Same settings as MC1 + page header (teacher top-right, brand top-left) + Arabic alignment fixes.
Lesson dict keys (compact format): num, title_fr, title_ar, th, tph (hours), type,
objective, situation, tools, theory, tp (blocks), evaluation (blocks), summary, homework, glossary.
Legacy format (MC1): prebuilt duration/phases, tp blocks under 'tp'."""
import os
import sys
sys.path.insert(0, "/home/user/pipeline")

from io import BytesIO
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_BREAK

from memo_lib import (para, heading, make_table, render_blocks_docx, setup_docx,
                      BLUE, BLUE2, CENTER, RIGHT, JUSTIFY, TEACHER, BRAND)
from memo_lib import (S, pdf_table, render_blocks_pdf, ar, A4, cm, colors, make_onpage2)
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                Table, TableStyle, Flowable)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER

BASE = "/home/user/MC1 Reseau informatique"  # fallback; each subject has own folder
TYPE_LABEL = {'Cours+TP': 'Cours + TP', 'Cours+TD': 'Cours + TD', 'Cours+TP+Eval': 'Cours + TP + Évaluation',
              'Cours+Eval': 'Cours + Évaluation', 'Cours': 'Cours', 'Evaluation': 'Évaluation'}

def short_dur(lesson):
    d = lesson.get('duration') or f"{lesson['th'] + lesson['tph']} ساعات"
    return d.split("(")[0].strip()

def normalize(lesson):
    l = dict(lesson)
    if 'phases' not in l:
        th, tph = l['th'], l['tph']
        if tph > 0:
            l['duration'] = f"{th + tph} ساعات ({th} ساعات نظري + {tph} ساعات تطبيقي)"
            p3 = ["المرحلة 3: المحاكاة والتطبيق (تطبيقي)", f"{tph * 60} دقيقة ({tph} سا)",
                  "توزيع الوسائل + التوجيه + التنقل للمراقبة والتصحيح",
                  "الإنجاز الفردي/الجماعي + احترام قواعد السلامة", "دقة الإنجاز (احترام معايير الأمان)"]
        else:
            l['duration'] = f"{th} ساعات (نظري بالكامل)"
            p3 = ["المرحلة 3: أمثلة وتمارين تطبيقية", "مدمجة في النظري",
                  "أمثلة وتمارين مدمجة في العرض + التوجيه", "حل التمارين والمشاركة", "دقة الحلول"]
        l['phases'] = [
            ["المرحلة 1: الانطلاق والربط", "10 دقائق", "عرض وضعية من بيئة العمل + طرح أسئلة المكتسبات القبلية",
             "إدراك المشكلة المهنية + الإجابة عن الأسئلة", "مدى الاستعداد (نسبة الاستيعاب)"],
            ["المرحلة 2: العرض والتحليل (نظري)", f"{th * 60} دقيقة ({th} سا)",
             "شرح الخطوات بالمحاكاة/العتاد + طرح الوضعية في صعوبة + إبراز الجوانب الأمنية",
             "الملاحظة + تدوين المفاهيم + التحليل", "القدرة على التحليل الفني (فهم التتابع)"],
            p3,
            ["المرحلة 4: التقييم والختام", "15 – 20 دقيقة", "طلب عرض المنجزات + الملخص النهائي + التقييم وفق بطاقة الأداء",
             "عرض العمل + مناقشة الأخطاء وتصحيحها", "مطابقة المنتج للمواصفات في الغرض البيداغوجي"],
        ]
    if 'resources' not in l:
        l['resources'] = l.get('tools', 'وثائق، مناصب معلوماتية، سبورة.')
    return l

def tech_rows(subj, lesson):
    return [
        ["المؤسسة", "المعهد الوطني للتكوين والتعليم المهنيين (INFEP)"],
        ["الشعبة المهنية", "Informatique"],
        ["التخصص", "Informatique option Bases de Données"],
        ["المادة / المقياس", f"{subj['code']} — {subj['name_fr']} ({subj['cat']})"],
        ["عنوان الدرس", lesson['title_ar'] + " — " + lesson['title_fr']],
        ["رقم الحصة", str(lesson['num'])],
        ["المدة الزمنية", lesson['duration']],
        ["نوع الحصة", TYPE_LABEL.get(lesson.get('type', ''), lesson.get('type', ''))],
        ["السنة الدراسية", "2026"],
    ]

# ================================================================ DOCX
def docx_lesson_body(doc, subj, lesson):
    para(doc, f"الحصة رقم {lesson['num']}", size=18, bold=True, align=CENTER, color=BLUE)
    para(doc, lesson['title_ar'], size=15, bold=True, align=CENTER, color=BLUE2)
    para(doc, f"({lesson['title_fr']})", size=11, align=CENTER, italic=True)
    para(doc, f"المدة: {lesson['duration']}  —  النوع: {TYPE_LABEL.get(lesson.get('type', ''), lesson.get('type', ''))}",
         size=10.5, align=CENTER, color="595959", space_after=10)

    heading(doc, "1. البطاقة التقنية", 1)
    make_table(doc, ["البيان", "المعلومة"], tech_rows(subj, lesson), col_widths=[5, 11])
    heading(doc, "2. الكفاءة المستهدفة والغرض البيداغوجي", 1)
    para(doc, "الكفاءة العامة للمادة: " + subj['competency'], bold=True)
    para(doc, "الغرض البيداغوجي: " + lesson['objective'])
    heading(doc, "3. الوضعية الانطلاقية (المشكلة المهنية)", 1)
    para(doc, lesson['situation'], align=JUSTIFY)
    heading(doc, "4. الموارد والوسائل", 1)
    para(doc, lesson['resources'])
    heading(doc, "5. سير الحصة التكوينية", 1)
    make_table(doc, ["المرحلة", "المدة", "نشاط المكون", "نشاط المتربص", "المعيار"],
               lesson['phases'], col_widths=[3.2, 2.2, 4.2, 4.2, 3.2], font_size=10)
    heading(doc, "6. المحتوى النظري (الدرس)", 1)
    render_blocks_docx(doc, lesson['theory'], subj.get('img_dir', ''))
    heading(doc, "7. الأنشطة التطبيقية (TP)", 1)
    render_blocks_docx(doc, lesson['tp'], subj.get('img_dir', ''))
    heading(doc, "8. التقييم", 1)
    render_blocks_docx(doc, lesson['evaluation'], subj.get('img_dir', ''))
    heading(doc, "9. الخلاصة والواجب المنزلي", 1)
    para(doc, "الخلاصة: " + lesson['summary'], align=JUSTIFY)
    para(doc, "الواجب المنزلي: " + lesson['homework'], align=JUSTIFY)
    heading(doc, "10. قائمة المصطلحات", 1)
    make_table(doc, ["المصطلح بالعربية", "المصطلح بالفرنسية"], lesson['glossary'], col_widths=[6, 10])

def build_docx(subj, lessons, out_path):
    doc = Document()
    style = doc.styles['Normal']
    style.font.name = "Arial"
    style.font.size = Pt(12)
    label = f"{subj['code']} — {subj['name_fr']}"
    setup_docx(doc, label)

    n = len(lessons)
    total = sum(l.get('th', 0) + l.get('tph', 0) for l in lessons) or subj.get('total_h', '')
    para(doc, "الجمهورية الجزائرية الديمقراطية الشعبية", size=13, bold=True, align=CENTER, color=BLUE)
    para(doc, "وزارة التكوين والتعليم المهنيين", size=13, bold=True, align=CENTER, color=BLUE)
    para(doc, "المعهد الوطني للتكوين والتعليم المهنيين (INFEP)", size=12, align=CENTER)
    para(doc, "مذكرة بيداغوجية", size=26, bold=True, align=CENTER, color=BLUE, space_after=10)
    para(doc, f"المادة: {label}", size=16, bold=True, align=CENTER)
    para(doc, f"({subj['name_ar']} — {subj['cat']})", size=13, align=CENTER, color=BLUE2)
    para(doc, f"عدد الحصص: {n}  —  المدة الإجمالية: {total} ساعة", size=12, align=CENTER)
    para(doc, "الشعبة: Informatique — التخصص: Bases de Données", size=12, align=CENTER)
    para(doc, "السنة الدراسية: 2026", size=12, align=CENTER)
    para(doc, "الأستاذ : " + TEACHER, size=13, bold=True, align=CENTER)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    heading(doc, "فهرس المذكرات", 1)
    rows = [[str(l['num']), l['title_ar'] + " — " + l['title_fr'], short_dur(l),
             TYPE_LABEL.get(l.get('type', ''), l.get('type', ''))] for l in lessons]
    make_table(doc, ["رقم الحصة", "عنوان الدرس", "المدة", "النوع"], rows,
               col_widths=[2.2, 8.3, 3, 3.5], font_size=10.5)
    para(doc, "ملاحظة: كل مذكرة تبدأ في صفحة جديدة وتحتوي على: البطاقة التقنية، الكفاءة المستهدفة، "
              "الوضعية الانطلاقية، سير الحصة، المحتوى النظري، أنشطة التطبيق، التقييم، الخلاصة والواجب، وقائمة المصطلحات.",
         size=10, italic=True, color="595959", align=JUSTIFY)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    for i, lesson in enumerate(lessons):
        docx_lesson_body(doc, subj, lesson)
        if i < len(lessons) - 1:
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    doc.core_properties.title = f"{label} — المذكرات"
    doc.core_properties.author = TEACHER
    doc.save(out_path)

# ================================================================ PDF
S['lesson_title'] = ParagraphStyle('lesson_title', fontName='DVS-B', fontSize=17, leading=23,
                                   alignment=TA_CENTER, textColor=colors.HexColor('#1F4E79'),
                                   spaceAfter=4, spaceBefore=2)

class Recorder(Flowable):
    def __init__(self, store, key):
        Flowable.__init__(self)
        self.store = store
        self.key = key
    def wrap(self, *args):
        return (0, 0)
    def draw(self):
        self.store[self.key] = self.canv.getPageNumber()

def pdf_toc_table(lessons, page_map):
    header = ["رقم الحصة", "عنوان الدرس", "المدة", "النوع", "الصفحة"]
    data = [[Paragraph(ar(h), S['cellc']) for h in reversed(header)]]
    for l in lessons:
        vals = [str(l['num']), l['title_ar'], short_dur(l),
                TYPE_LABEL.get(l.get('type', ''), l.get('type', '')), str(page_map.get(l['num'], ""))]
        data.append([Paragraph(ar(v), S['celln'] if str(v).strip().isdigit() else S['cell'])
                     for v in reversed(vals)])
    widths = [2 * cm, 7 * cm, 3 * cm, 2.8 * cm, 2.2 * cm]
    t = Table(data, colWidths=list(reversed(widths)), repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BFBFBF')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F2F6FB')]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    return t

def pdf_lesson_body(subj, lesson, story):
    story.append(Paragraph(ar(f"الحصة رقم {lesson['num']}"), S['lesson_title']))
    story.append(Paragraph(ar(lesson['title_ar']), S['subtitle']))
    story.append(Paragraph(ar(f"({lesson['title_fr']})"), S['cover']))
    story.append(Paragraph(ar(f"المدة: {lesson['duration']}  —  النوع: {TYPE_LABEL.get(lesson.get('type', ''), lesson.get('type', ''))}"), S['cover']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(ar("1. البطاقة التقنية"), S['h1']))
    story.append(pdf_table(["البيان", "المعلومة"], tech_rows(subj, lesson)))
    story.append(Spacer(1, 6))
    story.append(Paragraph(ar("2. الكفاءة المستهدفة والغرض البيداغوجي"), S['h1']))
    story.append(Paragraph(ar("الكفاءة العامة للمادة: " + subj['competency']), S['body']))
    story.append(Paragraph(ar("الغرض البيداغوجي: " + lesson['objective']), S['body']))
    story.append(Paragraph(ar("3. الوضعية الانطلاقية (المشكلة المهنية)"), S['h1']))
    story.append(Paragraph(ar(lesson['situation']), S['body']))
    story.append(Paragraph(ar("4. الموارد والوسائل"), S['h1']))
    story.append(Paragraph(ar(lesson['resources']), S['body']))
    story.append(Paragraph(ar("5. سير الحصة التكوينية"), S['h1']))
    story.append(pdf_table(["المرحلة", "المدة", "نشاط المكون", "نشاط المتربص", "المعيار"], lesson['phases']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(ar("6. المحتوى النظري (الدرس)"), S['h1']))
    render_blocks_pdf(lesson['theory'], subj.get('img_dir', ''), story)
    story.append(Paragraph(ar("7. الأنشطة التطبيقية (TP)"), S['h1']))
    render_blocks_pdf(lesson['tp'], subj.get('img_dir', ''), story)
    story.append(Paragraph(ar("8. التقييم"), S['h1']))
    render_blocks_pdf(lesson['evaluation'], subj.get('img_dir', ''), story)
    story.append(Paragraph(ar("9. الخلاصة والواجب المنزلي"), S['h1']))
    story.append(Paragraph(ar("الخلاصة: " + lesson['summary']), S['body']))
    story.append(Paragraph(ar("الواجب المنزلي: " + lesson['homework']), S['body']))
    story.append(Paragraph(ar("10. قائمة المصطلحات"), S['h1']))
    story.append(pdf_table(["المصطلح بالعربية", "المصطلح بالفرنسية"], lesson['glossary']))

def make_story(subj, lessons, page_map):
    label = f"{subj['code']} — {subj['name_fr']}"
    n = len(lessons)
    total = sum(l.get('th', 0) + l.get('tph', 0) for l in lessons) or subj.get('total_h', '')
    story = []
    story.append(Paragraph(ar("الجمهورية الجزائرية الديمقراطية الشعبية"), S['subtitle']))
    story.append(Paragraph(ar("وزارة التكوين والتعليم المهنيين"), S['subtitle']))
    story.append(Paragraph(ar("المعهد الوطني للتكوين والتعليم المهنيين (INFEP)"), S['cover']))
    story.append(Spacer(1, 12))
    story.append(Paragraph(ar("مذكرة بيداغوجية"), S['title']))
    story.append(Paragraph(ar(f"المادة: {label}"), S['subtitle']))
    story.append(Paragraph(ar(f"({subj['name_ar']} — {subj['cat']})"), S['cover']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(ar(f"عدد الحصص: {n}  —  المدة الإجمالية: {total} ساعة"), S['cover']))
    story.append(Paragraph(ar("الشعبة: Informatique — التخصص: Bases de Données"), S['cover']))
    story.append(Paragraph(ar("السنة الدراسية: 2026"), S['cover']))
    story.append(Paragraph(ar("الأستاذ : " + TEACHER), S['subtitle']))
    story.append(PageBreak())
    story.append(Paragraph(ar("فهرس المذكرات"), S['h1']))
    story.append(pdf_toc_table(lessons, page_map))
    story.append(Spacer(1, 8))
    story.append(Paragraph(ar("ملاحظة: كل مذكرة تبدأ في صفحة جديدة وتحتوي على: البطاقة التقنية، الكفاءة المستهدفة، "
                              "الوضعية الانطلاقية، سير الحصة، المحتوى النظري، أنشطة التطبيق، التقييم، الخلاصة والواجب، "
                              "وقائمة المصطلحات."), S['body']))
    for lesson in lessons:
        story.append(PageBreak())
        story.append(Recorder(page_map, lesson['num']))
        pdf_lesson_body(subj, lesson, story)
    return story

def build_pdf(subj, lessons, out_path):
    label = f"{subj['code']} — {subj['name_fr']}"
    kw = dict(pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
              topMargin=2.5 * cm, bottomMargin=2 * cm,
              title=f"{label} — المذكرات", author=TEACHER)
    page_map = {}
    buf = BytesIO()
    d1 = SimpleDocTemplate(buf, **kw)
    d1.build(make_story(subj, lessons, page_map), onFirstPage=make_onpage2(label),
             onLaterPages=make_onpage2(label))
    d2 = SimpleDocTemplate(out_path, **kw)
    d2.build(make_story(subj, lessons, page_map), onFirstPage=make_onpage2(label),
             onLaterPages=make_onpage2(label))
    return page_map

# ================================================================ runner
def build_subject(subj):
    lessons = [normalize(l) for l in subj['lessons']]
    folder = os.path.join("/home/user", subj['file'])
    os.makedirs(folder, exist_ok=True)
    name = subj['file']
    docx_path = os.path.join(folder, name + ".docx")
    pdf_path = os.path.join(folder, name + ".pdf")
    build_docx(subj, lessons, docx_path)
    print("DOCX OK:", docx_path)
    pmap = build_pdf(subj, lessons, pdf_path)
    print("PDF  OK:", pdf_path, "| pages start:", {k: v for k, v in sorted(pmap.items())})
