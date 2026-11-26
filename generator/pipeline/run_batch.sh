#!/bin/bash
# Autonomous supervisor: keeps the specialty batch alive until all done.
cd /home/user/pipeline
LOG=/home/user/pipeline/batch_log.txt
pip install -q pymupdf python-docx reportlab arabic-reshaper python-bidi fonttools 2>/dev/null
PASS=0
while [ $PASS -lt 5 ]; do
  echo "===== SUPERVISOR pass $PASS $(date -u +%H:%M:%S) =====" | tee -a $LOG
  python3 -u auto_specialty.py --all 2>&1 | tee -a $LOG
  REM=$(python3 - <<'PYEOF'
import re
queue = [c.strip() for c in open('/home/user/pipeline/queue.txt') if c.strip()]
txt = open('/home/user/روابط التحميل.md', encoding='utf-8').read()
done = set(re.findall(r'\*\*([A-Z]+\d+[A-Z]?) ', txt))
print(len([c for c in queue if c not in done]))
PYEOF
)
  echo "===== SUPERVISOR: $REM remaining =====" | tee -a $LOG
  if [ "$REM" -eq 0 ]; then echo "ALL SPECIALTIES DONE" | tee -a $LOG; break; fi
  PASS=$((PASS+1))
  sleep 5
done
