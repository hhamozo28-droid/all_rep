# -*- coding: utf-8 -*-
"""ELE0701 memo builder v2 — richer content, right alignment, colored terms,
researched facts, solved exercises, AI + real photos.
Usage: python3 make_memos_ele.py
"""
import os, sys, json, re
sys.path.insert(0, "/home/user/pipeline")

from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_BREAK, WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                Table as RLTable, TableStyle, Image as RLImage)
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER

import arabic_reshaper

CODE = "ELE0701"
SUBJ = json.load(open("/home/user/pipeline/ele0701_subjects.json", encoding="utf-8"))
IMG = "/home/user/pipeline/memo_imgs"
REAL = "/home/user/pipeline/memo_imgs/real"
OUT = "/home/user/memo_out"
os.makedirs(OUT, exist_ok=True)
os.makedirs(REAL, exist_ok=True)

# copy real photos
import shutil, glob
for f in glob.glob("/home/user/image-search/*"):
    shutil.copy(f, REAL)

# ---------------- fonts — IBM Plex Sans Arabic (professional, FE-complete) ----------------
pdfmetrics.registerFont(TTFont('PSA', '/home/user/pipeline/fonts2/IBMPlexSansArabic-Regular.ttf'))
pdfmetrics.registerFont(TTFont('PSA-B', '/home/user/pipeline/fonts2/IBMPlexSansArabic-Bold.ttf'))
pdfmetrics.registerFontFamily('PSA', normal='PSA', bold='PSA-B', italic='PSA', boldItalic='PSA-B')
FONT_DOCX = "IBM Plex Sans Arabic"

# shaping: EXACT v1 pipeline — reshape + get_display + escape (proven display order)
from bidi.algorithm import get_display
from xml.sax.saxutils import escape
def ar(t):
    return escape(get_display(arabic_reshaper.reshape(str(t)), base_dir='R'))

# ---------------- colors ----------------
BLUE   = RGBColor(0x1F, 0x4E, 0x79)
BLUE2  = RGBColor(0x2E, 0x75, 0xB6)
GOLD   = RGBColor(0xB4, 0x53, 0x09)
GREEN  = RGBColor(0x1E, 0x7A, 0x3C)
RED    = RGBColor(0xB0, 0x2A, 0x2A)
GRAY   = RGBColor(0x59, 0x59, 0x59)
HEX_BLUE, HEX_BLUE2, HEX_GOLD, HEX_GREEN = "#1F4E79", "#2E75B6", "#B45309", "#1E7A3C"
HEX_ROW, HEX_ROW2, HEX_NOTE = "#F2F7FB", "#FFFFFF", "#FFF6DD"

# ---------------- DOCX helpers ----------------
def _run(p, text, size=12, bold=False, color=None, italic=False, font="IBM Plex Sans Arabic"):
    r = p.add_run(text)
    r.font.size = Pt(size); r.bold = bold; r.italic = italic
    r.font.name = font
    r._element.rPr.rFonts.set(qn('w:eastAsia'), font)
    if color is not None:
        r.font.color.rgb = color
    return r

def rtl(p, align=WD_ALIGN_PARAGRAPH.RIGHT):
    pPr = p._p.get_or_add_pPr()
    b = OxmlElement('w:bidi'); b.set(qn('w:val'), '1'); pPr.append(b)
    p.alignment = align

def hl_runs(p, text, terms, size=12, base_color=None, bold=False):
    """right-aligned text with colored bold term highlighting"""
    rtl(p, WD_ALIGN_PARAGRAPH.RIGHT)
    pattern = "(" + "|".join(re.escape(t) for t in sorted(terms, key=len, reverse=True)) + ")" if terms else None
    if pattern:
        for piece in re.split(pattern, str(text)):
            if not piece:
                continue
            if piece in terms:
                _run(p, piece, size=size, bold=True, color=GOLD)
            else:
                _run(p, piece, size=size, bold=bold, color=base_color)
    else:
        _run(p, str(text), size=size, bold=bold, color=base_color)

def h1(doc, text):
    p = doc.add_paragraph(); rtl(p)
    _run(p, text, size=15, bold=True, color=BLUE)
    return p

def h2(doc, text):
    p = doc.add_paragraph(); rtl(p)
    _run(p, text, size=13, bold=True, color=BLUE2)
    return p

def body(doc, text, terms, size=12):
    p = doc.add_paragraph(); hl_runs(p, text, terms, size=size)
    p.paragraph_format.space_after = Pt(5)
    return p

def bullet(doc, text, terms):
    p = doc.add_paragraph(); rtl(p)
    _run(p, "•  ", size=12, bold=True, color=BLUE2)
    hl_runs(p, text, terms)
    return p

def numbered(doc, n, text, terms):
    p = doc.add_paragraph(); rtl(p)
    _run(p, f"{n}. ", size=12, bold=True, color=BLUE2)
    hl_runs(p, text, terms)
    return p

def cell_align(txt):
    v = str(txt).strip()
    return WD_ALIGN_PARAGRAPH.CENTER if v.isdigit() else WD_ALIGN_PARAGRAPH.RIGHT

def col_weights(header, rows):
    """column width weight = amount of text it holds (user rule)"""
    w = []
    for i in range(len(header)):
        m = max([len(str(header[i]))] + [len(str(r[i])) for r in rows])
        w.append(min(max(m, 6), 90))
    return w

def table(doc, header, rows, terms=None, fsize=10.5):
    tb = doc.add_table(rows=1, cols=len(header))
    tb.style = "Table Grid"
    tb.autofit = False
    tb._tbl.tblPr.append(OxmlElement('w:bidiVisual'))
    weights = col_weights(header, rows)
    wtot = sum(weights)
    for i, htxt in enumerate(header):
        c = tb.rows[0].cells[i]; c.text = ""
        p = c.paragraphs[0]; rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
        _run(p, str(htxt), size=fsize, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))
        shd = OxmlElement('w:shd'); shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:fill'), "1F4E79"); c._tc.get_or_add_tcPr().append(shd)
    for ri, row in enumerate(rows):
        cells = tb.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            rtl(p, cell_align(val))
            hl_runs(p, str(val), terms or set(), size=fsize)
            shd = OxmlElement('w:shd'); shd.set(qn('w:val'), 'clear')
            shd.set(qn('w:fill'), "F2F7FB" if ri % 2 == 0 else "FFFFFF")
            cells[i]._tc.get_or_add_tcPr().append(shd)
    for r in tb.rows:
        for j, wgt in enumerate(weights):
            r.cells[j].width = Cm(max(17.0 * wgt / wtot, 1.8))
    doc.add_paragraph().paragraph_format.space_after = Pt(3)
    return tb

def note_box(doc, text, title="سلامة مهنية"):
    tb = doc.add_table(rows=1, cols=1); tb.style = "Table Grid"
    c = tb.rows[0].cells[0]; c.text = ""
    p = c.paragraphs[0]; rtl(p)
    _run(p, f"⚠ {title}: ", size=11, bold=True, color=RED)
    _run(p, text, size=11, bold=True, color=RGBColor(0x7A, 0x4A, 0x00))
    shd = OxmlElement('w:shd'); shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:fill'), "FFF6DD"); c._tc.get_or_add_tcPr().append(shd)
    doc.add_paragraph().paragraph_format.space_after = Pt(3)

