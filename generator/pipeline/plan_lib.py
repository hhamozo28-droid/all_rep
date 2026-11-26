# -*- coding: utf-8 -*-
"""Plan de leçon renderer (landscape, bright colors, distinctive fonts): DOCX + PDF."""
import os
from xml.sax.saxutils import escape

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                Image, PageBreak, Flowable, KeepTogether)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

# ---------------------------------------------------------------- palette
BLUE = '#2E86DE'      # bright blue
ORANGE = '#F97C2B'    # bright orange
GREEN = '#27AE60'
PURPLE = '#7B5EA7'
RED = '#E8475F'
YELLOW = '#FFE066'
TEAL = '#00B4D8'
LIGHT_BLUE = '#EAF3FC'
LIGHT_GREEN = '#E8F8F0'
LIGHT_ORANGE = '#FFF3E0'
LIGHT_YELLOW = '#FFF9E0'
GREY = '#555555'

TEACHER = 'حمزة شعيب'
BRAND = 'صفحة دروسي'
CS_FONT = 'Traditional Arabic'   # Arabic in Word
LAT_FONT = 'Segoe UI'            # Latin in Word

CENTER = WD_ALIGN_PARAGRAPH.CENTER
RIGHT = WD_ALIGN_PARAGRAPH.RIGHT
LEFT = WD_ALIGN_PARAGRAPH.LEFT

