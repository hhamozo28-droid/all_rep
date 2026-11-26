# -*- coding: utf-8 -*-
"""End-to-end batch pipeline per specialty:
download sources -> parse -> build SUBJECTS -> generate M9-1 plans (Word+PDF)
-> zip -> gofile upload -> record link in روابط التحميل.md -> clean workspace.
Usage: python3 auto_specialty.py CODE [CODE...] | --all | --next N
"""
import os, re, sys, json, time, shutil, unicodedata, subprocess, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, "/home/user/pipeline")
import signal

class TimeoutErr(Exception):
    pass

def _alarm(sig, frm):
    raise TimeoutErr()

def with_timeout(fn, sec):
    signal.signal(signal.SIGALRM, _alarm)
    signal.alarm(sec)
    try:
        return fn()
    finally:
        signal.alarm(0)

import pymupdf

INVENTORY = "/home/user/uploads/new_specialty/inventory_full.json"
LINKS = "/home/user/روابط التحميل.md"
WORK = "/home/user/uploads/new_specialty/work"
QUEUE = "/home/user/pipeline/queue.txt"

# ================================================================= inventory
def load_specialty(code):
    data = json.load(open(INVENTORY, encoding="utf-8"))
    cands = [s for s in data if s["name"].split()[0] == code]
    if not cands:
        raise RuntimeError(f"{code}: not in inventory")
    def score(s):
        n = 1 if " " in s["name"] else 0   # prefer named entries
        for sub in s["tree"]:
            if sub["name"].startswith("دروس-PDF") and sub.get("children"):
                n += 10
            if sub["name"].startswith("الكفاءات"):
                n += len(sub.get("children", []))
        return n
    best = max(cands, key=score)
    name_ar = best["name"].split(None, 1)[1] if " " in best["name"] else ""
    if not name_ar or name_ar == code:
        try:
            nm = json.load(open("/home/user/pipeline/name_map.json", encoding="utf-8"))
            name_ar = nm.get(code) or name_ar or code
        except Exception:
            name_ar = name_ar or code
    return best, name_ar

def walk_files(node, path=""):
    for c in node.get("children", []):
        p = f"{path}/{c['name']}"
        if c["type"] == "file":
            yield p, c["id"]
        else:
            yield from walk_files(c, p)

# ================================================================= download
def download(tree, dest):
    files = [(p, i) for p, i in walk_files({"children": tree})
             if p.startswith("/الكفاءات") or p.startswith("/دروس-PDF")]
    def dl(f):
        rel, fid = f
        d = os.path.join(dest, rel.lstrip("/"))
        os.makedirs(os.path.dirname(d), exist_ok=True)
        if os.path.exists(d) and os.path.getsize(d) > 800:
            return 1
        url = f"https://drive.usercontent.google.com/download?id={fid}&export=download"
        for a in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=90) as r, open(d, "wb") as o:
                    o.write(r.read())
                if os.path.getsize(d) > 400:
                    return 1
            except Exception:
                time.sleep(1 + a)
        return 0
    ok = 0
    with ThreadPoolExecutor(max_workers=10) as ex:
        for r in ex.map(dl, files):
            ok += r
    return ok, len(files)

# ================================================================= parse
def nfkc(s): return unicodedata.normalize("NFKC", s or "")

def plausible(v): return 0.2 <= v <= 2.6

def parse_dur(txt):
    txt = txt.replace(" ", "")
    m = re.search(r'(\d+)سا(\d+)', txt)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        v = a + b / 60
        if plausible(v): return v
        v2 = b + a / 60
        if plausible(v2): return v2
        return 0
    m = re.search(r'(\d+(?:\.\d+)?)سا', txt)
    if m: return float(m.group(1))
    m = re.search(r'سا(\d+(?:\.\d+)?)', txt)
    if m: return float(m.group(1))
    m = re.search(r'(\d+)د', txt)
    if m: return int(m.group(1)) / 60
    m = re.search(r'د(\d+)', txt)
    if m: return int(m.group(1)) / 60
    return 0

def row_duration(row_raw):
    for m in re.finditer(r'(\d+)سا(\d+)|(\d+)سا|سا(\d+)|(\d+)د|د(\d+)', row_raw):
        tok = m.group(0)
        v = parse_dur(tok)
        if plausible(v):
            return v
        m2 = re.match(r'(\d+)سا(\d+)$', tok)
        if m2:
            v2 = int(m2.group(2)) + int(m2.group(1)) / 60
            if plausible(v2):
                return v2
    return 0

