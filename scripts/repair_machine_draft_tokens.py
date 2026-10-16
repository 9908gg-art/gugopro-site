#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ['zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt']
TOKEN_RE = re.compile(r'(\$\{(?:\\.|[^}])*\}|\{\{.*?\}\}|https?://[^\s<]+|<[^>]*>|`[^`]*`|\b(?:HTML|CSS|JS|JSON|CSV|HTTP|SVG|DOM|API|URL|RWD|Beta|Z-Score|Grid Trading|Futures|Arbitrage|ETF|DCF|MACD|RSI|KDJ|ATR|P/E|PEG)\b)', re.I | re.S)
GUGO_TOKEN_RE = re.compile(r'(?i)gugo\s+token\s+(\d+)')


def norm_token(value: str) -> str:
    return value.lower() if re.fullmatch(r'[A-Za-z][A-Za-z0-9 /-]*', value) else value


def repair(source: str, target: str) -> tuple[str, int]:
    source_tokens = TOKEN_RE.findall(source)
    output = target
    for match in list(GUGO_TOKEN_RE.finditer(output)):
        index = int(match.group(1))
        replacement = source_tokens[index] if index < len(source_tokens) else ''
        output = output.replace(match.group(0), replacement, 1)
    required = Counter(norm_token(token) for token in source_tokens)
    current = Counter(norm_token(token) for token in TOKEN_RE.findall(output))
    appended = 0
    for token in source_tokens:
        normalized = norm_token(token)
        if current[normalized] < required[normalized]:
            output = output.rstrip() + ' ' + token
            current[normalized] += 1
            appended += 1
    # Some model outputs dropped the numeric suffix but retained the sentinel label.
    output = re.sub(r'(?i)gugo\s+token(?:\s+\d+)?', '', output)
    return re.sub(r'\s{2,}', ' ', output).strip(), appended


catalog = json.loads((ROOT / 'i18n/catalog.json').read_text(encoding='utf-8'))
rows = catalog.get('strings', [])
for locale in LOCALES:
    path = ROOT / 'i18n' / f'{locale}.json'
    payload = json.loads(path.read_text(encoding='utf-8'))
    total_appended = 0
    for row in rows:
        key = str(row['id'])
        fixed, appended = repair(row['text'], str(payload['translations'].get(key, row['text'])))
        payload['translations'][key] = fixed
        total_appended += appended
    payload['tokenRepairVersion'] = 1
    payload['tokenRepairAppendedCount'] = total_appended
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(locale, 'appended_tokens=', total_appended)
