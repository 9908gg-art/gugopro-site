from __future__ import annotations

import concurrent.futures as cf
import json
import time
from pathlib import Path
from typing import Any

from openai import OpenAI
from generate_i18n_catalog import CATALOG, OUT, LOCALES, is_code_template, valid_translation

TARGETS = [x for x in sorted(LOCALES) if x != 'zh-CN']


def call_batch(client: OpenAI, items: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    payload = [{'id': int(x['id']), 'source': x['text']} for x in items]
    locale_descriptions = {loc: LOCALES[loc] for loc in TARGETS}
    system = (
        'You are a senior financial localization editor. Translate every source string into every target locale. '
        'Return JSON only with one array per locale. Preserve meaning, financial precision, numbers, formulas, ticker symbols, '
        'URLs, HTML tags, CSS selectors, JavaScript placeholders, line breaks, arrows, and punctuation tokens. Do not translate '
        'brand names, tickers, code identifiers, URLs, or mathematical formulas. Do not summarize, omit, merge, or add commentary. '
        'Use natural local finance terminology rather than literal machine translation. If a source is already an English brand, '
        'code, formula, or ticker, keep it unchanged where appropriate. The same source id must appear exactly once in every locale.'
    )
    user = json.dumps({'targetLocales': locale_descriptions, 'items': payload}, ensure_ascii=False)
    locale_item_schema = {
        'type': 'array',
        'items': {
            'type': 'object',
            'properties': {'id': {'type': 'integer'}, 'translation': {'type': 'string'}},
            'required': ['id', 'translation'],
            'additionalProperties': False,
        },
    }
    response = client.chat.completions.create(
        model='gpt-5-mini',
        messages=[{'role': 'system', 'content': system}, {'role': 'user', 'content': user}],
        max_completion_tokens=60000,
        response_format={
            'type': 'json_schema',
            'json_schema': {
                'name': 'localized_strings_all_locales',
                'strict': True,
                'schema': {
                    'type': 'object',
                    'properties': {loc: locale_item_schema for loc in TARGETS},
                    'required': TARGETS,
                    'additionalProperties': False,
                },
            },
        },
    )
    obj = json.loads(response.choices[0].message.content)
    expected = {int(x['id']) for x in items}
    for locale in TARGETS:
        rows = obj.get(locale, [])
        if {int(r['id']) for r in rows} != expected:
            raise ValueError(f'{locale} batch id mismatch')
        for row in rows:
            source = next(x['text'] for x in items if int(x['id']) == int(row['id']))
            if is_code_template(source):
                if row['translation'] != source:
                    raise ValueError(f'{locale} code template changed id={row["id"]}')
            else:
                ok, reason = valid_translation(source, row['translation'])
                if not ok:
                    raise ValueError(f'{locale} quality gate id={row["id"]} {reason}')
    return obj


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))['strings']
    states: dict[str, dict[str, str]] = {}
    pending_by_locale: dict[str, list[dict[str, Any]]] = {}
    for locale in TARGETS:
        path = OUT / f'{locale}.json'
        states[locale] = json.loads(path.read_text(encoding='utf-8')).get('translations', {}) if path.exists() else {}
        for item in catalog:
            if is_code_template(item['text']):
                states[locale].setdefault(str(item['id']), item['text'])
        pending_by_locale[locale] = [x for x in catalog if str(x['id']) not in states[locale]]
    pending_ids = sorted({x['id'] for rows in pending_by_locale.values() for x in rows})
    pending = [x for x in catalog if x['id'] in pending_ids]
    batch_size = 80
    batches = [pending[i:i + batch_size] for i in range(0, len(pending), batch_size)]
    print(f'targets={TARGETS} total={len(catalog)} pending_union={len(pending)} batches={len(batches)}')
    client = OpenAI()

    def run(pair):
        idx, batch = pair
        last = None
        for attempt in range(4):
            try:
                return idx, call_batch(client, batch)
            except Exception as exc:
                last = exc
                time.sleep(2 ** attempt)
        raise RuntimeError(f'batch {idx} failed: {last}')

    with cf.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(run, (idx, batch)) for idx, batch in enumerate(batches)]
        completed = 0
        for future in cf.as_completed(futures):
            idx, result = future.result()
            completed += 1
            for locale in TARGETS:
                for row in result[locale]:
                    states[locale][str(row['id'])] = row['translation']
            print(f'completed batch={completed}/{len(batches)} index={idx}')
    OUT.mkdir(exist_ok=True)
    for locale in TARGETS:
        if set(states[locale]) != {str(x['id']) for x in catalog}:
            raise RuntimeError(f'{locale} incomplete {len(states[locale])}/{len(catalog)}')
        path = OUT / f'{locale}.json'
        path.write_text(json.dumps({'sourceLanguage': 'zh-TW', 'targetLanguage': locale, 'catalogVersion': 1, 'translations': states[locale]}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'written={path} translations={len(states[locale])}')


if __name__ == '__main__':
    main()