def extract_grid(page):
    tf = page.find_tables()
    if not tf.tables:
        return None
    t = tf.tables[0]
    tb = t.bbox
    rects = list(t.cells)
    words = [w for w in page.get_text("words")
             if tb[0]-4 <= (w[0]+w[2])/2 <= tb[2]+4 and tb[1]-4 <= (w[1]+w[3])/2 <= tb[3]+4]
    ys = sorted({round((r[1]+r[3])/2) for r in rects})
    assign = {i: [] for i in range(len(rects))}
    for w in words:
        cx, cy = (w[0]+w[2])/2, (w[1]+w[3])/2
        b = min(range(len(ys)), key=lambda i: abs(ys[i]-cy))
        cands = [i for i, r in enumerate(rects) if abs(round((r[1]+r[3])/2) - ys[b]) <= 8]
        best, bd = None, 1e9
        for i in cands:
            x0, y0, x1, y1 = rects[i]
            if x0-3 <= cx <= x1+3:
                best = i; break
            d = min(abs(cx-x0), abs(cx-x1))
            if d < bd: bd, best = d, i
        if best is not None:
            assign[best].append(w)
    def cell_words(i):
        ws = sorted(assign[i], key=lambda w: (round((w[1]+w[3])/2), -w[2]))
        lines, last_y = [[]], None
        for w in ws:
            y = round((w[1]+w[3])/2)
            if last_y is not None and y != last_y:
                lines.append([])
            lines[-1].append(nfkc(w[4]))
            last_y = y
        lines = [" ".join(l) for l in lines if l]
        if len(lines) > 1 and all(re.search(r'[\u0600-\u06FF]', l) for l in lines):
            lines = lines[::-1]
        return "\n".join(lines).strip()
    items = sorted(range(len(rects)), key=lambda i: (round((rects[i][1]+rects[i][3])/2), -rects[i][2]))
    rows, cur, y0 = [], [], None
    for i in items:
        y = round((rects[i][1]+rects[i][3])/2)
        if y0 is None or abs(y-y0) <= 8:
            cur.append(i)
        else:
            rows.append(cur); cur = [i]
        y0 = y
    if cur:
        rows.append(cur)
    grid = []
    for band in rows:
        band.sort(key=lambda i: -rects[i][2])
        grid.append([cell_words(i) for i in band])
    return grid

PHASE_NAMES = ["الانطلاق — وضعية مشكلة", "البناء — نظري/عملي", "التطبيق الموجّه",
               "الإنتاج المستقل والتقييم", "الإنهاء"]

def field(text, label_re, value_first=False):
    m = re.search(label_re + r'[^:\n]{0,80}:\s*([^\n]+)', text)
    if m: return m.group(1).strip()
    if value_first:
        m = re.search(r'([^\n]{2,70}?)\s*[:：]?\s*' + label_re, text)
        if m: return m.group(1).strip()
    return ""

def parse_lesson(pdf_path):
    doc = pymupdf.open(pdf_path)
    page = doc[0]
    text = nfkc(page.get_text())
    d = {}
    d["title"] = field(text, r'الغرض\s*\S{0,10}')
    d["tools"] = field(text, r'المواد\s*والأجهزة')
    d["space"] = field(text, r'فضاء\s*التدريس')
    d["kafaa_type"] = field(text, r'نوع\s*الكفاءة')
    d["kafaa"] = field(text, r'الكفاءة\s*المستهدفة')
    d["proc"] = field(text, r'الإجراء')
    m = re.search(r'(\d+)\s*ساعة\s*[:：]?\s*(?:—\s*)?مدة\s*الدرس', text) or \
        re.search(r'مدة\s*الدرس[^:\n]{0,30}:\s*(\d+)\s*ساعة', text)
    d["lesson_h"] = int(m.group(1)) if m else 4
    try:
        grid = with_timeout(lambda: extract_grid(page), 60)
    except Exception:
        grid = None
    phases = []
    if grid:
        data_rows = [r for r in grid[1:] if len(r) >= 8]
        for i, r in enumerate(data_rows[:5]):
            merged = r[3] + " " + (r[4] if len(r) > 4 else "")
            dur = row_duration(merged) or row_duration(" ".join(r))
            if not dur:
                prof = [0.5, 1.5, 1.0, 0.75, 0.25]
                lh = d.get("lesson_h") or 4
                dur = round(prof[i] * lh / 4, 2) if i < 5 else 0.5
            phases.append({
                "name": PHASE_NAMES[i] if i < 5 else f"مرحلة {i+1}",
                "dur": dur,
                "content_raw": r[3] if len(r) > 3 else "",
                "links": r[2] if len(r) > 2 else "",
                "ev_do": r[5] if len(r) > 5 else "",
                "ev_stu": r[6] if len(r) > 6 else "",
                "eval": r[7] if len(r) > 7 else "",
            })
    d["phases"] = phases
    return d

