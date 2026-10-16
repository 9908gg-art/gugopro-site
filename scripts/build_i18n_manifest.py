from pathlib import Path
import json

ROOT = Path('/home/ubuntu/gugopro-site')
source = json.loads((ROOT / 'i18n-source-catalog.json').read_text(encoding='utf-8'))
strings = source['strings']
out = ROOT / 'i18n'
out.mkdir(exist_ok=True)
(out / 'catalog.json').write_text(json.dumps({'sourceLanguage': 'zh-TW', 'catalogVersion': 1, 'strings': strings}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
identity = {str(row['id']): row['text'] for row in strings}
(out / 'zh-TW.json').write_text(json.dumps({'sourceLanguage': 'zh-TW', 'targetLanguage': 'zh-TW', 'catalogVersion': 1, 'translations': identity}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
dynamic_ids = [row for row in strings if '${' in row['text'] and any(chr(0x3400) <= ch <= chr(0x9fff) for ch in row['text'])]
identity_dynamic = {str(row['id']): row['text'] for row in dynamic_ids}
(out / 'zh-TW.dynamic.json').write_text(json.dumps({'sourceLanguage': 'zh-TW', 'targetLanguage': 'zh-TW', 'catalogVersion': 1, 'templates': identity_dynamic}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print({'catalog': len(strings), 'identity': len(identity), 'dynamic': len(identity_dynamic)})
