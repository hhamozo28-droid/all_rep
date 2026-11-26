# -*- coding: utf-8 -*-
"""Generate 'Plans de leçon' (مخططات الدروس) for all 10 subjects — Word + PDF.
Rows/exercises derived from the lesson content modules; images from plan_images."""
import os
import re
import sys
sys.path.insert(0, "/home/user/pipeline")

from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_BREAK

from plan_lib import (dpara, dtable, docx_card, pdf_card, pdf_table, pdf_band,
                      exercises_boxes_docx, exercises_boxes_pdf, add_img_docx, pdf_image,
                      setup_docx, make_onpage, PHASE_HDR, PHASE_W,
                      BLUE, ORANGE, GREEN, PURPLE, RED, YELLOW, TEAL,
                      LIGHT_BLUE, LIGHT_GREEN, LIGHT_ORANGE, LIGHT_YELLOW,
                      CENTER, RIGHT, TEACHER, ar, PS)
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER

from content_a import LESSONS_A
from content_b import LESSONS_B
from content_mc import MC2, MC3, MC4, MC5
from content_mq1 import MQ1
from content_mq2 import MQ2
from content_mq3 import MQ3
from content_mq45 import MQ4, MQ5

IMG = "/home/user/pipeline/plan_images"
OUT_ROOT = "/home/user"

# ------------------------------------------------------------------ helpers
def parse_hours(l):
    if 'th' in l and 'tph' in l:
        return l['th'], l['tph']
    d = l.get('duration', '')
    m = re.search(r'\((\d+)\s*ساعات?\s*نظري\s*\+\s*(\d+)\s*ساعات?\s*تطبيقي', d)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.search(r'\((\d+)\s*ساعات?\s*نظري', d)
    if m:
        return int(m.group(1)), 0
    return 4, 0

def hms(sec):
    """format hours float: 2 -> '2 سا', 1.5 -> 'سا 1.5'"""
    if sec == int(sec):
        return f'{int(sec)} سا'
    return f'{sec:.1f} سا'

def sectionize(theory):
    """split theory blocks into sections: (title, [items])"""
    sections = []
    cur = None
    for b in theory:
        k = b[0]
        if k == 'h2':
            cur = (b[1].strip(), [])
            sections.append(cur)
        elif cur is not None:
            if k == 'p':
                txt = b[1].strip()
                cur[1].append(txt[:70] + ('…' if len(txt) > 70 else ''))
            elif k == 'b':
                cur[1].append(b[1].strip()[:60])
            elif k == 'n':
                cur[1].append(b[1].strip()[:60])
            elif k == 't':
                cur[1].append('جدول: ' + ' / '.join(str(x) for x in b[1][:4]))
            elif k == 'note':
                cur[1].append('ملاحظة: ' + b[1].strip()[:55] + '…')
            elif k == 'img':
                cur[1].append('انظر الشكل: ' + b[2][:40])
    return [(t, items[:4]) for t, items in sections if t]

def short_title(t):
    t = re.sub(r'^\d+\.\s*', '', t)
    return t[:52] + ('…' if len(t) > 52 else '')

import re as _re2
def _clean(t):
    return _re2.sub(r'[\u064B-\u0652\u0670]', '', str(t))