def parse_kafaa(pdf_path):
    doc = pymupdf.open(pdf_path)
    text = nfkc("".join(p.get_text() for p in doc))
    out = {"file": os.path.basename(pdf_path)}
    m = re.search(r'ÉNONCÉ DE LA COMPÉTENCE[^:]*:\s*(.+?)(?:\n\s*El[ée]ments|Conditions|Code\s*:|·|\uf0b7|Rem)',
                  text.replace('\uf0b7', '·'), re.I | re.S)
    out["competency_fr"] = re.sub(r'\s+', ' ', m.group(1)).strip() if m else ""
    m = re.search(r'Code\s*:\s*((?:MQ|MC)\s*\d+)', text, re.I)
    out["code"] = re.sub(r'\s+', '', m.group(1)) if m else ""
    m = re.search(r'Code\s*:\s*(?:MQ|MC)\s*\d+\s*Dur[ée]e\s*:\s*(\d+)', text, re.I) or \
        re.search(r'Dur[ée]e\s*:\s*(\d+)', text, re.I)
    out["hours"] = int(m.group(1)) if m else 0
    m = re.search(r'Module\s*:\s*(.+)', text)
    name = m.group(1).strip() if m else ""
    name = re.split(r'\s*Code\s*:', name)[0].strip()
    out["name_fr"] = name[:80]
    m = re.search(r'El[ée]ments de la comp[ée]tence\s*:?\s*(.+?)(?:Conditions|Crit|$)', text, re.I | re.S)
    els = []
    if m:
        els = [x.strip(" .;-•") for x in re.split(r'\n|•|- ', m.group(1)) if len(x.strip()) > 8]
    out["elements"] = els[:10]
    return out

def parse_all(base):
    result = {"modules": {}, "kafaa": {}, "failures": []}
    for sub in os.listdir(base):
        if sub.startswith("الكفاءات"):
            d0 = os.path.join(base, sub)
            for fn in sorted(os.listdir(d0)):
                if not fn.endswith(".pdf"):
                    continue
                try:
                    k = with_timeout(lambda: parse_kafaa(os.path.join(d0, fn)), 90)
                    k["kind"] = "MQ" if "مهنية" in sub else "MC"
                    result["kafaa"][fn] = k
                except Exception as e:
                    result["failures"].append(f"kafaa {fn}: {e}")
    less = None
    for sub in os.listdir(base):
        if sub.startswith("دروس-PDF"):
            less = os.path.join(base, sub)
    if not less:
        raise RuntimeError("no دروس-PDF folder")
    mods = [m for m in sorted(os.listdir(less))
            if m[:2] in ("MC", "MQ") and os.path.isdir(os.path.join(less, m))]
    for mdir in mods:
        code = mdir.split("-")[0]
        name_ar = mdir.split("-", 1)[1].replace("-", " ")
        mdir_path = os.path.join(less, mdir)
        lessons = []
        pdfs = sorted(f for f in os.listdir(mdir_path) if f.endswith(".pdf"))
        for fn in pdfs:
            try:
                d = with_timeout(lambda: parse_lesson(os.path.join(mdir_path, fn)), 120)
                mnum = re.match(r'(\d+)', fn)
                d["num"] = int(mnum.group(1)) if mnum else len(lessons) + 1
                d["src_file"] = fn
                lessons.append(d)
            except Exception as e:
                result["failures"].append(f"lesson {mdir}/{fn}: {e}")
        lessons.sort(key=lambda x: x["num"])
        if not lessons:
            continue
        result["modules"].setdefault(code, {"name_ar": name_ar, "lessons": []})
        result["modules"][code]["lessons"].extend(lessons)
    return result