# ---------------------------------------------------------------- fonts (PDF)
FD = '/home/user/pipeline/plan_fonts'
try:
    pdfmetrics.registerFont(TTFont('Amiri', f'{FD}/Amiri-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('Amiri-B', f'{FD}/Amiri-Bold.ttf'))
    
    pdfmetrics.registerFont(TTFont('Tajawal', f'{FD}/Tajawal-Regular.ttf'))
    pdfmetrics.registerFont(TTFont('Tajawal-B', f'{FD}/Tajawal-Bold.ttf'))
except Exception:
    pdfmetrics.registerFont(TTFont('Amiri', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('Amiri-B', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
    pdfmetrics.registerFont(TTFont('Tajawal', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('Tajawal-B', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

# Tajawal lacks these presentation forms -> substitute visually-identical twins
_SHAPE_SUB = {
    '\ufe80': '\u0621',   # hamza isolated -> base hamza
    '\ufe81': '\ufe82',   # alef+madda iso -> final (same shape)
    '\ufe83': '\ufe84',   # alef+hamza iso -> final
    '\ufe85': '\ufe86',   # waw+hamza iso -> final
    '\ufe87': '\ufe88',   # yeh+hamza iso -> final
    '\ufeab': '\ufeac',   # thal final -> isolated (non-connector: identical)
    '\ufeae': '\ufead' if False else '\ufeae',  # placeholder
    '\ufead': '\ufeae',   # reh iso -> final (identical)
    '\ufeaf': '\ufeb0',   # zain final -> isolated (identical)
}

def ar(t):
    import re as _re
    t = _re.sub(r'[\u064B-\u0652\u0653-\u065F\u0670\u0640\u200B-\u200F\uFEFF]', '', str(t))
    t = t.replace('«', '"').replace('»', '"').replace('◆', '•')
    t = t.replace('\u2190', '<-').replace('\u2192', '->')
    t = t.replace('\u2612', '[x]').replace('\u2611', '[x]').replace('\u2610', '[  ]')
    t = t.replace('\u25A0', '[x]').replace('\u25A1', '[  ]').replace('\u25CF', '[x]').replace('\u25CB', '[  ]')
    t = t.replace('\u2713', '[x]').replace('\u2714', '[x]').replace('\u2705', '[x]')
    t = t.replace('\u25B2', '^').replace('\u25B8', '>')
    resh = arabic_reshaper.reshape(t)
    for k, v in _SHAPE_SUB.items():
        resh = resh.replace(k, v)
    return escape(get_display(resh))

# ================================================================ DOCX helpers
def _run(r, size=11, bold=False, color=None, italic=False, font=None):
    r.font.name = font or LAT_FONT
    r.font.size = Pt(size)
    r.bold = bold
    r.italic = italic
    if color:
        r.font.color.rgb = RGBColor.from_string(color.lstrip('#'))
    rPr = r._r.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:ascii'), font or LAT_FONT)
    rFonts.set(qn('w:hAnsi'), font or LAT_FONT)
    rFonts.set(qn('w:cs'), font or CS_FONT)
    rFonts.set(qn('w:eastAsia'), font or CS_FONT)
    szCs = OxmlElement('w:szCs')
    szCs.set(qn('w:val'), str(int(size * 2)))
    rPr.append(szCs)

def rtl(p, align=RIGHT):
    pPr = p._p.get_or_add_pPr()
    pPr.append(OxmlElement('w:bidi'))
    p.alignment = align
    return p

def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:fill'), color.lstrip('#'))
    tcPr.append(shd)

def _clean_txt(t):
    import re as _re
    t = _re.sub(r'[\u064B-\u0652\u0653-\u065F\u0670\u0640\u200B-\u200F\uFEFF]', '', str(t))
    t = t.replace('\u2612', '[x]').replace('\u2611', '[x]').replace('\u2610', '[  ]')
    t = t.replace('\u25A0', '[x]').replace('\u25A1', '[  ]').replace('\u25CF', '[x]').replace('\u25CB', '[  ]')
    t = t.replace('\u2713', '[x]').replace('\u2714', '[x]').replace('\u2705', '[x]')
    t = t.replace('\u25B2', '^').replace('\u25B8', '>')
    return t.replace('«', '"').replace('»', '"').replace('◆', '•').replace('\u2190', '<-').replace('\u2192', '->')

def dpara(doc, text, size=11, bold=False, color=None, align=RIGHT, italic=False,
          space_after=4, bg=None, font=None):
    text = _clean_txt(text)
    p = doc.add_paragraph()
    rtl(p, align)
    p.paragraph_format.space_after = Pt(space_after)
    if bg:
        pPr = p._p.get_or_add_pPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:fill'), bg.lstrip('#'))
        pPr.append(shd)
    r = p.add_run(text)
    _run(r, size=size, bold=bold, color=color, italic=italic, font=font)
    return p

def cell_para(cell, text, size=8, bold=False, color=None, align=RIGHT, first=False, italic=False):
    text = _clean_txt(text)
    p = cell.paragraphs[0] if first else cell.add_paragraph()
    if first:
        p.text = ''
    rtl(p, align)
    p.paragraph_format.space_after = Pt(1)
    p.paragraph_format.space_before = Pt(1)
    r = p.add_run(text)
    _run(r, size=size, bold=bold, color=color, italic=italic)
    return p

def setup_docx(doc, subject_label):
    sec = doc.sections[0]
    sec.orientation = WD_ORIENT.LANDSCAPE
    sec.page_width = Cm(29.7)
    sec.page_height = Cm(21)
    sec.top_margin = Cm(1.7)
    sec.bottom_margin = Cm(1.3)
    sec.left_margin = Cm(1.5)
    sec.right_margin = Cm(1.5)
    # header: teacher right / brand left
    hdr = sec.header
    hdr.paragraphs[0].text = ''
    t = hdr.add_table(rows=1, cols=2, width=Cm(26.7))
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
    b.set(qn('w:sz'), '8')
    b.set(qn('w:color'), 'F97C2B')
    borders.append(b)
    tblPr.append(borders)
    cr, cl = t.rows[0].cells
    cr.width = Cm(16)
    cl.width = Cm(10.7)
    p = cr.paragraphs[0]
    rtl(p, RIGHT)
    r = p.add_run('الأستاذ : ' + TEACHER)
    _run(r, size=10, bold=True, color=BLUE)
    p2 = cl.paragraphs[0]
    pPr = p2._p.get_or_add_pPr()
    pPr.append(OxmlElement('w:bidi'))
    p2.alignment = LEFT
    r2 = p2.add_run(BRAND)
    _run(r2, size=10, bold=True, color=ORANGE)
    # footer
    fp = sec.footer.paragraphs[0]
    rtl(fp, CENTER)
    r = fp.add_run(f'{subject_label}  |  مخططات الدروس — Plans de leçon  |  INFEP  |  السنة الدراسية 2026  |  صفحة ')
    _run(r, size=8, color='808080')
    f1 = OxmlElement('w:fldChar'); f1.set(qn('w:fldCharType'), 'begin')
    ins = OxmlElement('w:instrText'); ins.set(qn('xml:space'), 'preserve'); ins.text = 'PAGE'
    f2 = OxmlElement('w:fldChar'); f2.set(qn('w:fldCharType'), 'end')
    for el in (f1, ins, f2):
        rr = fp.add_run(); rr._r.append(el); _run(rr, size=8, color='808080')

def dtable(doc, header, rows, widths, hdr_bg=BLUE, fsize=8, row_bgs=None, col_bold=None):
    table = doc.add_table(rows=1, cols=len(header))
    table.style = 'Table Grid'
    table._tbl.tblPr.append(OxmlElement('w:bidiVisual'))
    for i, h in enumerate(header):
        c = table.rows[0].cells[i]
        shade(c, hdr_bg)
        cell_para(c, h, size=fsize, bold=True, color='FFFFFF', align=CENTER, first=True)
    for ri, row in enumerate(rows):
        cells = table.add_row().cells
        bg = (row_bgs[ri] if row_bgs and ri < len(row_bgs) else None)
        for i, val in enumerate(row):
            if bg:
                shade(cells[i], bg)
            v = str(val)
            is_bold = bool(col_bold and i in col_bold)
            cell_para(cells[i], v, size=fsize, bold=is_bold,
                      align=CENTER if v.strip().isdigit() or len(v) < 4 else RIGHT, first=True)
    for row in table.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = Cm(w)
    return table

def add_img_docx(doc, path, caption, width_cm=16):
    p = doc.add_paragraph()
    p.alignment = CENTER
    p.add_run().add_picture(path, width=Cm(width_cm))
    if caption:
        dpara(doc, caption, size=9, italic=True, color=GREY, align=CENTER, space_after=6)

# ================================================================ PDF styles
PS = {
    'title': ParagraphStyle('t', fontName='Amiri-B', fontSize=22, leading=28, alignment=TA_CENTER,
                            textColor=colors.HexColor('#1B3B6F'), spaceAfter=6),
    'subtitle': ParagraphStyle('st', fontName='Amiri-B', fontSize=13, leading=18, alignment=TA_CENTER,
                               textColor=colors.HexColor('#2E86DE'), spaceAfter=4),
    'cover': ParagraphStyle('cv', fontName='Amiri', fontSize=11, leading=16, alignment=TA_CENTER,
                            textColor=colors.HexColor('#333333'), spaceAfter=3),
    'h1': ParagraphStyle('h1', fontName='Amiri-B', fontSize=14, leading=19, alignment=TA_RIGHT,
                         textColor=colors.white, spaceBefore=8, spaceAfter=5),
    'cell': ParagraphStyle('c', fontName='Amiri', fontSize=7.6, leading=11, alignment=TA_RIGHT),
    'cellc': ParagraphStyle('cc', fontName='Amiri-B', fontSize=7.8, leading=11, alignment=TA_CENTER,
                            textColor=colors.white),
    'cellb': ParagraphStyle('cb', fontName='Amiri-B', fontSize=7.8, leading=11, alignment=TA_RIGHT,
                            textColor=colors.HexColor('#1B3B6F')),
    'cardlbl': ParagraphStyle('cl', fontName='Amiri-B', fontSize=8.6, leading=12, alignment=TA_RIGHT,
                              textColor=colors.HexColor('#7A4F00')),
    'cardval': ParagraphStyle('cvv', fontName='Amiri', fontSize=8.6, leading=12, alignment=TA_RIGHT,
                              textColor=colors.HexColor('#222222')),
    'cardfr': ParagraphStyle('cf', fontName='Amiri', fontSize=8.2, leading=11, alignment=TA_LEFT,
                             textColor=colors.HexColor('#444444')),
    'exq': ParagraphStyle('exq', fontName='Amiri-B', fontSize=10, leading=15, alignment=TA_RIGHT,
                          textColor=colors.HexColor('#7A1F2B'), spaceAfter=3),
    'exa': ParagraphStyle('exa', fontName='Amiri', fontSize=9.5, leading=14, alignment=TA_RIGHT,
                          textColor=colors.HexColor('#1E6B3C')),
    'note': ParagraphStyle('nt', fontName='Amiri', fontSize=9, leading=13, alignment=TA_RIGHT,
                           textColor=colors.HexColor('#555555')),
    'cap': ParagraphStyle('cap', fontName='Amiri', fontSize=9, leading=13, alignment=TA_CENTER,
                          textColor=colors.HexColor('#666666'), spaceAfter=6),
}

def pdf_band(text, bg):
    """Colored full-width band used as section header."""
    t = Table([[Paragraph(ar(text), PS['h1'])]], colWidths=[26.5 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(bg)),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    return t

def pdf_table(header, rows, widths, hdr_bg='#2E86DE', fsize=7.6, row_bgs=None):
    n = len(header)
    data = [[Paragraph(ar(h), PS['cellc']) for h in reversed(header)]]
    for row in rows:
        cells = []
        for v in reversed(row):
            sv = str(v)
            st = PS['cell']
            cells.append(Paragraph(ar(sv), st))
        data.append(cells)
    t = Table(data, colWidths=list(reversed([w * cm for w in widths])), repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(hdr_bg)),
        ('GRID', (0, 0), (-1, -1), 0.6, colors.HexColor('#B9C6D6')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]
    if row_bgs:
        for ri, bg in enumerate(row_bgs):
            if bg:
                style.append(('BACKGROUND', (0, ri + 1), (-1, ri + 1), colors.HexColor(bg)))
    else:
        style.append(('ROWBACKGROUNDS', (0, 1), (-1, -1),
                      [colors.white, colors.HexColor('#F4F8FC')]))
    t.setStyle(TableStyle(style))
    return t

def pdf_image(path, caption, max_w=22 * cm):
    with PILImage.open(path) as im:
        w, h = im.size
    width = min(max_w, 24 * cm)
    height = width * h / w
    if height > 11 * cm:
        height = 11 * cm
        width = height * w / h
    flow = [Image(path, width=width, height=height)]
    if caption:
        flow.append(Paragraph(ar(caption), PS['cap']))
    return flow

# ================================================================ page furniture
def make_onpage(subject_label):
    def onpage(canvas, doc):
        canvas.saveState()
        W, H = landscape(A4)
        canvas.setStrokeColor(colors.HexColor('#F97C2B'))
        canvas.setLineWidth(1.1)
        canvas.line(1.5 * cm, H - 1.25 * cm, W - 1.5 * cm, H - 1.25 * cm)
        canvas.setFont('Amiri-B', 9)
        canvas.setFillColor(colors.HexColor('#2E86DE'))
        canvas.drawRightString(W - 1.5 * cm, H - 1.0 * cm, ar('الأستاذ : ' + TEACHER))
        canvas.setFillColor(colors.HexColor('#F97C2B'))
        canvas.drawString(1.5 * cm, H - 1.0 * cm, ar(BRAND))
        canvas.setFont('Amiri', 7.5)
        canvas.setFillColor(colors.HexColor('#808080'))
        canvas.drawCentredString(W / 2, 0.75 * cm,
                                 ar(f'{subject_label} | مخططات الدروس — Plans de leçon | INFEP | 2026'))
        canvas.drawRightString(W - 1.5 * cm, 0.75 * cm, str(doc.page))
        canvas.restoreState()
    return onpage

# ================================================================ card builders
def docx_card(doc, fields):
    """fields: list of (ar_label, value, fr_label)."""
    table = doc.add_table(rows=0, cols=3)
    table.style = 'Table Grid'
    table._tbl.tblPr.append(OxmlElement('w:bidiVisual'))
    for ar_lbl, val, fr_lbl in fields:
        cells = table.add_row().cells
        shade(cells[0], YELLOW)
        shade(cells[2], LIGHT_BLUE)
        cell_para(cells[0], ar_lbl, size=9, bold=True, color='#7A4F00', first=True)
        cell_para(cells[1], val, size=9, first=True)
        cell_para(cells[2], fr_lbl, size=8, color='#33507A', align=LEFT, first=True)
        cells[0].width = Cm(5.2)
        cells[1].width = Cm(16.3)
        cells[2].width = Cm(5.2)
    return table

def pdf_card(fields):
    data = []
    for ar_lbl, val, fr_lbl in fields:
        data.append([Paragraph(ar(ar_lbl), PS['cardlbl']),
                     Paragraph(ar(val), PS['cardval']),
                     Paragraph(_clean_txt(fr_lbl), PS['cardfr'])])
    t = Table(data, colWidths=[5.2 * cm, 16.1 * cm, 5.2 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#FFE066')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#EAF3FC')),
        ('GRID', (0, 0), (-1, -1), 0.7, colors.HexColor('#C9A227')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t

# ================================================================ exercises
def exercises_boxes_docx(doc, ex_list):
    for tag, q, a in ex_list:
        dpara(doc, tag, size=11, bold=True, color='FFFFFF', align=RIGHT, bg=RED, space_after=2)
        dpara(doc, q, size=10, bold=True, color='#7A1F2B', align=RIGHT, bg=LIGHT_YELLOW, space_after=2)
        dpara(doc, 'عناصر الإجابة: ' + a, size=9.5, color='#1E6B3C', align=RIGHT, bg=LIGHT_GREEN, space_after=8)

def exercises_boxes_pdf(ex_list):
    flow = []
    for tag, q, a in ex_list:
        tt = Table([[Paragraph(ar(tag), ParagraphStyle('tg', fontName='Amiri-B', fontSize=11,
                     leading=15, alignment=TA_RIGHT, textColor=colors.white))]], colWidths=[26.5 * cm])
        tt.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#E8475F')),
                                ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                                ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8)]))
        qq = Table([[Paragraph(ar(q), PS['exq'])]], colWidths=[26.5 * cm])
        qq.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFF9E0')),
                                ('BOX', (0, 0), (-1, -1), 0.7, colors.HexColor('#F5C242')),
                                ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                                ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8)]))
        aa = Table([[Paragraph(ar('عناصر الإجابة: ' + a), PS['exa'])]], colWidths=[26.5 * cm])
        aa.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#E8F8F0')),
                                ('BOX', (0, 0), (-1, -1), 0.7, colors.HexColor('#27AE60')),
                                ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                                ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8)]))
        flow += [tt, qq, aa, Spacer(1, 7)]
    return flow

# ================================================================ phase-table geometry
PHASE_HDR = ['المراحل\n(Phases)', 'الأغراض التعلّمية\n(Objectifs de formation)', 'الروابط\n(Liens)',
             'عناصر المحتوى\n(Éléments de contenu)', 'المدة\n(Durée)',
             'الأحداث البيداغوجية\n(Événements pédagogiques)', 'الوسائل البيداغوجية\n(Moyens pédagogiques)',
             'القيمة\n(Quantité)', 'المكان\n(Lieu)', 'التقييم التكويني\n(Évaluation formative)']
PHASE_W = [1.35, 3.9, 1.25, 4.4, 1.35, 5.7, 2.8, 1.05, 1.35, 2.4]  # ≈ 25.5 cm
