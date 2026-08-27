from __future__ import annotations

import concurrent.futures as cf
import json
import re
import time
from pathlib import Path

from openai import OpenAI

ROOT = Path('/home/ubuntu/gugopro-site')
CATALOG = json.loads((ROOT / 'i18n-source-catalog.json').read_text(encoding='utf-8'))['strings']
TARGETS = {
    'zh-CN': 'Simplified Chinese',
    'en': 'English',
    'ja': 'Japanese',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'pt': 'Portuguese',
}
DYNAMIC = [x for x in CATALOG if '${' in x['text'] and any(chr(0x3400) <= ch <= chr(0x9fff) for ch in x['text'])]


def expr_signature(text: str) -> list[str]:
    return re.findall(r'\$\{(.*?)\}', text, flags=re.S)


def mask_quoted(code: str) -> str:
    out = []
    quote = None
    escaped = False
    for ch in code:
        if quote is not None:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == quote:
                quote = None
            continue
        if ch in ("'", '"'):
            quote = ch
            out.append('STRING')
        else:
            out.append(ch)
    return ''.join(out)


def protect_expressions(text: str) -> tuple[str, list[str]]:
    expressions: list[str] = []
    def replace(match: re.Match[str]) -> str:
        expressions.append(match.group(0))
        return f'__GUGO_EXPR_{len(expressions) - 1}__'
    return re.sub(r'\$\{(.*?)\}', replace, text, flags=re.S), expressions


def restore_expressions(text: str, expressions: list[str]) -> str:
    for index, expression in enumerate(expressions):
        token = f'__GUGO_EXPR_{index}__'
        if token not in text:
            raise ValueError(f'missing protected token {token}')
        text = text.replace(token, expression)
    return text


def validate(source: str, target: str) -> None:
    if not target or not isinstance(target, str):
        raise ValueError('empty translation')
    if target.count('${') != source.count('${'):
        raise ValueError(f'placeholder count {source.count("${") } != {target.count("${")}')


def one(locale: str, client: OpenAI) -> tuple[str, dict[str, str]]:
    payload = []
    expressions_by_id: dict[int, list[str]] = {}
    for item in DYNAMIC:
        protected, expressions = protect_expressions(item['text'])
        expressions_by_id[item['id']] = expressions
        payload.append({'id': item['id'], 'source': protected})
    system = (
        f'You are a senior financial UI localization editor translating into {TARGETS[locale]}. '
        'Translate only human-readable text. Every token matching __GUGO_EXPR_N__ is immutable: copy it exactly once, '
        'with the same spelling and number, and never add, remove, translate, or move it inside another token. Preserve '
        'numbers, formulas, tickers, URLs, HTML tags, CSS classes, punctuation and line breaks. Do not summarize, omit, '
        'merge, or add commentary. For code-like text, return it unchanged. Return JSON only.'
    )
    response = client.chat.completions.create(
        model='gpt-5-mini',
        messages=[
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': json.dumps({'items': payload}, ensure_ascii=False)},
        ],
        max_completion_tokens=18000,
        response_format={
            'type': 'json_schema',
            'json_schema': {
                'name': f'dynamic_ui_{locale.replace("-", "_")}',
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
    rows = json.loads(response.choices[0].message.content)['translations']
    expected = {x['id'] for x in DYNAMIC}
    if {r['id'] for r in rows} != expected:
        raise ValueError(f'{locale}: id mismatch')
    output: dict[str, str] = {}
    for row in rows:
        item = next(x for x in DYNAMIC if x['id'] == row['id'])
        translated = restore_expressions(row['translation'], expressions_by_id[item['id']])
        validate(item['text'], translated)
        output[str(item['id'])] = translated
    return locale, output


def main() -> None:
    client = OpenAI()
    out = ROOT / 'i18n'
    results: dict[str, dict[str, str]] = {}

    def run(locale: str):
        last = None
        for attempt in range(4):
            try:
                return one(locale, client)
            except Exception as exc:
                last = exc
                time.sleep(2 ** attempt)
        raise RuntimeError(f'{locale} failed: {last}')

    with cf.ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(run, locale): locale for locale in TARGETS}
        for future in cf.as_completed(futures):
            locale, translations = future.result()
            results[locale] = translations
            print(f'completed={locale} templates={len(translations)}')
    for locale, translations in results.items():
        path = out / f'{locale}.dynamic.json'
        path.write_text(json.dumps({'sourceLanguage': 'zh-TW', 'targetLanguage': locale, 'catalogVersion': 1, 'templates': translations}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'written={path}')


if __name__ == '__main__':
    main()