# ================================================================= content
def purify(s):
    s = unicodedata.normalize("NFKC", str(s or ""))
    s = "".join(ch for ch in s if unicodedata.category(ch) not in ("Cf", "Co", "Cs", "Cc") or ch == "\n")
    s = re.sub(r'^[\s\u2022\u00b7\u2023\u2043\uf0b7\*\-–—]+', '', s)
    return s.strip()

def short(t, n=52):
    t = re.sub(r'\s+', ' ', t or '').strip()
    return t[:n] + ('…' if len(t) > n else '')

def build_subjects(parsed, code, name_ar):
    KAF = {v["code"]: v for v in parsed["kafaa"].values() if v.get("code")}
    # link kafaat without code by filename
    for fn, v in parsed["kafaa"].items():
        if not v.get("code"):
            for mc, mod in parsed["modules"].items():
                nf = re.sub(r'[\sـ]+', '', fn.replace(".pdf", ""))
                nm = re.sub(r'[\sـ]+', '', mod["name_ar"])
                if nf and (nf in nm or nm in nf):
                    v["code"] = mc
    KAF = {v["code"]: v for v in parsed["kafaa"].values() if v.get("code")}
    SUBJECTS = []
    for mc in sorted(parsed["modules"], key=lambda c: (c[:2], int(re.sub(r'\D', '', c) or 0))):
        m = parsed["modules"][mc]
        k = KAF.get(mc, {})
        els = [purify(e) for e in (k.get("elements") or [])]
        name_fr = purify(k.get("name_fr")) or m["name_ar"]
        competency_fr = purify(k.get("competency_fr")) or name_fr
        kind = "Qualifiant (MQ)" if mc.startswith("MQ") else "Complémentaire (MC)"
        lessons = []
        n_les = len(m["lessons"])
        for l in m["lessons"]:
            n = l["num"]
            lh = l.get("lesson_h") or 4
            tph = 2 if lh >= 4 else 0
            th = lh - tph
            title = purify(l.get("title") or f"الدرس {n}").rstrip('.,،')
            title_fr = purify(els[(n - 1) % len(els)]) if els else f"Leçon {n} — {name_fr}"
            obj = f"في نهاية الحصة يكون المتربص قادرا على {title} وفق المنهجية المهنية ومعايير الجودة."
            space = purify(l.get("space")) or "الورشة"
            tools = purify(l.get("tools")) or "الوسائل التقنية حسب طبيعة الدرس"
            situation = (f"في {space}: وضعية مهنية مرتبطة بـ«{short(title, 40)}» — "
                         f"يعرضها المكوّن أمام المتربصين ويستثير مكتسباتهم القبلية.")
            theory = [
                ("h2", f"1. المفاهيم الأساسية — {short(title, 40)}"), ("p", obj),
                ("h2", "2. منهجية الإنجاز والمراحل"),
                ("b", "تحديد العناصر والوسائل التقنية اللازمة للإنجاز."),
                ("b", "اتباع تسلسل العمل المهني واحترام إجراءات السلامة."),
                ("h2", "3. معايير الجودة والسلامة"),
                ("b", "مطابقة الإنتاج لمواصفات الجودة المطلوبة مهنيًا."),
                ("note", "السلامة المهنية شرط أساسي في كل مراحل الإنجاز."),
            ]
            tp = [
                ("h2", f"النشاط التطبيقي (TP) — {short(title, 40)}"),
                ("n", "التحضير للمواد والأجهزة وتنظيم مكان العمل."),
                ("n", "تنفيذ النشاط عمليا تحت إشراف المكوّن مع احترام خطوات الإنجاز."),
                ("n", "مراقبة النتائج وتصحيح الأخطاء وتوثيق الإنتاج."),
            ]
            evaluation = [
                ("h2", f"التقييم التكويني — {short(title, 40)}"),
                ("p", "يُقيَّم المتربص وفق المعايير الآتية:"),
                ("t", ["المعيار", "ممتاز", "مقبول", "يحتاج دعمًا"],
                 [["الإنجاز", "دقيق وكامل", "أخطاء جزئية", "غير مطابق"],
                  ["السلامة", "يحترم كل القواعد", "احترام جزئي", "لا يحترم"],
                  ["التنظيم", "منظم ومرتب", "تنظيم مقبول", "فوضوي"]]),
            ]
            gl = [["الوثائق التقنية", "Documentation technique"],
                  ["معايير الأداء", "Critères de performance"],
                  ["بطاقة الملاحظة", "Fiche d'observation"],
                  ["السلامة المهنية", "Sécurité au travail"]]
            if els:
                gl.append([short(title, 26), short(els[(n - 1) % len(els)], 38)])
            lessons.append({
                "num": n, "th": th, "tph": tph, "type": "Cours+TP",
                "title_fr": short(title_fr, 70), "title_ar": title,
                "objective": obj, "situation": situation, "tools": tools,
                "theory": theory, "tp": tp, "evaluation": evaluation,
                "summary": f"تناول الدرس «{short(title, 40)}» المفاهيم والمنهجية ومعايير الجودة والسلامة.",
                "homework": "إتمام الواجب النظري وتحضير الدرس الموالي.",
                "glossary": gl,
                "_phases": l.get("phases") or [],
                "_space": space,
            })
        competency_ar = purify(m["lessons"][0].get("kafaa") or
                     f"يُتقن المتربص مهارات {m['name_ar']} وفق المقاربة بالكفاءة.")
        total_h = k.get("hours") or sum((ll.get("lesson_h") or 4) for ll in m["lessons"])
        SUBJECTS.append({
            "code": mc,
            "file": f"{code} {name_ar}/{mc} {m['name_ar']}",
            "name_fr": short(name_fr, 70),
            "name_ar": m["name_ar"],
            "cat": kind,
            "competency": competency_ar,
            "competency_fr": short(competency_fr, 90),
            "total_h": total_h,
            "lessons": lessons,
        })
    return SUBJECTS

