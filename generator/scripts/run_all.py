# -*- coding: utf-8 -*-
"""Build all 10 subjects: MC1..MC5, MQ1..MQ5 — one combined memo file per subject."""
import sys
sys.path.insert(0, "/home/user/pipeline")

from generate_all import build_subject
from content_a import LESSONS_A
from content_b import LESSONS_B
from content_mc import MC2, MC3, MC4, MC5
from content_mq1 import MQ1
from content_mq2 import MQ2
from content_mq3 import MQ3
from content_mq45 import MQ4, MQ5

MC1 = {
 "code": "MC1", "file": "MC1 Reseau informatique", "name_fr": "Réseau informatique",
 "name_ar": "شبكات معلوماتية", "cat": "Complémentaire (MC)",
 "competency": "يُدرك المتربص مبادئ الشبكات الحاسوبية ويركّبها ويهيّئها.",
 "img_dir": "/home/user/MC1 Reseau informatique/images",
 "total_h": 51,
 "lessons": LESSONS_A + LESSONS_B,
}

SUBJECTS = [MC1, MC2, MC3, MC4, MC5, MQ1, MQ2, MQ3, MQ4, MQ5]

if __name__ == "__main__":
    only = sys.argv[1:] if len(sys.argv) > 1 else None
    for subj in SUBJECTS:
        if only and subj['code'] not in only:
            continue
        print(f"===== {subj['code']} {subj['name_fr']}")
        build_subject(subj)
    print("ALL DONE")
