#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PUBLISHER = 'ca-pub-4756902118634553'
SCRIPT = f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={PUBLISHER}" crossorigin="anonymous"></script>'
SCRIPT_BYTES = SCRIPT.encode('utf-8')
MARKER = b'<!-- GugoPro AdSense publisher script -->'
TARGET = MARKER + b'\n' + SCRIPT_BYTES
SKIP = {ROOT / 'googled0dfad57039c64f6.html'}

# Remove any previous AdSense loader tags and our marker before inserting one canonical copy.
OLD_TAG = re.compile(rb'\s*<script\b[^>]*src=["\'][^"\']*pagead\\?2?\.googlesyndication\.com[^>]*></script>\s*', re.I)
# The actual URL contains pagead2.googlesyndication.com; this pattern also handles legacy variants.
OLD_TAG = re.compile(rb'\s*<script\b[^>]*src=["\'][^"\']*googlesyndication\.com/pagead/js/adsbygoogle\.js[^>]*></script>\s*', re.I)
MARKER_BLOCK = re.compile(rb'\s*<!-- GugoPro AdSense publisher script -->\s*', re.I)

changed = []
skipped = []
errors = []
for path in sorted(ROOT.rglob('*.html')):
    if '.git' in path.parts:
        continue
    if path in SKIP:
        skipped.append(str(path.relative_to(ROOT)))
        continue
    raw = path.read_bytes()
    cleaned = MARKER_BLOCK.sub(b'\n', raw)
    cleaned = OLD_TAG.sub(b'\n', cleaned)
    heads = list(re.finditer(rb'<head\b[^>]*>', cleaned, re.I))
    if len(heads) != 1:
        errors.append(f'{path.relative_to(ROOT)}: expected exactly one <head>, found {len(heads)}')
        continue
    if re.search(rb'</head\s*>', cleaned, re.I) is None:
        errors.append(f'{path.relative_to(ROOT)}: missing </head>')
        continue
    pos = heads[0].end()
    updated = cleaned[:pos] + b'\n' + TARGET + cleaned[pos:]
    if updated != raw:
        path.write_bytes(updated)
        changed.append(str(path.relative_to(ROOT)))

if errors:
    raise SystemExit('\n'.join(errors))
print(f'html_total={len(changed) + len(skipped)}')
print(f'changed={len(changed)}')
print(f'skipped_verification={len(skipped)}')
for item in skipped:
    print(f'skipped: {item}')