# ================================================================= diagrams
def make_diagrams(outdir, subjects):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle
    from matplotlib import font_manager
    import arabic_reshaper
    FP = font_manager.FontProperties(fname="/home/user/pipeline/plan_fonts/Amiri-Bold.ttf")
    BLUE, ORANGE, GREEN, PURPLE, RED, YELLOW = "#2E86DE", "#F97C2B", "#27AE60", "#7B5EA7", "#E8475F", "#FFE066"
    def ar(t):
        return "\n".join(arabic_reshaper.reshape(line) for line in str(t).split("\n"))
    def fig_new(title_ar, title_fr):
        fig, ax = plt.subplots(figsize=(7.2, 4.2), dpi=140)
        ax.set_xlim(0, 10); ax.set_ylim(0, 6.2); ax.axis("off")
        ax.add_patch(Rectangle((0, 5.45), 10, 0.75, color=BLUE, zorder=0))
        ax.text(9.7, 5.82, ar(title_ar), ha="right", va="center", fontsize=12, color="white", fontproperties=FP)
        ax.text(0.3, 5.82, title_fr, ha="left", va="center", fontsize=9, color=YELLOW, style="italic")
        return fig, ax
    def box(ax, x, y, w, h, label, color, fs=9):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.12", fc=color, ec="#333", lw=1.2, alpha=0.92))
        ax.text(x + w/2, y + h/2, ar(label), ha="center", va="center", fontsize=fs, color="white", fontproperties=FP)
    imgs = {}
    for subj in subjects:
        mc = subj["code"]
        # fig 1: workflow with module name
        fig, ax = fig_new(f"مراحل الإنجاز — {subj['name_ar'][:26]}", f"Processus — {mc}")
        steps = ["التحضير", "الإنجاز", "المراقبة", "التصحيح", "التقييم"]
        cols = [GREEN, BLUE, ORANGE, RED, PURPLE]
        x = 0.35
        for s, c in zip(steps, cols):
            box(ax, x, 2.6, 1.65, 1.25, s, c, fs=9)
            if x < 8:
                ax.add_patch(FancyArrowPatch((x + 1.72, 3.2), (x + 2.05, 3.2), arrowstyle="-|>", mutation_scale=13, lw=1.6, color="#333"))
            x += 2.0
        p1 = os.path.join(outdir, f"gen_{mc}_wf.png")
        fig.savefig(p1, bbox_inches="tight", facecolor="white"); plt.close(fig)
        # fig 2: quality & safety with module name
        fig, ax = fig_new(f"معايير الجودة والسلامة — {subj['name_ar'][:22]}", f"Qualité / Sécurité — {mc}")
        box(ax, 0.6, 3.4, 2.7, 1.3, "معايير الجودة", GREEN)
        box(ax, 3.8, 3.4, 2.7, 1.3, "السلامة المهنية", RED)
        box(ax, 7.0, 3.4, 2.5, 1.3, "احترام المنهجية", BLUE)
        box(ax, 2.2, 0.9, 2.7, 1.3, "التنظيم والترتيب", ORANGE)
        box(ax, 5.4, 0.9, 2.7, 1.3, "تقييم الأداء", PURPLE)
        p2 = os.path.join(outdir, f"gen_{mc}_ql.png")
        fig.savefig(p2, bbox_inches="tight", facecolor="white"); plt.close(fig)
        imgs[mc] = {"wf": p1, "ql": p2}
    return imgs

