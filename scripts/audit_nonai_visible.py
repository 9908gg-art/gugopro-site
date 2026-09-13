from pathlib import Path
from bs4 import BeautifulSoup
import json,re,collections
ROOT=Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'i18n/nonai-visible-translations.json').read_text())
for loc in ('en','ja'):
 rows=[]
 for p in sorted(ROOT.rglob('*.html')):
  if '.git' in p.parts or '/tools/ai/' in p.as_posix() or '/tools/ai-media/' in p.as_posix(): continue
  s=BeautifulSoup(p.read_text(encoding='utf-8',errors='ignore'),'html.parser')
  for n in s.find_all(string=True):
   if n.parent.name in {'script','style','noscript','template'} or n.parent.has_attr('data-i18n-ignore') or n.parent.name in {'title','meta'}: continue
   t=' '.join(n.split()).strip()
   if not t or len(t)<2 or not re.search(r'[\u3400-\u9fff]',t): continue
   # Source strings with mixed Chinese/English are high-priority: translations must remove CJK for en.
   v=m[loc].get(t)
   if not v or (loc=='en' and re.search(r'[\u3400-\u9fff]',v) and not re.search(r'[\u3040-\u30ff]',v)):
    rows.append((str(p.relative_to(ROOT)),t,v or '[MISSING]'))
 print(f'[{loc}] rows={len(rows)} unique={len(set(x[1] for x in rows))}')
 seen=set(); out=[]
 for r in rows:
  if r[1] not in seen: seen.add(r[1]); out.append(r)
 for p,t,v in out[:250]: print(p+'\t'+t+'\t=>\t'+v)
 print()
