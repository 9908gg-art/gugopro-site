from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlparse
from bs4 import BeautifulSoup

ROOT = Path('/home/ubuntu/gugopro-site')
PAGES = sorted(set((ROOT / 'academy').rglob('*.html')) | set((ROOT / 'articles' / 'investment').glob('*.html')))
LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt']
HREFLANG = {'zh-TW':'zh-Hant','zh-CN':'zh-Hans','en':'en','ja':'ja','de':'de','fr':'fr','es':'es','pt':'pt'}
source = json.loads((ROOT / 'i18n' / 'catalog.json').read_text(encoding='utf-8'))
source_ids = {str(x['id']) for x in source['strings']}
errors: list[str] = []
for locale in LOCALES:
    path = ROOT / 'i18n' / f'{locale}.json'
    if not path.exists(): errors.append(f'missing locale pack {locale}')
    else:
        data = json.loads(path.read_text(encoding='utf-8'))
        ids = set(data.get('translations', {}))
        if ids != source_ids: errors.append(f'{locale} ids {len(ids)} != {len(source_ids)}')
for locale in LOCALES:
    path = ROOT / 'i18n' / f'{locale}.dynamic.json'
    if not path.exists(): errors.append(f'missing dynamic pack {locale}')
    else:
        ids = set(json.loads(path.read_text(encoding='utf-8')).get('templates', {}))
        if not ids.issubset(source_ids): errors.append(f'{locale} dynamic ids outside source')
for page in PAGES:
    rel = page.relative_to(ROOT).as_posix()
    soup = BeautifulSoup(page.read_text(encoding='utf-8'), 'html.parser')
    html = soup.find('html')
    if not html or html.get('lang') != 'zh-TW': errors.append(f'{rel}: html lang is not zh-TW')
    scripts = [s.get('src','') for s in soup.find_all('script')]
    if not any('gugopro-i18n.js?v=20260827-i18n1' in src for src in scripts): errors.append(f'{rel}: missing versioned i18n runtime')
    if any(src.endswith('/academy.js') or src.endswith('academy.js') for src in scripts): errors.append(f'{rel}: unversioned academy.js')
    alt = {l.get('hreflang'): l.get('href') for l in soup.find_all('link', rel=lambda v: v and 'alternate' in v)}
    for locale, lang in HREFLANG.items():
        if lang not in alt: errors.append(f'{rel}: missing hreflang {lang}')
    if 'x-default' not in alt: errors.append(f'{rel}: missing x-default')
    expected_script = Path(__file__).parent.parent / 'i18n' / 'gugopro-i18n.js'
    if not expected_script.exists(): errors.append('missing i18n runtime file')
    # Only external links should remain external; i18n runtime itself is client-only and has no market endpoint.
    text = page.read_text(encoding='utf-8')
    if re.search(r'(WebSocket|wss://|fetch\s*\([^)]*(?:quote|market|price|candle|ticker))', text, re.I):
        errors.append(f'{rel}: unexpected market-data runtime marker')

for locale in LOCALES:
    data = json.loads((ROOT / 'i18n' / f'{locale}.json').read_text(encoding='utf-8'))
    if any(not isinstance(v, str) or not v.strip() for v in data['translations'].values()): errors.append(f'{locale}: empty translation value')

print(json.dumps({'pages': len(PAGES), 'sourceKeys': len(source_ids), 'locales': len(LOCALES), 'errors': errors}, ensure_ascii=False))
if errors:
    raise SystemExit(1)
