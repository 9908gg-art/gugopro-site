from pathlib import Path
import concurrent.futures as cf
import json
import os
import re
import sys
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT / 'docs' / 'tutor-ui-source-strings.json').read_text(encoding='utf-8'))
items = source['items']
LANGS = {
    'zh-TW': 'Traditional Chinese (Taiwan)',
    'zh-CN': 'Simplified Chinese (China)',
    'en-US': 'English',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
    'fr-FR': 'French',
    'de-DE': 'German',
    'es-ES': 'Spanish (Spain)',
    'th-TH': 'Thai',
    'vi-VN': 'Vietnamese',
    'id-ID': 'Indonesian',
    'pt-BR': 'Brazilian Portuguese',
    'it-IT': 'Italian',
    'ru-RU': 'Russian',
    'ar-SA': 'Arabic',
    'hi-IN': 'Hindi',
    'ms-MY': 'Malay',
    'nl-NL': 'Dutch',
    'pl-PL': 'Polish',
    'tr-TR': 'Turkish',
}

client = OpenAI()
source_lines = '\n'.join(f'{i}: {item["text"]}' for i, item in enumerate(items))
schema = {
    'type': 'object',
    'properties': {'translations': {'type': 'array', 'items': {'type': 'string'}, 'minItems': len(items), 'maxItems': len(items)}},
    'required': ['translations'],
    'additionalProperties': False,
}

def translate(locale, language):
    if locale == 'zh-TW':
        return [item['text'] for item in items]
    prompt = f'''Translate the following user-interface strings from Traditional Chinese / mixed English into {language} for a multilingual AI language tutor web app.

Rules:
- Return exactly one translated string for every numbered input, preserving order and count ({len(items)} total).
- Translate every visible UI label, button, hint, title, aria label, and option label naturally and completely.
- Preserve brand names (GugoPro, Gugo), product names, punctuation, emoji, icons, ellipses, placeholders such as {{page}}, and keyboard symbols.
- Keep translations concise enough for the same UI controls. Do not add explanations, notes, numbering, or quotation marks around the strings.
- If a string is already a proper name or a language name, use the conventional native-language form where appropriate.

INPUT STRINGS:
{source_lines}'''
    resp = client.chat.completions.create(
        model='gpt-5-mini',
        messages=[
            {'role': 'system', 'content': 'You are a meticulous professional software UI translator. Output only the requested JSON object.'},
            {'role': 'user', 'content': prompt},
        ],
        response_format={'type': 'json_schema', 'json_schema': {'name': 'tutor_ui_translations', 'strict': True, 'schema': schema}},
        max_completion_tokens=24000,
    )
    data = json.loads(resp.choices[0].message.content)
    values = data['translations']
    if len(values) != len(items):
        raise ValueError(f'{locale}: expected {len(items)} translations, got {len(values)}')
    if any(not isinstance(value, str) for value in values):
        raise ValueError(f'{locale}: non-string translation')
    return values

results = {'zh-TW': {item['text']: item['text'] for item in items}}
errors = []
with cf.ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(translate, locale, language): locale for locale, language in LANGS.items() if locale != 'zh-TW'}
    for future in cf.as_completed(futures):
        locale = futures[future]
        try:
            values = future.result()
            results[locale] = {item['text']: value for item, value in zip(items, values)}
            print(f'completed {locale}', flush=True)
        except Exception as exc:
            errors.append(f'{locale}: {exc}')
            print(f'FAILED {locale}: {exc}', file=sys.stderr, flush=True)

if errors:
    raise SystemExit('\n'.join(errors))

# Ensure every locale has the exact same key set and preserve source item order via an ordered list.
out = {'version': '2026-09-13', 'sourceLocale': 'zh-TW', 'languageOptions': source['language_options'], 'items': [item['text'] for item in items], 'translations': results}
path = ROOT / 'i18n' / 'tutor-ui-catalog.json'
path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'wrote {path} with {len(results)} locales x {len(items)} strings')
