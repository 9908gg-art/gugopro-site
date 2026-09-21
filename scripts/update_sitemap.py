from pathlib import Path
import re
from datetime import date
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'sitemap.xml'
raw=p.read_text(encoding='utf-8')
existing=set(re.findall(r'<loc>([^<]+)</loc>',raw))
new=[]
for f in sorted(ROOT.glob('*/legal/*.html')):
    url='https://gugopro.com/'+str(f.relative_to(ROOT)).replace('\\','/')
    if url not in existing:
        new.append(f'  <url><loc>{url}</loc><lastmod>{date.today().isoformat()}</lastmod></url>')
if new:
    raw=raw.replace('</urlset>','\n'+'\n'.join(new)+'\n</urlset>')
    p.write_text(raw,encoding='utf-8')
print(f'added {len(new)} legal sitemap URLs')
