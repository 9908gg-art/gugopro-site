from pathlib import Path
import json, concurrent.futures as cf
from openai import OpenAI
ROOT=Path(__file__).resolve().parents[1]; p=ROOT/'i18n'/'tutor-ui-catalog.json'; d=json.loads(p.read_text())
keys=['配額重置倒數：約','小時','分鐘','📚 未設定學習清單','次 / 剩餘','剩餘']
names={'zh-CN':'Simplified Chinese','en-US':'English','ja-JP':'Japanese','ko-KR':'Korean','fr-FR':'French','de-DE':'German','es-ES':'Spanish','th-TH':'Thai','vi-VN':'Vietnamese','id-ID':'Indonesian','pt-BR':'Brazilian Portuguese','it-IT':'Italian','ru-RU':'Russian','ar-SA':'Arabic','hi-IN':'Hindi','ms-MY':'Malay','nl-NL':'Dutch','pl-PL':'Polish','tr-TR':'Turkish'}
client=OpenAI()
def one(loc):
 r=client.chat.completions.create(model='gpt-5-mini',messages=[{'role':'system','content':'Translate UI fragments. Return JSON object with an items array of exactly six strings.'},{'role':'user','content':f'Translate into {names[loc]}: '+json.dumps(keys,ensure_ascii=False)}],response_format={'type':'json_schema','json_schema':{'name':'x','strict':True,'schema':{'type':'object','properties':{'items':{'type':'array','items':{'type':'string'},'minItems':6,'maxItems':6}},'required':['items'],'additionalProperties':False}}},max_completion_tokens=2000)
 return loc,json.loads(r.choices[0].message.content)['items']
with cf.ThreadPoolExecutor(max_workers=6) as ex:
 for loc,vals in ex.map(one,sorted(names)):
  for k,v in zip(keys,vals):d['translations'][loc][k]=v
for k in keys:d['translations']['zh-TW'][k]=k
d['items']=list(dict.fromkeys(d['items']+keys));p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');print('added',len(keys))
