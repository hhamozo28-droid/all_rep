# -*- coding: utf-8 -*-
"""Build ONE combined memo file per subject (named after the subject):
MC1 Reseau informatique — all 6 lesson memos in a single DOCX + a single PDF."""
import os
import sys
sys.path.insert(0, "/home/user/pipeline")

from io import BytesIO

from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_BREAK
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

from memo_lib import (para, heading, make_table, render_blocks_docx, _set_run, rtl,
                      BLUE, BLUE2, CENTER, RIGHT, JUSTIFY)
from memo_lib import (S, pdf_table, render_blocks_pdf, ar, A4, cm, colors)
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                Table, TableStyle, Flowable)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER

from content_a import LESSONS_A
from content_b import LESSONS_B

BASE = "/home/user/MC1 Reseau informatique"
IMG_DIR = os.path.join(BASE, "images")
LESSONS = LESSONS_A + LESSONS_B
SUBJECT_FILE = "MC1 Reseau informatique"
GEN_COMPETENCY = "يُدرك المتربص مبادئ الشبكات الحاسوبية ويركّبها ويهيّئها."

def short_dur(d):
    return d.split("(")[0].strip()

# ================================================================ DOCX (one file)
def add_footer_combined(doc):
    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)
    p = section.footer.paragraphs[0]
    rtl(p, CENTER)
    r = p.add_run("MC1 — Réseau informatique  |  مذكرة بيداغوجية — INFEP  |  السنة الدراسية 2026  |  صفحة ")
    _set_run(r, size=9, color="808080")
    fldChar1 = OxmlElement('w:fldChar'); fldChar1.set(qn('w:fldCharType'), 'begin')
    instr = OxmlElement('w:instrText'); instr.set(qn('xml:space'), 'preserve'); instr.text = 'PAGE'
    fldChar2 = OxmlElement('w:fldChar'); fldChar2.set(qn('w:fldCharType'), 'end')
    for el in (fldChar1, instr, fldChar2):
        rr = p.add_run(); rr._r.append(el); _set_run(rr, size=9, color="808080")

def docx_lesson_body(doc, lesson):
    para(doc, f"الحصة رقم {lesson['num']}", size=18, bold=True, align=CENTER, color=BLUE)
    para(doc, lesson['title_ar'], size=15, bold=True, align=CENTER, color=BLUE2)
    para(doc, f"({lesson['title_fr']})", size=11, align=CENTER, italic=True)
    para(doc, f"المدة: {lesson['duration']}  —  النوع: {lesson['type']}",
         size=10.5, align=CENTER, color="595959", space_after=10)

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

    heading(doc, "2. الكفاءة المستهدفة والغرض البيداغوجي", 1)
    para(doc, "الكفاءة العامة للمادة: " + GEN_COMPETENCY, bold=True)
    para(doc, "الغرض البيداغوجي: " + lesson['objective'])

    heading(doc, "3. الوضعية الانطلاقية (المشكلة المهنية)", 1)
    para(doc, lesson['situation'], align=JUSTIFY)

    heading(doc, "4. الموارد والوسائل", 1)
    para(doc, lesson['resources'])

    heading(doc, "5. سير الحصة التكوينية", 1)
    make_table(doc, ["المرحلة", "المدة", "نشاط المكون", "نشاط المتربص", "المعيار"],
               lesson['phases'], col_widths=[3.2, 2.2, 4.2, 4.2, 3.2], font_size=10)

    heading(doc, "6. المحتوى النظري (الدرس)", 1)
    render_blocks_docx(doc, lesson['theory'], IMG_DIR)
    heading(doc, "7. الأنشطة التطبيقية (TP)", 1)
    render_blocks_docx(doc, lesson['tp'], IMG_DIR)
    heading(doc, "8. التقييم", 1)
    render_blocks_docx(doc, lesson['evaluation'], IMG_DIR)

    heading(doc, "9. الخلاصة والواجب المنزلي", 1)
    para(doc, "الخلاصة: " + lesson['summary'], align=JUSTIFY)
    para(doc, "الواجب المنزلي: " + lesson['homework'], align=JUSTIFY)

    heading(doc, "10. قائمة المصطلحات", 1)
    make_table(doc, ["المصطلح بالعربية", "المصطلح بالفرنسية"], lesson['glossary'], col_widths=[6, 10])

