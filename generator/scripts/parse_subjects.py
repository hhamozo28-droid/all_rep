# -*- coding: utf-8 -*-
"""Parse the 9 uploaded memo PDFs into structured subject/session data."""
import re, json, glob, os

def norm(t):
    return re.sub(r'\s+', ' ', t).strip()

subjects = []
for f in sorted(glob.glob('/home/user/extract_*.txt')):
    name = os.path.basename(f)[8:-4]
    if name == 'MC1_Reseauinformatique':
        continue
    raw = open(f).read()
    txt = norm(raw)

    subj = {'file': name}

    m = re.search(r'المادة\s+([A-Z]{2}\d+)\s+(.+?)\s+الفئة', txt)
    if m:
        subj['code'] = m.group(1)
        subj['short'] = m.group(2).strip()
    m = re.search(r'الفئة:\s*([A-Za-z() ]+)\|', txt)
    if m:
        subj['cat'] = m.group(1).strip()
    m = re.search(r'الحجم\s*:\s*(\d+)\s*سا', txt)
    if m:
        subj['total_h'] = int(m.group(1))
    m = re.search(r'الكفاءة المستهدفة:\s*(.+?)\s*الوضعية الإدماجية', txt.replace('اإل','ال').replace('اإل','ال'))
    # Arabic text is jumbled; capture raw and clean later
    m = re.search(r'الكفاءة المستهدفة:\s*(.{20,260}?)\s*الوضعية', txt)
    if m:
        subj['competency_raw'] = m.group(1)
    m = re.search(r'الوضعية الإدماجية:\s*(.{5,200}?)\s*📝', txt)
    if m:
        subj['integration_raw'] = m.group(1)

    # sessions
    cards = re.split(r'بطاقة الحصة التقنية\s*—\s*الحصة رقم\s*(\d+)', txt)
    sessions = []
    for i in range(1, len(cards) - 1, 2):
        num = int(cards[i])
        body = cards[i + 1]
        s = {'num': num}
        m = re.search(r'عنوان درس الحصة(.+?)رقم الحصة', body)
        if m:
            s['title'] = norm(m.group(1))
        m = re.search(r'المدة الزمنية\s*(\d+)\s*\+\s*سا نظري\s*(\d+)\s*=\s*سا تطبيقي\s*(\d+)\s*سا', body)
        if not m:
            m = re.search(r'المدة الزمنية\s*(\d+).*?نظري\s*(\d+).*?تطبيقي\s*(\d+)\s*سا', body)
        if m:
            s['th'] = int(m.group(1)); s['tp'] = int(m.group(2)); s['total'] = int(m.group(3))
        m = re.search(r'نوع الحصة\s*([A-Za-zÉé+ ]+?)\s*الغرض', body)
        if m:
            s['type'] = norm(m.group(1))
        m = re.search(r'أدوات التقييم\s*(.+?)\s*الوسائل', body)
        if m:
            s['eval_tool'] = norm(m.group(1))
        m = re.search(r'الوسائل\s*(.+?)\s*🔄', body)
        if m:
            s['tools'] = norm(m.group(1))
        sessions.append(s)
    subj['sessions'] = sessions
    subjects.append(subj)

json.dump(subjects, open('/home/user/subjects.json', 'w'), ensure_ascii=False, indent=1)

for s in subjects:
    print(f"\n===== {s.get('code','?')} {s.get('short','?')} | {s.get('total_h','?')}h | cat={s.get('cat','?')}")
    print("  competency_raw:", s.get('competency_raw', '')[:90])
    print("  integration_raw:", s.get('integration_raw', '')[:90])
    for ses in s['sessions']:
        print(f"   [{ses.get('num')}] th={ses.get('th')} tp={ses.get('tp')} type={ses.get('type','?')!r} | {ses.get('title','?')}")
        print(f"        eval={ses.get('eval_tool','?')} | tools={ses.get('tools','?')}")
