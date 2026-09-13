from pathlib import Path
import json, concurrent.futures as cf, time
from openai import OpenAI
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'i18n'/'tutor-ui-catalog.json'; data=json.loads(p.read_text(encoding='utf-8'))
items=data['items']; names={'zh-CN':'Simplified Chinese','en-US':'English','ja-JP':'Japanese','ko-KR':'Korean','fr-FR':'French','de-DE':'German','es-ES':'Spanish','th-TH':'Thai','vi-VN':'Vietnamese','id-ID':'Indonesian','pt-BR':'Brazilian Portuguese','it-IT':'Italian','ru-RU':'Russian','ar-SA':'Arabic','hi-IN':'Hindi','ms-MY':'Malay','nl-NL':'Dutch','pl-PL':'Polish','tr-TR':'Turkish'}
client=OpenAI(); chunk_size=55

def batch(locale, start, chunk):
 source={str(i):v for i,v in enumerate(chunk, start)}
 prompt=f'Translate this JSON object of UI strings into {names[locale]}. Return a JSON object with exactly the same numeric keys and one value per key. Never omit or reorder keys. Preserve emojis, brands, punctuation and placeholders.\n{json.dumps(source,ensure_ascii=False)}'
 for attempt in range(3):
  try:
   r=client.chat.completions.create(model='gpt-5-mini',messages=[{'role':'system','content':'Precise software UI translator. JSON object only.'},{'role':'user','content':prompt}],response_format={'type':'json_object'},max_completion_tokens=9000)
   out=json.loads(r.choices[0].message.content)
   if set(out)==set(source) and all(isinstance(v,str) for v in out.values()): return out
  except Exception as e:
   if attempt==2: raise
  time.sleep(1)
 raise ValueError(f'{locale} chunk {start} invalid')

def locale_job(locale):
 out={}
 for start in range(0,len(items),chunk_size): out.update(batch(locale,start,items[start:start+chunk_size]))
 return locale,{items[int(k)]:v for k,v in out.items()}

with cf.ThreadPoolExecutor(max_workers=3) as ex:
 futures={ex.submit(locale_job,l):l for l in sorted(names)}
 for f in cf.as_completed(futures):
  loc,mapping=f.result(); data['translations'][loc]=mapping; p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8'); print('repaired',loc,flush=True)
data['translations']['zh-TW']={k:k for k in items}; p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('complete',len(data['translations']),len(items))