def make_rows(l, liens):
    th, tph = parse_hours(l)
    rows, bgs = [], []
    # phase 1: launch
    sit = l.get('situation', '').split('.')[0][:60]
    rows.append(['1', 'أن يربط الدرس بمكتسباته القبلية ويستشعر المشكلة المهنية.', liens,
                 f'الوضعية الانطلاقية: {sit}…', '10 د',
                 'المكوّن: يعرض الوضعية ويسأل عن المكتسبات القبلية.\nالمتّكوّن: يستمع، يفكر، ويجيب.',
                 'السبورة، وثائق', '01', 'القسم', 'مدى الاستعداد'])
    bgs.append(LIGHT_YELLOW)
    # phase 2: theory sections
    secs = sectionize(l.get('theory', []))
    nsec = max(len(secs), 1)
    per = th / nsec
    for title, items in secs:
        contenu = '• ' + short_title(title)
        if items:
            contenu += '\n' + '\n'.join('• ' + it for it in items)
        rows.append(['2', f'أن يشرح مضمون «{short_title(title)}» ويوظّفه في وضعيات مهنية.', liens,
                     contenu, hms(per),
                     f'المكوّن: يعرض «{short_title(title)}» بالأمثلة والتحليل.\nالمتّكوّن: يلاحظ، يدوّن المفاهيم، ويناقش.',
                     'السبورة، حاسوب، بطاقات', '01', 'القسم',
                     f'أسئلة شفهية حول «{short_title(title)[:24]}»'])
        bgs.append(LIGHT_BLUE)
    # phase 3: TP
    tp_titles = [b[1].strip() for b in l.get('tp', []) if b[0] == 'h2']
    tp_steps = [b[1].strip()[:55] for b in l.get('tp', []) if b[0] == 'n']
    if tph > 0 or tp_steps:
        contenu = '• الأنشطة التطبيقية (TP)'
        if tp_titles:
            contenu += '\n' + '\n'.join('• ' + t[:48] for t in tp_titles[:3])
        if tp_steps:
            contenu += '\n' + '\n'.join('• ' + s for s in tp_steps[:3])
        tools = l.get('tools') or l.get('resources') or 'حاسوب، وسائل الدرس'
        rows.append(['3', 'أن ينجز الأنشطة التطبيقية بدقة واحترام منهجية العمل.', liens,
                     contenu, hms(tph) if tph else 'داخل النظري',
                     'المكوّن: يوزع الأنشطة، يوجّه، ويراقب الإنجاز.\nالمتّكوّن: ينجز الأنشطة خطوة بخطوة ويصحح أخطاءه.',
                     str(tools)[:34], '01', 'المخبر', 'تصحيح الأنشطة وإنجازها'])
        bgs.append(LIGHT_GREEN)
    # phase 4: evaluation
    ev = ''
    for b in l.get('evaluation', []):
        if b[0] == 'h2':
            ev = b[1].strip()
            break
    rows.append(['4', 'أن يظهر تحكّمه في المكتسبات وفق معايير التقييم.', liens,
                 f'• {short_title(ev) if ev else "التقييم والختام"}\n• مناقشة الأخطاء والخلاصة', '15-20 د',
                 'المكوّن: يطلب عرض المنجزات، يقيّم وفق بطاقة الأداء.\nالمتّكوّن: يعرض عمله ويناقش أخطاءه.',
                 'بطاقة الأداء، السبورة', '01', 'القسم', 'مطابقة المنتج للمواصفات'])
    bgs.append(LIGHT_ORANGE)
    return rows, bgs

def make_exercises(l):
    ex = []
    gl = l.get('glossary') or []
    if gl:
        terms = gl[:4]
        q = 'أعطِ المصطلح الفرنسي المقابل للمصطلحات الآتية: ' + '، '.join(t[0] for t in terms) + '.'
        a = '؛ '.join(f'{t[0]} = {t[1]}' for t in terms) + '.'
        ex.append(('التمرين 1: المطلحات والمفاهيم', q, a))
    h2s = [short_title(b[1]) for b in l.get('theory', []) if b[0] == 'h2'][:3]
    if h2s:
        q = 'أجب بإيجاز عن الأسئلة الآتية: ' + ' '.join(f'({i+1}) ما المقصود بـ«{h}»؟' for i, h in enumerate(h2s))
        a = 'الجواب مستخلص من المحتوى النظري للدرس، الأقسام: ' + '؛ '.join(h2s) + '.'
        ex.append(('التمرين 2: الفهم والتحليل', q, a))
    steps = [b[1].strip() for b in l.get('tp', []) if b[0] == 'n'][:2]
    if steps:
        q = 'التمرين التطبيقي: ' + ' ثم '.join(steps) + '.'
        a = 'يُنجز على الحاسوب/الوسائل المخصصة، ويُصحَّح وفق خطوات الدرس ومعاييره.'
        ex.append(('التمرين 3: التطبيق العملي', q, a))
    sit = l.get('situation', '').split('.')[0][:80]
    if sit:
        ex.append(('التمرين 4: وضعية مهنية',
                   f'بالنظر إلى الوضعية الآتية: «{sit}.» — اقترح حلا مهنيا منظما على مراحل، وبرّر خطواتك.',
                   'يُقيَّم الحل وفق معايير التقييم الواردة في الدرس (الدقة، الاتساق، احترام المنهجية).'))
    return ex

