# -*- coding: utf-8 -*-
"""Generalized flowchart generator — labels from lesson phases/KB, same Mermaid spec.
Usage: python3 make_flows_gen.py CODE SUBJECTS_JSON SPEC_JSON FLOWDIR
"""
import os, sys, json, subprocess, concurrent.futures as cf
from PIL import Image

CODE = sys.argv[1]
SUBJ = json.load(open(sys.argv[2], encoding="utf-8"))
SPEC = json.load(open(sys.argv[3], encoding="utf-8"))
PDIR = sys.argv[4]
FDIR = os.path.join(PDIR, "mmd")
os.makedirs(FDIR, exist_ok=True)
os.makedirs(PDIR, exist_ok=True)
KB = SPEC.get("modules", {})

INIT = ('%%{init: {"theme":"base","themeVariables":{"fontFamily":"IBM Plex Sans Arabic, DejaVu Sans",'
        '"fontSize":"22px","primaryColor":"#F2EFE7","primaryTextColor":"#222B33","primaryBorderColor":"#22414A",'
        '"lineColor":"#B5733A","tertiaryColor":"#FCF0E4"},'
        '"flowchart":{"curve":"basis","nodeSpacing":34,"rankSpacing":42}}}%%')
CLS = ("classDef start fill:#1F4E79,color:#ffffff,stroke:#14375A;\n"
       "classDef proc fill:#F2F6FB,color:#222B33,stroke:#22414A;\n"
       "classDef dec fill:#FDE7CE,color:#7A4A00,stroke:#B5733A;\n"
       "classDef io fill:#FCF0E4,color:#222B33,stroke:#B5733A;\n")

def w6(t):
    t = " ".join(str(t or "").replace('"', "'").split())
    return t[:52] if len(t) > 52 else t

def theory_steps(mc, l):
    k = KB.get(mc, {})
    if k.get("steps"):
        return [w6(s) for s in k["steps"][:5]]
    phs = l.get("_phases") or []
    out = []
    for ph in phs[:5]:
        txt = (ph.get("content_raw") or ph.get("ev_do") or "").strip()
        out.append(w6(txt.split("\n")[0]) if txt else "تنفيذ النشاط المطلوب")
    while len(out) < 5:
        out.append("مراقبة النتائج وتوثيقها")
    return out

def case_nodes(mc, l):
    k = KB.get(mc, {})
    q = w6(k.get("case_q") or "الإنجاز مطابق للمطلوب؟")
    fix = w6(k.get("case_fix") or "تصحيح الأخطاء وإعادة التنفيذ")
    return q, fix

def theory_mmd(mc, l, s):
    return f"""{INIT}
flowchart TD
  S(["بداية"]) --> A["درس: {w6(l['title_ar'])}"]
  A --> B1["{s[0]}"]
  B1 --> B2["{s[1]}"]
  B2 --> B3["{s[2]}"]
  B3 --> B4["{s[3]}"]
  B4 --> B5["{s[4]}"]
  B5 --> Z(["نهاية"])
{CLS}class S,Z start;
class A,B1,B2,B3,B4,B5 proc;
"""

def case_mmd(mc, l, q, fix):
    return f"""{INIT}
flowchart TD
  S(["بداية"]) --> A["وضعية: {w6(l['title_ar'])}"]
  A --> B["فحص الوضعية والمعطيات"]
  B --> C{{"{q}"}}
  C -- نعم --> D["التوثيق والتسليم"]
  C -- لا --> E["{fix}"]
  E --> F{{"تم التحقق من النتيجة؟"}}
  F -- نعم --> G["اختبار نهائي وتسليم"]
  F -- لا --> H["إعادة الفحص"]
  H --> B
  D --> Z(["نهاية"])
  G --> Z
{CLS}class S,Z start;
class A,B,E,G,H proc;
class C,F dec;
class D io;
"""

def render(mmd_path, png_path, rl=False):
    if not rl and os.path.exists(png_path) and os.path.getsize(png_path) > 5000:
        return True  # idempotent: skip valid existing render
    src = mmd_path
    if rl:
        src = mmd_path.replace(".mmd", "_RL.mmd")
        open(src, "w", encoding="utf-8").write(
            open(mmd_path, encoding="utf-8").read().replace("flowchart TD", "flowchart RL"))
    cmd = ["npx", "--yes", "@mermaid-js/mermaid-cli@11", "-i", src, "-o", png_path, "-b", "white", "-w", "1200"]
    if "_t." in os.path.basename(mmd_path):
        cmd += ["-s", "2"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    except Exception:
        return False
    return r.returncode == 0 and os.path.exists(png_path)

def ratio(png):
    w, h = Image.open(png).size
    return h / w

def main():
    jobs = []
    for subj in SUBJ:
        mc = subj["code"]
        for l in subj["lessons"]:
            n = int(l["num"])
            s = theory_steps(mc, l)
            q, fix = case_nodes(mc, l)
            for kind, mmd in (("t", theory_mmd(mc, l, s)), ("c", case_mmd(mc, l, q, fix))):
                mp = os.path.join(FDIR, f"{mc}_{n:02d}_{kind}.mmd")
                pp = os.path.join(PDIR, f"{mc}_{n:02d}_{kind}.png")
                open(mp, "w", encoding="utf-8").write(mmd)
                jobs.append((mp, pp))
    print("mmd:", len(jobs), flush=True)
    warm = os.path.join(FDIR, "_warmup.mmd")
    open(warm, "w", encoding="utf-8").write(INIT + '\nflowchart TD\n  A["اختبار"] --> B(["نهاية"])\n')
    print("warmup:", render(warm, os.path.join(PDIR, "_warmup.png")), flush=True)
    fails = []
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        futs = {ex.submit(render, m, p): (m, p) for m, p in jobs}
        for i, f in enumerate(cf.as_completed(futs)):
            m, p = futs[f]
            try:
                if not f.result():
                    fails.append(p)
            except Exception:
                fails.append(p)
            if (i + 1) % 100 == 0:
                print("rendered", i + 1, flush=True)
    print("first-pass fails:", len(fails), flush=True)
    fixed = still = 0
    for mp, pp in jobs:
        if not os.path.exists(pp):
            continue
        r = ratio(pp)
        if r > 2.4:
            rl = pp.replace(".png", "_RL.png")
            if render(mp, rl, rl=True):
                r2 = ratio(rl)
                if 0.35 <= r2 <= 2.1 and abs(r2 - 1) < abs(r - 1):
                    os.replace(rl, pp); fixed += 1
                else:
                    os.remove(rl); still += 1
            else:
                still += 1
    ok = sum(1 for _, p in jobs if os.path.exists(p))
    print("PNG:", ok, "/", len(jobs), "RL-fixed:", fixed, flush=True)

if __name__ == "__main__":
    main()
