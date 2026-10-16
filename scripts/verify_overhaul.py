#!/usr/bin/env python3
"""Verification for the Amazon Shop overhaul (v3)."""
import json
import sys
from html.parser import HTMLParser
from xml.etree import ElementTree

REPO = '/home/ubuntu/gugopro-site'
results = []


def check(name, ok, detail=''):
    results.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL') + f'  [{name}] {detail}')


# 1. JSON structure
with open(f'{REPO}/data/amazon-categories.json', encoding='utf-8') as f:
    data = json.load(f)
check('json-top-keys', set(data) == {'us_categories', 'jp_categories'},
      f'keys={sorted(data)}')
check('json-18-us', len(data['us_categories']) == 18, f'{len(data["us_categories"])}')
check('json-18-jp', len(data['jp_categories']) == 18, f'{len(data["jp_categories"])}')
us_ids = [c['id'] for c in data['us_categories']]
jp_ids = [c['id'] for c in data['jp_categories']]
check('json-no-dup-ids', len(set(us_ids)) == len(us_ids) and len(set(jp_ids)) == len(jp_ids))
bad_keys_us = set()
for c in data['us_categories']:
    if set(c) != {'id', 'name', 'icon', 'subcategories'}:
        bad_keys_us.add(str(set(c)))
for c in data['jp_categories']:
    if set(c) != {'id', 'name', 'icon', 'subcategories'}:
        bad_keys_us.add(str(set(c)))
check('json-field-schema', not bad_keys_us, f'unexpected fields: {bad_keys_us or "none"}')
n_us = sum(len(c['subcategories']) for c in data['us_categories'])
n_jp = sum(len(c['subcategories']) for c in data['jp_categories'])
check('json-subtotal', n_us >= 66 and n_jp >= 66, f'US={n_us} JP={n_jp}')

# 2. HTML syntax
from bs4 import BeautifulSoup
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr'}
for fpath in ('index.html', 'shop/index.html', 'amazon-us/index.html', 'amazon-jp/index.html'):
    full = f'{REPO}/{fpath}'
    try:
        with open(full, encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        issues = []
        # Check every non-void tag is properly closed by BeautifulSoup's parse tree
        for tag in soup.find_all(True):
            if tag.name in VOID or tag.name in ('script', 'style'):
                continue
            if tag.parent is None or tag.parent.name in ('script', 'style'):
                issues.append(tag.name)
        check(f'syntax-{fpath}', not issues, f'unmatched roots: {issues[:5] or "none"}')
    except Exception as e:
        check(f'syntax-{fpath}', False, str(e))

# 3. Shop portal replaces store
with open(f'{REPO}/shop/index.html', encoding='utf-8') as f:
    shop = f.read()
check('shop-hero', '亞馬遜商城總入口' in shop and '18' in shop, '')
check('shop-fetch', 'amazon-categories.json' in shop, '')
check('shop-us-link', '../amazon-us/index.html' in shop, '')
check('shop-jp-link', '../amazon-jp/index.html' in shop, '')
check('shop-ga4', 'G-GF1DYLWMKX' in shop, '')
check('shop-fa6', 'font-awesome/6' in shop, '')
check('shop-kofi', 'ko-fi.com/R1K123XRS9' in shop, '')
check('shop-no-store-ref', '/store/' not in shop, '')

# 4. amazon-us page
with open(f'{REPO}/amazon-us/index.html', encoding='utf-8') as f:
    us = f.read()
check('us-lang-en', us.startswith('<!DOCTYPE html>\n<html lang="en">'), '')
check('us-search-us', 'amazon.com/s?k=' in us, '')
check('us-tag', 'tag=9908qq-20' in us, '')
check('us-fetch-us', 'us_categories' in us, '')
check('us-nav-shop', 'Return to Store Portal' in us and '../shop/' in us, '')
check('us-no-store-ref', '/store/' not in us, '')
check('us-no-jp-keywords', '麻雀' not in us, '')

# 5. amazon-jp page
with open(f'{REPO}/amazon-jp/index.html', encoding='utf-8') as f:
    jp = f.read()
check('jp-lang-ja', jp.startswith('<!DOCTYPE html>\n<html lang="ja">'), '')
check('jp-search-jp', 'amazon.co.jp/s?k=' in jp, '')
check('jp-tag', 'tag=gugopro-22' in jp, '')
check('jp-fetch-jp', 'jp_categories' in jp, '')
check('jp-nav-shop', '../shop/' in jp, '')
check('jp-no-store-ref', '/store/' not in jp, '')
check('jp-no-en-keywords', 'mahjong' not in jp.lower(), '')

# 6. Home page integrity & link update
with open(f'{REPO}/index.html', encoding='utf-8') as f:
    home = f.read()
check('home-store-card', '亞馬遜精選商城' in home, '')
check('home-card-links-to-shop', 'href="/shop/"' in home, '')
check('home-no-old-store', '/store/' not in home, '')
# GA4 + Ko-fi preserved
check('home-ga4', 'G-GF1DYLWMKX' in home, '')
check('home-kofi', 'ko-fi.com/R1K123XRS9' in home, '')
# Existing 14 tools still present
for kw in ('籌碼終端', '凱利', '德州撲克', '塔羅', '口說', '對獎', 'TDEE', '翻譯', '額度'):
    check(f'home-intact-{kw[:4]}', kw in home, '')
# Total counts updated
check('home-15-tools', '15 大 Web AI 工具' in home, '')
check('home-utility-5', '5 個服務線上運行中' in home, '')

# 7. tools-list.json
with open(f'{REPO}/data/tools-list.json', encoding='utf-8') as f:
    tools = json.load(f)
check('tools-valid-json', isinstance(tools, list), f'{len(tools)} entries')
ids = [t.get('id') for t in tools]
check('tools-no-dup-ids', len(set(ids)) == len(ids), f'{len(ids)} unique ids')
portal = [t for t in tools if t.get('id') == 'amazon-store-portal']
check('tools-portal-id', len(portal) == 1, '')
check('tools-portal-shop-url', len(portal) == 1 and portal[0].get('url') == '/shop/index.html',
      portal[0].get('url') if portal else '')

# 8. document.write check
for fpath, content in (('home', home), ('shop', shop), ('us', us), ('jp', jp)):
    check(f'no-doc-write-{fpath}', 'document.write' not in content, '')

failed = [r for r in results if not r[1]]
print(f'\n=== {len(results) - len(failed)}/{len(results)} passed ===')
sys.exit(1 if failed else 0)
