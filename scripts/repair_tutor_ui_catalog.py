from pathlib import Path
import json, concurrent.futures as cf
from openai import OpenAI
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'i18n'/'tutor-ui-catalog.json'; data=json.loads(p.read_text(encoding='utf-8'))
items=data['items']; source={str(i):v for i,v in enumerate(items)}
names={'zh-CN':'Simplified Chinese','en-US':'English','ja-JP':'Japanese','ko-KR':'Korean','fr-FR':'French','de-DE':'German','es-ES':'Spanish','th-TH':'Thai','vi-VN':'Vietnamese','id-ID':'Indonesian','pt-BR':'Brazilian Portuguese','it-IT':'Italian','ru-RU':'Russian','ar-SA':'Arabic','hi-IN':'Hindi','ms-MY':'Malay','nl-NL':'Dutch','pl-PL':'Polish','tr-TR':'Turkish'}
client=OpenAI()
def one(locale):
 prompt=f'''Translate this JSON object of tutor web UI strings into {names[locale]}. Return a JSON object with exactly the same numeric string keys and one translated string value for every key. Never reorder, omit, merge, or invent keys. Preserve brand names, emojis, punctuation, placeholders, and concise UI length.\nSOURCE JSON:\n{json.dumps(source,ensure_ascii=False)}'''
 r=client.chat.completions.create(model='gpt-5-mini',messages=[{'role':'system','content':'You are a meticulous software UI translator. Output JSON object only.'},{'role':'user','content':prompt}],response_format={'type':'json_object'},max_completion_tokens=30000)
 out=json.loads(r.choices[0].message.content)
 if set(out)!=set(source) or any(not isinstance(out[k],str) for k in source): raise ValueError(f'{locale}: invalid keys {len(out)} expected {len(source)}')
 return locale,out
with cf.ThreadPoolExecutor(max_workers=4) as ex:
 for loc,out in ex.map(one,sorted(names)):
  data['translations'][loc]={items[int(k)]:v for k,v in out.items()}
  print('repaired',loc,flush=True)
data['translations']['zh-TW']={k:k for k in items}
p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('repaired catalog',len(data['translations']),'locales x',len(items),'strings')
