#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from bs4 import BeautifulSoup

LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt']


def target_pages(repo: Path, mode: str) -> list[Path]:
    if mode == 'academy':
        roots = [repo / 'index.html', repo / 'guides', repo / 'tools', repo / 'quant']
        excluded = {'en', 'es', 'ja', 'zh-cn', 'zh-CN', 'de', 'fr', 'pt'}
        pages = []
        for root in roots:
            if root.is_file(): pages.append(root)
            elif root.is_dir(): pages.extend(p for p in root.rglob('*.html') if not (set(p.relative_to(repo).parts) & excluded))
        return sorted(set(pages))
    roots = [repo / 'academy', repo / 'articles' / 'investment']
    return sorted({p for root in roots if root.exists() for p in root.rglob('*.html')})


def check(condition: bool, message: str, errors: list[str]) -> None:
    if not condition: errors.append(message)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--mode', choices=['academy', 'site'], required=True)
    args = parser.parse_args()
    repo = args.repo
    errors: list[str] = []
    catalog_path = repo / 'i18n/catalog.json'
    check(catalog_path.exists(), f'missing {catalog_path}', errors)
    if errors:
        print(json.dumps({'ok': False, 'errors': errors}, ensure_ascii=False, indent=2)); return 1
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    rows = catalog.get('strings', [])
    expected = {str(row['id']) for row in rows}
    packs = {}
    for locale in LOCALES:
        path = repo / 'i18n' / f'{locale}.json'
        check(path.exists(), f'{locale}: missing pack', errors)
        if not path.exists(): continue
        pack = json.loads(path.read_text(encoding='utf-8'))
        packs[locale] = pack
        keys = set(pack.get('translations', {}))
        check(keys == expected, f'{locale}: key parity failed missing={len(expected-keys)} extra={len(keys-expected)}', errors)
        check(pack.get('translationStatus') == 'machine-draft', f'{locale}: translationStatus is not machine-draft', errors)
        check(pack.get('reviewRequired') is True, f'{locale}: reviewRequired is not true', errors)
        check(pack.get('catalogKeyCount') in (None, len(expected)), f'{locale}: catalogKeyCount mismatch', errors)
    runtime = repo / 'i18n/gugopro-i18n.js'
    check(runtime.exists(), f'missing runtime {runtime}', errors)
    if runtime.exists():
        subprocess.run(['node', '--check', str(runtime)], check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        result = subprocess.run(['node', '--check', str(runtime)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        check(result.returncode == 0, f'runtime JS syntax failed: {result.stderr.strip()}', errors)
        runtime_text = runtime.read_text(encoding='utf-8')
        for needle in ['machine-draft', 'gugo-locale-select', 'CanvasRenderingContext2D', 'localStorage', 'zh-CN']:
            check(needle in runtime_text, f'runtime missing expected feature: {needle}', errors)
    pages = target_pages(repo, args.mode)
    check(bool(pages), f'{args.mode}: no target pages discovered', errors)
    expected_count = 99 if args.mode == 'academy' else 47
    check(len(pages) == expected_count, f'{args.mode}: expected {expected_count} pages, found {len(pages)}', errors)
    page_stats = {'pages': len(pages), 'runtime': 0, 'hreflang': 0, 'metadata': 0, 'parseable': 0}
    for page in pages:
        html = page.read_text(encoding='utf-8', errors='replace')
        soup = BeautifulSoup(html, 'html.parser')
        page_stats['parseable'] += 1
        scripts = [tag for tag in soup.find_all('script') if 'gugopro-i18n.js' in (tag.get('src') or '')]
        alternates = {tag.get('hreflang') for tag in soup.find_all('link', rel='alternate')}
        metadata = soup.find('meta', attrs={'name': 'i18n-status'})
        page_stats['runtime'] += len(scripts)
        page_stats['hreflang'] += len(alternates)
        page_stats['metadata'] += int(metadata is not None and metadata.get('content') == 'machine-draft')
        check(len(scripts) == 1, f'{page.relative_to(repo)}: runtime tag count={len(scripts)}', errors)
        check(set(LOCALES) | {'x-default'} <= alternates, f'{page.relative_to(repo)}: incomplete hreflang set', errors)
        check(metadata is not None and metadata.get('content') == 'machine-draft', f'{page.relative_to(repo)}: missing machine-draft metadata', errors)
    result = {'ok': not errors, 'repo': str(repo), 'mode': args.mode, 'catalogKeys': len(expected), 'locales': LOCALES, 'pageStats': page_stats, 'errors': errors}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
