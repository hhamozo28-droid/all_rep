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
    # 3) upload individual files to R2
    import urllib.parse
    r2_account = os.environ.get("R2_ACCOUNT_ID")
    r2_key = os.environ.get("R2_ACCESS_KEY_ID")
    r2_secret = os.environ.get("R2_SECRET_ACCESS_KEY")
    r2_bucket = os.environ.get("R2_BUCKET")
    r2_base = (os.environ.get("R2_PUBLIC_BASE") or "").rstrip("/")
    if not all([r2_account, r2_key, r2_secret, r2_bucket, r2_base]):
        raise SystemExit("Missing R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE)")
    files = sorted(f for f in os.listdir(OUT) if f.lower().endswith((".pdf", ".docx")))
    if not files:
        raise SystemExit(f"No PDF/DOCX files found in {OUT}")
    manifest = {"code": CODE, "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "files": []}
    for f in files:
        local = os.path.join(OUT, f)
        key = f"{CODE}/{f}"
        url = f"https://{r2_account}.r2.cloudflarestorage.com/{r2_bucket}/{urllib.parse.quote(key, safe='/')}"
        cmd = ["curl", "-sS", "-X", "PUT", "--aws-sigv4", "aws:amz:auto:s3",
               "--user", f"{r2_key}:{r2_secret}",
               "-T", local, "-H", "Content-Type: application/octet-stream",
               "-w", "\\n%{http_code}", url]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        status = r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ""
        if r.returncode != 0 or status not in ("200", "201"):
            log(f"R2 upload failed for {f}: rc={r.returncode} status={status} stderr={r.stderr[-500:]}")
            raise SystemExit(1)
        public_url = f"{r2_base}/{urllib.parse.quote(key, safe='/')}"
        manifest["files"].append({"name": f, "url": public_url})
        log(f"uploaded {f} -> {public_url}")
    manifest_path = os.environ.get("MANIFEST_PATH", f"/home/user/manifest_{CODE}.json")
    json.dump(manifest, open(manifest_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    log(f"manifest: {manifest_path} ({len(files)} files)")
    # 4) keep zip for archival (optional)
    zst = f"/home/user/zipstage_{CODE}"
    shutil.rmtree(zst, ignore_errors=True)
    os.makedirs(f"{zst}/خطوط", exist_ok=True)
    os.makedirs(f"{zst}/موارد التوليد/flowcharts", exist_ok=True)
    for f in os.listdir(OUT):
        shutil.copy(os.path.join(OUT, f), zst)
    for f in ["IBMPlexSansArabic-Regular.ttf", "IBMPlexSansArabic-Bold.ttf", "IBMPlexSansArabic-SemiBold.ttf"]:
        if os.path.exists(f"{PIPE}/fonts2/{f}"):
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
    log(f"zip: {os.path.getsize(zip_path)/1e6:.1f} MB (archival)")
    # 5) clean
    shutil.rmtree(OUT, ignore_errors=True)
    shutil.rmtree(zst, ignore_errors=True)
    os.remove(zip_path)
    log("DONE — workspace cleaned")

if MODE in ("--prepare", "--all"):
    prepare()
if MODE in ("--build", "--all"):
    build()
