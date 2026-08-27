#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import re

LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt']
VERSION = 'machine-draft-20260827'
SCRIPT_MARKER = 'gugopro-i18n.js'


def rel_page_href(page: Path) -> str:
    return './' + page.name


def inject(path: Path) -> bool:
    text = path.read_text(encoding='utf-8', errors='replace')
    original = text
    # Keep one deterministic versioned runtime tag if previous attempts or legacy markers exist.
    text = re.sub(r'\s*<script\b[^>]*src=["\'][^"\']*gugopro-i18n\.js[^>]*>\s*</script>', '', text, flags=re.I)
    text = re.sub(r'\s*<meta\b[^>]*name=["\']i18n-status["\'][^>]*>', '', text, flags=re.I)
    text = re.sub(r'\s*<link\b[^>]*hreflang=["\'][^"\']+["\'][^>]*>', '', text, flags=re.I)
    href = rel_page_href(path)
    alternates = []
    for locale in LOCALES:
        target = href if locale == 'zh-TW' else href + '?lang=' + locale
        alternates.append(f'<link rel="alternate" hreflang="{locale}" href="{target}">')
    alternates.append(f'<link rel="alternate" hreflang="x-default" href="{href}">')
    marker = (
        f'<meta name="i18n-status" content="machine-draft">\n'
        + '\n'.join(alternates)
        + f'\n<script src="/i18n/gugopro-i18n.js?v={VERSION}" defer></script>'
    )
    if re.search(r'</head>', text, re.I):
        text = re.sub(r'</head>', marker + '\n</head>', text, count=1, flags=re.I)
    else:
        raise ValueError(f'{path}: missing </head>')
    path.write_text(text, encoding='utf-8')
    return text != original


def target_pages(repo: Path, mode: str) -> list[Path]:
    if mode == 'academy':
        roots = [repo / 'index.html', repo / 'guides', repo / 'tools', repo / 'quant']
        excluded = {'en', 'es', 'ja', 'zh-cn', 'zh-CN', 'de', 'fr', 'pt'}
        pages = []
        for root in roots:
            if root.is_file():
                pages.append(root)
            elif root.is_dir():
                pages.extend(p for p in root.rglob('*.html') if not (set(p.relative_to(repo).parts) & excluded))
        return sorted(set(pages))
    if mode == 'site':
        # Exact catalog-backed finance surface: Academy subtree, investment articles,
        # and finance-specific converter/tools pages only. Non-finance utilities are excluded.
        paths = set()
        for root in [repo / 'academy', repo / 'articles' / 'investment']:
            if root.exists():
                paths.update(root.rglob('*.html'))
        # Keep the site scope aligned with the existing 3,222-key catalog:
        # 28 Academy pages plus 19 investment articles. Finance utility pages
        # outside this catalog require a separate extraction pass, so they are
        # intentionally not claimed by this runtime batch.
        return sorted(paths)
    raise ValueError(mode)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--mode', choices=['academy', 'site'], required=True)
    args = parser.parse_args()
    pages = target_pages(args.repo, args.mode)
    changed = sum(inject(path) for path in pages)
    print(f'pages={len(pages)} changed={changed} repo={args.repo} mode={args.mode}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
