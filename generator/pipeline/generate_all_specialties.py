# same content
import os, sys, json, glob, time, subprocess

PIPE = "/home/user/pipeline"
AUTO_MEMOS = os.path.join(PIPE, "auto_memos.py")

def codes():
    out = []
    for p in sorted(glob.glob(os.path.join(PIPE, "spec_kb", "*.json"))):
        out.append(os.path.splitext(os.path.basename(p))[0])
    return out

def done(code):
    return os.path.exists(f"/home/user/manifest_{code}.json")

def run(code):
    subprocess.run([sys.executable, AUTO_MEMOS, code, "--build"], check=True, timeout=7200)

def main():
    argv = sys.argv[1:]
    dry = "--dry-run" in argv
    only = None
    start = None
    for a in argv:
        if a.startswith("--only="):
            only = [x.strip() for x in a.split("=", 1)[1].split(",") if x.strip()]
        elif a.startswith("--from="):
            start = a.split("=", 1)[1].strip()
    all_codes = codes()
    if only:
        selected = [c for c in all_codes if c in only]
    elif start:
        idx = all_codes.index(start) if start in all_codes else 0
        selected = all_codes[idx:]
    else:
        selected = all_codes
    print(f"Total specs: {len(all_codes)} | selected: {len(selected)}", flush=True)
    if dry:
        for c in selected:
            print(f"{'SKIP' if done(c) else 'TODO'} {c}")
        return
    failures = []
    for i, code in enumerate(selected, 1):
        if done(code):
            print(f"[{i}/{len(selected)}] SKIP {code} (manifest exists)", flush=True)
            continue
        print(f"[{i}/{len(selected)}] BUILD {code}", flush=True)
        t0 = time.time()
        try:
            run(code)
            print(f"  OK {code} in {time.time()-t0:.0f}s", flush=True)
        except Exception as e:
            print(f"  FAIL {code}: {e}", flush=True)
            failures.append(code)
    print(f"\nDone. failures={len(failures)}: {failures}", flush=True)
    if failures:
        sys.exit(1)

if __name__ == "__main__":
    main()