LESSON_IMGS = {
 'MC1': {1: ['diagram_lan_man_wan.png', 'illustration_reseau.png'],
         2: ['diagram_topologies.png', 'materiel_reseau.png'],
         3: ['diagram_interconnexion.png', 'materiel_reseau.png'],
         4: ['diagram_osi.png'], 5: ['diagram_ip_classes.png'],
         6: ['diagram_interconnexion.png']},
 'MC2': {1: ['pl_mc2_tables.png'], 2: ['pl_mc2_formulaires.png'],
         3: ['pl_mc2_requetes.png'], 4: ['pl_mc2_requetes.png']},
 'MC3': {1: ['pl_mc3_barres.png'], 2: ['pl_mc3_barres.png'],
         3: ['pl_mc3_tendance.png'], 4: ['pl_mc3_dispersion.png'], 5: ['pl_mc3_tendance.png']},
 'MC4': {1: ['pl_mc4_graphe.png'], 2: ['pl_mc4_chemins.png'], 3: ['pl_mc4_pert.png']},
 'MC5': {1: ['pl_mc5_demarche.png'], 2: ['pl_mc5_demarche.png'],
         3: ['pl_mc5_memoire.png'], 4: ['pl_mc5_memoire.png']},
 'MQ1': {1: ['pl_mq1_sgbdr.png'], 2: ['pl_mq1_sgbdr.png'], 3: ['pl_mq1_mcd.png'],
         4: ['pl_mq1_fn.png'], 5: ['pl_mq1_mcd.png'], 6: ['pl_mq1_mld.png'],
         7: ['pl_mq1_fn.png'], 8: ['pl_mq1_mld.png'], 9: ['pl_mq1_sgbdr.png'],
         10: ['pl_mq1_mcd.png', 'pl_mq1_mld.png']},
 'MQ2': {1: ['pl_mq2_edi.png'], 2: ['pl_mq2_edi.png'], 3: ['pl_mq2_edi.png'],
         4: ['pl_mq2_quickreport.png'], 5: ['pl_mq2_chaine.png'], 6: ['pl_mq2_chaine.png'],
         7: ['pl_mq2_quickreport.png'], 8: [], 9: ['pl_mq2_chaine.png']},
 'MQ3': {1: ['pl_mq3_arch.png'], 2: ['pl_mq3_arch.png'], 3: ['pl_mq3_arch.png'],
         4: ['pl_mq3_objets.png'], 5: ['pl_mq3_tsql.png'], 6: ['pl_mq3_tsql.png'],
         7: ['pl_mq3_arch.png'], 8: ['pl_mq3_objets.png'], 9: ['pl_mq3_objets.png'],
         10: ['pl_mq3_objets.png'], 11: ['pl_mq3_tsql.png']},
 'MQ4': {1: ['pl_mq3_tsql.png'], 2: ['pl_mq4_securite.png'], 3: ['pl_mq4_securite.png'],
         4: ['pl_mq4_sauvegarde.png'], 5: ['pl_mq4_restau.png'], 6: ['pl_mq4_restau.png'],
         7: ['pl_mq4_sauvegarde.png']},
 'MQ5': {1: ['pl_mq5_arch.png'], 2: ['pl_mq5_interbase.png'], 3: ['pl_mq5_interbase.png'],
         4: ['pl_mq5_interbase.png'], 5: ['pl_mq5_dcom.png'], 6: ['pl_mq5_arch.png']},
}

def total_hours(subj):
    if subj.get('total_h'):
        return subj.get('total_h') or 0
    s = 0
    for l in subj['lessons']:
        th, tph = parse_hours(l)
        s += th + tph
    return s

TYPE_LABEL = {'Cours+TP': 'Cours + TP', 'Cours+TD': 'Cours + TD', 'Cours+TP+Eval': 'Cours + TP + Évaluation',
              'Cours+Eval': 'Cours + Évaluation', 'Cours': 'Cours', 'Evaluation': 'Évaluation'}