def facts_box(doc, facts):
    tb = doc.add_table(rows=1, cols=1); tb.style = "Table Grid"
    c = tb.rows[0].cells[0]; c.text = ""
    p = c.paragraphs[0]; rtl(p)
    _run(p, "📌 معطيات تقنية موثقة (بحث معمّق):", size=11.5, bold=True, color=GREEN)
    shd = OxmlElement('w:shd'); shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:fill'), "EAF6EC"); c._tc.get_or_add_tcPr().append(shd)
    for f in facts:
        p2 = c.add_paragraph(); rtl(p2)
        _run(p2, "✓ ", size=11, bold=True, color=GREEN)
        _run(p2, f, size=11)
    doc.add_paragraph().paragraph_format.space_after = Pt(3)

def add_pic(doc, path, caption=None, width=13):
    if not os.path.exists(path):
        return
    p = doc.add_paragraph(); rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
    p.add_run().add_picture(path, width=Cm(width))
    if caption:
        cp = doc.add_paragraph(); rtl(cp, WD_ALIGN_PARAGRAPH.CENTER)
        _run(cp, caption, size=9.5, italic=True, color=GRAY)

# ---------------- PDF styles ----------------
S2 = {
 'title':  ParagraphStyle('t', fontName='PSA-B', fontSize=15, leading=24, alignment=TA_CENTER, textColor=colors.HexColor(HEX_BLUE)),
 'sub':    ParagraphStyle('s', fontName='PSA-B', fontSize=12.5, leading=21, alignment=TA_CENTER, textColor=colors.HexColor(HEX_BLUE2)),
 'h1':     ParagraphStyle('h1', fontName='PSA-B', fontSize=13.5, leading=22, alignment=TA_RIGHT, textColor=colors.HexColor(HEX_BLUE), spaceBefore=8, spaceAfter=4),
 'h2':     ParagraphStyle('h2', fontName='PSA-B', fontSize=12, leading=19.5, alignment=TA_RIGHT, textColor=colors.HexColor(HEX_BLUE2), spaceBefore=6, spaceAfter=3),
 'body':   ParagraphStyle('b', fontName='PSA', fontSize=11, leading=19.5, alignment=TA_RIGHT, spaceAfter=5),
 'bullet': ParagraphStyle('bl', fontName='PSA', fontSize=11, leading=19.5, alignment=TA_RIGHT, rightIndent=8, spaceAfter=3),
 'cell':   ParagraphStyle('c', fontName='PSA', fontSize=9.5, leading=15.5, alignment=TA_RIGHT),
 'cellc':  ParagraphStyle('cc', fontName='PSA-B', fontSize=9.5, leading=15.5, alignment=TA_CENTER),
 'cap':    ParagraphStyle('cap', fontName='PSA', fontSize=9, leading=14, alignment=TA_CENTER, textColor=colors.HexColor("#595959")),
}
CAPS = {"flowt": "المخطط التدفقي لمحتوى الدرس — اقرأه من الأعلى إلى الأسفل",
        "flowc": "المخطط التدفقي لمسار المعالجة — اختر مسارك على المخطط قبل التنفيذ",
        "imgc": "الواقع المهني — صورة توضيحية للحالة"}

def flow_width_cm(path, cap=8.4, max_h=13.4):
    if not os.path.exists(path):
        return cap
    from PIL import Image as PI
    w, h = PI.open(path).size
    return min(cap, max_h * w / h)

def pdf_hl(text, terms, style):
    """v1-exact display order: per-piece ar(), pieces concatenated in visual (reversed) order,
    terms wrapped in color tags (tags are Latin markup, safe outside ar())."""
    t = str(text)
    if terms:
        pattern = "(" + "|".join(re.escape(x) for x in sorted(terms, key=len, reverse=True)) + ")"
        pieces = [p for p in re.split(pattern, t) if p != ""]
    else:
        pieces = [t]
    out = ""
    for piece in reversed(pieces):
        seg = ar(piece)
        if terms and piece in terms:
            out += f'<font color="{HEX_GOLD}"><b>{seg}</b></font>'
        else:
            out += seg
    return Paragraph(out, style)

def pdf_table(header, rows, terms=None, widths=None):
    if widths is None:
        wts = col_weights(header, rows)
        wtot = sum(wts)
        widths = [max(16.5 * cm * w / wtot, 1.6 * cm) for w in wts]
    header = header[::-1]                      # RTL: first column drawn rightmost
    rows = [list(r)[::-1] for r in rows]
    widths = widths[::-1]
    data = []
    data.append([Paragraph(ar(str(h)), S2['cellc']) for h in header])
    for r in rows:
        row = []
        for v in r:
            sty = S2['cellc'] if cell_align(v) == WD_ALIGN_PARAGRAPH.CENTER else S2['cell']
            row.append(pdf_hl(v, terms, sty))
        data.append(row)
    if widths is None:
        widths = [16.5 * cm / len(header)] * len(header)
    t = RLTable(data, colWidths=widths, repeatRows=1)
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(HEX_BLUE)),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#B9C6D4")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]
    for i in range(1, len(data)):
        if i % 2 == 1:
            style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor(HEX_ROW)))
    t.setStyle(TableStyle(style))
    return t

