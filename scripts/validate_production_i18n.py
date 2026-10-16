from __future__ import annotations

import json
import subprocess
from bs4 import BeautifulSoup

LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt']
BASE = 'https://gugopro.com/academy/index.html?lang={}&qa=1219798'
results = []
for locale in LOCALES:
    command = [
        '/usr/bin/chromium', '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
        '--disable-background-networking', '--no-first-run', '--no-default-browser-check',
        '--virtual-time-budget=3500', '--dump-dom', BASE.format(locale)
    ]
    try:
        proc = subprocess.run(command, capture_output=True, text=True, timeout=90)
    except subprocess.TimeoutExpired:
        proc = subprocess.run(command[:-3] + ['--virtual-time-budget=1500', '--dump-dom', BASE.format(locale)], capture_output=True, text=True, timeout=90)
    soup = BeautifulSoup(proc.stdout, 'html.parser')
    text = soup.get_text(' ', strip=True)
    select = soup.select_one('#gugo-locale-select')
    options = [o.get('value') for o in select.find_all('option')] if select else []
    result = {
        'locale': locale,
        'returncode': proc.returncode,
        'htmlLang': soup.html.get('lang') if soup.html else None,
        'title': soup.title.get_text(' ', strip=True) if soup.title else '',
        'options': len(options),
        'courseCount': '22' in text,
        'toolCount': '19' in text,
        'category13': any(x in text for x in ('Category 13', '第 13 類', '第13類', '第13类', 'Practical trading', '實戰交易', '实战交易')),
        'runtime': any('gugopro-i18n.js?v=20260827-i18n1' in (s.get('src') or '') for s in soup.find_all('script')),
        'resourceHints': all(('gugopro.com/i18n/' + name) in proc.stdout for name in ('catalog.json', f'{locale}.json')),
    }
    results.append(result)
passed = all(r['returncode'] == 0 and r['htmlLang'] == r['locale'] and r['options'] == 8 and r['courseCount'] and r['toolCount'] and r['category13'] and r['runtime'] for r in results)
print(json.dumps({'results': results, 'allPassed': passed}, ensure_ascii=False, indent=2))
if not passed:
    raise SystemExit(1)
