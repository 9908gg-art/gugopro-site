from __future__ import annotations

import json
import subprocess
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path('/home/ubuntu/gugopro-site')
LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt']
URL = 'http://127.0.0.1:8127/academy/index.html?lang={}&qa=headless'
results = []
for locale in LOCALES:
    proc = subprocess.run([
        '/usr/bin/chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
        '--virtual-time-budget=3500', '--dump-dom', URL.format(locale)
    ], capture_output=True, text=True, timeout=30)
    html = proc.stdout
    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text(' ', strip=True)
    select = soup.select_one('#gugo-locale-select')
    options = [o.get('value') for o in select.find_all('option')] if select else []
    row = {
        'locale': locale,
        'returncode': proc.returncode,
        'htmlLang': soup.html.get('lang') if soup.html else None,
        'options': options,
        'courseCount': '22' in text,
        'toolCount': '19' in text,
        'category13': any(token in text for token in ('Category 13', '第13類', '第 13 類', '第13类', 'Practical trading', '實戰交易', '实战交易')),
        'translatedHero': any(token in text for token in ('Address market noise', '把市場雜訊', '把市场噪音', 'Traitez le bruit', 'Marktrauschen', 'Rumore del mercato', 'Ruído do mercado', '市場のノイズ')),
        'hasRuntime': any('gugopro-i18n.js' in (s.get('src') or '') for s in soup.find_all('script')),
        'stderrTail': proc.stderr[-400:] if proc.stderr else '',
    }
    results.append(row)
print(json.dumps({'results': results, 'allPassed': all(r['returncode']==0 and r['htmlLang']==locale and len(r['options'])==8 and r['courseCount'] and r['toolCount'] and r['category13'] and r['hasRuntime'] for r, locale in zip(results, LOCALES))}, ensure_ascii=False, indent=2))
if not all(r['returncode']==0 and r['htmlLang']==locale and len(r['options'])==8 and r['courseCount'] and r['toolCount'] and r['category13'] and r['hasRuntime'] for r, locale in zip(results, LOCALES)):
    raise SystemExit(1)
