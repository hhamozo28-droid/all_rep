# -*- coding: utf-8 -*-
"""Rendering library: builds RTL Arabic DOCX and PDF lesson memos."""
import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

BLUE = "1F4E79"
BLUE2 = "2E75B6"
FONT = "Arial"
TEACHER = "حمزة شعيب"
BRAND = "صفحة دروسي"
CENTER = WD_ALIGN_PARAGRAPH.CENTER
RIGHT = WD_ALIGN_PARAGRAPH.RIGHT
# Arabic: natural right alignment — avoid stretched justification gaps
JUSTIFY = RIGHT

# ------------------------------------------------------------------ DOCX helpers
def _set_run(r, size=12, bold=False, color=None, italic=False):
    r.font.name = FONT
    r.font.size = Pt(size)
    r.bold = bold
    r.italic = italic
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    rPr = r._r.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:ascii'), FONT)
    rFonts.set(qn('w:hAnsi'), FONT)
    rFonts.set(qn('w:cs'), FONT)
    rFonts.set(qn('w:eastAsia'), FONT)
    szCs = OxmlElement('w:szCs')
    szCs.set(qn('w:val'), str(int(size * 2)))
    rPr.append(szCs)

def rtl(p, align=RIGHT):
    pPr = p._p.get_or_add_pPr()
    pPr.append(OxmlElement('w:bidi'))
    p.alignment = align
    return p

def para(doc, text, size=12, bold=False, color=None, align=RIGHT, space_after=6, italic=False):
    p = doc.add_paragraph()
    rtl(p, align)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(2)
    r = p.add_run(text)
    _set_run(r, size=size, bold=bold, color=color, italic=italic)
    return p

def heading(doc, text, level=1):
    p = doc.add_paragraph()
    rtl(p)
    p.paragraph_format.space_before = Pt(14 if level == 1 else 10)
    p.paragraph_format.space_after = Pt(6)
    if level == 1:
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement('w:pBdr')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')
        bottom.set(qn('w:sz'), '12')
        bottom.set(qn('w:space'), '4')
        bottom.set(qn('w:color'), BLUE2)
        pBdr.append(bottom)
        pPr.append(pBdr)
    r = p.add_run(text)
    _set_run(r, size=16 if level == 1 else 13, bold=True, color=BLUE if level == 1 else BLUE2)
    return p

def bullet(doc, text, size=12):
    p = doc.add_paragraph()
    rtl(p)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.right_indent = Cm(0.7)
    r = p.add_run("•  " + text)
    _set_run(r, size=size)
    return p

def numbered(doc, n, text, size=12):
    p = doc.add_paragraph()
    rtl(p)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.right_indent = Cm(0.7)
    r = p.add_run(f"{n}.  " + text)
    _set_run(r, size=size)
    return p

def shade_cell(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:fill'), color)
    tcPr.append(shd)

def make_table(doc, header, rows, col_widths=None, font_size=11):
    table = doc.add_table(rows=1, cols=len(header))
    table.style = 'Table Grid'
    tblPr = table._tbl.tblPr
    tblPr.append(OxmlElement('w:bidiVisual'))
    for i, h in enumerate(header):
        cell = table.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        rtl(p, CENTER)
        r = p.add_run(h)
        _set_run(r, size=font_size, bold=True, color="FFFFFF")
        shade_cell(cell, BLUE)
    for row in rows:
        cells = table.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            v = str(val).strip()
            rtl(p, CENTER if v.isdigit() else RIGHT)
            r = p.add_run(str(val))
            _set_run(r, size=font_size)
    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Cm(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return table

def add_image(doc, path, caption=None, width_cm=15):
    p = doc.add_paragraph()
    p.alignment = CENTER
    run = p.add_run()
    run.add_picture(path, width=Cm(width_cm))
    if caption:
        para(doc, caption, size=10, italic=True, align=CENTER, color="595959")

def note_box(doc, text, title="ملاحظة"):
    table = doc.add_table(rows=1, cols=1)
    table.style = 'Table Grid'
    table._tbl.tblPr.append(OxmlElement('w:bidiVisual'))
    cell = table.rows[0].cells[0]
    shade_cell(cell, "FFF2CC")
    cell.text = ""
    p = cell.paragraphs[0]
    rtl(p)
    r = p.add_run(title + ": ")
    _set_run(r, size=11, bold=True, color="7F6000")
    r2 = p.add_run(text)
    _set_run(r2, size=11)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_footer(doc, lesson_num, title_fr):
    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)
    footer = section.footer
    p = footer.paragraphs[0]
    rtl(p, CENTER)
    r = p.add_run(f"MC1 — Réseau informatique  |  الحصة رقم {lesson_num}  |  {title_fr}  |  صفحة ")
    _set_run(r, size=9, color="808080")
    fldChar1 = OxmlElement('w:fldChar'); fldChar1.set(qn('w:fldCharType'), 'begin')
    instr = OxmlElement('w:instrText'); instr.set(qn('xml:space'), 'preserve'); instr.text = 'PAGE'
    fldChar2 = OxmlElement('w:fldChar'); fldChar2.set(qn('w:fldCharType'), 'end')
    for el in (fldChar1, instr, fldChar2):
        rr = p.add_run(); rr._r.append(el); _set_run(rr, size=9, color="808080")

def add_page_header(section):
    """Header: teacher name top-right, brand top-left, thin rule below (RTL)."""
    hdr = section.header
    hdr.paragraphs[0].text = ""
    t = hdr.add_table(rows=1, cols=2, width=Cm(17))
    t.autofit = False
    tblPr = t._tbl.tblPr
    tblPr.append(OxmlElement('w:bidiVisual'))
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'right', 'insideH', 'insideV'):
        el = OxmlElement(f'w:{edge}')
        el.set(qn('w:val'), 'none')
        borders.append(el)
    b = OxmlElement('w:bottom')
    b.set(qn('w:val'), 'single')
    b.set(qn('w:sz'), '6')
    b.set(qn('w:space'), '2')
    b.set(qn('w:color'), BLUE2)
    borders.append(b)
    tblPr.append(borders)
    c_right, c_left = t.rows[0].cells  # bidiVisual: first cell renders at RIGHT
    c_right.width = Cm(10)
    c_left.width = Cm(7)
    p = c_right.paragraphs[0]
    rtl(p, RIGHT)
    r = p.add_run("الأستاذ : " + TEACHER)
    _set_run(r, size=10, bold=True, color=BLUE)
    p2 = c_left.paragraphs[0]
    pPr = p2._p.get_or_add_pPr()
    pPr.append(OxmlElement('w:bidi'))
    p2.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r2 = p2.add_run(BRAND)
    _set_run(r2, size=10, bold=True, color=BLUE2)

