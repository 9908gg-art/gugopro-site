from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]/'i18n/nonai-visible-translations.json'
d=json.loads(p.read_text(encoding='utf-8'))
repl={
'盈透證券':'Interactive Brokers','盈透／Interactive Brokers':'Interactive Brokers','盈透':'Interactive Brokers',
'第一證券':'Firstrade','嘉信理財':'Charles Schwab','富台期':'Taiwan index futures',
'臺灣期貨交易所':'Taiwan Futures Exchange','台灣期貨交易所':'Taiwan Futures Exchange',
'勞退':'Labor Pension','勞保':'Labor Insurance','台積電':'Taiwan Semiconductor Manufacturing Company','聯發科':'MediaTek',
'群益台灣精選高息':'Capital Taiwan High-Yield Select','復華台灣科技優息':'Fuh Hwa Taiwan Technology Dividend',
'元大台灣50':'Yuanta Taiwan 50','萬用轉 PDF':'Universal PDF Converter','萬用 PDF':'Universal PDF',
'商城':'Store','第 N 頁':'page N','元':'yuan'
}
for k,v in list(d['en'].items()):
 for a,b in repl.items(): v=v.replace(a,b)
 d['en'][k]=v
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('updated',len(d['en']))
