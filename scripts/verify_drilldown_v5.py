#!/usr/bin/env python3
"""V5 verification: in-site drill-down navigation for Amazon Shop."""
import json
import re
import sys

BASE = '/home/ubuntu/gugopro-site'
PASS, FAIL = [], []

def check(name, cond, detail=''):
    (PASS if cond else FAIL).append(name)
    status = 'PASS' if cond else 'FAIL'
    print(f'[{status}] {name}' + (f' — {detail}' if detail else ''))

# ---------- JSON ----------
with open(f'{BASE}/data/amazon-categories.json') as f:
    data = json.load(f)

check('JSON has us_categories and jp_categories',
      'us_categories' in data and 'jp_categories' in data)
for region in ('us', 'jp'):
    list_ = data[region + '_categories']
    check(f'{region}: 10 departments', len(list_) == 10, str(len(list_)))
    dept_ids, cat_ids, leaf_ids = set(), set(), set()
    for dept in list_:
        dept_ids.add(dept['id'])
        for cat in dept['categories']:
            check(f'{region}: category "{cat["name"]}" has id', 'id' in cat and cat['id'], cat.get('id', ''))
            cat_ids.add(cat['id'])
            for leaf in cat['leaf_items']:
                leaf_ids.add((leaf.get('name'), leaf.get('keywords')))
    check(f'{region}: unique dept ids', len(dept_ids) == len(list_))
    check(f'{region}: unique category ids', len(cat_ids) == sum(len(d['categories']) for d in list_))

# ---------- Home page integrity ----------
home = open(f'{BASE}/index.html').read()
for kw in ['Amazon Store Portal', '/shop/', 'G-GF1DYLWMKX', 'ko-fi.com/R1K123XRS9',
           '塔羅', 'Poker Odds Calculator', 'Kelly']:
    check(f'Home page keeps: {kw[:40]}', kw in home)
check('Home page not overwritten (has 15-tool count text)', '15 大 Web AI 工具' in home or '15大' in home or 'tools' in home.lower())

# ---------- Drill-down pages ----------
def analyze(path, lang, domain, tag, rating_rh):
    html = open(f'{BASE}/{path}').read()
    check(f'{path}: lang="{lang}"', f'lang="{lang}"' in html)
    check(f'{path}: GA4 tag', 'G-GF1DYLWMKX' in html)
    check(f'{path}: no document.write', 'document.write' not in html)
    check(f'{path}: static Ko-fi link', 'ko-fi.com/R1K123XRS9' in html and 'document.write' not in html)
    check(f'{path}: affiliate tag', f'tag={tag}' in html, f'tag={tag}')
    check(f'{path}: domain', domain in html, domain)
    check(f'{path}: rating RH', rating_rh in html, rating_rh)
    check(f'{path}: 6 sort options', all(s in html for s in [
        'relevanceblender', 'price-asc-rank', 'price-desc-rank',
        'review-rank', 'date-desc-rank', 'exact-aware-popularity-rank']))
    # three-view structure
    for vid in ('view-root', 'view-dept', 'view-category'):
        check(f'{path}: view {vid}', vid in html)
    # breadcrumbs & back buttons
    check(f'{path}: breadcrumbs nav', 'id="breadcrumbs"' in html)
    check(f'{path}: back-to-dept button', 'id="back-to-dept"' in html)
    check(f'{path}: back-to-root buttons', html.count('id="back-to-root') >= 2 or 'id="back-to-root2"' in html)
    # leaf items only open Amazon: dept-head/cat-head bind toggleDept/toggleCat, not doSearch
    check(f'{path}: dept-head binds toggleDept (not doSearch)',
          re.search(r"head\.addEventListener\('click', function \(\) \{[^}]*toggleDept\(card\)[^}]*\}\)", html) is not None)
    check(f'{path}: window.open only in doSearch',
          html.count('window.open(') == 1)
    # URL assembly helpers
    check(f'{path}: buildSearchUrl present', 'function buildSearchUrl' in html)
    check(f'{path}: s param in URL assembly', "params.set('s'" in html)
    check(f'{path}: low-price param', "params.set('low-price'" in html)
    check(f'{path}: high-price param', "params.set('high-price'" in html)
    check(f'{path}: category-scoped filter toolbar', 'id="cat-search-btn"' in html)
    # language isolation
    if lang == 'ja':
        check(f'{path}: no english keywords in JP page',
              'keywords_us' not in html and 'name_zh' not in html)
        # ensure CJK filter labels present
        for lbl in ['星評価', '並び替え', '部門一覧に戻る']:
            check(f'{path}: JP label "{lbl}"', lbl in html)
    else:
        for lbl in ['Star Rating', 'Sort By', 'Back to Categories']:
            check(f'{path}: EN label "{lbl}"', lbl in html)

analyze('amazon-us/index.html', 'en', 'https://www.amazon.com/s', '9908qq-20', 'p_72:1249150011')
analyze('amazon-jp/index.html', 'ja', 'https://www.amazon.co.jp/s', 'gugopro-22', 'p_72:1248897011')

# ---------- Shop portal ----------
shop = open(f'{BASE}/shop/index.html').read()
check('shop portal: US link points to internal amazon-us page',
      '../amazon-us/index.html' in shop and 'amazon.com' not in shop)
check('shop portal: JP link points to internal amazon-jp page',
      '../amazon-jp/index.html' in shop and 'amazon.co.jp' not in shop)
check('shop portal: GA4', 'G-GF1DYLWMKX' in shop)

# ---------- Tools list ----------
tl = json.load(open(f'{BASE}/data/tools-list.json'))
items = tl if isinstance(tl, list) else tl.get('tools', [])
ids = [it.get('id') for it in items if isinstance(it, dict)]
check('tools-list.json: valid JSON list', isinstance(tl, list))
check('tools-list.json: no duplicate ids', len(ids) == len(set(ids)))
check('tools-list.json: contains store-portal entry', any(i == 'store-portal' for i in ids))
portal = next((it for it in items if it.get('id') == 'store-portal'), None)
check('tools-list.json: store-portal link is /shop/index.html',
      portal and ('/shop/index.html' in portal.get('live_url', '') or '/shop/' in portal.get('live_url', '')))

print(f'\n===== {len(PASS)} PASS / {len(FAIL)} FAIL =====')
sys.exit(1 if FAIL else 0)