def setup_docx(doc, subject_label):
    """Page setup + running header (teacher/brand) + footer with subject label."""
    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)
    add_page_header(section)
    p = section.footer.paragraphs[0]
    rtl(p, CENTER)
    r = p.add_run(f"{subject_label}  |  مذكرة بيداغوجية — INFEP  |  السنة الدراسية 2026  |  صفحة ")
    _set_run(r, size=9, color="808080")
    fldChar1 = OxmlElement('w:fldChar'); fldChar1.set(qn('w:fldCharType'), 'begin')
    instr = OxmlElement('w:instrText'); instr.set(qn('xml:space'), 'preserve'); instr.text = 'PAGE'
    fldChar2 = OxmlElement('w:fldChar'); fldChar2.set(qn('w:fldCharType'), 'end')
    for el in (fldChar1, instr, fldChar2):
        rr = p.add_run(); rr._r.append(el); _set_run(rr, size=9, color="808080")

def render_blocks_docx(doc, blocks, img_dir):
    counter = 0
    for block in blocks:
        kind = block[0]
        if kind == "n":
            counter += 1
            numbered(doc, counter, block[1])
            continue
        counter = 0
        if kind == "h2":
            heading(doc, block[1], 2)
        elif kind == "p":
            para(doc, block[1], align=JUSTIFY)
        elif kind == "b":
            bullet(doc, block[1])
        elif kind == "t":
            make_table(doc, block[1], block[2])
        elif kind == "img":
            add_image(doc, os.path.join(img_dir, block[1]), block[2])
        elif kind == "note":
            note_box(doc, block[1])

# ------------------------------------------------------------------ PDF helpers
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                Image, PageBreak, HRFlowable)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import arabic_reshaper
from bidi.algorithm import get_display
from xml.sax.saxutils import escape
from PIL import Image as PILImage

