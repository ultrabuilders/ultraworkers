import re, sys, os
def rows(path, section=None):
    t = open(path, encoding="utf-8").read()
    if section:
        i = t.find(section)
        if i < 0: return None, t
        t = t[i:]
    out = []
    for l in t.split("\n"):
        if not l.startswith("| "): continue
        if re.match(r"^\| *[-: |]+\|?$", l): continue        # dòng phân cách
        first = l.split("|")[1].strip().lower()
        if first in ("", "work item", "work item / sóng", "sóng", "#"): continue
        out.append(l)
    return len(out), t
MD = "/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/m5-md"
n1, _ = rows(f"{MD}/90-back1.md", "## Bảng quyết định")
n2, _ = rows(f"{MD}/90-back1.md", "## Rủi ro")
na, _ = rows(f"{MD}/90-back2a.md")
nb, _ = rows(f"{MD}/90-back2b.md")
n3, _ = rows(f"{MD}/90-back3.md")
print(f"  rủi ro           : {n2}")
print(f"  quyết định       : {n1}  (kỳ vọng 69)")
print(f"  đính chính a+b   : {na} + {nb} = {na+nb}  (kỳ vọng 143)")
print(f"  hoàn thành       : {n3}  (kỳ vọng 16)")
