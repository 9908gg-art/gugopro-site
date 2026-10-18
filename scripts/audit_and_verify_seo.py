#!/usr/bin/env python3
"""Audit and repair mapped static SEO titles/H1 and known dynamic document.title overrides."""
from __future__ import annotations

from collections import Counter
from datetime import date
from pathlib import Path
import html
import json
import re
import sys

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import update_seo_titles_h1 as normalizer  # source-aware, structure-preserving helpers

SEO_MAPPING = normalizer.SEO_MAPPING
NON_PAGE_ASSETS = {'googled0dfad57039c64f6.html'}
REPORT_PATH = ROOT / 'seo_dynamic_title_audit_report.md'

# Explicit localized tab titles supplied in the task attachment.
LPLAYER_TITLES = {
    'zh': SEO_MAPPING['tools/english/l-player-study.html']['title'],
    'en': 'YouTube Bilingual Shadowing Player | Subtitle Dictation & Study - GugoPro L-Player',
    'ja': 'YouTube 2言語字幕シャドーイング学習機｜ディクテーション・精聴・発音練習 - GugoPro',
}
TRACKER_TITLES = {
    'zh-TW': SEO_MAPPING['tools/ai-media/ai-video-tracker.html']['title'],
    'ja': 'YouTube 続編・新シーズン追跡｜次のエピソード・新シーズン自動検索 - GugoPro',
    'en': 'YouTube Sequel & Season Tracker | Find Next Episodes & Seasons - GugoPro',
}


def normalized_text(value: str) -> str:
    return ' '.join(value.split())


def replace_exact(text: str, old: str, new: str, *, expected: int = 1, new_already: int = 0, label: str) -> str:
    count_old = text.count(old)
    count_new = text.count(new)
    if count_old == expected:
        return text.replace(old, new)
    if count_old == 0 and count_new == expected + new_already:
        return text  # idempotent rerun
    raise RuntimeError(f'{label}: expected {expected} old or already-patched match; old={count_old}, new={count_new}')


def replace_page_title(text: str, old: str, new: str, locale: str) -> str:
    old_literal = json.dumps(old, ensure_ascii=False)
    new_literal = json.dumps(new, ensure_ascii=False)
    pattern = re.compile(r'(\bpageTitle\s*:\s*)' + re.escape(old_literal))
    updated, count = pattern.subn(lambda m: m.group(1) + new_literal, text)
    if count == 1:
        return updated
    current = re.compile(r'\bpageTitle\s*:\s*' + re.escape(new_literal))
    if count == 0 and len(current.findall(text)) == 1:
        return text
    raise RuntimeError(f'L-Player {locale} pageTitle: expected one old or new dictionary value; old={count}, new={len(current.findall(text))}')


def patch_file(rel: str, mutator) -> bool:
    path = ROOT / rel
    if not path.is_file():
        raise FileNotFoundError(rel)
    original = path.read_text(encoding='utf-8')
    updated = mutator(original)
    if updated != original:
        path.write_text(updated, encoding='utf-8')
        return True
    return False