def pdf_note(text, title="سلامة مهنية"):
    # piecewise visual order: text segment left, colored title rightmost
    inner = [[Paragraph(ar(text) + ' ' + f'<font color="#B02A2A"><b>{ar("⚠ " + title + ": ")}</b></font><b></b>',
                        ParagraphStyle('n', fontName='PSA', fontSize=10.5, leading=16, alignment=TA_RIGHT))]]
    t = RLTable(inner, colWidths=[16.2 * cm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(HEX_NOTE)),
                           ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#D9A93C")),
                           ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    return t

def pdf_facts(facts):
    rows = [[Paragraph(f'<font color="#1E7A3C"><b>{ar("معطيات تقنية موثقة (بحث معمّق):")}</b></font>' + f'<font color="#1E7A3C"><b> 📌</b></font>',
             ParagraphStyle('f', fontName='PSA-B', fontSize=11, leading=16, alignment=TA_RIGHT))]]
    for f in facts:
        rows.append([Paragraph(ar(f) + f'<font color="#1E7A3C"><b> ✓</b></font>',
                     ParagraphStyle('f2', fontName='PSA', fontSize=10.5, leading=15, alignment=TA_RIGHT))])
    t = RLTable(rows, colWidths=[16.2 * cm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EAF6EC")),
                           ('BOX', (0, 0), (-1, -1), 0.8, colors.HexColor("#7FB98D")),
                           ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
    return t

def pdf_image(path, caption=None, max_w=13.5 * cm):
    from PIL import Image as PILImage
    out = []
    if os.path.exists(path):
        w, h = PILImage.open(path).size
        w2 = min(max_w, w)
        h2 = h * (w2 / w)
        out.append(RLImage(path, width=w2, height=h2))
        if caption:
            out.append(Paragraph(ar(caption), S2['cap']))
        out.append(Spacer(1, 4))
    return out

# ---------------- module knowledge ----------------
MOD = {
 "MC1": {"intro": "يعرّف هذا المقياس المتربص بميدان كهرباء السيارات: مهن الورشة، مسار التكوين، أدوات المهنة، وقواعد الاندماج المهني. الهدف بناء هوية مهنية واعية بالمسؤولية والجودة.",
  "terms": [["الورشة", "Atelier"], ["المهنة", "Métier"], ["التكوين", "Formation"], ["الجدولة", "Planning"]],
  "facts": ["يُعدّ كهربائي السيارات من المهن الحرفية المنظمة بشارة مهنية وسجل تجاري حسب التشريع الجزائري.",
            "تشمل الكفاءات المهنية: التشخيص، الإصلاح، الصيانة الوقائية، وخدمة الزبون."],
  "safety": "احترم قواعد الورشة: لباس العمل، تنظيم المكان، والانضباط في التوقيت.",
  "steps": ["تحديد مهارات ومهام كهربائي السيارات.", "التعريف بمراحل التكوين والدروس الأساسية.", "تنظيم مكان العمل وأدوات الورشة.", "إعداد خطة شخصية للتعلم والاندماج.", "تطبيق قواعد التواصل المهني مع الزملاء والمكوّن."]},
 "MC2": {"intro": "يتعلق المقياس بحماية المستهلك: حقوقه وواجباته، الضمان، الفاتورة، السلامة الاستهلاكية، وآليات الشكوى والجودة في القطاع الحرفي.",
  "terms": [["المستهلك", "Consommateur"], ["الفاتورة", "Facture"], ["الضمان", "Garantie"], ["الجودة", "Qualité"]],
  "facts": ["الفاتورة وثيقة قانونية يجب أن تتضمن: هوية الحرفي، طبيعة العمل، الكميات، الأثمنة، والتاريخ.",
            "مدة الضمان القانونية على الإصلاحات الحرفيّة تحدد بالعقد وتُحترم وفق قانون حماية المستهلك."],
  "safety": "الفاتورة والضمان وثيقتان أساسيتان — لا تسليم المنتج دونهما.",
  "steps": ["جمع المعلومات عن المنتج والخدمة.", "قراءة الفاتورة والضمان وشروطهما.", "التحقق من مطابقة المنتج للمواصفات.", "متابعة الخدمة بعد البيع وتوثيقها.", "معالجة الشكوى وفق المسار الإداري الصحيح."]},
 "MC3": {"intro": "يطبّق الحساب المهني على الكهرباء: قانون أوم (V = R × I)، القدرة (P = U × I)، التحويل بين الوحدات، وحسابات المقاطع والتيارات — أساس كل تشخيص كهربائي سليم.",
  "terms": [["الجهد", "Tension (V)"], ["التيار", "Courant (A)"], ["المقاومة", "Résistance (Ω)"], ["القدرة", "Puissance (W)"]],
  "facts": ["بطارية السيارة 12V؛ جهد الشحن السليم 13.8–14.5V؛ القوة الدافعة للخلية الرطبة ≈ 2.1V (6 خلايا = 12.6V).",
            "قدرة البادئ النموذجية 1–2 kW، ويصل سحبه إلى 100–200A أثناء التشغيل."],
  "safety": "لا تُجري حسابات على قيم مفترضة — اقرأ القياسات الحقيقية بالجهاز أولًا.",
  "steps": ["تحديد المعطيات (U, I, R) من المخطط أو القياس.", "اختيار العلاقة المناسبة (V=RI، P=UI).", "إجراء الحساب بالوحدات الصحيحة.", "مقارنة النتيجة بالقيمة المرجعية والحكم.", "توثيق القيم المقاسة في بطاقة التدخل."]},
 "MC4": {"intro": "أساسيات الكهرباء: التيار المستمر والمتردد، التوصيل على التوالي والتوازي، قانون أوم، القوة الدافعة الكهربائية، والقياسات بالملتيميتر — لغة كل دورة كهربائية في السيارة.",
  "terms": [["تيار مستمر", "Courant continu (DC)"], ["توصيل توالٍ", "Série"], ["توصيل توازٍ", "Parallèle"], ["القوة الدافعة", "Force électromotrice"], ["الأرضي", "Masse"]],
  "facts": ["في التوصيل التوالي: Rت = R1+R2+… ؛ في التوازي: 1/Rت = 1/R1+1/R2.",
            "أرضي السيارة هي الهيكل المعدني (Masse) ويُشكّل القطب السالب في أغلب الدوائر."],
  "safety": "افصل القطب السالب للبطارية قبل أي تدخل في الدوائر الكهربائية.",
  "steps": ["رسم الدائرة وتحديد العناصر.", "حساب المقاومة المكافئة (توالٍ/توازٍ).", "حساب التيارات والجهود في كل فرع.", "التحقق عمليًا بالملتيميتر.", "توثيق النتائج ومقارنتها بالنظري."]},
 "MC5": {"intro": "تحليل المكوّنات الإلكترونية الأساسية في سيارات اليوم: المقاومات، المكثفات، الثنائيات، الترانزستورات، المرحّلات، والمعالجات البسيطة — كيف تتحكم الإلكترونيات في الأنظمة الكهربائية.",
  "terms": [["ثنائي", "Diode"], ["ترانزستور", "Transistor"], ["مرحل", "Relais"], ["مكثف", "Condensateur"], ["معالج", "Microcontrôleur"]],
  "facts": ["الثنائي يمرّر التيار في اتجاه واحد فقط؛ قياسه بوضع Diode في الملتيميتر يعطي سقوط جهد ≈ 0.5–0.7V للتوجيه الأمامي.",
            "المرحل (Relais) مفتاح كهرومغناطيسي يتحكم بتيار عالٍ بتيار ضعيف نموذجي 12V."],
  "safety": "لا تلمس المكوّنات الإلكترونية والبطارية موصولة — الحساسية للشحن الكهربائي عالية.",
  "steps": ["قراءة رمز المكوّن على المخطط.", "فحص المكوّن بالملتيميتر (وضع Diode/Ω).", "استبدال المكوّن المعطوب بمكافئ معتمد.", "إعادة اختبار الدائرة تحت التشغيل.", "توثيق قيم الفحص قبل/بعد."]},
 "MC6": {"intro": "تكنولوجيا مكوّنات السيارة الكهربائية: الضفائن والأسلاك، المفاتيح، المصهرات، المرحّلات، الوصلات والتوصيلات — هندسة التوزيع الكهربائي داخل المركبة.",
  "terms": [["ضفيرة", "Faisceau"], ["مصهر", "Fusible"], ["مرحل", "Relais"], ["وصلة", "Connecteur"], ["أرضي", "Masse"]],
  "facts": ["المصهر يُختار حسب تيار المستهلك؛ القيم الشائعة: 5A، 10A، 15A، 20A، 30A (ملوّنة حسب المعيار).",
            "أعطال الضفائر الشائعة: قصر، انقطاع، تآكل الوصلات، وأكسدة التلامسات."],
  "safety": "استبدل المصهر دائمًا بنفس القيمة الاسمية — التكبير يعرض الدائرة للحريق.",
  "steps": ["التعريف بالضفيرة وأقسامها.", "تتبع الدائرة على المخطط.", "فحص الوصلات والتلامسات.", "استبدال العناصر التالفة وإعادة التجميع.", "اختبار جميع الوظائف بعد التجميع."]},
 "MC7": {"intro": "قراءة الرسوم البيانية الكهربائية للسيارة: الرموز القياسية ISO، المخططات المفصلة والمجمّعة، تتبّع المسارات من المصهر إلى المستهلك — المهنة التي تختصر وقت التشخيص.",
  "terms": [["مخطط", "Schéma"], ["رمز", "Symbole"], ["مسار", "Circuit"], ["تغذية", "Alimentation"], ["إرجاع", "Retour"]],
  "facts": ["تُقرأ المخططات من التغذية (+Batt) إلى المستهلك ثم الإرجاع إلى الأرضي.",
            "الرموز الموحدة ISO تجعل المخطط مفهومًا عبر الشركات المصنعة المختلفة."],
  "safety": "المخطط المرجع الأول — لا تعتمد على الذاكرة عند التوصيل.",
  "steps": ["تحديد نوع المخطط ورموزه.", "تتبّع دائرة التغذية من المصهر.", "تتبّع دائرة الإرجاع إلى الأرضي.", "مطابقة المخطط بالواقع بالمقاييس.", "تدوين الملاحظات على نسخة العمل."]},
 "MC8": {"intro": "المعلوماتية في الورشة: الحاسوب والبرامج المتخصصة، قواعد بيانات قطع الغيار، وحدة التشخيص OBD، وتوثيق التدخلات رقميًا — أتمتة الورشة الحديثة.",
  "terms": [["تشخيص", "Diagnostic"], ["OBD", "On-Board Diagnostics"], ["قاعدة بيانات", "Base de données"], ["تحديث", "Mise à jour"]],
  "facts": ["منفذ OBD-II معيار منذ 1996؛ يقرأ الأكواد P0xxx (محرك)، C (تعليق)، B (جسم)، U (شبكة).",
            "يجب تحديث برامج التشخيص دوريًا لمطابقة مركبات السنوات الجديدة."],
  "safety": "احمِ بيانات العميل — لا تشارك معلومات المركبة خارج الورشة.",
  "steps": ["تهيئة جهاز التشخيص وتوصيله بالمنفذ OBD.", "قراءة الأكواد وتفكيكها (DTC).", "البحث عن قطع الغيار في قاعدة البيانات.", "توثيق التقرير وحفظه.", "مسح الأكواد بعد الإصلاح والاختبار."]},
 "MC9": {"intro": "الصحة والسلامة والبيئة في ورشة كهرباء السيارات: مخاطر الكهرباء، الحرائق، حمض البطارية، الأدوات الدوّارة، والمواد الكيميائية — مع قواعد الوقاية والتصريف البيئي السليم.",
  "terms": [["مخاطر مهنية", "Risques professionnels"], ["معدات واقية", "EPI"], ["إسعافات", "Secourisme"], ["بيئة", "Environnement"]],
  "facts": ["حمض بطارية الرصاص خطر تآكلي — يُعادل الصودا قبل التصريف؛ والبطاريات تُسلّم لمراكز المعالجة المعتمدة.",
            "تيار 50mA مميت عبر جسم الإنسان — لذلك تُستخدم الأدوات العازلة دائمًا."],
  "safety": "النظارة والقفازان والحذاء العازل إلزاميان داخل الورشة دائمًا.",
  "steps": ["تحديد المخاطر في مكان العمل.", "استخدام المعدات الواقية الصحيحة.", "تنظيم الطوارئ والإخلاء.", "تصريف الزيوت والبطاريات وفق القواعد.", "مراجعة خطة الوقاية دوريًا."]},
 "MC10": {"intro": "تقنيات التعبير والبحث عن الوظيفة: كتابة السيرة الذاتية، رسالة الطلب، التحضير لمقابلة العمل، والتواصل المهني — جسر الانتقال من التكوين إلى الشغل.",
  "terms": [["سيرة ذاتية", "CV"], ["مقابلة", "Entretien"], ["توصية", "Recommandation"], ["تواصل", "Communication"]],
  "facts": ["السيرة الذاتية الفعّالة صفحة واحدة للمبتدئ: المعلومات، التكوين، الكفاءات، والتجارب.",
            "الانطباع الأول في المقابلة يُحدَّد خلال أول 30 ثانية — المظهر والسلام والدقة."],
  "safety": "الصدق في السيرة الذاتية قاعدة مهنية — المبالغة تُسقط الثقة.",
  "steps": ["تحليل عرض العمل وشروطه.", "إعداد سيرة ذاتية مخصصة للعرض.", "التحضير لأسئلة المقابلة.", "المتابعة بعد المقابلة.", "تحديث قاعدة مهاراتك باستمرار."]},
 "MQ1": {"intro": "صيانة نظام تشغيل محرك السيارة: البطارية 12V، البادئ (Démarreur) بملفه المغناطيسي وترس البندكس، مفتاح الإشعال، وحلقة الطيران. عند إدارة المفتاح ينشط الملف المغناطيسي فيدفع النواة ويعشق الترس مع الحذافة فيدور المحرك، ثم يفصل القابض أحادي الاتجاه تلقائيًا بعد التشغيل لمنع الضرر.",
  "terms": [["بادئ", "Démarreur"], ["حلقة طيران", "Volant moteur"], ["قابض أحادي", "Bendix"], ["بطارية", "Batterie"], ["مفتاح مغناطيسي", "Télérupteur"]],
  "facts": ["جهد البطارية الساكن السليم 12.4–12.7V؛ سحب البادئ النموذجي 100–200A عند التشغيل (يُقاس بمقياس مخصوص).",
            "مكوّنات البادئ: محرك تيار مستمر، آلية النقل (ترس البندكس)، والمفتاح الكهرومغناطيسي (Solenoid)؛ القابض أحادي الاتجاه يمنع تدوير البادئ من المحرك."],
  "safety": "سلك البطارية السالب يُفصل أولًا ويُركّب آخرًا — وتجنب قصر الأدوات المعدنية بين القطبين.",
  "steps": ["فحص البطارية: جهد ساكن 12.4–12.7V.", "فحص سحب تيار البادئ (Ampèremètre).", "فحص المفتاح المغناطيسي والتوصيلات.", "فحص ترس البندكس وتعشيقه مع الحذافة.", "اختبار التشغيل ومراقبة التعشيق.", "توثيق القيم وتسليم المركبة."]},
 "MQ2": {"intro": "صيانة نظام الشحن: الدينامو (Alternateur) يحوّل الحركة إلى تيار متردد تُقوّمه الديودات إلى مستمر، ومنظم الجهد (Régulateur) يثبّت الخرج بين 13.5 و14.5 فولت لشحن البطارية دون إتلافها. القياس بالملتيميتر هو أساس التشخيص.",
  "terms": [["دينامو", "Alternateur"], ["منظم الجهد", "Régulateur"], ["ديود", "Diode"], ["حزام", "Courroie"], ["بكرة", "Galet"]],
  "facts": ["جهد الشحن السليم 13.8–14.5V عند 2000 لفة/د؛ إذا تجاوز 15V فمنظم الجهد تالف (خطر الشحن الزائد).",
            "يتكوّن الدينامو من: روتور (مجال)، ستاتور (توليد)، جسر ديودات (تقويم)، ومنظم جهد؛ الحزام يُفحص للتوتر والاهتراء."],
  "safety": "لا تفصل البطارية والمحرك يعمل — قد يرتفع الجهد ويؤتلف الوحدات الإلكترونية.",
  "steps": ["قياس جهد البطارية والمحرك متوقف (12.4–12.7V).", "القياس عند التشغيل (13.8–14.5V).", "فحص الحزام والتوتر والبكرات.", "فحص الديودات والمنظم.", "استبدال الوحدة التالفة وتكرار الاختبار.", "اختبار التحمل مع الأحمال (الإضاءة/المكيف)."]},
 "MQ3": {"intro": "صيانة أنظمة الإنارة والإشارات: المصابيح الأمامية (هالوجين/LED/زينون)، مصابيح الإشارة والخطر، الضوء الخلفي، والدوائر: المرحل، المصهرات، المفاتيح، وضبط زاوية الأضواء.",
  "terms": [["مصباح", "Lampe"], ["مرحل", "Relais"], ["مفتاح", "Interrupteur"], ["ضبط الأضواء", "Réglage des phares"]],
  "facts": ["قدرة لمبة الهالوجين H4 ≈ 55/60W؛ LED أكفأ بأقل من 20W لشدة ضوء مكافئة؛ الزينون يحتاج محوّل جهد (Ballast).",
            "ضبط الأضواء يُنجز على جهاز الضبط (Vérificateur) وفق المعيار: ارتفاع 1% لكل 100kg حمولة."],
  "safety": "اللمبات الساخنة بعد التشغيل — انتظر التبريد قبل الاستبدال.",
  "steps": ["تحديد العطل: لمبة، مصهر، مرحل، أو أسلاك.", "فحص التغذية والإرجاع بالملتيميتر.", "استبدال العنصر بالمواصفات الأصلية.", "ضبط الأضواء على جهاز الضبط.", "اختبار جميع وظائف الإنارة والإشارات."]},
 "MQ4": {"intro": "صيانة نظام الإشعال: البواجي، ملفات الإشعال، التوقيت، وكاشف الانفجار — خلقة شرارة موثوقة في اللحظة الصحيحة. الفحص يشمل مقاومة الملف، فجوة البواجي، وقراءة الأكواد.",
  "terms": [["بواجي", "Bougie"], ["ملف إشعال", "Bobine d'allumage"], ["شرارة", "Étincelle"], ["توقيت", "Avance"], ["كاشف انفجار", "Détonation"]],
  "facts": ["فجوة البواجي النموذجية 0.7–1.1mm؛ جهد الإشعال يبلغ 20–40kV في الظروف الحرجة.",
            "مقاومة ملف الإشعال: أولي 0.5–3Ω، ثانوي 6–15kΩ (تُقاس بعد الفصل عن الوحدة)."],
  "safety": "جهد الإشعال يتجاوز 20kV — لا تقترب من كابلات الإشعال والمحرك يعمل.",
  "steps": ["قراءة أكواد الأعطال OBD.", "فحص البواجي: اللون والفجوة والتآكل.", "فحص الملفات (مقاومة أولي/ثانوي).", "فحص التوقيت وكاشف الانفجار.", "استبدال الأجزاء وتقييم التشغيل.", "مسح الأكواد وإجراء جولة اختبار."]},
 "MQ5": {"intro": "صيانة مكونات الحقن الكهربائي والإلكتروني: الحاقنات، مضخة الوقود، الحساسات، ووحدة التحكم ECU — قياس الدقة في خلط الوقود والهواء. التشخيص يبدأ بالأكواد ثم القياسات.",
  "terms": [["حاقن", "Injecteur"], ["حساس", "Capteur"], ["ECU", "Calculateur"], ["مضخة", "Pompe à essence"], ["سكة الوقود", "Rampe d'injection"]],
  "facts": ["مقاومة الحاقن: 11–17Ω للعالي المقاومة، و2–5Ω للمنخفض المقاومة؛ الفرق المقبول بين الحاقنات ≤ 0.4Ω.",
            "ضغط الوقود النموذجي في السكة 3–3.5 بار (نظام العودة)؛ يُقاس بمقياس موصول بخط الخدمة."],
  "safety": "ضغط الوقود مرتفع — تفريغ الضغط قبل فك أي وصلة وقود.",
  "steps": ["قراءة الأكواب الحية Live Data.", "فحص ضغط الوقود (منظم الضغط).", "فحص الحاقنات (المقاومة والرش).", "فحص الحساسات ومقارنتها بالقيم المرجعية.", "استبدال العناصر وإعادة المعايرة.", "اختبار القيادة ومسح الأكواد."]},
 "MQ6": {"intro": "تركيب وإصلاح نظام القفل المركزي ونوافذ السيارة: محرّكات الأقفال، وحدة التحكم، المفتاح الذكي، مفاتيح النوافذ، وأنظمة الأمان — راحة وأمان في نظام واحد.",
  "terms": [["قفل مركزي", "Verrouillage centralisé"], ["محرك", "Vérin"], ["وحدة تحكم", "Calculateur"], ["مفتاح ذكي", "Clé intelligente"]],
  "facts": ["محرك القفل (Vérin) يعمل بتيار ثنائي الاتجاه (+/-) يغيّر اتجاه الحركة؛ سحبه النموذجي 2–5A لحظيًا.",
            "أنظمة المفتاح الذكي تعتمد على RFID مع رمز تردد متطابق بين المفتاح والوحدة."],
  "safety": "احذر ارتداد الزجاج أثناء فك الأبواب — استخدم الحماية على الحواف.",
  "steps": ["تشخيص العطل (كل الأبواب/باب واحد).", "فحص التغذية والإشارات للوحدات.", "استبدال المحرّك أو الوحدة.", "اختبار القفل المركزي والمزامنة.", "برمجة المفتاح الجديد عند الحاجة."]},
 "MQ7": {"intro": "تركيب وإصلاح دوائر الراديو السيارة: رأس القراءة، السماعات، المضخم، الهوائي، ووحدات الوسائط — التوصيل السليم مع الحفاظ على الضفيرة الأصلية وعزل الضجيج.",
  "terms": [["راديو", "Autoradio"], ["سماعة", "Haut-parleur"], ["مضخم", "Amplificateur"], ["هوائي", "Antenne"]],
  "facts": ["معظم رؤوس القراءة تعمل على 12V DC؛ التغذية الصفراء (ذاكرة) والحمراء (تشغيل) والسوداء (أرضي).",
            "مقاومة السماعة النموذجية 4Ω؛ التوصيل بالقطبية يحافظ على جودة الصوت (الطور)."],
  "safety": "افصل التغذية قبل توصيل السماعات لتفادي قصر الوصلات.",
  "steps": ["قراءة مخطط التوصيل للمركبة.", "توصيل التغذية والمفاتيح والضوء.", "توصيل السماعات مع مراعاة القطبية.", "عزل الوصلات وتنظيم الضفيرة.", "الضبط والاختبار الصوتي."]},
 "MQ8": {"intro": "صيانة وإصلاح نظام تكييف الهواء: دورة التبريد (الضاغط، المكثف، المبخّر، فتحة التوسيع)، غاز R134a أو R1234yf، قياس الضغوط بمقياس الخدمة، وكشف التسريبات — نظام يجمع الكهرباء والحرارة.",
  "terms": [["ضاغط", "Compresseur"], ["مكثف", "Condenseur"], ["مبخّر", "Évaporateur"], ["فريون", "Fréon"], ["مقياس الخدمة", "Manifold"]],
  "facts": ["ضغوط R134a الطبيعية: منخفض 25–35 PSI (≈1.7–2.4 bar)، عالي 200–250 PSI (≈14–17 bar) عند 25–30°C؛ الساكن 80–90 PSI.",
            "درجة غليان R134a = -26°C؛ النقص يظهر كضغط منخفض، والانسداد كضغط منخفض جدًا مع عالي مرتفع."],
  "safety": "لا تفتح الدائرة المغلقة للغاز — التسريب ضار بالبيئة والصحة؛ استخدم جهاز الاسترجاع.",
  "steps": ["قياس ضغطي الدائرة (عالي/منخفض).", "كشف التسريبات (جهاز الكشف/صبغة UV).", "التفريغ بالجهاز لمدة 30 دقيقة.", "التعبئة بالكمية المحددة بالجهاز.", "اختبار التبريد (فرق الحرارة 8–12°C).", "توثيق الكميات والضغوط."]},
 "MQ9": {"intro": "الصيانة الوقائية والعلاجية للإكسسوارات الكهربائية: مقاعد كهربائية، زجاج كهربائي، مساحات، أبجورة، حساسات ومصابيح خلفية — أعمال دقيقة تعتمد على الصبر في تتبع الضفيرة.",
  "terms": [["مقعد كهربائي", "Siège électrique"], ["زجاج كهربائي", "Lève-vitre"], ["مساحة", "Essuie-glace"], ["أبجورة", "Plafonnier"]],
  "facts": ["محرك الزجاج الكهربائي يحتوي على مفتاح أمان حراري يمنع الاستمرار عند الانسداد؛ سحبه 2–8A.",
            "مساحات الزجاج: التعشيق الموقّت يعتمد على مرحل زمني أو وحدة تحكم في المركبات الحديثة."],
  "safety": "استخدم أدوات العزل عند العمل على الوصلات الدقيقة، ولا تشد الأسلاك بأكثر من اللازم.",
  "steps": ["تحديد العطل بالاختبار الكهربائي.", "تتبّع الضفيرة والوصلات.", "استبدال المحرّك أو المفتاح أو الوحدة.", "اختبار الوظيفة كاملة بعد التركيب.", "تنظيف وتنظيم الضفيرة النهائية."]},
}

MOD_IMGS = {
 "MQ1": ["mq1_a.jpg", "mq1_b.jpg"], "MQ2": ["mq2_a.jpg", "mq2_b.jpg"],
 "MQ3": ["mq3_a.jpg", "mq3_b.jpg"], "MQ4": ["mq4_a.jpg", "mq4_b.jpg"],
 "MQ5": ["mq5_a.jpg", "mq5_b.jpg"], "MQ6": ["mq6_a.jpg", "mq6_b.jpg"],
 "MQ7": ["mq7_a.jpg", "mq7_b.jpg"], "MQ8": ["mq8_a.jpg", "mq8_b.jpg"],
 "MQ9": ["mq9_a.jpg", "mq9_b.jpg"], "MC4": ["mc4_a.jpg"], "MC9": ["mc9_a.jpg"],
}
# real photos per module family
REAL_IMG = {
 "MQ2": "automotive-electrical-workshop-technicia-1.jpg",
 "MQ5": "automotive-electrical-workshop-technicia-3.jpg",
 "MQ8": "ac-manifold-gauge-set-car-air-conditioni-1.jpg",
 "MC3": "automotive-electrical-workshop-technicia-2.jpg",
}

TERMS = {}
for mc, m in MOD.items():
    TERMS[mc] = set(t[0] for t in m["terms"]) | set(t[1] for t in m["terms"])

# ---------------- lesson blocks ----------------
def lesson_blocks(subj, l, mod, mc):
    terms = TERMS.get(mc, set())
    title = l["title_ar"]
    title_fr = l.get("title_fr") or ""
    lh = (l.get("th") or 2) + (l.get("tph") or 2)
    _n = int(l["num"])
    ft_path = f"/home/user/pipeline/memo_imgs/flow/{mc}_{_n:02d}_t.png"
    fc_path = f"/home/user/pipeline/memo_imgs/flow/{mc}_{_n:02d}_c.png"
    ci_path = f"/home/user/pipeline/memo_imgs/cases/c{((_n + int(mc[2:])) % 10) + 1}.jpg"
    B = []  # list of (kind, payload) — custom rendering
    B.append(("title", f"مذكرة الدرس {l['num']} — {title}"))
    B.append(("table", ["البيان", "التفاصيل"], [
        ["المقياس", f"{subj['code']} — {subj['name_ar']}"],
        ["الدرس", title],
        ["بالفرنسية", title_fr],
        ["المدة", f"{lh} ساعة (نظري {l.get('th',2)} + تطبيقي {l.get('tph',2)})"],
        ["الكفاءة", subj.get("competency", "")[:110]],
    ]))
    B.append(("h2", "الأهداف التعلمية"))
    B.append(("p", "في نهاية هذا الدرس يكون المتربص قادرًا على:"))
    for o in [f"شرح مضمون «{title}» وربطه بمكوّنات السيارة الكهربائية بدقة.",
              "تطبيق منهجية العمل المهنية وفق تسلسل الإنجاز المعتمد.",
              "استخدام أجهزة القياس والتشخيص (الملتيميتر، جهاز OBD) بشكل صحيح وآمن.",
              "التمييز بين الأعطال الشائعة وطرق معالجتها في هذا المحور.",
              "تقييم نتيجة العمل وفق معايير الجودة والسلامة وتوثيقها."]:
        B.append(("b", o))
    B.append(("h2", "المكتسبات القبلية والوسائل"))
    B.append(("p", f"المكتسبات القبلية: مفاهيم {subj['name_ar']} الأساسية، قراءة المخططات الكهربائية، استعمال الملتيميتر، قواعد السلامة العامة."))
    B.append(("p", f"الوسائل والمعدات: {l.get('tools') or 'معدات الورشة وأجهزة القياس حسب طبيعة النشاط'}، بطاقات الملاحظة، المخططات الكهربائية للمركبة، أدوات اليد المتخصصة."))
    B.append(("facts", mod["facts"]))
    B.append(("h2", f"1. المحتوى النظري الموسّع — {title}"))
    B.append(("p", f"{mod['intro']} ويتمحور هذا الدرس حول «{title}» الذي يمثل محورًا عمليًا من محوريات المقياس."))
    B.append(("p", f"أولًا — الإطار المفاهيمي: يندرج «{title}» ضمن منظومة {subj['name_ar']} التي تربط المعرفة النظرية بالتطبيق الميداني. فالمفهوم النظري يجيب عن سؤال «لماذا؟»، بينما الإجراء الميداني يجيب عن «كيف؟»، والكفاءة المهنية هي القدرة على الجمع بينهما بذكاء وسرعة في بيئة الورشة. من هذا المنطلق، يتعلم المتربص في هذا الدرس كيف يحلّل الظاهرة الكهربائية أو الميكانيكية المرتبطة بـ«{title}»، ثم كيف يترجم تحليله إلى خطوات إنجاز قابلة للقياس والتحقق."))
    B.append(("table", ["المصطلح", "المقابل بالفرنسية"], mod["terms"]))
    B.append(("p", f"ثانيًا — التفاصيل التقنية: لكل مكوّن من مكوّنات «{title}» وظيفة محددة ومعيار أداء قابل للفحص. عند التدخل المهني نبدأ دائمًا بالفحص البصري، ثم القياس الكهربائي أو الميكانيكي، ثم المقارنة بالقيم المرجعية، وأخيرًا الحكم: إصلاح، ضبط، أو استبدال. هذه المنهجية تختصر الوقت وتمنع العطل المتكرر، وهي ما يميّز الحرفي المدرّب عن المجرّب."))
    B.append(("p", f"ثالثًا —ربط المعارف: يتصل هذا الدرس مباشرة بمراحل العمل في الورشة، وبمعايير الجودة المعمول بها، وبقواعد التوثيق المهني. فكل تدخل ناجح يُقاس بثلاثة معايير: مطابقة الإصلاح للمواصفة، سلامة المركبة والعميل، ورضا الزبون عن الخدمة."))
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
    for s in ["ارتدِ المعدات الواقية قبل بدء أي تدخل (نظارة، قفازان، حذاء واقٍ).",
              "أبقِ مكان العمل منظمًا ونظيفًا طوال مدة النشاط.",
              "اطلب المساعدة عند التعامل مع الأوزان الثقيلة أو الجهد العالي."]:
        B.append(("b", s))
    B.append(("h2", "4. حالة مهنية تطبيقية"))
    B.append(("p", f"يصل إلى الورشة زبون يشكو من خلل يرتبط بـ«{title}». يستقبله الحرفي باحتراف: يستمع إلى الشكوى، يسجل ملاحظات، ثم يبدأ الفحص المنهجي — بحث بصري، قياس بالجهاز المناسب، مقارنة بالقيم المرجعية — قبل أن يقترح الحل والتكلفة. بعد موافقة الزبون ينجز العمل، ثم يختبر النظام تحت ظروف تشغيل حقيقية، ويوثّق كل شيء في بطاقة التدخل ويسلّم المركبة مع شرح مختصر للعمل المنجز. هذا السيناريو هو جوهر الخدمة المهنية الحديثة."))
    B.append(("flowc", fc_path))
    B.append(("imgc", ci_path))
    # exercises — 6 with solutions
    B.append(("h2", "5. تمارين محلولة (6 تمارين)"))
    ex = [
     (f"التمرين 1 — تعريف: عرّف «{title}» واذكر أهميته في مقياس {subj['name_ar']}.",
      f"الحل: «{title}» مفهوم/إجراء تقني يندرج ضمن مقياس {subj['name_ar']}، ويتضمن مجموعة من الإجراءات والمعايير التقنية التي تُنجز في ظروف الورشة. أهميته: يبني كفاءة مباشرة يحتاجها سوق العمل، ويربط المعرفة النظرية بالإنجاز الميداني القابل للقياس."),
     ("التمرين 2 — ترتيب: رتّب مراحل الإنجاز المهني لهذا الدرس.",
      "الحل: (1) الفحص البصري وجمع المعلومات، (2) القياس بالجهاز المناسب، (3) المقارنة بالقيم المرجعية، (4) الإنجاز (إصلاح/ضبط/استبدال)، (5) الاختبار النهائي، (6) التوثيق والتسليم."),
     ("التمرين 3 — تشخيص: مركبة تظهر العطل التالي: انقطاع متكرر في الوظيفة الكهربائية. ما خطوات التشخيص؟",
      "الحل: (1) قراءة الأكواد بجهاز OBD إن وُجدت، (2) الفحص البصري للوصلات والمصهرات، (3) قياس التغذية والإرجاع بالملتيميتر تحت الحمل، (4) فحص التلامسات والأرضي، (5) استبدال العنصر المثبت عطله، (6) إعادة الاختبار ومسح الأكواد."),
     ("التمرين 4 — حساب: بطارية 12V تغذي دورة مقاومتها الكلية 4Ω. احسب التيار المستهلك والقدرة.",
      "الحل: من قانون أوم I = U/R = 12/4 = 3 أمبير. القدرة P = U×I = 12×3 = 36 واط. (التحقق: P = U²/R = 144/4 = 36 واط ✓)"),
     ("التمرين 5 — صح أم خطأ: (أ) يجوز استبدال مصهر 10A بآخر 20A لتفادي الانقطاع. (ب) جهد الشحن السليم 13.8–14.5V. (ج) الملتيميتر يُستخدم مع البطارية موصولة دائمًا.",
      "الحل: (أ) خطأ — المصهر يُستبدل بنفس القيمة الإسمية فقط؛ التكبير يعرض الدائرة للحريق. (ب) صحيح — هذه القيم موثقة معياريًا. (ج) خطأ — القياسات الكهربائية الدقيقة تُجرى بعد الفصل، إلا في حالات القياس الحي المبرمجة."),
     ("التمرين 6 — حالة مهنية: زبون يطلب تفسيرًا لفاتورة الإصلاح. ما الذي تشرحه له؟",
      "الحل: أشرح له بطبيعة العطل المكتشف، والقطع المستبدلة وأثمنتها، وأجرة العمل، ومدة الضمان، ونصائح الاستعمال السليم — بلغة واضحة وبشفافية، مع تسليمه الفاتورة مفصّلة والحفاظ على حقه في المتابعة."),
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
    B.append(("p", "تقويم ذاتي: هل أستطيع شرح الفرق بين المفهوم النظري والإجراء الميداني؟ هل أعرف القيم المرجعية الأساسية؟ هل طبّقت قواعد السلامة دون مراقبة؟"))
    B.append(("h2", "الخلاصة والواجب"))
    B.append(("p", f"تناول الدرس «{title}» المفاهيم والمنهجية ومعايير الجودة والسلامة، مع ستة تمارين محلولة وحالة مهنية ترسّخ الكفاءة المستهدفة."))
    B.append(("p", "الواجب المنزلي: (1) أعد كتابة مراحل الإنجاز في دفترك مع رسم توضيحي بسيط. (2) ابحث عن معلومة تقنية إضافية تتعلق بالدرس واذكر مصدرها."))
    B.append(("table", ["المصطلح", "Français"], mod["terms"][:5]))
    return B

# ---------------- rendering DOCX ----------------
def render_docx(doc, blocks, terms, mc):
    for kind, *rest in blocks:
        if kind == "title":
            p = doc.add_paragraph(); rtl(p)
            _run(p, rest[0], size=14, bold=True, color=BLUE)
        elif kind == "h2":
            h2(doc, rest[0])
        elif kind == "p":
            body(doc, rest[0], terms)
        elif kind == "b":
            bullet(doc, rest[0], terms)
        elif kind == "n":
            numbered(doc, rest[0], rest[1], terms)
        elif kind == "a":
            p = doc.add_paragraph(); rtl(p)
            _run(p, "✔ ", size=11.5, bold=True, color=GREEN)
            hl_runs(p, rest[0], terms, size=11.5)
        elif kind == "table":
            table(doc, rest[0], rest[1], terms)
        elif kind == "note":
            note_box(doc, rest[0])
        elif kind == "facts":
            facts_box(doc, rest[0])
        elif kind in ("flowt", "flowc"):
            add_pic(doc, rest[0], CAPS[kind], width=flow_width_cm(rest[0]))
        elif kind == "imgc":
            add_pic(doc, rest[0], CAPS["imgc"], width=11)

# ---------------- rendering PDF ----------------
def render_pdf(story, blocks, terms, mc):
    for kind, *rest in blocks:
        if kind == "title":
            story.append(Paragraph(ar(rest[0]), S2['h1']))
        elif kind == "h2":
            story.append(Paragraph(ar(rest[0]), S2['h2']))
        elif kind == "p":
            story.append(pdf_hl(rest[0], terms, S2['body']))
        elif kind == "b":
            story.append(pdf_hl("•  " + rest[0], terms, S2['bullet']))
        elif kind == "n":
            story.append(pdf_hl(f"{rest[0]}.  {rest[1]}", terms, S2['bullet']))
        elif kind == "a":
            story.append(pdf_hl("✔ " + rest[0], terms, ParagraphStyle('a', parent=S2['body'], textColor=colors.HexColor(HEX_GREEN))))
        elif kind == "table":
            story.append(pdf_table(rest[0], rest[1], terms))
            story.append(Spacer(1, 5))
        elif kind == "note":
            story.append(pdf_note(rest[0]))
            story.append(Spacer(1, 5))
        elif kind == "facts":
            story.append(pdf_facts(rest[0]))
            story.append(Spacer(1, 5))
        elif kind in ("flowt", "flowc"):
            story.extend(pdf_image(rest[0], CAPS[kind], max_w=flow_width_cm(rest[0]) * cm))
        elif kind == "imgc":
            story.extend(pdf_image(rest[0], CAPS["imgc"], max_w=11 * cm))

# ---------------- page furniture ----------------
def docx_header(section):
    hdr = section.header
    hdr.paragraphs[0].text = ""
    t = hdr.add_table(rows=1, cols=2, width=Cm(17))
    t._tbl.tblPr.append(OxmlElement('w:bidiVisual'))
    c0 = t.rows[0].cells[0]; c0.text = ""
    p0 = c0.paragraphs[0]; rtl(p0, WD_ALIGN_PARAGRAPH.RIGHT)
    _run(p0, "الأستاذ : حمزة شعيب", size=10.5, bold=True, color=BLUE2)
    c1 = t.rows[0].cells[1]; c1.text = ""
    p1 = c1.paragraphs[0]; rtl(p1, WD_ALIGN_PARAGRAPH.LEFT)
    _run(p1, "صفحة دروسي", size=10.5, bold=True, color=GOLD)

def docx_footer(section, label):
    ftr = section.footer
    p = ftr.paragraphs[0]
    rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
    _run(p, label, size=9, color=GRAY)

def pdf_onpage(label):
    from reportlab.pdfgen import canvas as _canvas
    def onpage(canv, doc):
        canv.saveState()
        canv.setFont('PSA-B', 9)
        canv.setFillColor(colors.HexColor(HEX_BLUE2))
        canv.drawString(2 * cm, A4[1] - 1.35 * cm, ar("صفحة دروسي"))
        canv.setFillColor(colors.HexColor(HEX_GOLD))
        canv.drawRightString(A4[0] - 2 * cm, A4[1] - 1.35 * cm, ar("الأستاذ : حمزة شعيب"))
        canv.setStrokeColor(colors.HexColor(HEX_BLUE2)); canv.setLineWidth(0.7)
        canv.line(2 * cm, A4[1] - 1.55 * cm, A4[0] - 2 * cm, A4[1] - 1.55 * cm)
        canv.setFont('PSA', 8); canv.setFillColor(colors.HexColor("#808080"))
        canv.drawCentredString(A4[0] / 2, 1.1 * cm, ar(label))
        canv.drawRightString(A4[0] - 2 * cm, 1.1 * cm, str(doc.page))
        canv.restoreState()
    return onpage

# ---------------- main ----------------
if __name__ == "__main__":
  made = []
  for subj in SUBJ:
    mc = subj["code"]
    mod = MOD.get(mc) or MOD["MC4"]
    terms = TERMS.get(mc, set())
    base = f"{CODE} كهرباء السيارات - مذكرات - {mc} {subj['name_ar']}"
    docx_path = os.path.join(OUT, base + ".docx")
    pdf_path = os.path.join(OUT, base + ".pdf")
    # DOCX
    doc = Document()
    st = doc.styles["Normal"]; st.font.name = FONT_DOCX; st.font.size = Pt(12)
    docx_header(doc.sections[0])
    docx_footer(doc.sections[0], f"ELE0701 كهرباء السيارات — {mc} {subj['name_ar']} — السنة التكوينية 2026")
    p = doc.add_paragraph(); rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
    _run(p, "الجمهورية الجزائرية الديمقراطية الشعبية", size=13, bold=True, color=BLUE)
    p = doc.add_paragraph(); rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
    _run(p, "وزارة التكوين والتعليم المهنيين", size=13, bold=True, color=BLUE)
    p = doc.add_paragraph(); rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
    _run(p, "مذكرات الدروس — دليل المكوّن", size=16, bold=True, color=BLUE2)
    p = doc.add_paragraph(); rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
    _run(p, f"المقياس {mc}: {subj['name_ar']}", size=14, bold=True, color=GOLD)
    p = doc.add_paragraph(); rtl(p, WD_ALIGN_PARAGRAPH.CENTER)
    _run(p, f"التخصص: كهرباء السيارات — السنة التكوينية 2026 — عدد الدروس: {len(subj['lessons'])}", size=11, color=GRAY)
    imgs = MOD_IMGS.get(mc, [])
    if imgs:
        add_pic(doc, os.path.join(IMG, imgs[0]), "مخطط توضيحي للوحدة (صورة AI)", width=14)
    rimg = REAL_IMG.get(mc)
    if rimg:
        add_pic(doc, os.path.join(REAL, rimg), "الواقع المهني — صورة مرجعية", width=12)
    h2(doc, "مدخل الوحدة والمعطيات الموثقة")
    body(doc, mod["intro"], terms)
    facts_box(doc, mod["facts"])
    table(doc, ["المصطلح", "Français"], mod["terms"], terms)
    for l in subj["lessons"]:
        doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        render_docx(doc, lesson_blocks(subj, l, mod, mc), terms, mc)
    doc.save(docx_path)
    # PDF
    pdf = SimpleDocTemplate(pdf_path, pagesize=A4,
                            leftMargin=1.7 * cm, rightMargin=1.7 * cm,
                            topMargin=2.1 * cm, bottomMargin=1.8 * cm)
    story = []
    onpage = pdf_onpage(f"ELE0701 كهرباء السيارات — {mc} {subj['name_ar']}")
    story.append(Paragraph(ar("الجمهورية الجزائرية الديمقراطية الشعبية"), S2['title']))
    story.append(Paragraph(ar("وزارة التكوين والتعليم المهنيين"), S2['title']))
    story.append(Spacer(1, 4))
    story.append(Paragraph(ar("مذكرات الدروس — دليل المكوّن"), S2['sub']))
    story.append(Paragraph(ar(f"المقياس {mc}: {subj['name_ar']}"), S2['sub']))
    story.append(Paragraph(ar(f"التخصص: كهرباء السيارات — السنة التكوينية 2026 — عدد الدروس: {len(subj['lessons'])}"), S2['cap']))
    story.append(Spacer(1, 8))
    if imgs:
        story.extend(pdf_image(os.path.join(IMG, imgs[0]), "مخطط توضيحي للوحدة (صورة AI)", max_w=14 * cm))
    if rimg:
        story.extend(pdf_image(os.path.join(REAL, rimg), "الواقع المهني — صورة مرجعية", max_w=11 * cm))
    story.append(Paragraph(ar("مدخل الوحدة والمعطيات الموثقة"), S2['h2']))
    story.append(pdf_hl(mod["intro"], terms, S2['body']))
    story.append(pdf_facts(mod["facts"]))
    story.append(Spacer(1, 5))
    story.append(pdf_table(["المصطلح", "Français"], mod["terms"], terms))
    for l in subj["lessons"]:
        story.append(PageBreak())
        render_pdf(story, lesson_blocks(subj, l, mod, mc), terms, mc)
    pdf.build(story, onFirstPage=onpage, onLaterPages=onpage)
    made += [docx_path, pdf_path]
    print("built:", mc, len(subj["lessons"]), "lessons")

  print("TOTAL FILES:", len(made))
