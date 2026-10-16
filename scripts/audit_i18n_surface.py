from pathlib import Path
from bs4 import BeautifulSoup
import json

ROOT = Path('/home/ubuntu/gugopro-site')
paths = sorted(set((ROOT/'academy').rglob('*.html')) | set((ROOT/'articles'/'investment').glob('*.html')))
rows = []
for path in paths:
    soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
    count = 0
    chars = 0
    attrs = 0
    for tag in soup.find_all(True):
        if tag.name in {'script','style','noscript','svg','path'}:
            continue
        if tag.find(True):
            continue
        text = ' '.join(tag.get_text(' ', strip=True).split())
        if text and len(text) >= 2:
            count += 1
            chars += len(text)
        for attr in ('placeholder','title','aria-label','alt','value'):
            value = tag.get(attr)
            if isinstance(value, str) and value.strip() and len(value.strip()) >= 2:
                attrs += 1
    rows.append({'path': str(path.relative_to(ROOT)), 'leaf_text_nodes': count, 'leaf_chars': chars, 'attrs': attrs, 'bytes': path.stat().st_size})
print(json.dumps({'pages': len(rows), 'total_leaf_text_nodes': sum(r['leaf_text_nodes'] for r in rows), 'total_leaf_chars': sum(r['leaf_chars'] for r in rows), 'total_attrs': sum(r['attrs'] for r in rows), 'rows': rows}, ensure_ascii=False, indent=2))
