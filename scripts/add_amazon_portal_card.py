import json

PATH = 'data/tools-list.json'

with open(PATH) as f:
    data = json.load(f)

portal = {
    "id": "amazon-store-portal",
    "name": "🛒 亞馬遜精選商城 (Amazon Store Portal)",
    "name_en": "Amazon Global Store Portal",
    "category": "shopping",
    "url": "/store/index.html",
    "live_url": "https://gugopro.com/store/",
    "icon": "fa-solid fa-cart-shopping",
    "description": "提供美亞（全英文）與日亞（全日文）雙區動態商品搜尋，精選電競設備、棋牌周邊、風控書籍與靈性水晶。",
    "status": "online",
    "tags": ["亞馬遜", "Amazon", "商城", "門戶", "Amazon US", "Amazon JP", "購物", "affiliate"],
    "color": "emerald",
    "created_at": "2026-08-09"
}

ids = {t.get('id') for t in data if t.get('id')}
assert portal['id'] not in ids, 'duplicate id'
data.append(portal)

# Validate overall integrity: no duplicate ids
all_ids = [t.get('id') for t in data if t.get('id')]
assert len(all_ids) == len(set(all_ids)), 'duplicate ids remain'

with open(PATH, 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('total tools:', len(data))
print('new id:', portal['id'], '- unique:', True)
