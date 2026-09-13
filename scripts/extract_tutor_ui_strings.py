from pathlib import Path
from bs4 import BeautifulSoup
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tools' / 'ai' / 'english-speaking-tutor.html'
html = SOURCE.read_text(encoding='utf-8', errors='ignore')
soup = BeautifulSoup(html, 'html.parser')
for tag in soup(['script', 'style', 'svg', 'path', 'noscript']):
    tag.decompose()

regions = []
for selector in ['header', '#side-menu', '#chat-container', '.bottom-controls', '.modal-overlay', '.ai-seo-help-toggle', '.ai-seo-drawer']:
    regions.extend(soup.select(selector))
seen = set()
items = []
for region in regions:
    for node in region.find_all(True):
        if node.get('id') in {'chat-container'} or node.select_one('.message-body, .message-user, .message-tutor'):
            continue
        for attr in ['placeholder', 'title', 'aria-label', 'data-label']:
            value = ' '.join((node.get(attr) or '').split())
            if value and value not in seen:
                seen.add(value); items.append({'kind': attr, 'text': value})
    for node in region.find_all(string=True):
        if node.parent and node.parent.name in {'script', 'style'}:
            continue
        if node.find_parent(class_=lambda x: x and any('message' in y for y in (x if isinstance(x, list) else [x]))):
            continue
        value = ' '.join(str(node).split())
        if value and len(value) > 1 and value not in seen:
            seen.add(value); items.append({'kind': 'text', 'text': value})

# Functional and interface language labels are a deliberate fixed catalog.
lang_options = []
for option in soup.select('#my-lang option'):
    lang_options.append({'value': option.get('value'), 'native': ' '.join(option.get_text(' ', strip=True).split())})

out = {'source': str(SOURCE.relative_to(ROOT)), 'items': items, 'language_options': lang_options}
path = ROOT / 'docs' / 'tutor-ui-source-strings.json'
path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'interface strings: {len(items)}')
print(f'language options: {len(lang_options)}')
print(f'wrote {path}')
