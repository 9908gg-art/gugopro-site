import re

results = []

for name, path in [('amazon-us', 'amazon-us/index.html'), ('amazon-jp', 'amazon-jp/index.html')]:
    html = open(path, encoding='utf-8').read()
    checks = {
        'no document.write': 'document.write' not in html,
        'ga4 snippet': 'G-GF1DYLWMKX' in html and 'googletagmanager.com/gtag' in html,
        'fontawesome CDN': 'font-awesome/6' in html or 'fontawesome' in html,
        'responsive viewport meta': 'width=device-width' in html,
        'kofi button': 'ko-fi.com/R1K123XRS9' in html,
        'dynamic fetch json': 'fetch(' in html and 'amazon-categories.json' in html,
    }
    if name == 'amazon-us':
        checks['us domain'] = 'amazon.com/s?k=' in html
        checks['us tag'] = 'tag=9908qq-20' in html
        checks['jp keywords absent'] = 'keywords_jp' not in html
    else:
        checks['jp domain'] = 'amazon.co.jp/s?k=' in html
        checks['jp tag'] = 'tag=gugopro-22' in html
        checks['us keywords absent'] = 'keywords_us' not in html
    ok = all(checks.values())
    results.append((name, ok, checks))
    print(f'[{name}] {"PASS" if ok else "FAIL"}')
    for k, v in checks.items():
        if not v:
            print('  - missing:', k)

cats = open('data/amazon-categories.json', encoding='utf-8').read()
valid_json = True
try:
    import json
    json.loads(cats)
except Exception as e:
    valid_json = False
print('[amazon-categories.json] "PASS" if', valid_json)

tools = json.load(open('data/tools-list.json'))
us = [t for t in tools if t.get('id') == 'amazon-us-shop']
jp = [t for t in tools if t.get('id') == 'amazon-jp-shop']
print('[tools-list] amazon-us-shop:', bool(us), 'amazon-jp-shop:', bool(jp))
