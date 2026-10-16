import json
import re
from html.parser import HTMLParser

html = open('index.html', encoding='utf-8').read()
tools = json.load(open('data/tools-list.json', encoding='utf-8'))

print('===== Home page integrity =====')
checks = {
    'GA4 tracking code': 'G-GF1DYLWMKX' in html,
    'GA4 gtag script': 'googletagmanager.com/gtag/js' in html,
    'Ko-fi widget script': 'storage.ko-fi.com/cdn/widget/Widget_2.js' in html,
    'Ko-fi sponsor section': 'kofiwidget2.init' in html and 'R1K123XRS9' in html,
    'footer present': 'main-footer' in html and 'All rights reserved' in html,
    'original 14 tools preserved': all(t in html for t in [
        'poker-odds-calculator', 'english-speaking-tutor', 'realtime-translator',
        'kelly-criterion-calculator', 'tdee-macros-calculator', 'mahjong-discard',
        'gacha-odds-calculator', 'Celestial Tarot 塔羅占卜', 'Celestial Tarot', 'life-path',
        'sports-hedging', 'invoice-lottery', 'srt-to-vtt', 'work-hours']),
}
for k, v in checks.items():
    print(('  PASS' if v else '  FAIL'), k)

print('===== New Amazon Store card =====')
card_checks = {
    'card title': '🛒 亞馬遜精選商城 (Amazon Store Portal)' in html,
    'card description': '提供美亞（全英文）與日亞（全日文）雙區動態商品搜尋' in html,
    'cta button text': '前往商城門戶 (Enter Store)' in html,
    'link to store': 'href="/store/"' in html,
    'icon': 'fa-solid fa-cart-shopping' in html,
    'tool-card class': 'tool-card' in html,
}
for k, v in card_checks.items():
    print(('  PASS' if v else '  FAIL'), k)

print('===== tools-list.json =====')
ids = [t.get('id') for t in tools]
print('  total entries:', len(tools))
print('  duplicate ids:', 'FAIL - ' + str([i for i in set(ids) if ids.count(i) > 1]) if len(ids) != len(set(ids)) else 'PASS - none')
portal = [t for t in tools if t.get('id') == 'amazon-store-portal']
print('  amazon-store-portal entry:', 'PASS' if portal else 'FAIL')
us = [t for t in tools if t.get('id') == 'amazon-us-shop']
jp = [t for t in tools if t.get('id') == 'amazon-jp-shop']
print('  (existing) amazon-us-shop:', 'present' if us else 'missing')
print('  (existing) amazon-jp-shop:', 'present' if jp else 'missing')

print('===== HTML syntax check =====')
class TagChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.void = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
    def handle_starttag(self, tag, attrs):
        if tag not in self.void:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in self.void:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.errors.append(f'mismatched </{tag}>')
checker = TagChecker()
checker.feed(html)
print('  open tags remaining:', checker.stack if checker.stack else 'PASS')
print('  parse errors:', checker.errors if checker.errors else 'PASS')
