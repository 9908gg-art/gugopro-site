#!/usr/bin/env python3
from __future__ import annotations
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRA = {'de','fr','es','pt','ko','vi','zh-CN','zh-cn'}
AI_MARKERS = ('tools/ai/', 'tools/ai-media/', '/tools/ai/', '/tools/ai-media/')
NONAI_LOCALES = ['zh-TW','en','ja']
AI_LOCALES = ['zh-TW','zh-CN','en','ja','de','fr','es','pt']


def is_ai(path: Path) -> bool:
    s = '/' + path.relative_to(ROOT).as_posix()
    return any(x in s for x in AI_MARKERS)


def inject_runtime(path: Path) -> bool:
    text = path.read_text(encoding='utf-8', errors='replace')
    if is_ai(path):
        return False
    original = text
    text = re.sub(r'\s*<script\b[^>]*src=["\'][^"\']*gugopro-i18n\.js[^>]*>\s*</script>', '', text, flags=re.I)
    text = re.sub(r'\s*<link\b(?=[^>]*\brel=["\']alternate["\'])(?=[^>]*\bhreflang=["\'][^"\']+["\'])[^>]*>', '', text, flags=re.I)
    text = re.sub(r'\s*<meta\b[^>]*name=["\']i18n-status["\'][^>]*>', '', text, flags=re.I)
    href = './' + path.name
    alternates = '\n'.join(f'<link rel="alternate" hreflang="{loc}" href="{href}{"?lang=" + loc if loc != "zh-TW" else ""}">' for loc in NONAI_LOCALES)
    alternates += f'\n<link rel="alternate" hreflang="x-default" href="{href}">'
    text = re.sub(r'</head>', alternates + '\n</head>', text, count=1, flags=re.I)
    marker = '<script src="/i18n/gugopro-i18n.js?v=tri-locale-20260912" defer></script>'
    if re.search(r'</head>', text, re.I):
        text = re.sub(r'</head>', marker + '\n</head>', text, count=1, flags=re.I)
    else:
        raise ValueError(f'{path}: missing </head>')
    path.write_text(text, encoding='utf-8')
    return text != original


def remove_nonai_locale_copies() -> list[str]:
    removed = []
    for locale in EXTRA:
        root = ROOT / locale
        if not root.exists():
            continue
        for p in sorted(root.rglob('*.html')):
            if not is_ai(p):
                removed.append(str(p.relative_to(ROOT)))
                p.unlink()
        # Remove empty directories, but keep directories containing AI pages.
        for d in sorted([p for p in root.rglob('*') if p.is_dir()], reverse=True):
            try: d.rmdir()
            except OSError: pass
        try: root.rmdir()
        except OSError: pass
    return removed


def main() -> None:
    pages = []
    for p in ROOT.rglob('*.html'):
        if '.git' in p.parts or is_ai(p):
            continue
        pages.append(p)
    changed = sum(inject_runtime(p) for p in pages)
    removed = remove_nonai_locale_copies()
    print(f'nonai_pages={len(pages)} runtime_changed={changed} removed_extra_locale_pages={len(removed)}')
    for p in removed: print('removed', p)

if __name__ == '__main__':
    main()
