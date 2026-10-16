#!/usr/bin/env python3
"""V6 verification: source-code-level enforcement that Tier 1/2 rendering
logic in amazon-us and amazon-jp pages never contains Amazon URLs."""
import re, sys

BASE = '/home/ubuntu/gugopro-site'
fails = 0
total = 0

def check(name, ok):
    global fails, total
    total += 1
    if ok:
        print(f'[PASS] {name}')
    else:
        fails += 1
        print(f'[FAIL] {name}')

for region, domain in [('us', 'amazon.com'), ('jp', 'amazon.co.jp')]:
    html = open(f'{BASE}/amazon-{region}/index.html').read()

    # 1. window.open must appear exactly once (inside doSearch)
    check(f'{region}: exactly one window.open() call (doSearch)', html.count('window.open(') == 1)

    # 2. DOMAIN constant exists and is the only place defining the Amazon base URL
    check(f'{region}: DOMAIN constant defines base URL', f"var DOMAIN = 'https://www.{domain}/s';" in html)

    # 3. No <a> or <button> elements with Amazon href/static HTML template carrying Amazon URLs outside DOMAIN block
    href_amazon = re.findall(r'href=["\']https?://www\.(?:amazon\.com|amazon\.co\.jp)[^"\']*', html)
    # allowed internal static links only
    allowed_static = {'https://gugopro.com', 'https://ko-fi.com/R1K123XRS9'}
    forbidden_static = [h for h in href_amazon if not any(h.startswith(a) for a in allowed_static)]
    check(f'{region}: no static href to Amazon in HTML', len(forbidden_static) == 0)

    # 4. Tier 1/2 rendering: dept-head / cat-head / cat-card carry data-no-external
    for cls in ["markInSite(head)", "markInSite(ch)", "markInSite(card)"]:
        check(f'{region}: renderers mark in-site elements ({cls})', cls in html)

    # 5. Render-time assertions present for all Tier 1/2 elements
    for ctx in ["assertNoAmazonIn(head, 'dept-head')", "assertNoAmazonIn(ch, 'cat-head')", "assertNoAmazonIn(card, 'cat-card')"]:
        check(f'{region}: render-time assertion ({ctx})', ctx in html)

    # 6. openSubPanel global API implemented
    check(f'{region}: window.openSubPanel API implemented', 'window.openSubPanel' in html)

    # 7. Capture-phase interception guard present
    check(f'{region}: capture-phase navigation guard', "data-no-external" in html and 'stopImmediatePropagation' in html)

    # 8. dept-head and cat-head click handlers bind toggleDept / toggle only (no doSearch on them)
    check(f'{region}: dept-head click binds toggleDept only', "head.addEventListener('click', function () { toggleDept(card)" in html)

    # 9. Leaf items (Tier 3/4) bind doSearch — allowed Amazon jump points
    leaf_doSearch = html.count("doSearch(leaf.keywords")
    check(f'{region}: leaf tiles bind doSearch ({leaf_doSearch} bind sites)', leaf_doSearch >= 2)

    # 10. Search buttons bind doSearch — allowed Amazon jump points
    check(f'{region}: search buttons bind doSearch', "searchBtn.addEventListener('click'" in html and "catSearchBtn.onclick" in html)

    # 11. Node syntax check
    m = re.search(r'<script>(.*?)</script>', html, re.S)
    js = m.group(1).replace('</script>', '<\\/script>').replace('</', '<')
    stub = "const window={};const document={addEventListener(){},getElementById(){return{classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return[]},appendChild(){},innerHTML:''}}};"
    import subprocess
    r = subprocess.run(['node', '--check'], input=stub + js, capture_output=True, text=True)
    check(f'{region}: JS syntax valid (node --check)', r.returncode == 0)

# Main site untouched
home = open(f'{BASE}/index.html').read()
check('Home page untouched (15-tool count kept)', '15 大 Web AI 工具' in home or '15大' in home or ('15' in home and 'Amazon Store Portal' in home))
check('Home page keeps GA4 + Ko-fi', 'G-GF1DYLWMKX' in home and 'ko-fi.com/R1K123XRS9' in home)
check('Home page store card links to /shop/', '/shop/' in home)

tools = open(f'{BASE}/data/tools-list.json').read()
check('tools-list.json keeps /shop/index.html portal link', '"link": "/shop/index.html"' in tools or '/shop/index.html' in tools)

print(f'\n===== {total - fails} PASS / {fails} FAIL =====')
sys.exit(1 if fails else 0)