def build_combined_docx(out_path):
    doc = Document()
    style = doc.styles['Normal']
    style.font.name = "Arial"
    style.font.size = Pt(12)
    add_footer_combined(doc)

    # ---- Cover (subject level)
    para(doc, "الجمهورية الجزائرية الديمقراطية الشعبية", size=13, bold=True, align=CENTER, color=BLUE)
    para(doc, "وزارة التكوين والتعليم المهنيين", size=13, bold=True, align=CENTER, color=BLUE)
    para(doc, "المعهد الوطني للتكوين والتعليم المهنيين (INFEP)", size=12, align=CENTER)
    para(doc, "مذكرة بيداغوجية", size=26, bold=True, align=CENTER, color=BLUE, space_after=10)
    para(doc, "المادة: MC1 — Réseau informatique", size=16, bold=True, align=CENTER)
    para(doc, "(شبكات معلوماتية — مقياس مكمل)", size=13, align=CENTER, color=BLUE2)
    para(doc, "المذكرة تضم حصص المادة الست (51 ساعة)", size=12, align=CENTER)
    para(doc, "الشعبة: Informatique — التخصص: Bases de Données", size=12, align=CENTER)
    para(doc, "السنة الدراسية: 2026", size=12, align=CENTER)
    para(doc, "الأستاذ / المكون: ......................................", size=12, align=CENTER)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    # ---- Table of contents
    heading(doc, "فهرس المذكرات", 1)
    rows = [[str(l['num']), l['title_ar'] + " — " + l['title_fr'], short_dur(l['duration']), l['type']]
            for l in LESSONS]
    make_table(doc, ["رقم الحصة", "عنوان الدرس", "المدة", "النوع"], rows,
               col_widths=[2.2, 8.3, 3, 3.5], font_size=10.5)
    para(doc, "ملاحظة: كل مذكرة تبدأ في صفحة جديدة وتحتوي على: البطاقة التقنية، الكفاءة المستهدفة، "
              "الوضعية الانطلاقية، سير الحصة، المحتوى النظري، أنشطة TP، التقييم، الخلاصة والواجب، وقائمة المصطلحات.",
         size=10, italic=True, color="595959", align=JUSTIFY)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    # ---- Lessons
    for i, lesson in enumerate(LESSONS):
        docx_lesson_body(doc, lesson)
        if i < len(LESSONS) - 1:
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    doc.core_properties.title = "MC1 Réseau informatique — المذكرات الست"
    doc.core_properties.author = "INFEP"
    doc.save(out_path)

# ================================================================ PDF (one file)
S['lesson_title'] = ParagraphStyle('lesson_title', fontName='DVS-B', fontSize=17, leading=23,
                                   alignment=TA_CENTER, textColor=colors.HexColor('#1F4E79'),
                                   spaceAfter=4, spaceBefore=2)

class Recorder(Flowable):
    """Zero-size flowable that records the page number where it is drawn."""
    def __init__(self, store, key):
        Flowable.__init__(self)
        self.store = store
        self.key = key
    def wrap(self, *args):
        return (0, 0)
    def draw(self):
        self.store[self.key] = self.canv.getPageNumber()

def make_onpage_combined():
    def onpage(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor('#2E75B6'))
        canvas.setLineWidth(0.7)
        canvas.line(2 * cm, A4[1] - 1.4 * cm, A4[0] - 2 * cm, A4[1] - 1.4 * cm)
        canvas.setFont('DVS', 8)
        canvas.setFillColor(colors.HexColor('#808080'))
        txt = ar("MC1 — Réseau informatique | مذكرة بيداغوجية — INFEP | السنة الدراسية 2026")
        canvas.drawCentredString(A4[0] / 2, 1.15 * cm, txt)
        canvas.drawRightString(A4[0] - 2 * cm, 1.15 * cm, str(doc.page))
        canvas.restoreState()
    return onpage

def pdf_toc_table(page_map):
    header = ["رقم الحصة", "عنوان الدرس", "المدة", "النوع", "الصفحة"]
    data = [[Paragraph(ar(h), S['cellc']) for h in reversed(header)]]
    for l in LESSONS:
        vals = [str(l['num']), l['title_ar'], short_dur(l['duration']), l['type'],
                str(page_map.get(l['num'], ""))]
        data.append([Paragraph(ar(v), S['cell']) for v in reversed(vals)])
    widths = [2 * cm, 7 * cm, 3 * cm, 2.8 * cm, 2.2 * cm]  # logical order (right -> left)
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

