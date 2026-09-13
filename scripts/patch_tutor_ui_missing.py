from pathlib import Path
import json, concurrent.futures as cf
from openai import OpenAI
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'i18n'/'tutor-ui-catalog.json'
data=json.loads(path.read_text(encoding='utf-8'))
keys=['介面語言','介面語言會套用到導師所有選單、按鈕、設定、教材與學習面板。','語音操作','👋 歡迎使用 AI 語言導師！']
langs={k for k in data['translations'] if k!='zh-TW'}
names={'zh-CN':'Simplified Chinese','en-US':'English','ja-JP':'Japanese','ko-KR':'Korean','fr-FR':'French','de-DE':'German','es-ES':'Spanish','th-TH':'Thai','vi-VN':'Vietnamese','id-ID':'Indonesian','pt-BR':'Brazilian Portuguese','it-IT':'Italian','ru-RU':'Russian','ar-SA':'Arabic','hi-IN':'Hindi','ms-MY':'Malay','nl-NL':'Dutch','pl-PL':'Polish','tr-TR':'Turkish'}
client=OpenAI()
def one(locale):
 prompt='Translate these four UI strings into '+names[locale]+'. Return exactly four strings in order, as a JSON array only. Preserve emoji.\n'+json.dumps(keys,ensure_ascii=False)
 r=client.chat.completions.create(model='gpt-5-mini',messages=[{'role':'system','content':'You are a precise UI translator. Output JSON array only.'},{'role':'user','content':prompt}],response_format={'type':'json_schema','json_schema':{'name':'translations','strict':True,'schema':{'type':'object','properties':{'items':{'type':'array','items':{'type':'string'},'minItems':4,'maxItems':4}},'required':['items'],'additionalProperties':False}}},max_completion_tokens=2000)
 return locale,json.loads(r.choices[0].message.content)['items']
with cf.ThreadPoolExecutor(max_workers=6) as ex:
 for locale,vals in ex.map(one,sorted(langs)):
  for k,v in zip(keys,vals): data['translations'][locale][k]=v
for k in keys: data['translations']['zh-TW'][k]=k
data['items']=list(dict.fromkeys(data['items']+keys))
path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('patched',len(keys),'keys across',len(data['translations']),'locales')
