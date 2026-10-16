from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import re
import time
from pathlib import Path
from typing import Any

from openai import OpenAI

ROOT = Path('/home/ubuntu/gugopro-site')
CATALOG = ROOT / 'i18n-source-catalog.json'
OUT = ROOT / 'i18n'
LOCALES = {
    'zh-CN': 'Simplified Chinese (中国大陆金融常用术语)',
    'en': 'English (international finance terminology)',
    'ja': 'Japanese (日本の金融・投資で自然な用語)',
    'de': 'German (DACH finance terminology)',
    'fr': 'French (France/international finance terminology)',
    'es': 'Spanish (international finance terminology)',
    'pt': 'Portuguese (Brazil/international finance terminology)',
}


def protect_tokens(text: str) -> set[str]:
    patterns = [
        r'https?://[^\s<>"\']+', r'mailto:[^\s<>"\']+',
        r'\$\{[^}]+\}', r'\{\{[^}]+\}\}', r'\{[A-Za-z][^}]*\}',
        r'#[A-Za-z][\w-]*', r'\b(?:ATR|RSI|MACD|KD|EMA|SMA|MA|ETF|DCF|VaR|MDD|R:R|P&L|OHLCV|API|WebSocket|JSON|HTML|SVG|CSS|JavaScript|Bitcoin|Ethereum|Binance|TradingView|CME|TAIFEX|FIRE|Kelly|Beta|Sharpe|Donchian|Basis|Swap|Pip|PEG|EPS|PE)\b',
        r'(?<![A-Za-z])\d+(?:[.,]\d+)?%?',
        r'\b\d{2,4}[A-Z]{0,4}\b',
    ]
    return {m.group(0) for p in patterns for m in re.finditer(p, text)}


def valid_translation(source: str, translated: str) -> tuple[bool, str]:
    if not isinstance(translated, str) or not translated.strip():
        return False, 'empty'
    if len(source) >= 8 and len(translated) < 2:
        return False, 'too_short'
    source_tokens = protect_tokens(source)
    target_tokens = protect_tokens(translated)
    missing = [t for t in source_tokens if t not in target_tokens]
    if missing:
        # Allow pure numeric tokens to change decimal punctuation in prose, but never lose URLs/placeholders.
        hard = [t for t in missing if t.startswith(('http://', 'https://', 'mailto:', '${', '{{', '#'))]
        if hard:
            return False, 'missing:' + ','.join(hard[:3])
    return True, ''


def call_batch(client: OpenAI, locale: str, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    target = LOCALES[locale]
    payload = [{'id': int(x['id']), 'source': x['text']} for x in items]
    system = (
        'You are a senior financial localization editor. Translate every source string into the target locale. '
        'Return JSON only. Preserve meaning, financial precision, numbers, formulas, ticker symbols, URLs, HTML tags, '
        'CSS selectors, JavaScript placeholders, line breaks, arrows, and punctuation tokens. Do not translate brand names, '
        'tickers, code identifiers, URLs, or mathematical formulas. Do not summarize, omit, merge, or add commentary. '
        'Use natural local finance terminology rather than literal machine translation. If a source is already an English '
        'brand, code, formula, or ticker, keep it unchanged where appropriate.'
    )
    user = json.dumps({'targetLocale': target, 'items': payload}, ensure_ascii=False)
    response = client.chat.completions.create(
        model='gpt-5-mini',
        messages=[
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': user},
        ],
        max_completion_tokens=30000,
        response_format={
            'type': 'json_schema',
            'json_schema': {
                'name': 'localized_strings',
                'strict': True,
                'schema': {
                    'type': 'object',
                    'properties': {
                        'translations': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {'id': {'type': 'integer'}, 'translation': {'type': 'string'}},
                                'required': ['id', 'translation'],
                                'additionalProperties': False,
                            },
                        }
                    },
                    'required': ['translations'],
                    'additionalProperties': False,
                },
            },
        },
    )
    obj = json.loads(response.choices[0].message.content)
    rows = obj['translations']
    if {int(r['id']) for r in rows} != {int(x['id']) for x in items}:
        raise ValueError('batch id mismatch')
    for r in rows:
        src = next(x['text'] for x in items if int(x['id']) == int(r['id']))
        ok, reason = valid_translation(src, r['translation'])
        if not ok:
            raise ValueError(f"quality gate id={r['id']} {reason}")
    return rows


def is_code_template(source: str) -> bool:
    return any(token in source for token in ('${', '=>', 'document.', 'window.', 'localStorage.', 'querySelector', 'addEventListener'))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('locale', choices=sorted(LOCALES))
    parser.add_argument('--batch-size', type=int, default=120)
    parser.add_argument('--workers', type=int, default=6)
    args = parser.parse_args()
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))['strings']
    existing = OUT / f'{args.locale}.json'
    done: dict[str, str] = {}
    if existing.exists():
        done = json.loads(existing.read_text(encoding='utf-8')).get('translations', {})
    for item in catalog:
        if is_code_template(item['text']):
            done.setdefault(str(item['id']), item['text'])
    pending = [x for x in catalog if str(x['id']) not in done]
    client = OpenAI()
    batches = [pending[i:i + args.batch_size] for i in range(0, len(pending), args.batch_size)]
    skipped = len(catalog) - len(pending) - (0 if existing.exists() else 0)
    print(f'locale={args.locale} total={len(catalog)} pending={len(pending)} preserved_code_templates={sum(1 for x in catalog if is_code_template(x["text"]))} batches={len(batches)}')

    def run(pair: tuple[int, list[dict[str, Any]]]) -> tuple[int, list[dict[str, Any]]]:
        idx, batch = pair
        last = None
        for attempt in range(4):
            try:
                return idx, call_batch(client, args.locale, batch)
            except Exception as exc:
                last = exc
                time.sleep(2 ** attempt)
        raise RuntimeError(f'batch {idx} failed: {last}')

    results: list[tuple[int, list[dict[str, Any]]]] = []
    with cf.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 8))) as executor:
        futures = [executor.submit(run, pair) for pair in enumerate(batches)]
        for future in cf.as_completed(futures):
            idx, rows = future.result()
            results.append((idx, rows))
            print(f'completed batch={idx + 1}/{len(batches)} rows={len(rows)}')
    for _, rows in sorted(results):
        for row in rows:
            done[str(row['id'])] = row['translation']
    if set(done) != {str(x['id']) for x in catalog}:
        raise RuntimeError(f'incomplete: {len(done)}/{len(catalog)}')
    OUT.mkdir(exist_ok=True)
    output = {'sourceLanguage': catalog and 'zh-TW', 'targetLanguage': args.locale, 'catalogVersion': 1, 'translations': done}
    existing.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'written={existing} translations={len(done)}')


if __name__ == '__main__':
    main()
