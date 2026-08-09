import json

print('===== data/amazon-categories.json =====')
data = json.load(open('data/amazon-categories.json', encoding='utf-8'))
ok = set(data.keys()) == {'us_categories', 'jp_categories'} and len(data['us_categories']) == 4 and len(data['jp_categories']) == 4
us_keys = set().union(*(c.keys() for c in data['us_categories']))
jp_keys = set().union(*(c.keys() for c in data['jp_categories']))
sub_keys_us = set().union(*(s.keys() for s in data['us_categories'][0]['subcategories']))
sub_keys_jp = set().union(*(s.keys() for s in data['jp_categories'][0]['subcategories']))
ok = ok and us_keys == {'id', 'name', 'icon', 'subcategories'}
ok = ok and jp_keys == {'id', 'name', 'icon', 'subcategories'}
ok = ok and sub_keys_us == {'name', 'keywords'} and sub_keys_jp == {'name', 'keywords'}
print('JSON structure:', 'PASS' if ok else 'FAIL')

checks = {}
for name, path in [('amazon-us', 'amazon-us/index.html'), ('amazon-jp', 'amazon-jp/index.html'), ('store', 'store/index.html')]:
    html = open(path, encoding='utf-8').read()
    c = {
        'no document.write': 'document.write' not in html,
        'ga4': 'G-GF1DYLWMKX' in html,
        'fontawesome 6': 'font-awesome/6' in html,
        'responsive meta': 'width=device-width' in html,
        'kofi': 'ko-fi.com/R1K123XRS9' in html,
        'dynamic fetch': 'fetch(' in html and 'amazon-categories.json' in html,
    }
    if name == 'amazon-us':
        c['english lang attr'] = html.startswith('<!DOCTYPE html>\n<html lang="en">')
        c['reads us_categories'] = 'data.us_categories' in html
        c['us nav active'] = '> 🇺🇸 Amazon US Store<' in html and 'class="active"' in html
        c['jp nav link'] = '../amazon-jp/index.html' in html
        c['gugopro home link'] = 'https://gugopro.com' in html and 'Return to GugoPro Home' in html
        c['store portal link'] = '../store/' in html
        c['us domain + tag'] = 'amazon.com/s?k=' in html and 'tag=9908qq-20' in html
        c['keywords field only'] = 'sub.keywords' in html and 'keywords_us' not in html and 'keywords_jp' not in html
        c['no legacy name_zh'] = 'name_zh' not in html
    elif name == 'amazon-jp':
        c['japanese lang attr'] = html.startswith('<!DOCTYPE html>\n<html lang="ja">')
        c['reads jp_categories'] = 'data.jp_categories' in html
        c['jp nav active'] = '> 🇯🇵 Amazon JP ストア<' in html and 'class="active"' in html
        c['us nav link'] = '../amazon-us/index.html' in html
        c['gugopro home link'] = 'GugoPro ホームへ戻る' in html and 'https://gugopro.com' in html
        c['store portal link'] = '../store/' in html
        c['jp domain + tag'] = 'amazon.co.jp/s?k=' in html and 'tag=gugopro-22' in html
        c['keywords field only'] = 'sub.keywords' in html and 'keywords_us' not in html and 'keywords_jp' not in html
        c['no legacy name_zh'] = 'name_zh' not in html
    else:
        c['reads both arrays'] = 'categories.us_categories' in html and 'categories.jp_categories' in html
        c['store portal links'] = '../amazon-us/index.html' in html and '../amazon-jp/index.html' in html
        c['gugopro home link'] = 'https://gugopro.com' in html
        c['portal card titles'] = 'Amazon US Store' in html and 'Amazon JP ストア' in html
    all_ok = all(c.values())
    print(f'===== [{name}] {"PASS" if all_ok else "FAIL"} =====')
    for k, v in c.items():
        if not v:
            print('  - missing:', k)

tools = json.load(open('data/tools-list.json'))
ids = {t.get('id') for t in tools}
print('===== tools-list =====')
print('amazon-us-shop:', 'amazon-us-shop' in ids)
print('amazon-jp-shop:', 'amazon-jp-shop' in ids)
print('store-portal:', 'store-portal' in ids)
