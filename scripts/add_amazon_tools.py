import json

PATH = 'data/tools-list.json'

with open(PATH) as f:
    data = json.load(f)

new_tools = [
    {
        "id": "amazon-us-shop",
        "name": "Amazon US 商品搜尋",
        "name_en": "Amazon US Product Search",
        "category": "shopping",
        "url": "/amazon-us/index.html",
        "live_url": "https://gugopro.com/amazon-us/index.html",
        "icon": "fa-solid fa-cart-shopping",
        "description": "美國亞馬遜商品分類搜尋導航",
        "status": "online",
        "tags": ["Amazon", "美國亞馬遜", "商品搜尋", "amazon.com", "affiliate"],
        "color": "blue",
        "created_at": "2026-08-09"
    },
    {
        "id": "amazon-jp-shop",
        "name": "Amazon JP 商品搜尋",
        "name_en": "Amazon JP Product Search",
        "category": "shopping",
        "url": "/amazon-jp/index.html",
        "live_url": "https://gugopro.com/amazon-jp/index.html",
        "icon": "fa-solid fa-cart-shopping",
        "description": "日本亞馬遜商品分類搜尋導航",
        "status": "online",
        "tags": ["Amazon", "日本亞馬遜", "amazon.co.jp", "商品搜尋", "affiliate"],
        "color": "rose",
        "created_at": "2026-08-09"
    }
]

ids = {t.get('id') for t in data if t.get('id')}
for t in new_tools:
    if t['id'] not in ids:
        data.append(t)

with open(PATH, 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('total tools:', len(data))
