from pathlib import Path
from xml.etree import ElementTree as ET
import re

root = Path(__file__).resolve().parents[1]
ET.parse(root / 'sitemap.xml')
files = list((root / 'academy').rglob('*.html')) + list((root / 'articles' / 'investment').glob('*.html'))
missing = []
for page in files:
    text = page.read_text(encoding='utf-8')
    for href in re.findall(r'href=["\']([^"\']+)["\']', text):
        if href.startswith(('http', '/', '#', 'mailto:', 'javascript:')):
            continue
        target = (page.parent / href.split('#')[0].split('?')[0]).resolve()
        if not target.exists():
            missing.append((str(page.relative_to(root)), href))
linked_lessons = [p for p in (root / 'articles' / 'investment').glob('[0-9][0-9]-*.html') if ('GugoPro Academy interactive lab' in p.read_text(encoding='utf-8') or 'portfolio-rebalancer' in p.read_text(encoding='utf-8'))]
if len(linked_lessons) != 14:
    raise SystemExit(f'expected 14 linked lessons, found {len(linked_lessons)}')
required = [
    'academy/index.html',
    'academy/lessons/15-retirement-cashflow.html',
    'academy/lessons/16-investor-behavior.html',
    'academy/tools/compound-interest.html',
    'academy/tools/portfolio-rebalancer.html',
    'academy/tools/portfolio-rebalancer.js',
    'academy/tools/portfolio-rebalancer.css',
    'articles/investment/03-asset-allocation-rebalancing.html',
    'academy/tools/margin-of-safety.html',
    'academy/tools/var-calculator.html',
    'academy/tools/retirement-cashflow.html',
    'academy/tools/retirement-cashflow.js',
    'academy/tools/retirement-cashflow.css',
    'academy/lessons/retirement-cashflow.css',
]
missing_required = [p for p in required if not (root / p).exists()]
print(f'academy_html={len(files)}')
print(f'missing_links={missing}')
print(f'missing_required={missing_required}')
print('sitemap_xml=ok')
if missing or missing_required:
    raise SystemExit(1)
