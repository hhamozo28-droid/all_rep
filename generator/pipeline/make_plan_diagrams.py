# -*- coding: utf-8 -*-
"""Bright-color diagrams for the lesson plans (Plans de leçon) — subjects MC2..MQ5."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np
import os

OUT = "/home/user/pipeline/plan_images"
os.makedirs(OUT, exist_ok=True)

C_BLUE, C_ORANGE, C_GREEN, C_PURPLE, C_RED, C_YELLOW, C_TEAL = (
    '#2E86DE', '#F97C2B', '#3DDC97', '#7B5EA7', '#E8475F', '#F5C242', '#00B4D8')
BG = '#FDFEFF'

def box(ax, x, y, w, h, text, fc, tc='white', fs=10, bold=True, style='round,pad=0.25'):
    b = FancyBboxPatch((x, y), w, h, boxstyle=style, fc=fc, ec='white', lw=1.5, zorder=3)
    ax.add_patch(b)
    ax.text(x + w / 2, y + h / 2, text, ha='center', va='center', fontsize=fs,
            color=tc, fontweight='bold' if bold else 'normal', zorder=4, wrap=True)

def arrow(ax, x1, y1, x2, y2, color='#555555', lw=2.2, style='-|>'):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style, color=color,
                                 lw=lw, mutation_scale=16, zorder=2))

def base_fig(w=10, h=5.2, title=''):
    fig, ax = plt.subplots(figsize=(w, h))
    fig.patch.set_facecolor(BG)
    ax.set_xlim(0, 100); ax.set_ylim(0, 100); ax.axis('off')
    if title:
        ax.text(50, 95, title, ha='center', va='center', fontsize=15,
                fontweight='bold', color='#1B3B6F')
        ax.plot([8, 92], [90, 90], color=C_ORANGE, lw=3)
    return fig, ax

def save(fig, name):
    fig.savefig(os.path.join(OUT, name), dpi=140, bbox_inches='tight',
                facecolor=fig.get_facecolor())
    plt.close(fig)
    print('OK', name)

# ============ MC2 Access ============
fig, ax = base_fig(title='Structure d\'une table — بنية الجدول')
box(ax, 20, 62, 60, 14, 'TABLE : Produits', C_BLUE, fs=13)
cols = ['Ref_produit\n(Primaire)', 'Désignation', 'Prix', 'Qte', 'Code_four\n(Étranger)']
for i, c in enumerate(cols):
    box(ax, 20 + i * 12, 42, 11, 14, c, [C_ORANGE, C_TEAL, C_TEAL, C_TEAL, C_PURPLE][i], fs=8)
rows = [['P001', 'Clavier', '2500', '12', 'F01'], ['P002', 'Souris', '900', '30', 'F02']]
for r, row in enumerate(rows):
    for i, v in enumerate(row):
        box(ax, 20 + i * 12, 32 - r * 10, 11, 8, v, '#FFFFFF', tc='#333', fs=8, bold=False, style='square')
ax.text(50, 8, 'Champs (حقول)  •  Enregistrements (سجلات)  •  Clé primaire/étranger',
        ha='center', fontsize=10, color='#555')
save(fig, 'pl_mc2_tables.png')

fig, ax = base_fig(title='Formulaires et États — النماذج والتقارير')
box(ax, 6, 55, 40, 20, 'Formulaire (نموذج)\nإدخال وعرض سجل', C_GREEN, fs=11)
box(ax, 54, 55, 40, 20, 'État / Rapport (تقرير)\nتنسيق وطباعة', C_PURPLE, fs=11)
box(ax, 6, 25, 40, 14, 'Zone de texte • Étiquette\nBouton • Sous-formulaire', C_TEAL, fs=9)
box(ax, 54, 25, 40, 14, 'En-tête • Détail • Pied\nGroupement • Somme', '#5C7AEA', fs=9)
arrow(ax, 46, 62, 54, 62, C_ORANGE)
ax.text(50, 10, 'Table (الجدول) = مصدر البيانات لكليهما', ha='center', fontsize=11, color='#555')
save(fig, 'pl_mc2_formulaires.png')

fig, ax = base_fig(title='Requête de sélection (QBE) — استعلام الاختيار')
box(ax, 30, 72, 40, 12, 'Tables sources (الجداول)', C_BLUE, fs=11)
box(ax, 30, 52, 40, 12, 'Choix des champs (الحقول)', C_TEAL, fs=11)
box(ax, 30, 32, 40, 12, 'Critères (المعايير): <10  •  Between  •  Like', C_ORANGE, fs=10)
box(ax, 30, 12, 40, 12, 'Tri (الترتيب)  →  Exécuter (التشغيل)', C_GREEN, fs=11)
for y1, y2 in [(72, 64), (52, 44), (32, 24)]:
    arrow(ax, 50, y1, 50, y2, '#555')
save(fig, 'pl_mc2_requetes.png')

# ============ MC3 Statistiques ============
np.random.seed(7)
notes = np.clip(np.random.normal(12, 2.5, 200), 0, 20)
fig, ax0 = plt.subplots(1, 2, figsize=(10, 4.4))
fig.patch.set_facecolor(BG)
ax0[0].hist(notes, bins=9, color=C_BLUE, edgecolor='white')
ax0[0].set_title('Histogramme (المدرج التكراري)', color='#1B3B6F', fontweight='bold', fontsize=12)
ax0[0].set_xlabel('Notes', color='#555'); ax0[0].set_ylabel('Effectif', color='#555')
ax0[0].grid(axis='y', alpha=0.3)
sizes = [30, 40, 20, 10]; labels = ['A', 'B', 'C', 'D']
ax0[1].pie(sizes, labels=labels, colors=[C_ORANGE, C_GREEN, C_TEAL, C_PURPLE],
           autopct='%1.0f%%', startangle=90, textprops={'fontweight': 'bold', 'color': 'white'})
ax0[1].set_title('Secteurs (الرسم الدائري)', color='#1B3B6F', fontweight='bold', fontsize=12)
fig.tight_layout()
save(fig, 'pl_mc3_barres.png')

fig, ax2 = plt.subplots(figsize=(10, 4.4))
fig.patch.set_facecolor(BG)
vals, bins, _ = ax2.hist(notes, bins=9, color=C_YELLOW, edgecolor='white', alpha=0.9)
mu, med = notes.mean(), np.median(notes)
mode = bins[np.argmax(vals)]
ax2.axvline(mu, color=C_RED, lw=2.5, label=f'Moyenne = {mu:.1f}')
ax2.axvline(med, color=C_BLUE, lw=2.5, label=f'Médiane = {med:.1f}')
ax2.axvline(mode, color=C_GREEN, lw=2.5, label=f'Mode ≈ {mode:.1f}')
ax2.legend(fontsize=11, facecolor='white'); ax2.grid(axis='y', alpha=0.3)
ax2.set_title('Tendances centrales — النزعة المركزية', color='#1B3B6F', fontweight='bold', fontsize=13)
save(fig, 'pl_mc3_tendance.png')

x = np.random.uniform(1, 10, 30)
y = 2 * x + np.random.normal(0, 2.2, 30)
b1, b0 = np.polyfit(x, y, 1)
r = np.corrcoef(x, y)[0, 1]
fig, ax3 = plt.subplots(figsize=(8.5, 4.6))
fig.patch.set_facecolor(BG)
ax3.scatter(x, y, color=C_PURPLE, s=55, edgecolor='white', zorder=3)
xs = np.linspace(0.5, 10.5, 10)
ax3.plot(xs, b1 * xs + b0, color=C_RED, lw=2.5, label=f'y = {b1:.1f}x + {b0:.1f}   (r = {r:.2f})')
ax3.legend(fontsize=11, facecolor='white')
ax3.set_title('Nuage de points et droite d\'ajustement — مخطط الانتشار وخط الملاءمة',
              color='#1B3B6F', fontweight='bold', fontsize=12)
ax3.grid(alpha=0.3)
save(fig, 'pl_mc3_dispersion.png')

# ============ MC4 Recherche opérationnelle ============
fig, ax = base_fig(title='Graphe — الرسم البياني')
pos = {'A': (15, 55), 'B': (38, 78), 'C': (38, 32), 'D': (65, 55), 'E': (88, 78), 'F': (88, 32)}
edges = [('A', 'B', '4', C_BLUE), ('A', 'C', '2', C_BLUE), ('B', 'D', '5', C_GREEN),
         ('C', 'D', '1', C_GREEN), ('D', 'E', '3', C_ORANGE), ('D', 'F', '6', C_ORANGE),
         ('B', 'C', '3', C_PURPLE)]
for a, b, w, col in edges:
    x1, y1 = pos[a]; x2, y2 = pos[b]
    ax.plot([x1, x2], [y1, y2], color=col, lw=2.6, zorder=1)
    ax.text((x1 + x2) / 2, (y1 + y2) / 2 + 3, w, fontsize=11, color=col, fontweight='bold')
for n, (x, y) in pos.items():
    ax.add_patch(plt.Circle((x, y), 6.5, color=C_RED, zorder=3))
    ax.text(x, y, n, ha='center', va='center', fontsize=13, color='white', fontweight='bold', zorder=4)
ax.text(50, 8, 'Sommets (رؤوس) • Arcs/Arêtes (أقواس/حواف) • Poids (أوزان)',
        ha='center', fontsize=11, color='#555')
save(fig, 'pl_mc4_graphe.png')

fig, ax = base_fig(title='Chemin optimal (Ford) — المسار الأمثل')
steps = ['Initialisation\n(البداية): 0, ∞, ∞...', 'Itération 1\n(تثبيت الرؤوس)', 'Itération 2\n(تحديث القيم)',
         'Stabilisation\n(الاستقرار)', 'Chemin optimal\n(المسار الأمثل)']
for i, s in enumerate(steps):
    box(ax, 4 + i * 19.2, 45, 17, 22, s, [C_BLUE, C_TEAL, C_GREEN, C_ORANGE, C_RED][i], fs=8.5)
    if i < 4:
        arrow(ax, 4 + i * 19.2 + 17, 56, 4 + (i + 1) * 19.2, 56, '#555')
ax.text(50, 22, 'Valeur optimale: min des distances successives — القيمة المثلى: أقل مسافة',
        ha='center', fontsize=11, color='#555')
save(fig, 'pl_mc4_chemins.png')

fig, ax = base_fig(title='PERT / Chemin critique — المسار الحرج')
nodes = {'1': (10, 55), '2': (30, 55), '3': (52, 75), '4': (52, 35), '5': (75, 55), '6': (93, 55)}
crit = [('1', '2', '3'), ('2', '3', '4'), ('3', '5', '5'), ('5', '6', '2')]
other = [('2', '4', '2'), ('4', '5', '4')]
for a, b, w in crit:
    x1, y1 = nodes[a]; x2, y2 = nodes[b]
    ax.plot([x1, x2], [y1, y2], color=C_RED, lw=4, zorder=1)
    ax.text((x1 + x2) / 2, (y1 + y2) / 2 + 4, w, fontsize=12, color=C_RED, fontweight='bold')
for a, b, w in other:
    x1, y1 = nodes[a]; x2, y2 = nodes[b]
    ax.plot([x1, x2], [y1, y2], color=C_BLUE, lw=2.2, ls='--', zorder=1)
    ax.text((x1 + x2) / 2, (y1 + y2) / 2 - 8, w, fontsize=12, color=C_BLUE, fontweight='bold')
for n, (x, y) in nodes.items():
    ax.add_patch(plt.Circle((x, y), 5.5, color='#1B3B6F', zorder=3))
    ax.text(x, y, n, ha='center', va='center', fontsize=12, color='white', fontweight='bold', zorder=4)
ax.text(50, 12, 'Le chemin critique (المسار الحرج) détermine la durée du projet',
        ha='center', fontsize=11, color=C_RED, fontweight='bold')
save(fig, 'pl_mc4_pert.png')

# ============ MC5 Méthodologie ============
fig, ax = base_fig(title='Structure du mémoire — هيكل المذكرة')
items = [('Page de garde\nالغلاف', C_BLUE), ('Résumé + Intro\nملخص + مقدمة', C_TEAL),
         ('Chapitres 1-2\nالإطار النظري', C_GREEN), ('Étude de cas\nالدراسة الميدانية', C_ORANGE),
         ('Conclusion\nالخاتمة', C_PURPLE), ('Bibliographie\nالمراجع', C_RED)]
for i, (t, c) in enumerate(items):
    box(ax, 8 + i * 14.8, 55, 13, 22, t, c, fs=8)
    if i < 5:
        arrow(ax, 8 + i * 14.8 + 13, 66, 8 + (i + 1) * 14.8, 66, '#555')
box(ax, 25, 22, 50, 16, 'Annexes (الملاحق): questionnaires, tableaux, captures',
    '#5C7AEA', fs=10)
ax.text(50, 8, 'Chaque partie répond à la problématique — كل فصل يجيب عن الإشكالية',
        ha='center', fontsize=11, color='#555')
save(fig, 'pl_mc5_memoire.png')

fig, ax = base_fig(title='Démarche de recherche — منهجية البحث')
steps = [('Thème\nالموضوع', C_BLUE), ('Problématique\nالإشكالية', C_RED),
         ('Hypothèses\nالفرضيات', C_ORANGE), ('Collecte\nجمع المعلومات', C_TEAL),
         ('Analyse\nالتحليل', C_GREEN), ('Conclusion\nالاستنتاج', C_PURPLE)]
for i, (t, c) in enumerate(steps):
    box(ax, 5 + i * 15.5, 52, 13, 22, t, c, fs=9)
    if i < 5:
        arrow(ax, 5 + i * 15.5 + 13, 63, 5 + (i + 1) * 15.5, 63, '#555')
arrow(ax, 92, 52, 8, 52, '#999', style='-|>', lw=1.8)
ax.text(50, 30, 'Validation / Réfutation des hypothèses — التحقق من الفرضيات',
        ha='center', fontsize=11, color='#555')
save(fig, 'pl_mc5_demarche.png')

# ============ MQ1 SGBDR ============
fig, ax = base_fig(title='MCD Entité-Association — نموذج المفاهيم')
box(ax, 8, 60, 24, 16, 'CLIENT\n(Identifiant: NumCli)', C_BLUE, fs=10)
box(ax, 62, 60, 28, 16, 'COMMANDE\n(NumCmd, Date)', C_GREEN, fs=10)
box(ax, 34, 22, 28, 16, 'PRODUIT\n(Ref, Désignation)', C_PURPLE, fs=10)
ax.add_patch(mpatches.Ellipse((52, 58), 18, 10, fc=C_ORANGE, ec='white', lw=1.5, zorder=3))
ax.text(52, 58, 'passer', ha='center', va='center', fontsize=10, color='white', fontweight='bold', zorder=4)
ax.add_patch(mpatches.Ellipse((58, 38), 18, 10, fc=C_RED, ec='white', lw=1.5, zorder=3))
ax.text(58, 38, 'contenir', ha='center', va='center', fontsize=10, color='white', fontweight='bold', zorder=4)
ax.plot([32, 44], [66, 60], color='#555', lw=2)
ax.plot([60, 64], [58, 52], color='#555', lw=2)
ax.plot([48, 50], [38, 34], color='#555', lw=2)
ax.text(36, 72, '(1,N)', fontsize=11, color='#333', fontweight='bold')
ax.text(62, 47, '(0,N)', fontsize=11, color='#333', fontweight='bold')
ax.text(50, 8, 'Entité (كيان) • Association (علاقة) • Cardinalités (العددية)',
        ha='center', fontsize=11, color='#555')
save(fig, 'pl_mq1_mcd.png')

fig, ax = base_fig(title='Passage MCD → MLD — الانتقال إلى النموذج المنطقي')
box(ax, 4, 62, 22, 18, 'CLIENT\nNumCli (PK)\nNom, Ville', C_BLUE, fs=8.5)
box(ax, 38, 62, 24, 18, 'COMMANDE\nNumCmd (PK)\nNumCli (FK), Date', C_GREEN, fs=8.5)
box(ax, 72, 62, 24, 18, 'PRODUIT\nRef (PK)\nDésignation, Prix', C_PURPLE, fs=8.5)
box(ax, 38, 26, 24, 18, 'LIGNE\n(NumCmd, Ref) PK\nQuantité', C_ORANGE, fs=8.5)
arrow(ax, 26, 71, 38, 71, C_RED); arrow(ax, 62, 71, 72, 71, C_RED)
arrow(ax, 50, 62, 50, 44, C_RED)
ax.text(50, 10, 'Règles de passage: 1,N → clé étrangère  •  N,P → table de jonction',
        ha='center', fontsize=10.5, color='#555')
save(fig, 'pl_mq1_mld.png')

fig, ax = base_fig(title='Formes normales — الصيغ المعيارية')
lv = [('1FN', 'Valeurs atomiques\nقيم ذرّية', C_BLUE), ('2FN', 'Pas de dépendance partielle\nلا اتصال جزئي', C_TEAL),
      ('3FN', 'Pas de dépendance transitive\nلا اتصال تعددي', C_GREEN), ('BCNF', 'Tout déterminant = clé\nكل محدِّد مفتاح', C_PURPLE)]
for i, (t, s, c) in enumerate(lv):
    box(ax, 6 + i * 23.5, 48, 20, 26, t + '\n' + s, c, fs=8.5)
    if i < 3:
        arrow(ax, 6 + i * 23.5 + 20, 61, 6 + (i + 1) * 23.5, 61, '#555')
ax.text(50, 22, 'Décomposition sans perte — التفكيك دون فقدان معلومات', ha='center', fontsize=11, color='#555')
save(fig, 'pl_mq1_fn.png')

fig, ax = base_fig(title='SGBD : rôle et fonctions — دور النظام ووظائفه')
fns = [('DDL\nتعريف', C_BLUE), ('DQL\nاستعلام', C_TEAL), ('DML\nتعامل', C_GREEN),
       ('DCL\nصلاحيات', C_ORANGE), ('Backup\nاسترجاع', C_PURPLE)]
for i, (t, c) in enumerate(fns):
    box(ax, 6 + i * 18.8, 55, 16, 20, t, c, fs=10)
box(ax, 25, 22, 50, 16, 'SGBDR ← Tables (Relations) + SQL', C_RED, fs=12)
ax.text(50, 8, 'Base de données = données organisées  •  SGBD = gestionnaire',
        ha='center', fontsize=11, color='#555')
save(fig, 'pl_mq1_sgbdr.png')

# ============ MQ2 Delphi ============
fig, ax = base_fig(title='EDI Delphi — بيئة التطوير')
box(ax, 4, 62, 30, 22, 'Concepteur de fiche\nمصمم النموذج', C_BLUE, fs=10)
box(ax, 37, 62, 26, 22, 'Object Inspector\nفاحص الخصائص', C_ORANGE, fs=10)
box(ax, 66, 62, 30, 22, 'Palette de composants\nلوحة المكونات', C_GREEN, fs=10)
box(ax, 4, 30, 44, 22, 'Éditeur de code (Pascal)\nمحرر الشيفرة', C_PURPLE, fs=10)
box(ax, 52, 30, 44, 22, 'Explorateur de projet\nمستكشف المشروع (.dpr, .pas, .dfm)', '#5C7AEA', fs=10)
ax.text(50, 12, 'F9 = Exécuter  •  F12 = Fiche ↔ Code  •  Ctrl+S = Sauvegarder',
        ha='center', fontsize=11, color='#555')
save(fig, 'pl_mq2_edi.png')

fig, ax = base_fig(title='Chaîne d\'accès aux données — سلسلة الوصول للبيانات')
chain = [('TTable / TQuery\nالجدول/الاستعلام', C_BLUE), ('TDataSource\nمصدر البيانات', C_ORANGE),
         ('TDBGrid\nالعرض', C_GREEN), ('TDBEdit\nالتحرير', C_TEAL),
         ('TDBNavigator\nالتنقل', C_PURPLE)]
for i, (t, c) in enumerate(chain):
    box(ax, 3 + i * 19.2, 52, 17, 22, t, c, fs=8)
    if i < 4:
        arrow(ax, 3 + i * 19.2 + 17, 63, 3 + (i + 1) * 19.2, 63, '#555')
box(ax, 20, 20, 60, 14, 'Append → Edit → Post → Delete (معاملات السجلات)', C_RED, fs=11)
save(fig, 'pl_mq2_chaine.png')

fig, ax = base_fig(title='QuickReport — نطاقات التقرير')
bands = [('PageHeader / Title', 'رأس التقرير', C_BLUE), ('GroupHeader', 'ترويسة المجموعة', C_TEAL),
         ('Detail', 'سطر البيانات (يتكرر)', C_GREEN), ('GroupFooter', 'مجاميع المجموعة', C_ORANGE),
         ('PageFooter', 'تذييل الصفحة', C_PURPLE)]
for i, (fr, ar, c) in enumerate(bands):
    box(ax, 15, 78 - i * 15, 70, 11, f'{fr}  —  {ar}', c, fs=10)
ax.text(50, 5, 'QRLabel • QRDBText • QRExpr (SUM) • QRSysData', ha='center', fontsize=11, color='#555')
save(fig, 'pl_mq2_quickreport.png')

# ============ MQ3 SQL Server ============
fig, ax = base_fig(title='Architecture SQL Server — معمارية الخادم')
box(ax, 32, 74, 36, 12, 'Applications (Delphi, VB, web...)', C_PURPLE, fs=10)
box(ax, 32, 56, 36, 12, 'Services du moteur (MSSQLServer, Agent)', C_BLUE, fs=10)
box(ax, 8, 32, 38, 14, 'Bases utilisateur\n(الجداول، العروض، الإجراءات)', C_GREEN, fs=10)
box(ax, 54, 32, 38, 14, 'Bases système\n(master, model, msdb, tempdb)', C_ORANGE, fs=10)
box(ax, 32, 12, 36, 12, 'Fichiers: MDF (données) + LDF (journal)', C_RED, fs=10)
arrow(ax, 50, 74, 50, 68); arrow(ax, 40, 56, 32, 46); arrow(ax, 60, 56, 68, 46)
arrow(ax, 50, 32, 50, 24)
save(fig, 'pl_mq3_arch.png')

fig, ax = base_fig(title='DDL • DML • DCL — عائلات أوامر T-SQL')
box(ax, 6, 55, 27, 24, 'DDL (Definition)\nCREATE\nALTER\nDROP', C_BLUE, fs=10)
box(ax, 36.5, 55, 27, 24, 'DML (Manipulation)\nSELECT • INSERT\nUPDATE • DELETE', C_GREEN, fs=10)
box(ax, 67, 55, 27, 24, 'DCL (Control)\nGRANT\nDENY\nREVOKE', C_ORANGE, fs=10)
box(ax, 25, 22, 50, 14, 'Outils: Query Analyzer • OSQL • scripts .sql', C_PURPLE, fs=11)
save(fig, 'pl_mq3_tsql.png')

fig, ax = base_fig(title='Objets de base de données — كائنات القاعدة')
objs = [('Tables', 'الجداول', C_BLUE), ('Vues', 'العروض', C_TEAL),
        ('Index', 'الفهارس', C_GREEN), ('Procédures', 'الإجراءات', C_ORANGE),
        ('Triggers', 'المشغّلات', C_PURPLE), ('Fonctions', 'الدوال', C_RED)]
for i, (fr, ar, c) in enumerate(objs):
    box(ax, 4 + i * 15.8, 52, 13.5, 24, f'{fr}\n{ar}', c, fs=9)
box(ax, 22, 20, 56, 14, 'Contraintes: PK • FK • CHECK • UNIQUE • NOT NULL', '#5C7AEA', fs=11)
save(fig, 'pl_mq3_objets.png')

# ============ MQ4 Administration ============
fig, ax = base_fig(title='Stratégie de sauvegarde — استراتيجية النسخ الاحتياطي')
days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
for i, d in enumerate(days):
    typ = 'Complète' if i == 0 else ('Diff.' if i < 5 else 'Journal')
    c = C_BLUE if i == 0 else (C_GREEN if i < 5 else C_ORANGE)
    box(ax, 6 + i * 13.3, 58, 11.5, 20, f'{d}\n{typ}\n01', c, fs=8.5)
box(ax, 15, 26, 32, 14, 'SQL Agent Jobs\n(الجدولة)', C_PURPLE, fs=10)
box(ax, 53, 26, 32, 14, 'Vérification RESTORE\n(اختبار الاستعادة)', C_RED, fs=10)
ax.text(50, 10, 'Copie hors site + rotation des supports — نسخ خارج الموقع',
        ha='center', fontsize=11, color='#555')
save(fig, 'pl_mq4_sauvegarde.png')

fig, ax = base_fig(title='Restauration — ترتيب الاستعادة')
steps = [('Sauvegarde\ncomplète', C_BLUE), ('Sauvegarde\ndifférentielle', C_GREEN),
         ('Journaux\n(LDF)', C_ORANGE), ('RECOVERY\n(الاستقرار)', C_RED)]
for i, (t, c) in enumerate(steps):
    box(ax, 8 + i * 22, 50, 18, 22, t, c, fs=9.5)
    if i < 3:
        arrow(ax, 8 + i * 22 + 18, 61, 8 + (i + 1) * 22, 61, '#555')
ax.text(50, 28, 'WITH NORECOVERY (بين الخطوات)  •  WITH RECOVERY (الأخيرة)',
        ha='center', fontsize=11, color='#555')
save(fig, 'pl_mq4_restau.png')

fig, ax = base_fig(title='Autorisations — الصلاحيات')
box(ax, 10, 58, 24, 20, 'GRANT\nمنح ✅', C_GREEN, fs=12)
box(ax, 38, 58, 24, 20, 'DENY\nرفض ⛔', C_RED, fs=12)
box(ax, 66, 58, 24, 20, 'REVOKE\nسلب 🔄', C_ORANGE, fs=12)
box(ax, 20, 26, 60, 14, 'DENY يغلب GRANT — الرفض الصريح مطلق', C_PURPLE, fs=11)
save(fig, 'pl_mq4_securite.png')

# ============ MQ5 Delphi réseau ============
fig, ax = base_fig(title='Architectures 2 et 3 niveaux — المعماريتان')
box(ax, 6, 62, 38, 16, 'Client (Fat)\nواجهة + منطق الأعمال', C_BLUE, fs=10)
box(ax, 6, 36, 38, 14, 'Serveur de données\n(قاعدة البيانات)', C_GREEN, fs=10)
arrow(ax, 25, 62, 25, 50, C_RED)
ax.text(25, 84, '2 niveaux', ha='center', fontsize=13, color='#1B3B6F', fontweight='bold')
box(ax, 56, 68, 38, 12, 'Présentation (Delphi)', C_TEAL, fs=9.5)
box(ax, 56, 50, 38, 12, 'Traitement (DCOM / COM+)', C_ORANGE, fs=9.5)
box(ax, 56, 32, 38, 12, 'Données (InterBase / SQL Server)', C_PURPLE, fs=9.5)
arrow(ax, 75, 68, 75, 62); arrow(ax, 75, 50, 75, 44)
ax.text(75, 84, '3 niveaux', ha='center', fontsize=13, color='#1B3B6F', fontweight='bold')
save(fig, 'pl_mq5_arch.png')

fig, ax = base_fig(title='InterBase Client/Serveur + ADO — الاتصال بالخادم')
box(ax, 30, 72, 40, 12, 'Application Delphi (العميل)', C_BLUE, fs=11)
box(ax, 30, 52, 40, 12, 'ADO / IBDatabase (الموصّلات)', C_ORANGE, fs=11)
box(ax, 30, 32, 40, 12, 'InterBase Server / SQL Server (الخادم)', C_GREEN, fs=11)
box(ax, 30, 12, 40, 12, 'Base .gdb / .mdf + journal (الملفات)', C_PURPLE, fs=11)
for y1, y2 in [(72, 64), (52, 44), (32, 24)]:
    arrow(ax, 50, y1, 50, y2, '#555')
ax.text(50, 4, 'Commit / Rollback (معاملات آمنة)', ha='center', fontsize=11, color=C_RED)
save(fig, 'pl_mq5_interbase.png')

fig, ax = base_fig(title='DCOM + Verrouillage — المشاركة والقفل')
box(ax, 8, 60, 24, 18, 'Client A\n(طلب تعديل)', C_BLUE, fs=10)
box(ax, 68, 60, 24, 18, 'Client B\n(طلب تعديل)', C_TEAL, fs=10)
box(ax, 38, 60, 24, 18, 'Composant DCOM\n(الخادم المشترك)', C_ORANGE, fs=10)
arrow(ax, 32, 69, 38, 69, C_RED); arrow(ax, 62, 69, 68, 69, C_RED)
box(ax, 14, 28, 32, 16, 'Optimiste\n(تفاؤلي)', C_GREEN, fs=11)
box(ax, 54, 28, 32, 16, 'Pessimiste\n(تشاؤمي)', C_PURPLE, fs=11)
ax.text(50, 12, 'Gestion des conflits: message + retry — معالجة التعارض',
        ha='center', fontsize=11, color='#555')
save(fig, 'pl_mq5_dcom.png')

print('ALL DIAGRAMS DONE')
