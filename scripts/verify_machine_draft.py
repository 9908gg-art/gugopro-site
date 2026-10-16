#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt']
TOKEN_RE = re.compile(r'(\$\{(?:\\.|[^}])*\}|\{\{.*?\}\}|https?://[^\s<]+|<[^>]*>|`[^`]*`|\b(?:HTML|CSS|JS|JSON|CSV|HTTP|SVG|DOM|API|URL|RWD|Beta|Z-Score|Grid Trading|Futures|Arbitrage|ETF|DCF|MACD|RSI|KDJ|ATR|P/E|PEG)\b)', re.I | re.S)
CJK_RE = re.compile(r'[\u3400-\u9fff]')


def tokens(value: str) -> list[str]:
    return TOKEN_RE.findall(str(value or ''))


def token_key(value: str) -> str:
    # HTML, URLs, template expressions and backtick code remain exact;
    # standard ASCII finance tokens are compared case-insensitively.
    if value.startswith(('<', 'http', '`', '${', '{{')):
        return value
    return value.lower()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', type=Path, required=True)
    args = parser.parse_args()
    repo = args.repo
    catalog = json.loads((repo / 'i18n/catalog.json').read_text(encoding='utf-8'))
    rows = catalog.get('strings', [])
    expected = {str(row['id']) for row in rows}
    source_by_key = {str(row['id']): row['text'] for row in rows}
    errors = []
    report = {'repo': str(repo), 'catalogKeys': len(expected), 'locales': {}, 'tokenMismatches': []}
    for locale in LOCALES:
        path = repo / 'i18n' / f'{locale}.json'
        if not path.exists():
            errors.append(f'{locale}: missing pack')
            continue
        pack = json.loads(path.read_text(encoding='utf-8'))
        trans = pack.get('translations', {})
        missing = expected - set(trans)
        extra = set(trans) - expected
        nulls = [key for key, value in trans.items() if value is None]
        cjk = sum(bool(CJK_RE.search(str(trans.get(key, '')))) for key in expected)
        report['locales'][locale] = {
            'keys': len(trans),
            'missing': len(missing),
            'extra': len(extra),
            'nullValues': len(nulls),
            'translatedStatus': pack.get('translationStatus'),
            'cjkValues': cjk,
            'translationMethods': pack.get('translationMethods', {}),
            'fallbackKeyCount': pack.get('fallbackKeyCount'),
        }
        if missing or extra or nulls:
            errors.append(f'{locale}: key/null failure missing={len(missing)} extra={len(extra)} null={len(nulls)}')
        if locale != 'zh-TW':
            for key, source in source_by_key.items():
                target = str(trans.get(key, ''))
                src_tokens = tokens(source)
                dst_tokens = tokens(target)
                required = Counter(token_key(token) for token in src_tokens)
                present = Counter(token_key(token) for token in dst_tokens)
                missing_tokens = []
                for token in src_tokens:
                    normalized = token_key(token)
                    if present[normalized] < required[normalized]:
                        missing_tokens.append(token)
                        present[normalized] += 1
                if missing_tokens or 'gugo token' in target.lower():
                    report['tokenMismatches'].append({'locale': locale, 'id': key, 'sourceTokens': src_tokens, 'targetTokens': dst_tokens, 'missingTokens': missing_tokens})
    if report['tokenMismatches']:
        errors.append(f'token preservation failed for {len(report["tokenMismatches"])} entries')
    report['ok'] = not errors
    report['errors'] = errors
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