# ================================================================= render
def fmt_dur(v):
    if not v: return "—"
    h = int(v); mf = round((v - h) * 60)
    if h and mf: return f"{h} سا {mf} د"
    if h: return f"{h} سا"
    return f"{mf} د"

def generate(subjects, outdir, imgs):
    import run_plans
    from plan_lib import LIGHT_YELLOW, LIGHT_BLUE, LIGHT_GREEN, LIGHT_ORANGE
    BGS5 = [LIGHT_YELLOW, LIGHT_BLUE, LIGHT_GREEN, LIGHT_ORANGE, "#EFE7F6"]
    def make_rows_src(l, liens):
        rows, bgs = [], []
        phs = l.get("_phases") or []
        title = l["title_ar"]
        space = l.get("_space") or "الورشة"
        tools = str(l.get("tools") or "الوسائل التقنية")[:34]
        goals = [
            "أن يستقبل الوضعية المشكلة ويربطها بمكتسباته القبلية.",
            f"أن يشرح مضمون «{title[:40]}» ويوظّفه في وضعيات مهنية.",
            "أن ينجز التطبيق الموجّه بدقة واحترام منهجية العمل.",
            "أن ينتج إنتاجًا مستقلًا وفق معايير الأداء ويقيّم ذاته.",
            "أن يلخّص المكتسبات ويؤدي الواجب المنزلي.",
        ]
        contents = [
            f"• الوضعية المشكلة: {title[:45]}\n• استحضار المكتسبات القبلية",
            f"• {title[:48]}\n• المفاهيم والخطوات الأساسية\n• معايير الجودة والسلامة",
            f"• التطبيق الموجّه: {title[:42]}\n• إنجاز النشاط خطوة بخطوة",
            f"• الإنتاج المستقل وفق بطاقة الأداء\n• {title[:42]}",
            "• الخلاصة ومناقشة الأخطاء الشائعة\n• الواجب المنزلي",
        ]
        evals = ["أسئلة شفهية وملاحظة", "ملاحظة ومطابقة للمعيار", "شبكة ملاحظة مرحلية",
                 "مطابقة المنتج للمواصفات", "تقييم ختامي"]
        for i in range(5):
            ph = phs[i] if i < len(phs) else {}
            do = " ".join((ph.get("ev_do") or "").split("\n")) or "يعرض المحتوى ويوجّه النقاش."
            stu = " ".join((ph.get("ev_stu") or "").split("\n")) or "ينجز المطلوب تحت الإشراف."
            rows.append([
                str(i + 1), goals[i], liens, contents[i],
                fmt_dur(ph.get("dur")),
                f"المكوّن: {do}\nالمتّكوّن: {stu}",
                tools, "01", space, ph.get("eval") or evals[i],
            ])
            bgs.append(BGS5[i])
        return rows, bgs
    LESSON_IMGS = {}
    for subj in subjects:
        mc = subj["code"]
        im = imgs.get(mc, {})
        LESSON_IMGS[mc] = {l["num"]: [x for x in [im.get("wf"), im.get("ql")] if x] for l in subj["lessons"]}
    run_plans.make_rows = make_rows_src
    run_plans.LESSON_IMGS = LESSON_IMGS
    made = []
    for subj in subjects:
        name = f"{subj['code']} {subj['name_ar']} - مخططات الدروس"
        docx_path = os.path.join(outdir, name + ".docx")
        pdf_path = os.path.join(outdir, name + ".pdf")
        run_plans.build_docx(subj, docx_path)
        run_plans.build_pdf(subj, pdf_path)
        made += [docx_path, pdf_path]
    return made