# ------------------------------------------------------------------ subjects
MC1 = {
 "code": "MC1", "file": "MC1 Reseau informatique", "name_fr": "Réseau informatique",
 "name_ar": "شبكات معلوماتية", "cat": "Complémentaire (MC)",
 "competency": "يُدرك المتربص مبادئ الشبكات الحاسوبية ويركّبها ويهيّئها.",
 "competency_fr": "Comprendre, monter et configurer les réseaux informatiques",
 "total_h": 51, "lessons": LESSONS_A + LESSONS_B,
}
SUBJECTS = [MC1, MC2, MC3, MC4, MC5, MQ1, MQ2, MQ3, MQ4, MQ5]

def card_fields(subj, l, n_total, th, tph):
    num = l['num']
    dur = f"{th + tph} ساعة" if tph else f"{th} ساعة"
    dur_fr = f"{th + tph} h" if tph else f"{th} h"
    pre = (f'الدروس 1 إلى {num - 1} من المقياس + المكتسبات القبلية العامة'
           if num > 1 else 'المكتسبات القبلية العامة + مدخلات المقياس')
    nxt = (f'الدروس {num + 1} إلى {n_total} من المقياس + مقاييس التخصص'
           if num < n_total else 'مقاييس التخصص + وضعيات التكوين المهنية')
    obj = l.get('objective', '').replace('في نهاية الحصة يكون المتربص قادراً على ', '').replace('وفق المعايير المهنية.', '').strip(' .')
    return [
        ('رقم و عنوان المقياس :', f"{subj['code']} — {subj['name_ar']}", f"N de titre module : {subj['name_fr']} — {subj['code']}"),
        ('المدة الكلية للمقياس :', f"{total_hours(subj)} ساعة", f"Durée totale de module : {total_hours(subj)} h"),
        ('الكفاءة المستهدفة :', subj['competency'], f"Compétence à développer : {subj.get('competency_fr', subj['name_fr'])}"),
        ('نوع الكفاءة :', '☒ خاصة   ☐ عامة', 'Type de compétence :   ☒ Particulière   ☐ Générale'),
        ('', '☐ سلوك   ☒ وضعية', '☐ Comportement   ☒ Situation'),
        ('الكفاءات القبلية (المكتسبات) :', pre, 'Compétences préalables (ou Prérequis) :'),
        ('الكفاءات اللاحقة :', nxt, 'Compétences ultérieures :'),
        ('المدة :', 'البداية : 01 - 09 - 2026   |   النهاية : 30 - 06 - 2027   |   التقييم : 2027',
         'Durée :  De début : 2026   De fin : 2027   De l’évaluation : 2027'),
        ('الغرض الوسيط :', f'({obj[:75]}…)' if len(obj) > 75 else f'({obj})',
         f"Objectif intermédiaire : ({l.get('title_fr','')})"),
        ('رقم الدرس :', str(num), f"N de leçon : {num}"),
        ('الحجم الكلي للدرس :', f'{dur}  ({th} نظري + {tph} تطبيقي)' if tph else f'{dur} (نظري)',
         f'Durée de leçon : {dur_fr}'),
    ]

