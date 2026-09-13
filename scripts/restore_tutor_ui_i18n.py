from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
page = ROOT / 'tools' / 'ai' / 'english-speaking-tutor.html'
text = page.read_text(encoding='utf-8')
tag = '<script defer src="../../i18n/tutor-ui-runtime.js?v=20260913-ui20"></script>'
if tag not in text:
    marker = '</head>'
    if marker not in text:
        raise SystemExit('missing </head>')
    text = text.replace(marker, f'{tag}{marker}', 1)
    page.write_text(text, encoding='utf-8')
    print('injected tutor UI runtime')
else:
    print('tutor UI runtime already present')
