from pathlib import Path
import json
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
changed=0
for path in sorted((ROOT/'tools').rglob('*.html')):
    if '/ai/' in path.as_posix() or '/ai-media/' in path.as_posix(): continue
    text=path.read_text(encoding='utf-8',errors='replace')
    soup=BeautifulSoup(text,'html.parser')
    if not soup.select_one('[data-seo-content]'): continue
    static=[]
    for tag in soup.find_all('script',type='application/ld+json'):
        try:
            d=json.loads(tag.string or '')
            static.extend(d.get('@graph',[d]) if isinstance(d,dict) else [])
        except Exception: pass
    if any(x.get('@type')=='FAQPage' for x in static): continue
    faq=soup.select_one('[data-seo-content] [data-locale-content="zh-TW"]') or soup.select_one('[data-seo-content]')
    entities=[]
    for detail in faq.find_all('details'):
        q,a=detail.find('summary'),detail.find('p')
        if q and a and q.get_text(' ',strip=True) and a.get_text(' ',strip=True):
            entities.append({'@type':'Question','name':q.get_text(' ',strip=True),'acceptedAnswer':{'@type':'Answer','text':a.get_text(' ',strip=True)}})
    if not entities: continue
    node=soup.new_tag('script',type='application/ld+json'); node['data-faq-schema']='true'
    node.string=json.dumps({'@context':'https://schema.org','@type':'FAQPage','mainEntity':entities},ensure_ascii=False)
    anchor=soup.find('script',attrs={'data-tool-seo-schema':True})
    (anchor or soup.body).insert_after(node) if anchor else soup.body.append(node)
    path.write_text(str(soup),encoding='utf-8'); changed+=1
print(f'faq_schema_added={changed}')