def repair_dynamic_titles() -> list[str]:
    changed = []

    # L-Player: never let the sample Podcast title replace the product/browser-tab title.
    rel = 'tools/english/l-player-study.html'
    def patch_lplayer(text):
        text = replace_exact(
            text,
            'document.title = state.id === DEFAULT_VIDEO_ID ? `${DEFAULT_COURSE_TITLE} | L-Player` : trainT("pageTitle");',
            'document.title = trainT("pageTitle");', new_already=1, label='L-Player state title override')
        text = replace_exact(
            text,
            'document.title = id === DEFAULT_VIDEO_ID ? `${DEFAULT_COURSE_TITLE} | L-Player` : trainT("pageTitle");',
            'document.title = trainT("pageTitle");', new_already=1, label='L-Player id title override')
        old_titles = {
            'zh': 'YouTube 影音「聽・寫・口說」多國語言跟讀器',
            'en': 'YouTube Listen, Write & Speak Multilingual Learning Studio',
            'ja': 'YouTube「聞く・書く・話す」多言語学習器',
        }
        for locale, old in old_titles.items():
            text = replace_page_title(text, old, LPLAYER_TITLES[locale], locale)
        return text
    if patch_file(rel, patch_lplayer): changed.append(rel)

    # Tracker: keep language switching, but use the approved full SEO title per locale.
    rel = 'tools/ai-media/ai-video-tracker.html'
    old_tracker = "document.title=lang==='zh-TW'?'YouTube 續集與新季追蹤器 - GugoPro':lang==='ja'?'YouTube 続編・新シーズン追跡 - GugoPro':'YouTube Sequel & Season Tracker - GugoPro';"
    new_tracker = (
        "document.title=lang==='zh-TW'?" + json.dumps(TRACKER_TITLES['zh-TW'], ensure_ascii=False) +
        ":lang==='ja'?" + json.dumps(TRACKER_TITLES['ja'], ensure_ascii=False) +
        ":" + json.dumps(TRACKER_TITLES['en'], ensure_ascii=False) + ';'
    )
    if patch_file(rel, lambda s: replace_exact(s, old_tracker, new_tracker, label='tracker language title')): changed.append(rel)

    # Tarot: keep localized metadata behavior while aligning both zh-TW metadata sources.
    rel = 'tools/ai/tarot-master.html'
    old_tarot = 'AI 塔羅大師｜五種塔羅牌陣、提問指南與自我反思 - GugoPro'
    new_tarot = SEO_MAPPING[rel]['title']
    if patch_file(rel, lambda s: replace_exact(s, old_tarot, new_tarot, expected=2, new_already=1, label='Tarot zh-TW metaTitle')): changed.append(rel)

    # Zi Wei: use an explicit zh-TW SEO title, while preserving localized fallbacks.
    rel = 'tools/ai/ziwei-astrology.html'
    old_ziwei_key = '"title":"GugoPro AI 紫微斗數大師"'
    seo_field = '"seoTitle":' + json.dumps(SEO_MAPPING[rel]['title'], ensure_ascii=False)
    def patch_ziwei(text):
        # The old key is a prefix of the patched key, so normalize any repeated
        # identical seoTitle fields instead of treating that prefix as unpatched.
        pattern = re.compile(re.escape(old_ziwei_key) + r'(?:,' + re.escape(seo_field) + r')*')
        matches = list(pattern.finditer(text))
        if len(matches) != 1:
            raise RuntimeError(f'Zi Wei zh-TW SEO title field: expected one locale object, found {len(matches)}')
        text = pattern.sub(old_ziwei_key + ',' + seo_field, text, count=1)
        text = replace_exact(text, "document.title=COPY.title+' | GugoPro';", "document.title=COPY.seoTitle||(COPY.title+' | GugoPro');", label='Zi Wei dynamic title expression')
        return text
    if patch_file(rel, patch_ziwei): changed.append(rel)

    # Health tools: zh-TW page titles were being replaced by generic app names/old SEO copy.
    health_specs = [
        ('tools/health/tdee-macros-calculator.html', 'AI 專屬營養師 | GugoPro'),
        ('tools/health/weight-loss-planner.html', 'AI減肥瘦身教練｜科學減脂與熱量赤字規劃 | GugoPro'),
    ]
    for rel, old_seo in health_specs:
        target = SEO_MAPPING[rel]['title']
        def patch_health(text, old_seo=old_seo, target=target, rel=rel):
            text = replace_exact(text, json.dumps(old_seo, ensure_ascii=False), json.dumps(target, ensure_ascii=False), label=f'{rel} zh-TW seoTitle')
            old_assignment = 'document.title = `${copy.appName} | GugoPro`;'
            new_assignment = 'document.title = copy.seoTitle || `${copy.appName} | GugoPro`;'
            text = replace_exact(text, old_assignment, new_assignment, new_already=1, label=f'{rel} initial localized title')
            return text
        if patch_file(rel, patch_health): changed.append(rel)

    return changed


def repair_static_titles() -> list[str]:
    changed = []
    for rel, meta in SEO_MAPPING.items():
        path = ROOT / rel
        if not path.is_file():
            raise FileNotFoundError(rel)
        original = path.read_text(encoding='utf-8')
        content = original
        soup = BeautifulSoup(content, 'html.parser')
        title_nodes = soup.find_all('title')
        titles_ok = bool(title_nodes) and all(normalized_text(n.get_text(' ', strip=True)) == normalized_text(meta['title']) for n in title_nodes)
        if not titles_ok:
            if title_nodes:
                content = normalizer.set_title(content, meta['title'], rel)
            elif re.search(r'</head\s*>', content, re.I):
                tag = '<title>' + html.escape(meta['title'], quote=False) + '</title>\n'
                content = re.sub(r'</head\s*>', lambda m: tag + m.group(0), content, count=1, flags=re.I)
            else:
                raise RuntimeError(f'{rel}: no safe <head> insertion point for title')

        soup = BeautifulSoup(content, 'html.parser')
        h1_nodes = soup.find_all('h1')
        if len(h1_nodes) > 1:
            raise RuntimeError(f'{rel}: multiple H1 elements; refusing ambiguous repair')
        if h1_nodes:
            if normalized_text(h1_nodes[0].get_text(' ', strip=True)) != normalized_text(meta['h1']):
                content = normalizer.set_existing_h1(content, meta['h1'], rel)
        else:
            h2_map = getattr(normalizer, 'H2_TO_H1_IDS', {})
            if rel in h2_map:
                content = normalizer.promote_heading(content, rel, h2_map[rel], meta['h1'])
            elif rel == 'tools/ai/english-speaking-tutor.html':
                content = normalizer.insert_visible_h1(content, rel, meta['h1'])
            else:
                raise RuntimeError(f'{rel}: no explicit safe H1 insertion rule')

        if content != original:
            path.write_text(content, encoding='utf-8')
            changed.append(rel)
    return changed