# ------------------------------------------------------------------ DOCX build
def build_docx(subj, out_path):
    lessons = subj['lessons']
    n_total = len(lessons)
    doc = Document()
    st = doc.styles['Normal']
    st.font.name = 'Segoe UI'
    st.font.size = Pt(10)
    label = f"{subj['code']} — {subj['name_fr']}"
    setup_docx(doc, label)

    # ---- cover
    dpara(doc, 'مخططات الدروس', size=30, bold=True, color='#FFFFFF', align=CENTER, bg='#2E86DE', space_after=2)
    dpara(doc, 'Plans de leçon', size=18, bold=True, color='#FFFFFF', align=CENTER, bg='#F97C2B', space_after=14)
    dpara(doc, f"المقياس: {subj['code']} — {subj['name_ar']}", size=17, bold=True, color='#1B3B6F', align=CENTER)
    dpara(doc, f"({subj['name_fr']})   —   {subj['cat']}", size=13, color='#2E86DE', align=CENTER)
    dpara(doc, f"الكفاءة المستهدفة: {subj['competency']}", size=12, bold=True, align=CENTER, bg=LIGHT_YELLOW)
    dpara(doc, f"عدد الدروس: {n_total}   |   المدة الإجمالية: {total_hours(subj)} ساعة   |   السنة الدراسية: 2026",
          size=11, align=CENTER)
    dpara(doc, 'الأستاذ : ' + TEACHER, size=14, bold=True, color='#F97C2B', align=CENTER)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    # ---- index
    dpara(doc, 'فهرس الدروس — Sommaire', size=16, bold=True, color='#FFFFFF', align=CENTER, bg=PURPLE)
    rows = []
    for l in lessons:
        th, tph = parse_hours(l)
        rows.append([str(l['num']), l['title_ar'] + ' — ' + l.get('title_fr', ''),
                     f'{th + tph} ساعة', TYPE_LABEL.get(l.get('type', ''), '')])
    dtable(doc, ['رقم الدرس', 'عنوان الدرس', 'المدة', 'النوع'], rows,
           [2.2, 15.5, 3, 5.5], hdr_bg=PURPLE, fsize=10)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    # ---- lesson plans
    for li, l in enumerate(lessons):
        th, tph = parse_hours(l)
        # banner
        dpara(doc, f"مخطط الدرس  ({l['num']:02d})   PLAN DE LEÇON", size=19, bold=True,
              color='#FFFFFF', align=CENTER, bg='#2E86DE', space_after=2)
        dpara(doc, f"{l['title_ar']}   —   ({l.get('title_fr','')})", size=12, bold=True,
              color='#7A4F00', align=CENTER, bg=YELLOW, space_after=8)
        docx_card(doc, card_fields(subj, l, n_total, th, tph))
        doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

        # phases table
        dpara(doc, 'سيرورة التكوين — Déroulement pédagogique', size=13, bold=True,
              color='#FFFFFF', align=CENTER, bg=GREEN, space_after=4)
        liens = f'الدرس {l["num"] - 1}' if l['num'] > 1 else '—'
        rows, bgs = make_rows(l, liens)
        dtable(doc, PHASE_HDR, rows, PHASE_W, hdr_bg='#1B3B6F', fsize=7.5,
               row_bgs=bgs)

        # exercises
        doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
        dpara(doc, 'تمارين تطبيقية — Exercices d\'application', size=14, bold=True,
              color='#FFFFFF', align=CENTER, bg=ORANGE, space_after=6)
        exercises_boxes_docx(doc, make_exercises(l))

        # images
        imgs = LESSON_IMGS.get(subj['code'], {}).get(l['num'], [])
        if imgs:
            dpara(doc, 'الأشكال والرسومات — Illustrations et schémas', size=13, bold=True,
                  color='#FFFFFF', align=CENTER, bg=PURPLE, space_after=6)
            for im in imgs:
                p = os.path.join(IMG, im)
                if os.path.exists(p):
                    add_img_docx(doc, p, im.replace('.png', '').replace('pl_', '').replace('_', ' ').upper(),
                                 width_cm=15)
        if li < n_total - 1:
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    doc.core_properties.title = f"{label} — مخططات الدروس"
    doc.core_properties.author = TEACHER
    doc.save(out_path)

