#!/usr/bin/env python3
"""Align data/tools-list.json with the v4 shop overhaul:
- store-portal entry now points to /shop/ (new portal path)
- remove the stale duplicate store-portal if amazon-store-portal already covers it
"""
import json

PATH = 'data/tools-list.json'
items = json.load(open(PATH))

# 1. Update store-portal to the new /shop/ portal path (canonical entry)
updated = 0
removed = 0
for it in items:
    if it.get('id') == 'store-portal':
        it['url'] = '/shop/index.html'
        it['live_url'] = 'https://gugopro.com/shop/'
        it['name'] = '亞馬遜精選商城 (Amazon Store Portal)'
        updated += 1

# 2. Drop the obsolete duplicate amazon-store-portal entry (store-portal now canonical)
before = len(items)
items = [it for it in items if it.get('id') != 'amazon-store-portal']
removed = before - len(items)

json.dump(items, open(PATH, 'w'), ensure_ascii=False, indent=2)

# Validate
ids = [it.get('id') for it in items]
assert len(ids) == len(set(ids)), 'duplicate ids!'
assert 'store-portal' in ids
print(f'OK: updated={updated}, removed_duplicates={removed}, total_entries={len(items)}, ids_unique={len(ids)}')
