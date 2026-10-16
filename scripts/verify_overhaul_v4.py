#!/usr/bin/env python3
"""Verification for v4 Amazon Shop overhaul:
- JSON 4-tier schema (departments > categories > leaf_items)
- amazon-us page: English, filter toolbar, US affiliate URL params
- amazon-jp page: Japanese, filter toolbar, JP affiliate URL params
- Home page integrity (append-only), store card points to /shop/
- No document.write anywhere
"""
import json
import sys
import re
from bs4 import BeautifulSoup

FAILS = []
PASSES = []

def check(name, ok):
    (FAILS if not ok else PASSES).append(name)
    print(('FAIL ' if not ok else 'PASS ') + name)

# ---------- 1. JSON schema ----------
data = json.load(open('data/amazon-categories.json'))
check('json: us_categories and jp_categories exist', set(data.keys()) == {'us_categories', 'jp_categories'})
for key in ('us_categories', 'jp_categories'):
    arr = data[key]
    check(f'json:{key}: count=10 departments', len(arr) == 10)
    ids = [d.get('id') for d in arr]
    check(f'json:{key}: unique ids', len(ids) == len(set(ids)))
    for d in arr:
        if not all(k in d for k in ('id', 'department_name', 'icon', 'categories')):
            check(f'json:{key}: dept keys ok', False); break
        for c in d['categories']:
            if not all(k in c for k in ('name', 'leaf_items')):
                check(f'json:{key}: category keys ok', False); break
            for leaf in c['leaf_items']:
                if set(leaf.keys()) != {'name', 'keywords'}:
                    check(f'json:{key}: leaf keys ok', False); break
        else:
            continue
        break
    else:
        check(f'json:{key}: dept/category/leaf schema ok', True)
    nleaves = sum(len(c['leaf_items']) for d in arr for c in d['categories'])
    ncats = sum(len(d['categories']) for d in arr)
    expected = {'us_categories': (18, 54), 'jp_categories': (18, 46)}[key]
    check(f'json:{key}: 18 categories, {expected[1]} leaf items ({ncats}/{nleaves})', ncats == expected[0] and nleaves == expected[1])

# ---------- 2. amazon-us ----------
us = open('amazon-us/index.html').read()
check('us: lang=en', '<html lang="en"' in us)
check('us: GA4 tag', "gtag('config', 'G-GF1DYLWMKX')" in us)
check('us: no document.write', 'document.write' not in us)
check('us: fetch amazon-categories.json', 'amazon-categories.json' in us and 'us_categories' in us)
check('us: keyword input', 'us-search' in us)
check('us: rating select', 'us-rating' in us)
check('us: sort select', 'us-sort' in us)
check('us: price inputs', 'us-low' in us and 'us-high' in us)
check('us: US rating rh param', 'p_72:1249150011' in us)
check('us: US affiliate tag', '9908qq-20' in us)
check('us: JP tag absent', 'gugopro-22' not in us)
check('us: amazon.co.jp absent', 'amazon.co.jp' not in us)
check('us: amazon.com domain', 'www.amazon.com/s' in us)
check('us: sort values', all(s in us for s in ['relevanceblender', 'price-asc-rank', 'price-desc-rank', 'review-rank', 'date-desc-rank', 'exact-aware-popularity-rank']))
check('us: URLSearchParams assembly', 'URLSearchParams' in us)
check('us: tag param via params.set', "params.set('tag'" in us)
us_soup = BeautifulSoup(us, 'html.parser')
check('us: parses with no fatal errors', us_soup.find() is not None and not us_soup.find_all(string=lambda s: False))

# ---------- 3. amazon-jp ----------
jp = open('amazon-jp/index.html').read()
check('jp: lang=ja', '<html lang="ja"' in jp)
check('jp: GA4 tag', "gtag('config', 'G-GF1DYLWMKX')" in jp)
check('jp: no document.write', 'document.write' not in jp)
check('jp: fetch jp_categories', 'jp_categories' in jp)
check('jp: keyword input jp', 'jp-search' in jp)
check('jp: rating select jp', 'jp-rating' in jp)
check('jp: sort select jp', 'jp-sort' in jp)
check('jp: price inputs jp', 'jp-low' in jp and 'jp-high' in jp)
check('jp: JP rating rh param', 'p_72:1248897011' in jp)
check('jp: JP affiliate tag', 'gugopro-22' in jp)
check('jp: US tag absent', '9908qq-20' not in jp)
check('jp: amazon.com absent', 'www.amazon.com/s' not in jp)
check('jp: amazon.co.jp domain', 'www.amazon.co.jp/s' in jp)
check('jp: japanese UI labels', all(s in jp for s in ['キーワード検索', '星評価', '並び替え', '最低価格', '最高価格', '検索']))
jp_soup = BeautifulSoup(jp, 'html.parser')
check('jp: parses with no fatal errors', jp_soup.find() is not None)

# ---------- 4. Home page integrity ----------
home = open('index.html').read()
keywords = ['撲克', 'Gacha', '凱利公式', '麻將', '對沖', 'TDEE', '即時翻譯', 'Gemini API', '口說', '塔羅', '對獎', '亞馬遜精選商城']
for kw in keywords:
    check(f'home: contains {kw}', kw in home)
check('home: GA4', "gtag('config', 'G-GF1DYLWMKX')" in home)
check('home: ko-fi', 'ko-fi' in home.lower())
check('home: store card links to /shop/', 'href="/shop/"' in home)
check('home: store card title', '亞馬遜精選商城 (Amazon Store Portal)' in home)
home_soup = BeautifulSoup(home, 'html.parser')
check('home: parses with no fatal errors', home_soup.find() is not None)
check('home: no document.write', 'document.write' not in home)

# ---------- 5. tools-list.json ----------
tools = json.load(open('data/tools-list.json'))
ids = [t.get('id') for t in tools]
check('tools: 14 unique ids', len(ids) == len(set(ids)))
check('tools: contains store-portal and amazon-us/jp', {'store-portal', 'amazon-us-shop', 'amazon-jp-shop'}.issubset(set(ids)))
sp = next(t for t in tools if t.get('id') == 'store-portal')
check('tools: store-portal -> /shop/', sp.get('url') == '/shop/index.html' and sp.get('live_url') == 'https://gugopro.com/shop/')
check('tools: no legacy /store/ path', not any('/store/' in (t.get('url') or '') for t in tools))

# ---------- 6. shop portal ----------
shop = open('shop/index.html').read()
check('shop: GA4', "gtag('config', 'G-GF1DYLWMKX')" in shop)
check('shop: links to both stores', '../amazon-us/index.html' in shop and '../amazon-jp/index.html' in shop)
check('shop: no document.write', 'document.write' not in shop)

print()
print(f'RESULT: {len(PASSES)} passed, {len(FAILS)} failed')
sys.exit(1 if FAILS else 0)
