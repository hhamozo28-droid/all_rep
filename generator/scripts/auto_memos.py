# -*- coding: utf-8 -*-
"""auto_memos.py — per-specialty memo batch:
load inventory -> download sources -> parse -> SUBJECTS -> flows -> memos v3
-> zip (files + fonts + mermaid sources) -> gofile -> link in روابط التحميل -> clean.
Usage: python3 auto_memos.py CODE [--prepare|--build|--all]
  --prepare : download + parse + subjects.json only (for research/KB writing)
  --build   : flows + memos + zip + upload + link + clean (needs subjects.json + spec_kb)
  --all     : both
"""
import os, re, sys, json, time, shutil, subprocess, urllib.request

sys.path.insert(0, "/home/user/pipeline")
from auto_specialty import load_specialty, download, parse_all, build_subjects, WORK

CODE = sys.argv[1]
MODE = sys.argv[2] if len(sys.argv) > 2 else "--all"
PIPE = "/home/user/pipeline"
LINKS = "/home/user/روابط التحميل.md"
SUBJ_F = f"{PIPE}/subjects_{CODE}.json"
SPEC_F = f"{PIPE}/spec_kb/{CODE}.json"
FLOWDIR = f"{PIPE}/memo_imgs/flow_{CODE}"
OUT = f"/home/user/memo_out_{CODE}"
LOG = f"{PIPE}/memo_batch_log.txt"

def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] [{CODE}] {msg}"
    print(line, flush=True)
    open(LOG, "a", encoding="utf-8").write(line + "\n")

def run(cmd, timeout=1800):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        log(f"CMD FAIL: {cmd}\n{r.stdout[-800:]}\n{r.stderr[-800:]}")
        raise SystemExit(1)
    return r.stdout

def prepare():
    best, name_ar = load_specialty(CODE)
    log(f"specialty: {CODE} {name_ar}")
    if os.path.exists(WORK):
        shutil.rmtree(WORK)
    os.makedirs(WORK, exist_ok=True)
    ok, total = download(best["tree"], WORK)
    log(f"downloaded {ok}/{total}")
    parsed = parse_all(WORK)
    log(f"parsed {len(parsed['modules'])} modules / {sum(len(m['lessons']) for m in parsed['modules'].values())} lessons / {len(parsed['kafaa'])} kafaat / {len(parsed['failures'])} failures")
    subs = build_subjects(parsed, CODE, name_ar)
    json.dump(subs, open(SUBJ_F, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    # spec skeleton if missing
    os.makedirs(f"{PIPE}/spec_kb", exist_ok=True)
    if not os.path.exists(SPEC_F):
        json.dump({"name_ar": name_ar, "dom": {}, "modules": {}, "imgs": {}, "real_imgs": {}},
                  open(SPEC_F, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    log(f"subjects saved: {len(subs)} modules -> {SUBJ_F}")
    shutil.rmtree(WORK, ignore_errors=True)
    return subs

def build():
    subs = json.load(open(SUBJ_F, encoding="utf-8"))
    n_lessons = sum(len(s["lessons"]) for s in subs)
    log(f"build start: {len(subs)} modules / {n_lessons} lessons")
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    # 1) flows
    run(f"python3 {PIPE}/make_flows_gen.py {CODE} {SUBJ_F} {SPEC_F} {FLOWDIR}", timeout=3600)
    log("flows done")
    # 2) memos
    run(f"python3 {PIPE}/make_memos_gen.py {CODE} {SUBJ_F} {SPEC_F} {FLOWDIR}", timeout=1800)
    log("memos built")
    # 3) zip
    zst = f"/home/user/zipstage_{CODE}"
    shutil.rmtree(zst, ignore_errors=True)
    os.makedirs(f"{zst}/خطوط", exist_ok=True)
    os.makedirs(f"{zst}/موارد التوليد/flowcharts", exist_ok=True)
    for f in os.listdir(OUT):
        shutil.copy(os.path.join(OUT, f), zst)
    for f in ["IBMPlexSansArabic-Regular.ttf", "IBMPlexSansArabic-Bold.ttf", "IBMPlexSansArabic-SemiBold.ttf"]:
        shutil.copy(f"{PIPE}/fonts2/{f}", f"{zst}/خطوط/")
    open(f"{zst}/خطوط/اقرأني.txt", "w", encoding="utf-8").write(
        "ثبّت هذه الخطوط على حاسوبك (زر يمين > Install) لعرض الملفات بنفس الخط الاحترافي IBM Plex Sans Arabic.\n")
    mmd_src = os.path.join(FLOWDIR, "mmd")
    if os.path.isdir(mmd_src):
        for f in os.listdir(mmd_src):
            if f.endswith(".mmd") and "_RL" not in f and "warmup" not in f:
                shutil.copy(os.path.join(mmd_src, f), f"{zst}/موارد التوليد/flowcharts/")
    zip_path = f"/home/user/{CODE}_memos.zip"
    if os.path.exists(zip_path):
        os.remove(zip_path)
    subprocess.run(f'cd "{zst}" && zip -q -r "{zip_path}" .', shell=True, check=True)
    size_mb = os.path.getsize(zip_path) / 1e6
    log(f"zip: {size_mb:.1f} MB")
    # 4) upload
    srv = json.load(urllib.request.urlopen("https://api.gofile.io/servers"))["data"]["servers"][0]["name"]
    import subprocess as sp
    up = sp.run(['curl', '-s', '-F', f'file=@{zip_path}', f'https://{srv}.gofile.io/contents/uploadfile'],
                capture_output=True, text=True, timeout=1800)
    link = json.loads(up.stdout)["data"]["downloadPage"]
    assert link.startswith("https://gofile.io/"), f"bad link: {up.stdout[:200]}"
    log(f"LINK: {link}")
    # 5) update links table
    txt = open(LINKS, encoding="utf-8").read()
    lines = txt.split("\n")
    done = False
    for i, ln in enumerate(lines):
        if f"**{CODE} " in ln and "المذكرات" not in ln:
            n_mod = len(subs)
            files = n_mod * 2
            ln = ln.replace("| مخططات |", "| مخططات + مذكرات |")
            ln = re.sub(r"\| (\d+) ملفًا \|", f"| \\1 + {files} ملفًا |", ln)
            if ln.rstrip().endswith("|"):
                ln = ln.rstrip()[:-1].rstrip() + f"<br>[⬇️ المذكرات]({link}) |"
            lines[i] = ln
            done = True
            break
    if done:
        open(LINKS, "w", encoding="utf-8").write("\n".join(lines))
        log("links table updated")
    else:
        log("WARN: row not found or already has memo link")
    run(f"python3 {PIPE}/make_links_docx.py", timeout=300)
    # 6) clean
    shutil.rmtree(OUT, ignore_errors=True)
    shutil.rmtree(zst, ignore_errors=True)
    os.remove(zip_path)
    log("DONE — workspace cleaned")

if MODE in ("--prepare", "--all"):
    prepare()
if MODE in ("--build", "--all"):
    build()
