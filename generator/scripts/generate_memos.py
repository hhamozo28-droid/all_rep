# -*- coding: utf-8 -*-
"""Generate 6 lesson memos (DOCX + PDF) for MC1 Reseau informatique."""
import os
import sys
sys.path.insert(0, "/home/user/pipeline")

from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_BREAK

from memo_lib import (para, heading, make_table, render_blocks_docx, add_footer,
                      BLUE, BLUE2, CENTER, RIGHT, JUSTIFY)
from memo_lib import (S, pdf_table, pdf_note, render_blocks_pdf, make_onpage, ar)
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors

from content_a import LESSONS_A
from content_b import LESSONS_B

BASE = "/home/user/MC1 Reseau informatique"
IMG_DIR = os.path.join(BASE, "images")
os.makedirs(BASE, exist_ok=True)

LESSONS = LESSONS_A + LESSONS_B

FILENAMES = {
    1: "الحصة 01 - عموميات حول الشبكات",
    2: "الحصة 02 - الشبكة المحلية LAN",
    3: "الحصة 03 - الربط بين الشبكات",
    4: "الحصة 04 - البروتوكولات",
    5: "الحصة 05 - العناوين IP",
    6: "الحصة 06 - التقييم وتركيب شبكة",
}

GEN_COMPETENCY = "يُدرك المتربص مبادئ الشبكات الحاسوبية ويركّبها ويهيّئها."

# ---------------------------------------------------------------- DOCX
def build_docx(lesson, out_path):
    doc = Document()
    style = doc.styles['Normal']
    style.font.name = "Arial"
    style.font.size = Pt(12)
    add_footer(doc, lesson['num'], lesson['title_fr'])

    # Cover
    para(doc, "الجمهورية الجزائرية الديمقراطية الشعبية", size=13, bold=True, align=CENTER, color=BLUE)
    para(doc, "وزارة التكوين والتعليم المهنيين", size=13, bold=True, align=CENTER, color=BLUE)
    para(doc, "المعهد الوطني للتكوين والتعليم المهنيين (INFEP)", size=12, align=CENTER)
    para(doc, "مذكرة بيداغوجية", size=24, bold=True, align=CENTER, color=BLUE, space_after=10)
    para(doc, "المادة: MC1 — Réseau informatique", size=15, bold=True, align=CENTER)
    para(doc, f"الحصة رقم {lesson['num']}: {lesson['title_ar']}", size=14, bold=True, align=CENTER, color=BLUE2)
    para(doc, f"({lesson['title_fr']})", size=12, align=CENTER, italic=True)
    para(doc, "السنة الدراسية: 2026", size=12, align=CENTER)
    para(doc, "الأستاذ / المكون: ......................................", size=12, align=CENTER)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    # 1. Technical card
    heading(doc, "1. البطاقة التقنية", 1)
    make_table(doc, ["البيان", "المعلومة"], [
        ["المؤسسة", "المعهد الوطني للتكوين والتعليم المهنيين (INFEP)"],
        ["الشعبة المهنية", "Informatique"],
        ["التخصص", "Informatique option Bases de Données"],
        ["المادة / المقياس", "MC1 — Réseau informatique (Complémentaire MC)"],
        ["عنوان الدرس", lesson['title_ar'] + " — " + lesson['title_fr']],
        ["رقم الحصة", str(lesson['num'])],
        ["المدة الزمنية", lesson['duration']],
        ["نوع الحصة", lesson['type']],
        ["السنة الدراسية", "2026"],
    ], col_widths=[5, 11])

    # 2. Competency & objective
    heading(doc, "2. الكفاءة المستهدفة والغرض البيداغوجي", 1)
    para(doc, "الكفاءة العامة للمادة: " + GEN_COMPETENCY, bold=True)
    para(doc, "الغرض البيداغوجي: " + lesson['objective'])

    # 3. Starting situation
    heading(doc, "3. الوضعية الانطلاقية (المشكلة المهنية)", 1)
    para(doc, lesson['situation'], align=JUSTIFY)

    # 4. Resources
    heading(doc, "4. الموارد والوسائل", 1)
    para(doc, lesson['resources'])

    # 5. Session flow
    heading(doc, "5. سير الحصة التكوينية", 1)
    make_table(doc, ["المرحلة", "المدة", "نشاط المكون", "نشاط المتربص", "المعيار"],
               lesson['phases'], col_widths=[3.2, 2.2, 4.2, 4.2, 3.2], font_size=10)

    # 6-8. Theory / TP / Evaluation
    heading(doc, "6. المحتوى النظري (الدرس)", 1)
    render_blocks_docx(doc, lesson['theory'], IMG_DIR)
    heading(doc, "7. الأنشطة التطبيقية (TP)", 1)
    render_blocks_docx(doc, lesson['tp'], IMG_DIR)
    heading(doc, "8. التقييم", 1)
    render_blocks_docx(doc, lesson['evaluation'], IMG_DIR)

    # 9. Summary & homework
    heading(doc, "9. الخلاصة والواجب المنزلي", 1)
    para(doc, "الخلاصة: " + lesson['summary'], align=JUSTIFY)
    para(doc, "الواجب المنزلي: " + lesson['homework'], align=JUSTIFY)

    # 10. Glossary
    heading(doc, "10. قائمة المصطلحات", 1)
    make_table(doc, ["المصطلح بالعربية", "المصطلح بالفرنسية"], lesson['glossary'], col_widths=[6, 10])

    doc.core_properties.title = f"MC1 Réseau informatique — الحصة {lesson['num']}"
    doc.core_properties.author = "INFEP"
    doc.save(out_path)

