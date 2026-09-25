from pathlib import Path
import re, json
ROOT=Path(__file__).parent/'fixtures'
def clock(v):
 p=v.split(':'); p=[int(x) for x in p]; return p[-1]+60*p[-2]+(3600*p[-3] if len(p)==3 else 0)
def clean(x): return re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',x.replace('&nbsp;',' ').replace('&amp;','&'))).strip()
def rows(text):
 out=[]; cur=None
 for raw in text.splitlines():
  line=raw.strip(); m=re.match(r'^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$',line)
  if m:
   if cur: out.append(cur)
   cur={'start':clock(m.group(1)),'text':clean(m.group(2))}
  elif cur and line and not line.startswith('#') and not re.match(r'^(Source video:|Language:|Other available|To request|Interactive version)',line): cur['text']=clean(cur['text']+' '+line)
 if cur: out.append(cur)
 return out
def split(text):
 text=clean(text); parts=re.findall(r'[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$',text)
 return [x.strip() for x in parts if x.strip()]
def norm(x): return re.sub(r'[^\w]+','',x.lower(),flags=re.UNICODE)
def segment(rs):
 out=[]; coverage=[]
 for i,r in enumerate(rs):
  end=max(rs[i+1]['start'] if i+1<len(rs) else r['start']+30,r['start']+.1); ps=split(r['text']); total=max(len(r['text']),1); cur=r['start']
  coverage.append((norm(r['text']),norm(' '.join(ps))))
  for j,p in enumerate(ps):
   nxt=end if j==len(ps)-1 else min(end,cur+(end-r['start'])*len(p)/total)
   out.append({'start':round(cur,3),'end':round(max(cur+.1,nxt),3),'text':p}); cur=nxt
 return out,coverage
all_report=[]
for vid in ['xUZYy3hCRUM','g5Vd0-y3rG8']:
 en=rows((ROOT/f'{vid}-en.md').read_text()); zh=rows((ROOT/f'{vid}-zh-TW.md').read_text()); caps,cov=segment(en)
 errors=[]
 for a,b in cov:
  if a!=b: errors.append('text-loss')
 for i,c in enumerate(caps):
  if not c['text'] or c['end']<=c['start']: errors.append('invalid-cue')
  if i and c['start']<caps[i-1]['start']: errors.append('non-monotonic')
 report={'video':vid,'sourceRowsEn':len(en),'sourceRowsZh':len(zh),'segments':len(caps),'textCoverageErrors':sum(x=='text-loss' for x in errors),'invalidCueErrors':sum(x in ('invalid-cue','non-monotonic') for x in errors),'first':caps[:3],'timingQuality':'estimated'}
 all_report.append(report); print(json.dumps(report,ensure_ascii=False))
assert all(x['segments']>0 and x['textCoverageErrors']==0 and x['invalidCueErrors']==0 for x in all_report)
print('PASS: structural segmentation, text conservation, and monotonic timing')
print('NOTE: timingQuality=estimated; no public word-level timestamps were available for these videos.')
