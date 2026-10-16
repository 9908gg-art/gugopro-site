#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt']
CATALOG = json.loads((ROOT / 'i18n/catalog.json').read_text(encoding='utf-8'))
rows = CATALOG.get('strings', [])
keys = {str(row['id']) for row in rows}

for locale in LOCALES:
    path = ROOT / 'i18n' / f'{locale}.json'
    payload = json.loads(path.read_text(encoding='utf-8'))
    translations = payload.get('translations', {})
    missing = sorted(keys - set(translations))
    payload.update({
        'translationStatus': 'machine-draft',
        'reviewRequired': True,
        'generatedBy': payload.get('generatedBy', 'shared-catalog-machine-draft'),
        'glossaryVersion': 1,
        'catalogKeyCount': len(keys),
        'translatedKeyCount': len(keys) - len(missing),
        'fallbackKeyCount': len(missing),
    })
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(locale, 'keys=', len(translations), 'missing=', len(missing))

glossary = {
    'sourceLanguage': 'zh-TW',
    'targetLanguages': LOCALES,
    'version': 1,
    'status': 'machine-draft',
    'protectedTerms': [
        'Futures', 'Arbitrage', 'Beta', 'Z-Score', 'Grid Trading', 'ETF', 'DCF',
        'MACD', 'RSI', 'KDJ', 'ATR', 'R:R', 'Pip', 'Swap', 'Forward', 'NDF',
        'HTML', 'CSS', 'JS', 'JSON', 'CSV', 'HTTP', 'SVG', 'DOM', 'API', 'URL',
    ],
    'note': 'Existing shared resources are retained and explicitly require native-finance review before publication claims.',
}
(ROOT / 'i18n/glossary.json').write_text(json.dumps(glossary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
