#!/usr/bin/env python3
"""Idempotently add/normalize 'id' fields on every Tier-2 category in
data/amazon-categories.json. Uses TRANSLIT for JP names without ASCII."""
import json
import re
from collections import Counter

PATH = 'data/amazon-categories.json'
data = json.load(open(PATH))

def slugify(name):
    s = name.lower()
    s = re.sub(r'[^\w\s]', '', s)
    s = re.sub(r'[\s_]+', '-', s)
    return s.strip('-')

TRANSLIT = {
    'スマホアクセサリ＆充電器': 'sumaho-accessory-charger',
    'イヤホン・ヘッドホン・オーディオ': 'earphones-headphones-audio',
    'パソコン本体・ストレージ': 'pc-body-storage',
    '空調・季節家電': 'climate-seasonal-appliance',
    'コーヒーメーカー・調理家電': 'coffee-maker-cooking-appliance',
    'ロボット掃除機・清掃家電': 'robot-vacuum-cleaning-appliance',
    'エルゴノミクスチェア': 'ergonomics-chair',
    'デスク・モニターアーム': 'desk-monitor-arm',
    '麻雀用品': 'mahjong-supplies',
    'ポーカー・カジノ用品': 'poker-casino-supplies',
    '投資・資産運用本': 'investment-asset-management-books',
    '占術・スピリチュアル用品': 'divination-spiritual-supplies',
    'ソロ・ソロキャンプギア': 'solo-camping-gear',
    '筋トレ・トレーニング器具': 'muscle-training-equipment',
    'スキンケア・メンズシェービング': 'skincare-mens-shaving',
    'カーエレクトロニクス・メンテナンス': 'car-electronics-maintenance',
}

for key in ('us_categories', 'jp_categories'):
    for dept in data[key]:
        for cat in dept['categories']:
            name = cat['name']
            base = TRANSLIT.get(name, slugify(name))
            if not base:
                base = 'cat'
            cat['id'] = base

# Deduplicate ids globally (same base used in both regions is fine,
# uniqueness is enforced at render via dept-scoped indexing; but keep
# per-region uniqueness by appending region suffix when clashing)
for key, suffix in (('us_categories', 'us'), ('jp_categories', 'jp')):
    seen = Counter()
    for dept in data[key]:
        for cat in dept['categories']:
            if seen[cat['id']] > 0:
                cat['id'] = f"{cat['id']}-{suffix}"
            seen[cat['id']] += 1

json.dump(data, open(PATH, 'w'), ensure_ascii=False, indent=2)

# validate
d2 = json.load(open(PATH))
ids = [c['id'] for key in ('us_categories', 'jp_categories') for d in d2[key] for c in d['categories']]
names = [c['name'] for key in ('us_categories', 'jp_categories') for d in d2[key] for c in d['categories']]
assert len(ids) == len(set(ids)), 'duplicate ids'
assert all('id' in c for key in ('us_categories', 'jp_categories') for d in d2[key] for c in d['categories'])
print('OK: 36 categories, all ids unique:', len(set(ids)))