def scan_dynamic_assignments() -> list[dict[str, str | int]]:
    extensions = {'.html', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'}
    excluded = {'.git', 'node_modules', 'dist', 'build', '__pycache__', '.venv'}
    pattern = re.compile(r'document\s*\.\s*title\s*=')
    found = []
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or path.suffix.lower() not in extensions or any(part in excluded for part in path.parts):
            continue
        try:
            lines = path.read_text(encoding='utf-8').splitlines()
        except (UnicodeDecodeError, OSError):
            continue
        rel = path.relative_to(ROOT).as_posix()
        for line_no, line in enumerate(lines, 1):
            if line.lstrip().startswith(('//', '/*', '*', '<!--')):
                continue
            for match in pattern.finditer(line):
                snippet = ' '.join(line[max(0, match.start() - 45):min(len(line), match.end() + 190)].split())
                found.append({'path': rel, 'line': line_no, 'snippet': snippet})
    return found


def verify_dynamic(assignments: list[dict[str, str | int]]) -> list[tuple[str, str]]:
    checks: list[tuple[str, str]] = []
    lp = (ROOT / 'tools/english/l-player-study.html').read_text(encoding='utf-8')
    page_titles = re.findall(r'\bpageTitle\s*:\s*"([^"]*)"', lp)
    if len(page_titles) != 3 or set(page_titles) != set(LPLAYER_TITLES.values()):
        raise AssertionError('L-Player language pageTitle dictionary does not match the three approved titles')
    if lp.count('document.title = trainT("pageTitle");') != 2 or 'document.title = state.id === DEFAULT_VIDEO_ID' in lp or 'document.title = id === DEFAULT_VIDEO_ID' in lp:
        raise AssertionError('L-Player still allows the default Podcast title to override document.title')
    checks.append(('L-Player (zh/en/ja)', 'PASS — both assignments and all three localized pageTitle values are aligned'))

    tracker = (ROOT / 'tools/ai-media/ai-video-tracker.html').read_text(encoding='utf-8')
    for title in TRACKER_TITLES.values():
        if json.dumps(title, ensure_ascii=False) not in tracker:
            raise AssertionError('Tracker language title missing: ' + title)
    checks.append(('YouTube tracker (zh-TW/ja/en)', 'PASS — applyLang uses all three approved full titles'))

    tarot_rel = 'tools/ai/tarot-master.html'
    tarot = (ROOT / tarot_rel).read_text(encoding='utf-8')
    if tarot.count(SEO_MAPPING[tarot_rel]['title']) != 3 or 'localizedMeta?.title' not in tarot:
        raise AssertionError('Tarot zh-TW metadata is not aligned or localized title flow changed')
    checks.append(('Tarot metadata', 'PASS — zh-TW metaTitle and localized document.title source match'))

    ziwei_rel = 'tools/ai/ziwei-astrology.html'
    ziwei = (ROOT / ziwei_rel).read_text(encoding='utf-8')
    if ziwei.count('"seoTitle":' + json.dumps(SEO_MAPPING[ziwei_rel]['title'], ensure_ascii=False)) != 1 or 'document.title=COPY.seoTitle||(COPY.title+\' | GugoPro\');' not in ziwei:
        raise AssertionError('Zi Wei zh-TW dynamic title is not aligned')
    checks.append(('Zi Wei', 'PASS — zh-TW COPY.seoTitle matches the static SEO title; other locales retain fallback'))

    for rel in ('tools/health/tdee-macros-calculator.html', 'tools/health/weight-loss-planner.html'):
        src = (ROOT / rel).read_text(encoding='utf-8')
        expected = SEO_MAPPING[rel]['title']
        if json.dumps(expected, ensure_ascii=False) not in src or src.count('document.title = copy.seoTitle || `${copy.appName} | GugoPro`;') != 2:
            raise AssertionError(f'{rel}: localized SEO title does not drive both dynamic title updates')
        checks.append((rel, 'PASS — both title updates use localized seoTitle; zh-TW matches the static title'))

    by_path = Counter(a['path'] for a in assignments)
    i18n = (ROOT / 'i18n/gugopro-i18n.js').read_text(encoding='utf-8')
    if by_path['i18n/gugopro-i18n.js'] != 1 or 'current===SOURCE?raw:replaceValue(raw)' not in i18n:
        raise AssertionError('Shared I18n title translation is not the expected conditional locale behavior')
    checks.append(('Shared I18n translator', 'PASS — retained as conditional translation; source locale returns the original title'))

    html_sources = [p for p in ROOT.rglob('*.html') if '.git' not in p.parts and 'node_modules' not in p.parts]
    converter_refs = [p.relative_to(ROOT).as_posix() for p in html_sources if 'converter-en.js' in p.read_text(encoding='utf-8', errors='ignore')]
    if by_path['tools/converter-en.js'] != 1 or converter_refs:
        raise AssertionError('converter-en.js assignment inventory or reference check changed unexpectedly')
    checks.append(('Legacy converter-en.js', 'PASS — assignment is in an orphan script with no HTML references'))

    expected_assignments = 11
    if len(assignments) != expected_assignments:
        raise AssertionError(f'Expected {expected_assignments} document.title assignments after fixes, found {len(assignments)}')
    reviewed_paths = {
        'tools/english/l-player-study.html', 'tools/ai-media/ai-video-tracker.html',
        'tools/ai/tarot-master.html', 'tools/ai/ziwei-astrology.html',
        'tools/health/tdee-macros-calculator.html', 'tools/health/weight-loss-planner.html',
        'i18n/gugopro-i18n.js', 'tools/converter-en.js',
    }
    unexpected = set(by_path) - reviewed_paths
    if unexpected:
        raise AssertionError('Unreviewed dynamic document.title assignments: ' + ', '.join(sorted(unexpected)))
    return checks


def protected_payload(text: str) -> tuple[list[str], list[str]]:
    jsonld = re.findall(r'<script\b(?=[^>]*\btype=["\']application/ld\+json["\'])[^>]*>.*?</script\s*>', text, re.I | re.S)
    ads = re.findall(r'pagead2\.googlesyndication\.com|ca-pub-[^\s"\'<>]+|<ins\b[^>]*adsbygoogle[^>]*>', text, re.I | re.S)
    return jsonld, ads


def main() -> int:
    if len(SEO_MAPPING) != 72:
        raise RuntimeError(f'Expected the supplied mapping to contain 72 entries; found {len(SEO_MAPPING)}')
    protected_before = {rel: protected_payload((ROOT / rel).read_text(encoding='utf-8')) for rel in SEO_MAPPING}
    dynamic_changed = repair_dynamic_titles()
    static_changed = repair_static_titles()

    static_failures = []
    for rel, meta in SEO_MAPPING.items():
        soup = BeautifulSoup((ROOT / rel).read_text(encoding='utf-8'), 'html.parser')
        titles = soup.find_all('title')
        h1s = soup.find_all('h1')
        if not titles or any(normalized_text(t.get_text(' ', strip=True)) != normalized_text(meta['title']) for t in titles):
            static_failures.append((rel, 'Title'))
        if len(h1s) != 1 or normalized_text(h1s[0].get_text(' ', strip=True)) != normalized_text(meta['h1']):
            static_failures.append((rel, 'H1'))
    if static_failures:
        raise AssertionError('Static Title/H1 verification failed: ' + repr(static_failures))

    site_h1_missing = []
    for path in ROOT.rglob('*.html'):
        if any(part in {'.git', 'node_modules', 'dist', 'build'} for part in path.parts):
            continue
        if path.relative_to(ROOT).as_posix() in NON_PAGE_ASSETS:
            continue
        if not BeautifulSoup(path.read_text(encoding='utf-8', errors='replace'), 'html.parser').find('h1'):
            site_h1_missing.append(path.relative_to(ROOT).as_posix())
    if site_h1_missing:
        raise AssertionError('Site content pages missing H1: ' + ', '.join(site_h1_missing))

    assignments = scan_dynamic_assignments()
    dynamic_checks = verify_dynamic(assignments)
    protected_failures = []
    for rel, before in protected_before.items():
        after = protected_payload((ROOT / rel).read_text(encoding='utf-8'))
        if before != after:
            protected_failures.append(rel)
    if protected_failures:
        raise AssertionError('JSON-LD/AdSense payload changed unexpectedly: ' + ', '.join(protected_failures))

    grouped = Counter(a['path'] for a in assignments)
    notes = {
        'tools/english/l-player-study.html': 'FIXED — title now always comes from the current language pageTitle; default Podcast sample no longer overrides the tab title.',
        'tools/ai-media/ai-video-tracker.html': 'FIXED — applyLang now uses the approved zh-TW, Japanese, and English full titles.',
        'tools/ai/tarot-master.html': 'FIXED — both zh-TW metadata sources now match the mapped title; other locales remain localized.',
        'tools/ai/ziwei-astrology.html': 'FIXED — zh-TW uses the mapped seoTitle; non-zh locales retain their existing title fallback.',
        'tools/health/tdee-macros-calculator.html': 'FIXED — both dynamic updates use localized seoTitle; zh-TW matches the mapped static title.',
        'tools/health/weight-loss-planner.html': 'FIXED — both dynamic updates use localized seoTitle; zh-TW matches the mapped static title.',
        'i18n/gugopro-i18n.js': 'INTENTIONAL — conditional user-locale translation; source locale preserves the original title.',
        'tools/converter-en.js': 'INACTIVE — legacy helper is not referenced by any HTML page; left unchanged.',
    }
    lines = [
        '# 全站 SEO 靜態／動態標題稽核與驗證報告',
        '',
        f'- 執行日期：{date.today().isoformat()}',
        f'- 靜態 Title/H1 映射檔案：{len(SEO_MAPPING)} / {len(SEO_MAPPING)} 通過，0 失敗。',
        f'- 全站內容頁缺失 H1：{len(site_h1_missing)}。GSC 驗證檔視為非內容資產。',
        f'- 動態 `document.title` 賦值：掃描到 {len(assignments)} 處，均已分類；已修復的硬編碼衝突通過驗證。',
        f'- 動態檢查：{len(dynamic_checks)} 項通過，0 失敗。',
        '- JSON-LD 與 AdSense 程式碼：72 個映射頁均未改動。',
        '',
        '> 附件所寫「通過 71 個檔案」與映射表不一致：首頁 3 + 工具 12 + 專欄 57 = 72；本報告依實際 72 筆映射計數，不虛報為 71。',
        '',
        '## 動態標題檢查',
        '',
        '| 檔案 | 賦值數 | 修復／狀態 |',
        '|---|---:|---|',
    ]
    for path in sorted(grouped):
        lines.append(f'| `{path}` | {grouped[path]} | {notes[path]} |')
    lines += ['', '## 動態檢查明細', '']
    for name, result in dynamic_checks:
        lines.append(f'- **{name}**：{result}')
    lines += ['', '## 完整 document.title 賦值清單', '']
    for item in assignments:
        lines.append(f'- `{item["path"]}:{item["line"]}` — `{item["snippet"].replace("`", "\\`")}`')
    lines += [
        '',
        '## 執行結果',
        '',
        f'- 靜態 SEO 檔案：**{len(SEO_MAPPING)} 通過 / 0 失敗**。',
        f'- 動態標題驗證：**{len(dynamic_checks)} 通過 / 0 失敗**。',
        f'- 本次修改的靜態映射頁：{len(static_changed)}；動態標題檔案：{len(dynamic_changed)}。',
        '',
    ]
    REPORT_PATH.write_text('\n'.join(lines), encoding='utf-8')

    print('=== Static Title/H1 validation ===')
    print(f'PASS: {len(SEO_MAPPING)} mapped files / FAIL: 0')
    print(f'Whole-site content pages missing H1: {len(site_h1_missing)}')
    print('=== Dynamic document.title audit ===')
    print(f'Assignments scanned: {len(assignments)}; checks passed: {len(dynamic_checks)}; failed: 0')
    for name, result in dynamic_checks:
        print(f'[PASS] {name}: {result}')
    print('=== Changes ===')
    print('Static mapped pages repaired:', len(static_changed))
    print('Dynamic title source files repaired:', len(dynamic_changed))
    if dynamic_changed:
        print('Dynamic files:', ', '.join(dynamic_changed))
    print('Report:', REPORT_PATH.relative_to(ROOT).as_posix())
    print('Note: mapping contains 72 files, despite the attachment requesting 71 passes.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
