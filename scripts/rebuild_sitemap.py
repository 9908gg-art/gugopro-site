from datetime import date
from pathlib import Path
from urllib.parse import quote
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://gugopro.com/'
TODAY = date.today().isoformat()
# Keep public HTML pages, excluding internal reports, test artifacts and locale
# directories that no longer exist after the non-AI three-locale consolidation.
files = []
for p in ROOT.rglob('*.html'):
    if '.git' in p.parts or 'audit-screenshots' in p.parts or 'artifacts' in p.parts:
        continue
    files.append(p.relative_to(ROOT).as_posix())
files = sorted(set(files))
rows = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for rel in files:
    loc = BASE + quote(rel, safe='/')
    rows += [f'  <url><loc>{loc}</loc><lastmod>{TODAY}</lastmod></url>']
rows.append('</urlset>')
(ROOT / 'sitemap.xml').write_text('\n'.join(rows) + '\n', encoding='utf-8')
print(f'sitemap_urls={len(files)} lastmod={TODAY}')
