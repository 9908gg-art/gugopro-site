from datetime import date
from pathlib import Path
from urllib.parse import quote
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://gugopro.com/'
TODAY = date.today().isoformat()
EXCLUDED_PAGES = {
    '404.html',
    'googled0dfad57039c64f6.html',  # Keep the GSC verification asset on the site, but never list it.
}
# Keep public HTML pages, excluding internal reports, test artifacts and locale
# directories that no longer exist after the non-AI three-locale consolidation.
files = []
for p in ROOT.rglob('*.html'):
    if '.git' in p.parts or 'audit-screenshots' in p.parts or 'artifacts' in p.parts:
        continue
    rel = p.relative_to(ROOT).as_posix()
    if rel in EXCLUDED_PAGES:
        continue
    files.append(rel)
files = sorted(set(files))
rows = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for rel in files:
    # The canonical Traditional Chinese home is the domain root, not /index.html.
    loc = BASE if rel == 'index.html' else BASE + quote(rel, safe='/')
    rows += [f'  <url><loc>{loc}</loc><lastmod>{TODAY}</lastmod></url>']
rows.append('</urlset>')
(ROOT / 'sitemap.xml').write_text('\n'.join(rows) + '\n', encoding='utf-8')
print(f'sitemap_urls={len(files)} lastmod={TODAY}')
