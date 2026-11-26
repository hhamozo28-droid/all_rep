# -*- coding: utf-8 -*-
"""Generate a Word (.docx) version of روابط التحميل.md with clickable hyperlinks, RTL."""
import re
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

MD = "/home/user/روابط التحميل.md"
OUT = "/home/user/روابط التحميل.docx"

def set_rtl(p):
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    bidi.set(qn('w:val'), '1')
    pPr.append(bidi)
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

def add_hyperlink(paragraph, url, text):
    part = paragraph.part
    r_id = part.relate_to(url,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True)
    hl = OxmlElement('w:hyperlink')
    hl.set(qn('r:id'), r_id)
    new_run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    color = OxmlElement('w:color'); color.set(qn('w:val'), '0563C1'); rPr.append(color)
    u = OxmlElement('w:u'); u.set(qn('w:val'), 'single'); rPr.append(u)
    rFonts = OxmlElement('w:rFonts')
    rFonts.set(qn('w:ascii'), 'Calibri'); rFonts.set(qn('w:hAnsi'), 'Calibri')
    rFonts.set(qn('w:cs'), 'Arial'); rPr.append(rFonts)
    sz = OxmlElement('w:sz'); sz.set(qn('w:val'), '20'); rPr.append(sz)
    new_run.append(rPr)
    t = OxmlElement('w:t'); t.text = text
    new_run.append(t)
    hl.append(new_run)
    paragraph._p.append(hl)

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear'); shd.set(qn('w:fill'), hexcolor)
    tcPr.append(shd)

# ---- parse md table ----
rows = []
for ln in open(MD, encoding="utf-8"):
    ln = ln.strip()
    if ln.startswith("|") and "⬇️" in ln and not ln.startswith("|---") and not ln.startswith("| #"):
        cells = [c.strip() for c in ln.strip("|").split("|")]
        if len(cells) >= 7:
            links = re.findall(r"\[(.*?)\]\((.*?)\)", cells[6])
            rows.append(cells[:6] + [links])

doc = Document()
# base font
style = doc.styles["Normal"]
style.font.name = "Calibri"; style.font.size = Pt(11)
style.element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial')

sec = doc.sections[0]
sec.left_margin = Cm(1.5); sec.right_margin = Cm(1.5)

# header identity
p = doc.add_paragraph(); set_rtl(p)
r = p.add_run("الأستاذ : حمزة شعيب / صفحة دروسي")
r.font.size = Pt(11); r.font.color.rgb = RGBColor(0x2E, 0x86, 0xDE); r.bold = True

p = doc.add_paragraph(); set_rtl(p)
r = p.add_run("🔗 روابط التحميل — مخططات الدروس حسب التخصص")
r.font.size = Pt(18); r.bold = True; r.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)

p = doc.add_paragraph(); set_rtl(p)
r = p.add_run("السنة الدراسية: 2026 · المحتوى: مخططات الدروس (نموذج M9-1 — Word + PDF) لكل تخصص، مضغوطة في ملف ZIP واحد")
r.font.size = Pt(10.5)

p = doc.add_paragraph(); set_rtl(p)
r = p.add_run("اضغط على «⬇️ تحميل» في كل سطر لتنزيل ملفات التخصص مباشرة")
r.font.size = Pt(10.5); r.italic = True; r.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

# table
table = doc.add_table(rows=1, cols=7)
table.style = "Table Grid"
table.alignment = WD_TABLE_ALIGNMENT.CENTER
hdr = table.rows[0].cells
headers = ["#", "التخصص", "المحتوى", "الوحدات / الدروس", "الملفات", "الحجم", "رابط التحميل"]
for i, h in enumerate(headers):
    hdr[i].text = ""
    p = hdr[i].paragraphs[0]; set_rtl(p)
    r = p.add_run(h); r.bold = True; r.font.size = Pt(10.5)
    r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    shade(hdr[i], "2E86DE")

for row in rows:
    cells = table.add_row().cells
    for i in range(6):
        cells[i].text = ""
        p = cells[i].paragraphs[0]; set_rtl(p)
        r = p.add_run(row[i].replace("**", ""))
        r.font.size = Pt(10)
    cells[6].text = ""
    first = True
    for lbl, url in (row[6] if isinstance(row[6], list) else [("⬇️ تحميل", row[6])]):
        p = cells[6].paragraphs[0] if first else cells[6].add_paragraph()
        set_rtl(p)
        add_hyperlink(p, url, lbl)
        first = False

# widths
widths = [Cm(1.0), Cm(5.2), Cm(2.6), Cm(3.0), Cm(1.9), Cm(1.7), Cm(2.4)]
for r_ in table.rows:
    for i, w in enumerate(widths):
        r_.cells[i].width = w

p = doc.add_paragraph(); set_rtl(p)
r = p.add_run(f"\nيُحدَّث هذا الجدول تلقائيًا بعد انتهاء كل دفعة توليد — إجمالي التخصصات المسجلة: {len(rows)}")
r.font.size = Pt(9.5); r.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

doc.save(OUT)
print("saved", OUT, "rows:", len(rows))