def pdf_lesson_body(lesson, story):
    story.append(Paragraph(ar(f"الحصة رقم {lesson['num']}"), S['lesson_title']))
    story.append(Paragraph(ar(lesson['title_ar']), S['subtitle']))
    story.append(Paragraph(ar(f"({lesson['title_fr']})"), S['cover']))
    story.append(Paragraph(ar(f"المدة: {lesson['duration']}  —  النوع: {lesson['type']}"), S['cover']))
    story.append(Spacer(1, 6))

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

    story.append(Paragraph(ar("2. الكفاءة المستهدفة والغرض البيداغوجي"), S['h1']))
    story.append(Paragraph(ar("الكفاءة العامة للمادة: " + GEN_COMPETENCY), S['body']))
    story.append(Paragraph(ar("الغرض البيداغوجي: " + lesson['objective']), S['body']))

    story.append(Paragraph(ar("3. الوضعية الانطلاقية (المشكلة المهنية)"), S['h1']))
    story.append(Paragraph(ar(lesson['situation']), S['body']))

    story.append(Paragraph(ar("4. الموارد والوسائل"), S['h1']))
    story.append(Paragraph(ar(lesson['resources']), S['body']))

    story.append(Paragraph(ar("5. سير الحصة التكوينية"), S['h1']))
    story.append(pdf_table(["المرحلة", "المدة", "نشاط المكون", "نشاط المتربص", "المعيار"], lesson['phases']))
    story.append(Spacer(1, 6))

    story.append(Paragraph(ar("6. المحتوى النظري (الدرس)"), S['h1']))
    render_blocks_pdf(lesson['theory'], IMG_DIR, story)
    story.append(Paragraph(ar("7. الأنشطة التطبيقية (TP)"), S['h1']))
    render_blocks_pdf(lesson['tp'], IMG_DIR, story)
    story.append(Paragraph(ar("8. التقييم"), S['h1']))
    render_blocks_pdf(lesson['evaluation'], IMG_DIR, story)

    story.append(Paragraph(ar("9. الخلاصة والواجب المنزلي"), S['h1']))
    story.append(Paragraph(ar("الخلاصة: " + lesson['summary']), S['body']))
    story.append(Paragraph(ar("الواجب المنزلي: " + lesson['homework']), S['body']))

    story.append(Paragraph(ar("10. قائمة المصطلحات"), S['h1']))
    story.append(pdf_table(["المصطلح بالعربية", "المصطلح بالفرنسية"], lesson['glossary']))

def make_story(page_map):
    story = []
    # ---- Cover
    story.append(Paragraph(ar("الجمهورية الجزائرية الديمقراطية الشعبية"), S['subtitle']))
    story.append(Paragraph(ar("وزارة التكوين والتعليم المهنيين"), S['subtitle']))
    story.append(Paragraph(ar("المعهد الوطني للتكوين والتعليم المهنيين (INFEP)"), S['cover']))
    story.append(Spacer(1, 12))
    story.append(Paragraph(ar("مذكرة بيداغوجية"), S['title']))
    story.append(Paragraph(ar("المادة: MC1 — Réseau informatique"), S['subtitle']))
    story.append(Paragraph(ar("(شبكات معلوماتية — مقياس مكمل)"), S['cover']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(ar("المذكرة تضم حصص المادة الست (51 ساعة)"), S['cover']))
    story.append(Paragraph(ar("الشعبة: Informatique — التخصص: Bases de Données"), S['cover']))
    story.append(Paragraph(ar("السنة الدراسية: 2026"), S['cover']))
    story.append(Paragraph(ar("الأستاذ / المكون: ......................................"), S['cover']))
    story.append(PageBreak())

    # ---- Table of contents
    story.append(Paragraph(ar("فهرس المذكرات"), S['h1']))
    story.append(pdf_toc_table(page_map))
    story.append(Spacer(1, 8))
    story.append(Paragraph(ar("ملاحظة: كل مذكرة تبدأ في صفحة جديدة وتحتوي على: البطاقة التقنية، الكفاءة المستهدفة، "
                              "الوضعية الانطلاقية، سير الحصة، المحتوى النظري، أنشطة TP، التقييم، الخلاصة والواجب، "
                              "وقائمة المصطلحات."), S['body']))

    # ---- Lessons
    for lesson in LESSONS:
        story.append(PageBreak())
        story.append(Recorder(page_map, lesson['num']))
        pdf_lesson_body(lesson, story)
    return story

def build_combined_pdf(out_path):
    kw = dict(pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
              topMargin=2 * cm, bottomMargin=2 * cm,
              title="MC1 Réseau informatique — المذكرات الست", author="INFEP")
    page_map = {}
    buf = BytesIO()
    d1 = SimpleDocTemplate(buf, **kw)
    d1.build(make_story(page_map), onFirstPage=make_onpage_combined(),
             onLaterPages=make_onpage_combined())
    d2 = SimpleDocTemplate(out_path, **kw)
    d2.build(make_story(page_map), onFirstPage=make_onpage_combined(),
             onLaterPages=make_onpage_combined())
    return page_map

# ================================================================ main
if __name__ == "__main__":
    docx_path = os.path.join(BASE, SUBJECT_FILE + ".docx")
    pdf_path = os.path.join(BASE, SUBJECT_FILE + ".pdf")
    build_combined_docx(docx_path)
    print("DOCX OK:", docx_path)
    pmap = build_combined_pdf(pdf_path)
    print("PDF  OK:", pdf_path)
    print("Lesson start pages (PDF):", {k: v for k, v in sorted(pmap.items())})
    print("DONE")