# ------------------------------------------------------------------ PDF build
def build_pdf(subj, out_path):
    lessons = subj['lessons']
    n_total = len(lessons)
    label = f"{subj['code']} — {subj['name_fr']}"
    kw = dict(pagesize=landscape(A4), leftMargin=1.5 * cm, rightMargin=1.5 * cm,
              topMargin=1.7 * cm, bottomMargin=1.3 * cm,
              title=f"{label} — مخططات الدروس", author=TEACHER)
    doc = SimpleDocTemplate(out_path, **kw)
    story = []
    W = 26.5 * cm

    # cover
    story.append(Spacer(1, 2))
    story.append(pdf_band('مخططات الدروس   —   Plans de leçon', '#2E86DE'))
    story.append(Spacer(1, 8))
    story.append(Paragraph(ar(f"المقياس: {subj['code']} — {subj['name_ar']}"), PS['title']))
    story.append(Paragraph(ar(f"({subj['name_fr']})   —   {subj['cat']}"), PS['subtitle']))
    story.append(Spacer(1, 4))
    cap = Table([[Paragraph(ar(f"الكفاءة المستهدفة: {subj['competency']}"), PS['subtitle'])]], colWidths=[W])
    cap.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), HexColor('#FFF9E0')),
                             ('BOX', (0, 0), (-1, -1), 1, HexColor('#F5C242')),
                             ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    story.append(cap)
    story.append(Spacer(1, 6))
    story.append(Paragraph(ar(f"عدد الدروس: {n_total}   |   المدة الإجمالية: {total_hours(subj)} ساعة   |   السنة الدراسية: 2026"), PS['cover']))
    story.append(Paragraph(ar('الأستاذ : ' + TEACHER), ParagraphStyle('tc', fontName='Amiri-B', fontSize=15,
                  leading=20, alignment=TA_CENTER, textColor=HexColor('#F97C2B'))))
    story.append(PageBreak())

    # index
    story.append(pdf_band('فهرس الدروس — Sommaire', '#7B5EA7'))
    story.append(Spacer(1, 5))
    rows = []
    for l in lessons:
        th, tph = parse_hours(l)
        rows.append([str(l['num']), l['title_ar'] + ' — ' + l.get('title_fr', ''),
                     f'{th + tph} ساعة', TYPE_LABEL.get(l.get('type', ''), '')])
    story.append(pdf_table(['رقم الدرس', 'عنوان الدرس', 'المدة', 'النوع'], rows,
                           [2.2, 15.5, 3.2, 5.6], hdr_bg='#7B5EA7', fsize=9))
    story.append(PageBreak())

    # lesson plans
    for li, l in enumerate(lessons):
        th, tph = parse_hours(l)
        story.append(pdf_band(f"مخطط الدرس  ({l['num']:02d})   —   PLAN DE LEÇON", '#2E86DE'))
        t = Table([[Paragraph(ar(f"{l['title_ar']}   —   ({l.get('title_fr','')})"),
                   ParagraphStyle('lt', fontName='Amiri-B', fontSize=11.5, leading=16,
                                  alignment=TA_CENTER, textColor=HexColor('#7A4F00')))]],
                  colWidths=[W])
        t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), HexColor('#FFE066')),
                               ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
        story.append(t)
        story.append(Spacer(1, 5))
        story.append(pdf_card(card_fields(subj, l, n_total, th, tph)))
        story.append(PageBreak())

        story.append(pdf_band('سيرورة التكوين — Déroulement pédagogique', '#27AE60'))
        story.append(Spacer(1, 5))
        liens = f'الدرس {l["num"] - 1}' if l['num'] > 1 else '—'
        rows, bgs = make_rows(l, liens)
        story.append(pdf_table(PHASE_HDR, rows, PHASE_W, hdr_bg='#1B3B6F', fsize=7.4, row_bgs=bgs))
        story.append(PageBreak())

        story.append(pdf_band('تمارين تطبيقية — Exercices d\'application', '#F97C2B'))
        story.append(Spacer(1, 5))
        story.extend(exercises_boxes_pdf(make_exercises(l)))

        imgs = LESSON_IMGS.get(subj['code'], {}).get(l['num'], [])
        if imgs:
            story.append(Spacer(1, 6))
            story.append(pdf_band('الأشكال والرسومات — Illustrations et schémas', '#7B5EA7'))
            story.append(Spacer(1, 5))
            for im in imgs:
                p = os.path.join(IMG, im)
                if os.path.exists(p):
                    story.extend(pdf_image(p, im.replace('.png', '').replace('pl_', '').replace('_', ' ').upper()))
        if li < n_total - 1:
            story.append(PageBreak())

    doc.build(story, onFirstPage=make_onpage(label), onLaterPages=make_onpage(label))

# ------------------------------------------------------------------ main
if __name__ == '__main__':
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    for subj in SUBJECTS:
        if only and subj['code'] not in only:
            continue
        folder = os.path.join(OUT_ROOT, subj['file'])
        os.makedirs(folder, exist_ok=True)
        name = subj['file'] + ' - مخططات الدروس'
        docx_path = os.path.join(folder, name + '.docx')
        pdf_path = os.path.join(folder, name + '.pdf')
        print(f"===== {subj['code']}")
        build_docx(subj, docx_path)
        print('DOCX OK:', docx_path)
        build_pdf(subj, pdf_path)
        print('PDF  OK:', pdf_path)
    print('ALL PLANS DONE')
