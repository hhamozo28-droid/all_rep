# -*- coding: utf-8 -*-
"""10 bright schematic diagrams for ELE0701 كهرباء السيارات lesson plans."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle
from matplotlib import font_manager
import arabic_reshaper
from bidi.algorithm import get_display

FP = font_manager.FontProperties(fname="/home/user/pipeline/plan_fonts/Amiri-Bold.ttf")
OUT = "/home/user/pipeline/plan_images"

BLUE, ORANGE, GREEN, PURPLE, RED, YELLOW = "#2E86DE", "#F97C2B", "#27AE60", "#7B5EA7", "#E8475F", "#FFE066"

def ar(t):
    # matplotlib handles bidi internally -> reshape ONLY (no get_display!)
    return "\n".join(arabic_reshaper.reshape(line) for line in str(t).split("\n"))

def newfig(title_ar, title_fr):
    fig, ax = plt.subplots(figsize=(7.2, 4.2), dpi=140)
    ax.set_xlim(0, 10); ax.set_ylim(0, 6.2); ax.axis("off")
    ax.add_patch(Rectangle((0, 5.45), 10, 0.75, color=BLUE, zorder=0))
    ax.text(9.7, 5.82, ar(title_ar), ha="right", va="center", fontsize=13,
            color="white", fontproperties=FP)
    ax.text(0.3, 5.82, title_fr, ha="left", va="center", fontsize=10, color=YELLOW, style="italic")
    return fig, ax

def box(ax, x, y, w, h, label, color, fs=9):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.12",
                                fc=color, ec="#333", lw=1.2, alpha=0.92))
    ax.text(x + w/2, y + h/2, ar(label), ha="center", va="center", fontsize=fs,
            color="white", fontproperties=FP)

def arrow(ax, x1, y1, x2, y2, color="#333", style="-|>"):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style,
                                 mutation_scale=14, lw=1.8, color=color))

def save(fig, name):
    fig.savefig(f"{OUT}/{name}", bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("saved", name)

# 1 battery / starting circuit
fig, ax = newfig("دارة البطارية ونظام التشغيل", "Circuit batterie / démarrage")
box(ax, 0.6, 2.2, 2.2, 1.4, "بطارية 12V", GREEN)
box(ax, 4, 3.8, 2.4, 1.3, "مفتاح التشغيل", ORANGE)
box(ax, 4, 1, 2.4, 1.3, "البادئ (Démarreur)", RED)
box(ax, 7.4, 2.2, 2.1, 1.4, "المحرك", PURPLE)
arrow(ax, 2.8, 3.2, 4, 4.4); arrow(ax, 6.4, 4.4, 8.2, 3.6)
arrow(ax, 2.8, 2.6, 4, 1.7); arrow(ax, 6.4, 1.6, 8.2, 2.4)
save(fig, "pl_ele_battery.png")

# 2 alternator / charging
fig, ax = newfig("نظام الشحن والدينامو", "Circuit de charge / alternateur")
box(ax, 0.6, 2.3, 2.3, 1.5, "الدينامو\n(Alternateur)", GREEN)
box(ax, 4.1, 2.3, 2.3, 1.5, "منظم الجهد\n(Régulateur)", ORANGE)
box(ax, 7.4, 2.3, 2.1, 1.5, "البطارية", BLUE)
box(ax, 4.1, 0.4, 2.3, 1.1, "المستهلكات", RED)
arrow(ax, 2.9, 3.2, 4.1, 3.2); arrow(ax, 6.4, 3.2, 7.4, 3.2)
arrow(ax, 5.25, 2.3, 5.25, 1.5)
save(fig, "pl_ele_alternator.png")

# 3 ignition
fig, ax = newfig("نظام الإشعال", "Système d'allumage")
box(ax, 0.5, 2.4, 2, 1.4, "الملف (Bobine)", PURPLE)
box(ax, 3.4, 2.4, 2, 1.4, "الموزع\n(Distributeur)", ORANGE)
box(ax, 6.3, 2.4, 1.8, 1.4, "الشموع\n(Bougies)", RED)
box(ax, 3.4, 0.5, 2, 1.1, "البطارية + المفتاح", GREEN)
arrow(ax, 2.5, 3.1, 3.4, 3.1); arrow(ax, 5.4, 3.1, 6.3, 3.1)
arrow(ax, 4.4, 1.6, 4.4, 2.4)
save(fig, "pl_ele_ignition.png")

# 4 lighting
fig, ax = newfig("دارة الإنارة والإشارات", "Éclairage / signallisation")
box(ax, 0.5, 2.4, 2, 1.4, "البطارية", GREEN)
box(ax, 3.3, 2.4, 1.9, 1.4, "المنصهرات\n(Fusibles)", YELLOW, fs=8)
box(ax, 6, 2.4, 1.7, 1.4, "المفتاحات", ORANGE)
box(ax, 8.2, 3.9, 1.5, 1.1, "المصابيح", RED, fs=8)
box(ax, 8.2, 0.7, 1.5, 1.1, "الإشارات", PURPLE, fs=8)
arrow(ax, 2.5, 3.1, 3.3, 3.1); arrow(ax, 5.2, 3.1, 6, 3.1)
arrow(ax, 7.7, 3.4, 8.2, 4.2); arrow(ax, 7.7, 2.6, 8.2, 1.4)
save(fig, "pl_ele_lighting.png")

# 5 injection
fig, ax = newfig("مكونات الحقن الكهربائي والإلكتروني", "Injection électronique")
box(ax, 0.5, 2.5, 2, 1.3, "المستشعرات\n(Capteurs)", GREEN, fs=8)
box(ax, 3.9, 2.5, 2.2, 1.3, "الحاسوب\n(Calculateur)", BLUE)
box(ax, 7.3, 2.5, 2, 1.3, "البخاخات\n(Injecteurs)", RED, fs=8)
arrow(ax, 2.5, 3.15, 3.9, 3.15); arrow(ax, 6.1, 3.15, 7.3, 3.15)
ax.text(5, 5.1, ar("إشارة الدخول ← المعالجة ← الأمر"), ha="center", fontsize=10,
        color=PURPLE, fontproperties=FP)
save(fig, "pl_ele_injection.png")

# 6 A/C
fig, ax = newfig("نظام التكييف في السيارة", "Climatisation automobile")
box(ax, 0.5, 2.4, 1.9, 1.4, "الضاغط\n(Compresseur)", RED, fs=8)
box(ax, 3.2, 2.4, 1.9, 1.4, "المكثف\n(Condenseur)", ORANGE, fs=8)
box(ax, 5.9, 2.4, 1.9, 1.4, "المبخّر\n(Évaporateur)", GREEN, fs=8)
box(ax, 8.3, 2.4, 1.4, 1.4, "المنفد", PURPLE, fs=8)
arrow(ax, 2.4, 3.1, 3.2, 3.1); arrow(ax, 5.1, 3.1, 5.9, 3.1); arrow(ax, 7.8, 3.1, 8.3, 3.1)
save(fig, "pl_ele_ac.png")

# 7 multimeter
fig, ax = newfig("القياس بالملتيميتر", "Mesures au multimètre")
box(ax, 0.6, 2.3, 2.4, 1.5, "ملتيميتر رقمي", BLUE)
box(ax, 4.4, 3.9, 2.6, 1.2, "قياس الجهد (V)", GREEN)
box(ax, 4.4, 2.2, 2.6, 1.2, "قياس التيار (A)", ORANGE)
box(ax, 4.4, 0.5, 2.6, 1.2, "قياس المقاومة (Ω)", RED)
arrow(ax, 3, 3.1, 4.4, 4.5); arrow(ax, 3, 3.1, 4.4, 2.8); arrow(ax, 3, 2.9, 4.4, 1.1)
save(fig, "pl_ele_multimeter.png")

# 8 symbols
fig, ax = newfig("الرموز الكهربائية الأساسية", "Symboles électriques")
pts = [("مقاومة", 1.2), ("مصباح", 3.2), ("بطارية", 5.2), ("مفتاح", 7.2), ("منصهر", 9.0)]
for lbl, x in pts:
    ax.add_patch(Circle((x, 3), 0.75, fc="#EAF3FC", ec=BLUE, lw=2))
    ax.text(x, 3, ar(lbl), ha="center", va="center", fontsize=8.5, color="#1B3B6F", fontproperties=FP)
save(fig, "pl_ele_symbols.png")

# 9 safety
fig, ax = newfig("السلامة الكهربائية في الورشة", "Sécurité électrique")
box(ax, 0.6, 3.6, 2.6, 1.3, "قطع التيار أولا", RED)
box(ax, 3.7, 3.6, 2.6, 1.3, "استعمال العزل", ORANGE)
box(ax, 6.8, 3.6, 2.6, 1.3, "فحص الأدوات", GREEN)
box(ax, 2.2, 1, 2.6, 1.3, "ارتداء الوقاية", BLUE)
box(ax, 5.4, 1, 2.6, 1.3, "منع السوائل", PURPLE)
save(fig, "pl_ele_safety.png")

# 10 maintenance
fig, ax = newfig("الصيانة الوقائية والعلاجية", "Maintenance préventive / curative")
box(ax, 0.6, 2.4, 2.5, 1.4, "الفحص الدوري", GREEN)
box(ax, 3.9, 2.4, 2.5, 1.4, "تشخيص العطب", ORANGE)
box(ax, 7.2, 2.4, 2.3, 1.4, "الإصلاح والاختبار", RED)
arrow(ax, 3.1, 3.1, 3.9, 3.1); arrow(ax, 6.4, 3.1, 7.2, 3.1)
ax.text(5, 5.1, ar("الوقاية خير من العلاج — الصيانة المنتظمة تطيل عمر المركبة"),
        ha="center", fontsize=9.5, color=PURPLE, fontproperties=FP)
save(fig, "pl_ele_maintenance.png")
print("ALL ELE DIAGRAMS DONE")