# ---------------------------------------------------------------- PDF
def build_pdf(lesson, out_path):
    doc = SimpleDocTemplate(out_path, pagesize=A4,
                            leftMargin=2 * cm, rightMargin=2 * cm,
                            topMargin=2 * cm, bottomMargin=2 * cm,
                            title=f"MC1 Réseau informatique — الحصة {lesson['num']}",
                            author="INFEP")
    story = []
    # Cover
    story.append(Paragraph(ar("الجمهورية الجزائرية الديمقراطية الشعبية"), S['subtitle']))
    story.append(Paragraph(ar("وزارة التكوين والتعليم المهنيين"), S['subtitle']))
    story.append(Paragraph(ar("المعهد الوطني للتكوين والتعليم المهنيين (INFEP)"), S['cover']))
    story.append(Spacer(1, 10))
    story.append(Paragraph(ar("مذكرة بيداغوجية"), S['title']))
    story.append(Paragraph(ar("المادة: MC1 — Réseau informatique"), S['subtitle']))
    story.append(Paragraph(ar(f"الحصة رقم {lesson['num']}: {lesson['title_ar']}"), S['subtitle']))
    story.append(Paragraph(ar(f"({lesson['title_fr']})"), S['cover']))
    story.append(Spacer(1, 8))
    story.append(Paragraph(ar("السنة الدراسية: 2026"), S['cover']))
    story.append(Paragraph(ar("الأستاذ / المكون: ......................................"), S['cover']))
    story.append(PageBreak())

    # 1. Technical card
    story.append(Paragraph(ar("1. البطاقة التقنية"), S['h1']))
    story.append(pdf_table(["البيان", "المعلومة"], [
        ["المؤسسة", "المعهد الوطني للتكوين والتعليم المهنيين (INFEP)"],
        ["الشعبة المهنية", "Informatique"],
        ["التخصص", "Informatique option Bases de Données"],
        ["المادة / المقياس", "MC1 — Réseau informatique (Complémentaire MC)"],
        ["عنوان الدرس", lesson['title_ar'] + " — " + lesson['title_fr']],
        ["رقم الحصة", str(lesson['num'])],
        ["المدة الزمنية", lesson['duration']],
        ["نوع الحصة", lesson['type']],
        ["السنة الدراسية", "2026"],
    ]))
    story.append(Spacer(1, 6))

    # 2. Competency & objective
    story.append(Paragraph(ar("2. الكفاءة المستهدفة والغرض البيداغوجي"), S['h1']))
    story.append(Paragraph(ar("الكفاءة العامة للمادة: " + GEN_COMPETENCY), S['body']))
    story.append(Paragraph(ar("الغرض البيداغوجي: " + lesson['objective']), S['body']))

    # 3. Starting situation
    story.append(Paragraph(ar("3. الوضعية الانطلاقية (المشكلة المهنية)"), S['h1']))
    story.append(Paragraph(ar(lesson['situation']), S['body']))

    # 4. Resources
    story.append(Paragraph(ar("4. الموارد والوسائل"), S['h1']))
    story.append(Paragraph(ar(lesson['resources']), S['body']))

    # 5. Session flow
    story.append(Paragraph(ar("5. سير الحصة التكوينية"), S['h1']))
    story.append(pdf_table(["المرحلة", "المدة", "نشاط المكون", "نشاط المتربص", "المعيار"], lesson['phases']))
    story.append(Spacer(1, 6))

    # 6-8
    story.append(Paragraph(ar("6. المحتوى النظري (الدرس)"), S['h1']))
    render_blocks_pdf(lesson['theory'], IMG_DIR, story)
    story.append(Paragraph(ar("7. الأنشطة التطبيقية (TP)"), S['h1']))
    render_blocks_pdf(lesson['tp'], IMG_DIR, story)
    story.append(Paragraph(ar("8. التقييم"), S['h1']))
    render_blocks_pdf(lesson['evaluation'], IMG_DIR, story)

    # 9. Summary & homework
    story.append(Paragraph(ar("9. الخلاصة والواجب المنزلي"), S['h1']))
    story.append(Paragraph(ar("الخلاصة: " + lesson['summary']), S['body']))
    story.append(Paragraph(ar("الواجب المنزلي: " + lesson['homework']), S['body']))

    # 10. Glossary
    story.append(Paragraph(ar("10. قائمة المصطلحات"), S['h1']))
    story.append(pdf_table(["المصطلح بالعربية", "المصطلح بالفرنسية"], lesson['glossary']))
    story.append(Spacer(1, 6))

    doc.build(story, onFirstPage=make_onpage(lesson['num'], lesson['title_fr']),
              onLaterPages=make_onpage(lesson['num'], lesson['title_fr']))

# ---------------------------------------------------------------- main
if __name__ == "__main__":
    for lesson in LESSONS:
        name = FILENAMES[lesson['num']]
        docx_path = os.path.join(BASE, name + ".docx")
        pdf_path = os.path.join(BASE, name + ".pdf")
        build_docx(lesson, docx_path)
        print("DOCX OK:", docx_path)
        build_pdf(lesson, pdf_path)
        print("PDF  OK:", pdf_path)
    print("DONE")