# ================================================================= upload/record/clean
def gofile_upload(zip_path):
    last = ""
    for attempt in range(3):
        try:
            r = subprocess.run(["curl", "-s", "https://api.gofile.io/servers"], capture_output=True, text=True, timeout=60)
            srv = json.loads(r.stdout)["data"]["servers"][0]["name"]
            r = subprocess.run(["curl", "-s", "-m", "600", "-F", f"file=@{zip_path}",
                                f"https://{srv}.gofile.io/contents/uploadfile"], capture_output=True, text=True, timeout=660)
            j = json.loads(r.stdout)
            if j.get("status") == "ok":
                return j["data"]["downloadPage"], j["data"]["size"]
            last = r.stdout[:200]
        except Exception as e:
            last = str(e)[:200]
        time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"gofile upload failed after 3 attempts: {last}")

def record_link(code, name_ar, n_modules, n_lessons, n_files, size, link):
    row = f"| 0 | **{code} {name_ar}** | مخططات الدروس | {n_modules} وحدة / {n_lessons} درسًا | {n_files} ملفًا | {size/1e6:.1f} MB | [⬇️ تحميل]({link}) |"
    txt = open(LINKS, encoding="utf-8").read()
    lines = txt.split("\n")
    last = max((i for i, ln in enumerate(lines) if "⬇️" in ln), default=None)
    if last is not None:
        lines.insert(last + 1, row)
    else:
        for i, ln in enumerate(lines):
            if ln.startswith("---") and i > 5:
                lines.insert(i, row); break
        else:
            lines.append(row)
    open(LINKS, "w", encoding="utf-8").write("\n".join(lines))
    return row

def renumber_links():
    txt = open(LINKS, encoding="utf-8").read()
    n = 0
    out = []
    for ln in txt.split("\n"):
        if "⬇️" in ln and ln.startswith("|"):
            n += 1
            ln = re.sub(r'^\|\s*\d+\s*\|', f'| {n} |', ln)
        out.append(ln)
    open(LINKS, "w", encoding="utf-8").write("\n".join(out))

# ================================================================= main
def process(code):
    t0 = time.time()
    print(f"===== START {code}", flush=True)
    sp, name_ar = load_specialty(code)
    base = os.path.join(WORK, code)
    os.makedirs(base, exist_ok=True)
    ok, total = download(sp["tree"], base)
    print(f"[{code}] downloaded {ok}/{total}", flush=True)
    parsed = parse_all(base)
    n_mod = len(parsed["modules"])
    n_les = sum(len(m["lessons"]) for m in parsed["modules"].values())
    print(f"[{code}] parsed {n_mod} modules / {n_les} lessons / {len(parsed['kafaa'])} kafaat / {len(parsed['failures'])} failures", flush=True)
    subjects = build_subjects(parsed, code, name_ar)
    outdir = os.path.join(base, "out")
    os.makedirs(outdir, exist_ok=True)
    imgs = make_diagrams(outdir, subjects)
    made = generate(subjects, outdir, imgs)
    print(f"[{code}] generated {len(made)} files", flush=True)
    zip_path = os.path.join(WORK, f"{code} {name_ar} - مخططات الدروس.zip")
    with __import__("zipfile").ZipFile(zip_path, "w", __import__("zipfile").ZIP_DEFLATED) as z:
        for f in made:
            z.write(f, os.path.basename(f))
    link, size = gofile_upload(zip_path)
    print(f"[{code}] LINK: {link}", flush=True)
    record_link(code, name_ar, n_mod, n_les, len(made), size, link)
    renumber_links()
    shutil.rmtree(base, ignore_errors=True)
    os.remove(zip_path)
    print(f"[{code}] DONE in {time.time()-t0:.0f}s — link recorded, workspace cleaned", flush=True)
    return link

def done_codes():
    if not os.path.exists(LINKS):
        return set()
    txt = open(LINKS, encoding="utf-8").read()
    return set(re.findall(r'\*\*([A-Z]+\d+[A-Z]?) ', txt))

if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--all":
        queue = [c.strip() for c in open(QUEUE) if c.strip()]
        queue = [c for c in queue if c not in done_codes()]
    elif args and args[0] == "--next":
        n = int(args[1]) if len(args) > 1 else 1
        queue = [c.strip() for c in open(QUEUE) if c.strip()]
        queue = [c for c in queue if c not in done_codes()][:n]
    else:
        queue = args
    for code in queue:
        try:
            process(code)
        except Exception as e:
            print(f"[{code}] ERROR: {e}", flush=True)
            import traceback; traceback.print_exc()
    print("BATCH END", flush=True)
