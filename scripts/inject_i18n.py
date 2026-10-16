from pathlib import Path
from bs4 import BeautifulSoup
import json
import os

ROOT = Path('/home/ubuntu/gugopro-site')
PAGES = sorted(set((ROOT / 'academy').rglob('*.html')) | set((ROOT / 'articles' / 'investment').glob('*.html')))
CACHE_VERSION = '20260827-i18n1'
LOCALES = {
    'zh-TW': 'zh-Hant',
    'zh-CN': 'zh-Hans',
    'en': 'en',
    'ja': 'ja',
    'de': 'de',
    'fr': 'fr',
    'es': 'es',
    'pt': 'pt',
}
BASE = 'https://gugopro.com/'
changed = []
for path in PAGES:
    soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
    html = soup.find('html')
    if html:
        html['lang'] = 'zh-TW'
    rel = str(path.relative_to(ROOT)).replace(os.sep, '/')
    for link in soup.find_all('link', rel=lambda value: value and 'alternate' in value):
        link.decompose()
    for locale, hreflang in LOCALES.items():
        link = soup.new_tag('link', rel='alternate', hreflang=hreflang)
        href = BASE + rel
        if locale != 'zh-TW':
            href += '?lang=' + locale
        link['href'] = href
        soup.head.append(link)
    xdefault = soup.new_tag('link', rel='alternate', hreflang='x-default')
    xdefault['href'] = BASE + rel
    soup.head.append(xdefault)
    rel_script = os.path.relpath(ROOT / 'i18n' / 'gugopro-i18n.js', path.parent).replace(os.sep, '/')
    versioned_i18n = rel_script + '?v=' + CACHE_VERSION
    for script in soup.find_all('script'):
        src = script.get('src', '')
        if src.split('?', 1)[0] == rel_script:
            script['src'] = versioned_i18n
            script['defer'] = ''
            script['data-gugopro-i18n'] = 'true'
    if not soup.find('script', src=versioned_i18n):
        script = soup.new_tag('script', src=versioned_i18n, defer=True)
        script['data-gugopro-i18n'] = 'true'
        soup.body.append(script)
    academy_js = os.path.relpath(ROOT / 'academy' / 'academy.js', path.parent).replace(os.sep, '/')
    for script in soup.find_all('script'):
        src = script.get('src', '')
        if src.split('?', 1)[0] == academy_js:
            script['src'] = academy_js + '?v=' + CACHE_VERSION
    path.write_text(str(soup), encoding='utf-8')
    changed.append(rel)
print(json.dumps({'pages': len(changed), 'runtime': 'i18n/gugopro-i18n.js', 'locales': list(LOCALES)}, ensure_ascii=False))
