#!/usr/bin/env python3
from pathlib import Path
from bs4 import BeautifulSoup
import json,re,time,os
from concurrent.futures import ThreadPoolExecutor, as_completed
from openai import OpenAI
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'i18n/nonai-visible-translations.json'; TMP=OUT.with_suffix('.tmp.json')
cat=json.loads((ROOT/'i18n/catalog.json').read_text(encoding='utf-8'))
texts=set()
for p in ROOT.rglob('*.html'):
 if '.git' in p.parts or 'tools/ai/' in p.as_posix() or 'tools/ai-media/' in p.as_posix(): continue
 soup=BeautifulSoup(p.read_text(encoding='utf-8',errors='ignore'),'html.parser')
 for n in soup.find_all(string=True):
  if n.parent.name in {'script','style','noscript','template'} or n.parent.has_attr('data-i18n-ignore'): continue
  t=' '.join(n.split()).strip()
  if len(t)>=2 and re.search(r'[\u3400-\u9fff]',t): texts.add(t)
existing=json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {'en':{},'ja':{}}
need=[t for t in sorted(texts) if not existing.get('en',{}).get(t) or not existing.get('ja',{}).get(t) or re.search(r'[\u3400-\u9fff]',str(existing.get('en',{}).get(t,'')))]
client=OpenAI()
def batch(start,items):
 payload='\n'.join(f'{i}\t{s}' for i,s in enumerate(items))
 prompt='Translate each Traditional Chinese UI/content string into natural complete English and Japanese. Preserve HTML tags, placeholders, punctuation, numbers, units, keyboard shortcuts and product names. Output only JSON mapping numeric indexes to {"en": string, "ja": string}. Do not leave Chinese except proper nouns.\n'+payload
 last=''
 for attempt in range(1,6):
  try:
   r=client.chat.completions.create(model='gpt-5-nano',max_completion_tokens=3000,messages=[{'role':'system','content':'You are a professional software UI translator. Output only valid JSON.'},{'role':'user','content':prompt}],response_format={'type':'json_object'})
   content=r.choices[0].message.content if r.choices else None
   if not content: raise RuntimeError('empty model content')
   data=json.loads(content)
   if not isinstance(data,dict) or len(data)<len(items): raise RuntimeError(f'incomplete response {len(data)}/{len(items)}')
   return start,items,data
  except Exception as e:
   last=str(e); print('retry',start,attempt,last,flush=True); time.sleep(attempt)
 raise RuntimeError(f'batch {start} failed after retries: {last}')
def save(data):
 TMP.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); os.replace(TMP,OUT)
if need:
 batches=[(start,need[start:start+10]) for start in range(0,len(need),10)]
 with ThreadPoolExecutor(max_workers=3) as ex:
  fs={ex.submit(batch,start,items):(start,items) for start,items in batches}; done=0
  for f in as_completed(fs):
   start,items,data=f.result()
   for idx,v in data.items():
    try:i=int(idx)
    except:continue
    if 0<=i<len(items) and isinstance(v,dict) and v.get('en') and v.get('ja'):
     existing['en'][items[i]]=v['en']; existing['ja'][items[i]]=v['ja']
   save(existing); done+=len(items); print('checkpoint',done,'/',len(need),flush=True)
print('translated_remaining',len(need),'total',len(existing['en']))
