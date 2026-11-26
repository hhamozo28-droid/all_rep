# -*- coding: utf-8 -*-
"""Generate technical diagrams (French labels) for MC1 Reseau informatique memos."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, FancyBboxPatch
import os

OUT = "/home/user/MC1 Reseau informatique/images"
os.makedirs(OUT, exist_ok=True)

C_PC = "#4A90D9"
C_SW = "#E67E22"
C_RT = "#C0392B"
C_GW = "#8E44AD"
C_LINE = "#2C3E50"
C_BG = "#F7F9FC"

plt.rcParams["font.family"] = "DejaVu Sans"

def pc(ax, x, y, s=0.55, label="PC"):
    ax.add_patch(Rectangle((x - s/2, y - s/2), s, s, facecolor=C_PC, edgecolor="white", lw=1.5, zorder=3))
    ax.text(x, y, label, ha="center", va="center", fontsize=7, color="white", weight="bold", zorder=4)

def box(ax, x, y, w, h, label, color, fs=8):
    ax.add_patch(FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0.03",
                                facecolor=color, edgecolor="white", lw=1.5, zorder=3))
    ax.text(x, y, label, ha="center", va="center", fontsize=fs, color="white", weight="bold", zorder=4)

def link(ax, p1, p2, color=C_LINE, lw=1.4, zorder=1):
    ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color=color, lw=lw, zorder=1)

# ---------------------------------------------------------------- LAN / MAN / WAN
fig, axes = plt.subplots(1, 3, figsize=(12, 4.2))
fig.patch.set_facecolor("white")

# LAN
ax = axes[0]; ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.axis("off")
ax.add_patch(Rectangle((0.5, 1), 9, 8, facecolor=C_BG, edgecolor=C_LINE, lw=1.5))
ax.text(5, 8.3, "LAN", ha="center", fontsize=13, weight="bold", color=C_LINE)
ax.text(5, 7.4, "Local Area Network", ha="center", fontsize=8, color="#555")
box(ax, 5, 5.6, 2.2, 1.1, "Switch", C_SW)
for i, x in enumerate([2, 4, 6, 8]):
    pc(ax, x, 3.2)
    link(ax, (x, 3.8), (5, 5.0))
ax.text(5, 1.6, "Un batiment / une entreprise", ha="center", fontsize=8, style="italic", color="#555")

# MAN
ax = axes[1]; ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.axis("off")
ax.add_patch(Rectangle((0.5, 1), 9, 8, facecolor=C_BG, edgecolor=C_LINE, lw=1.5))
ax.text(5, 8.3, "MAN", ha="center", fontsize=13, weight="bold", color=C_LINE)
ax.text(5, 7.4, "Metropolitan Area Network", ha="center", fontsize=8, color="#555")
pts = [(2.2, 3.2), (4.2, 4.2), (6.2, 3.4), (7.8, 4.6), (3.2, 5.6), (5.8, 5.8)]
for p in pts:
    pc(ax, p[0], p[1], s=0.8, label="LAN")
for i in range(len(pts)):
    for j in range(i+1, len(pts)):
        if abs(pts[i][0]-pts[j][0]) + abs(pts[i][1]-pts[j][1]) < 4.2:
            link(ax, pts[i], pts[j], lw=1.0)
ax.text(5, 1.6, "Une ville / une universite", ha="center", fontsize=8, style="italic", color="#555")

# WAN
ax = axes[2]; ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.axis("off")
ax.add_patch(Circle((5, 5), 3.6, facecolor="#D6EAF8", edgecolor=C_LINE, lw=1.5))
ax.text(5, 8.9, "WAN", ha="center", fontsize=13, weight="bold", color=C_LINE)
ax.text(5, 8.1, "Wide Area Network", ha="center", fontsize=8, color="#555")
pts = [(3.2, 6.2), (6.8, 6.4), (2.8, 4.2), (7.2, 4.0), (5, 3.0), (4.2, 5.2)]
for p in pts:
    pc(ax, p[0], p[1], s=0.8, label="LAN")
for i in range(len(pts)):
    for j in range(i+1, len(pts)):
        link(ax, pts[i], pts[j], lw=0.8)
ax.text(5, 1.0, "Des pays / des continents (Internet)", ha="center", fontsize=8, style="italic", color="#555")

plt.tight_layout()
plt.savefig(f"{OUT}/diagram_lan_man_wan.png", dpi=200, bbox_inches="tight")
plt.close()

# ---------------------------------------------------------------- Topologies
fig, axes = plt.subplots(1, 4, figsize=(13, 3.6))
fig.patch.set_facecolor("white")
titles = ["Bus (Nacelle)", "Anneau (Ring)", "Etoile (Star)", "Maillee (Mesh)"]

# Bus
ax = axes[0]; ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.axis("off")
ax.plot([1, 9], [5, 5], color=C_LINE, lw=3, zorder=1)
for x in [2, 4, 6, 8]:
    ax.plot([x, x], [5, 6.8], color=C_LINE, lw=1.4)
    pc(ax, x, 7.6)
ax.text(5, 3.2, "Un seul cable partage", ha="center", fontsize=8, style="italic", color="#555")

# Ring
ax = axes[1]; ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.axis("off")
import math
pts = [(5 + 3.2*math.cos(a), 5 + 3.2*math.sin(a)) for a in [math.pi/4, 3*math.pi/4, 5*math.pi/4, 7*math.pi/4]]
for i in range(4):
    link(ax, pts[i], pts[(i+1) % 4], lw=2)
for p in pts:
    pc(ax, p[0], p[1])
ax.text(5, 1.2, "Chaque poste relie a ses voisins", ha="center", fontsize=8, style="italic", color="#555")

# Star
ax = axes[2]; ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.axis("off")
box(ax, 5, 5, 2.4, 1.3, "Switch", C_SW)
for p in [(2, 8), (8, 8), (2, 2), (8, 2)]:
    pc(ax, p[0], p[1])
    link(ax, p, (5, 5))
ax.text(5, 0.6, "Un equipement central", ha="center", fontsize=8, style="italic", color="#555")

# Mesh
ax = axes[3]; ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.axis("off")
pts = [(2.5, 7.5), (7.5, 7.5), (2.5, 2.5), (7.5, 2.5)]
for i in range(4):
    for j in range(i+1, 4):
        link(ax, pts[i], pts[j], lw=1.2)
for p in pts:
    pc(ax, p[0], p[1])
ax.text(5, 0.6, "Tous les postes interconnectes", ha="center", fontsize=8, style="italic", color="#555")

for ax, t in zip(axes, titles):
    ax.set_title(t, fontsize=11, weight="bold", color=C_LINE, pad=8)

plt.tight_layout()
plt.savefig(f"{OUT}/diagram_topologies.png", dpi=200, bbox_inches="tight")
plt.close()

# ---------------------------------------------------------------- Interconnexion
fig, ax = plt.subplots(figsize=(12, 5))
fig.patch.set_facecolor("white")
ax.set_xlim(0, 20); ax.set_ylim(0, 10); ax.axis("off")

# LAN 1
ax.add_patch(Rectangle((0.5, 2.5), 5.5, 5, facecolor=C_BG, edgecolor=C_LINE, lw=1.5))
ax.text(3.25, 7.0, "LAN 1", ha="center", fontsize=11, weight="bold", color=C_LINE)
box(ax, 3.25, 5.2, 2.0, 1.0, "Switch", C_SW)
for x in [1.6, 3.25, 4.9]:
    pc(ax, x, 3.4); link(ax, (x, 4.0), (3.25, 4.7))

# LAN 2
ax.add_patch(Rectangle((14, 2.5), 5.5, 5, facecolor=C_BG, edgecolor=C_LINE, lw=1.5))
ax.text(16.75, 7.0, "LAN 2", ha="center", fontsize=11, weight="bold", color=C_LINE)
box(ax, 16.75, 5.2, 2.0, 1.0, "Switch", C_SW)
for x in [15.1, 16.75, 18.4]:
    pc(ax, x, 3.4); link(ax, (x, 4.0), (16.75, 4.7))

# Routeur between
box(ax, 10, 5.2, 2.6, 1.2, "Routeur", C_RT, fs=10)
link(ax, (6, 5.2), (8.7, 5.2), lw=2.5)
link(ax, (11.3, 5.2), (14, 5.2), lw=2.5)
ax.text(10, 4.2, "Choix du meilleur chemin (routage)", ha="center", fontsize=8, style="italic", color="#555")

# Passerelle to Internet
box(ax, 10, 8.6, 3.0, 1.1, "Passerelle", C_GW, fs=10)
link(ax, (10, 5.8), (10, 8.0), lw=2.5)
ax.text(10, 9.6, "Traduction entre protocoles differents", ha="center", fontsize=8, style="italic", color="#555")

ax.text(10, 1.4, "Interconnexion de reseaux : Hub / Switch (couche 2) - Routeur (couche 3) - Passerelle (couche 7)",
        ha="center", fontsize=9, color=C_LINE)

plt.tight_layout()
plt.savefig(f"{OUT}/diagram_interconnexion.png", dpi=200, bbox_inches="tight")
plt.close()

# ---------------------------------------------------------------- OSI / TCP-IP
fig, axes = plt.subplots(1, 2, figsize=(12, 6.2), gridspec_kw={"width_ratios": [1.35, 1]})
fig.patch.set_facecolor("white")

osi = [
    ("7 - Application", "HTTP, FTP, DNS, SMTP", "#2E86C1"),
    ("6 - Presentation", "Codage, chiffrement, compression", "#2E86C1"),
    ("5 - Session", "Ouverture et gestion des sessions", "#2E86C1"),
    ("4 - Transport", "TCP, UDP", "#27AE60"),
    ("3 - Reseau", "IP, routage", "#27AE60"),
    ("2 - Liaison", "Trames, adresses MAC, Ethernet", "#E67E22"),
    ("1 - Physique", "Bits, cables, ondes", "#E67E22"),
]
ax = axes[0]; ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.axis("off")
ax.set_title("Modele OSI (7 couches)", fontsize=12, weight="bold", color=C_LINE)
for i, (name, ex, col) in enumerate(osi):
    y = 8.6 - i * 1.18
    ax.add_patch(Rectangle((0.5, y - 0.5), 4.6, 1.0, facecolor=col, edgecolor="white", lw=1.5))
    ax.text(2.8, y, name, ha="center", va="center", fontsize=9, color="white", weight="bold")
    ax.text(5.4, y, ex, ha="left", va="center", fontsize=8.5, color="#333")

tcpip = [
    ("Application", "HTTP, FTP, DNS, SMTP", "#2E86C1", 3),
    ("Transport", "TCP, UDP", "#27AE60", 1),
    ("Internet", "IP, routage", "#27AE60", 1),
    ("Acces reseau", "Ethernet, Wi-Fi, MAC", "#E67E22", 2),
]
ax = axes[1]; ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.axis("off")
ax.set_title("Modele TCP/IP (4 couches)", fontsize=12, weight="bold", color=C_LINE)
for i, (name, ex, col, h) in enumerate(tcpip):
    y = 8.6 - i * 1.95
    ax.add_patch(Rectangle((0.5, y - 0.85), 4.6, 1.7, facecolor=col, edgecolor="white", lw=1.5))
    ax.text(2.8, y + 0.15, name, ha="center", va="center", fontsize=9, color="white", weight="bold")
    ax.text(2.8, y - 0.45, ex, ha="center", va="center", fontsize=7.5, color="white")
ax.text(5, 0.6, "TCP/IP = OSI simplifie (couches 5-7 fusionnees)", ha="center", fontsize=8, style="italic", color="#555")

plt.tight_layout()
plt.savefig(f"{OUT}/diagram_osi.png", dpi=200, bbox_inches="tight")
plt.close()

# ---------------------------------------------------------------- IP classes
fig, ax = plt.subplots(figsize=(12, 3.4))
fig.patch.set_facecolor("white")
ax.set_xlim(0, 256); ax.set_ylim(0, 10); ax.axis("off")
classes = [
    (1, 126, "A", "#C0392B", "255.0.0.0"),
    (128, 191, "B", "#E67E22", "255.255.0.0"),
    (192, 223, "C", "#27AE60", "255.255.255.0"),
    (224, 239, "D", "#2E86C1", "Multicast"),
    (240, 255, "E", "#8E44AD", "Reserve"),
]
for lo, hi, name, col, mask in classes:
    ax.add_patch(Rectangle((lo, 3.5), hi - lo + 1, 3.5, facecolor=col, edgecolor="white", lw=2))
    ax.text((lo + hi) / 2, 5.9, f"Classe {name}", ha="center", va="center", fontsize=10, color="white", weight="bold")
    ax.text((lo + hi) / 2, 4.7, f"{lo} - {hi}", ha="center", va="center", fontsize=8, color="white")
    ax.text((lo + hi) / 2, 2.6, mask, ha="center", va="center", fontsize=8, color="#333")
ax.text(128, 8.6, "Classes d'adresses IPv4 (1er octet) et masques par defaut", ha="center", fontsize=12, weight="bold", color=C_LINE)
ax.text(128, 1.2, "Adresses privees (LAN) : 10.x.x.x  -  172.16.x.x a 172.31.x.x  -  192.168.x.x",
        ha="center", fontsize=9, color="#555", style="italic")

plt.tight_layout()
plt.savefig(f"{OUT}/diagram_ip_classes.png", dpi=200, bbox_inches="tight")
plt.close()

print("Diagrams done:", sorted(os.listdir(OUT)))
