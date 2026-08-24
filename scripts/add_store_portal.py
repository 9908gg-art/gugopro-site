import json

PATH = 'data/tools-list.json'

with open(PATH) as f:
    data = json.load(f)

portal = {
    "id": "store-portal",
    "name": "商城總門戶 (Store Portal)",
    "name_en": "GugoPro Store Portal",
    "category": "shopping",
    "url": "/store/index.html",
    "live_url": "https://gugopro.com/store/index.html",
    "icon": "fa-solid fa-store",
    "description": "商城總入口：選擇前往美國或日本亞馬遜專區",
    "status": "online",
    "tags": ["商城", "門戶", "Amazon US", "Amazon JP", "Store Portal"],
    "color": "violet",
    "created_at": "2026-08-09"
}

ids = {t.get('id') for t in data if t.get('id')}
if portal['id'] not in ids:
    data.append(portal)

with open(PATH, 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('total tools:', len(data))