pdfmetrics.registerFont(TTFont('DVS', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DVS-B', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DVS-I', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DVS-BI', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

def ar(t):
    return escape(get_display(arabic_reshaper.reshape(str(t))))

S = {
    'title': ParagraphStyle('title', fontName='DVS-B', fontSize=20, leading=27, alignment=TA_CENTER,
                            textColor=colors.HexColor('#1F4E79'), spaceAfter=8),
    'subtitle': ParagraphStyle('subtitle', fontName='DVS', fontSize=13, leading=19, alignment=TA_CENTER,
                               textColor=colors.HexColor('#2E75B6'), spaceAfter=5),
    'cover': ParagraphStyle('cover', fontName='DVS', fontSize=12, leading=18, alignment=TA_CENTER, spaceAfter=4),
    'h1': ParagraphStyle('h1', fontName='DVS-B', fontSize=15, leading=21, alignment=TA_RIGHT,
                         textColor=colors.HexColor('#1F4E79'), spaceBefore=14, spaceAfter=6),
    'h2': ParagraphStyle('h2', fontName='DVS-B', fontSize=12.5, leading=18, alignment=TA_RIGHT,
                         textColor=colors.HexColor('#2E75B6'), spaceBefore=10, spaceAfter=4),
    'body': ParagraphStyle('body', fontName='DVS', fontSize=11, leading=18, alignment=TA_RIGHT, spaceAfter=5),
    'bullet': ParagraphStyle('bullet', fontName='DVS', fontSize=11, leading=17, alignment=TA_RIGHT,
                             spaceAfter=3, rightIndent=14),
    'cell': ParagraphStyle('cell', fontName='DVS', fontSize=9.5, leading=14, alignment=TA_RIGHT),
    'celln': ParagraphStyle('celln', fontName='DVS', fontSize=9.5, leading=14, alignment=TA_CENTER),
    'cellc': ParagraphStyle('cellc', fontName='DVS-B', fontSize=9.5, leading=14, alignment=TA_CENTER,
                            textColor=colors.white),
    'caption': ParagraphStyle('caption', fontName='DVS-I', fontSize=9, leading=13, alignment=TA_CENTER,
                               textColor=colors.HexColor('#595959'), spaceAfter=8, spaceBefore=3),
    'note': ParagraphStyle('note', fontName='DVS', fontSize=10.5, leading=16, alignment=TA_RIGHT),
}

def pdf_table(header, rows, avail_width=17 * cm):
    n = len(header)
    data = [[Paragraph(ar(h), S['cellc']) for h in reversed(header)]]
    for row in rows:
        cells = []
        for v in reversed(row):
            sv = str(v).strip()
            cells.append(Paragraph(ar(v), S['celln'] if sv.isdigit() else S['cell']))
        data.append(cells)
    t = Table(data, colWidths=[avail_width / n] * n, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BFBFBF')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F2F6FB')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t

def pdf_note(text):
    inner = [[Paragraph(ar("ملاحظة: ") + ar(text), S['note'])]]
    t = Table(inner, colWidths=[17 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFF2CC')),
        ('BOX', (0, 0), (-1, -1), 0.7, colors.HexColor('#BF9000')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t

def pdf_image(path, caption=None, max_width=16 * cm):
    with PILImage.open(path) as im:
        w, h = im.size
    aspect = h / w
    width = max_width
    height = width * aspect
    flow = [Image(path, width=width, height=height)]
    if caption:
        flow.append(Paragraph(ar(caption), S['caption']))
    return flow

def render_blocks_pdf(blocks, img_dir, story):
    counter = 0
    for block in blocks:
        kind = block[0]
        if kind == "n":
            counter += 1
            story.append(Paragraph(ar(f"{counter}.  {block[1]}"), S['bullet']))
            continue
        counter = 0
        if kind == "h2":
            story.append(Paragraph(ar(block[1]), S['h2']))
        elif kind == "p":
            story.append(Paragraph(ar(block[1]), S['body']))
        elif kind == "b":
            story.append(Paragraph(ar("•  " + block[1]), S['bullet']))
        elif kind == "t":
            story.append(pdf_table(block[1], block[2]))
            story.append(Spacer(1, 6))
        elif kind == "img":
            story.extend(pdf_image(os.path.join(img_dir, block[1]), block[2]))
        elif kind == "note":
            story.append(pdf_note(block[1]))
            story.append(Spacer(1, 6))

def make_onpage(lesson_num, title_fr):
    def onpage(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor('#2E75B6'))
        canvas.setLineWidth(0.7)
        canvas.line(2 * cm, A4[1] - 1.4 * cm, A4[0] - 2 * cm, A4[1] - 1.4 * cm)
        canvas.setFont('DVS', 8)
        canvas.setFillColor(colors.HexColor('#808080'))
        txt = ar(f"MC1 — Réseau informatique | الحصة رقم {lesson_num} | {title_fr}")
        canvas.drawCentredString(A4[0] / 2, 1.15 * cm, txt)
        canvas.drawRightString(A4[0] - 2 * cm, 1.15 * cm, str(doc.page))
        canvas.restoreState()
    return onpage

def make_onpage2(subject_label):
    """Running header: teacher top-right, brand top-left, rule below; footer: subject + page."""
    def onpage(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor('#2E75B6'))
        canvas.setLineWidth(0.7)
        # header rule + header text
        canvas.line(2 * cm, A4[1] - 2.05 * cm, A4[0] - 2 * cm, A4[1] - 2.05 * cm)
        canvas.setFont('DVS-B', 9)
        canvas.setFillColor(colors.HexColor('#1F4E79'))
        canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.7 * cm, ar("الأستاذ : " + TEACHER))
        canvas.setFillColor(colors.HexColor('#2E75B6'))
        canvas.drawString(2 * cm, A4[1] - 1.7 * cm, ar(BRAND))
        # footer
        canvas.setFont('DVS', 8)
        canvas.setFillColor(colors.HexColor('#808080'))
        txt = ar(f"{subject_label} | مذكرة بيداغوجية — INFEP | السنة الدراسية 2026")
        canvas.drawCentredString(A4[0] / 2, 1.15 * cm, txt)
        canvas.drawRightString(A4[0] - 2 * cm, 1.15 * cm, str(doc.page))
        canvas.restoreState()
    return onpage
