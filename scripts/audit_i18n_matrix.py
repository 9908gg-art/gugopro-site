#!/usr/bin/env python3
"""Audit finance-page i18n coverage across the two GugoPro repositories."""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path

LOCALES = ["zh-TW", "zh-CN", "en", "ja", "de", "fr", "es", "pt"]
LOCALE_DIRS = {"en", "es", "ja", "de", "fr", "pt", "zh-CN", "zh-cn", "ko", "vi"}
FINANCE_SEGMENTS = {"academy", "articles", "guides", "tools", "quant-lab", "quant_lab"}
FINANCE_FILE_RE = re.compile(r"(^|/)(academy|articles/investment|guides|tools|quant(?:-lab|_lab)?)(/|$)", re.I)
LANG_RE = re.compile(r"<html\b[^>]*\blang=[\"']([^\"']+)", re.I)


def rel_files(repo: Path, suffix: str) -> list[Path]:
    return sorted(p.relative_to(repo) for p in repo.rglob(f"*{suffix}") if ".git" not in p.parts)


def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def is_finance_page(path: Path) -> bool:
    s = path.as_posix().lower()
    # Academy's root index is the finance knowledge-tree landing page; include
    # it explicitly while keeping unrelated site homepages outside the scope.
    return s == 'index.html' or bool(FINANCE_FILE_RE.search(s))


def locale_of_html(text: str) -> str | None:
    m = LANG_RE.search(text)
    return m.group(1) if m else None


def page_i18n_mode(text: str) -> str:
    if re.search(r"gugopro[-_]i18n|i18n/.*\.js|data-i18n|gugopro_locale", text, re.I):
        return "runtime"
    if re.search(r"hreflang", text, re.I):
        return "metadata-only"
    return "none"


def implementation_target_pages(repo: Path, html: list[Path]) -> list[Path]:
    if repo.name == 'gugopro-academy':
        excluded = LOCALE_DIRS
        return sorted(p for p in html if (p.as_posix() == 'index.html' or p.parts[0] in {'guides', 'tools', 'quant'}) and not (set(p.parts) & excluded))
    if repo.name == 'gugopro-site':
        return sorted(p for p in html if p.parts and ((p.parts[0] == 'academy') or p.as_posix().startswith('articles/investment/')))
    return []


def audit_repo(repo: Path) -> dict:
    html = rel_files(repo, ".html")
    js = rel_files(repo, ".js")
    json_files = rel_files(repo, ".json")
    html_text = {p: read(repo / p) for p in html}
    target_pages = implementation_target_pages(repo, html)
    finance = [p for p in html if is_finance_page(p)]
    locale_counts = Counter()
    locale_finance_counts = Counter()
    locale_examples: dict[str, list[str]] = {loc: [] for loc in LOCALES}
    runtime_pages = []
    hreflang_pages = []
    none_pages = []
    lang_values = Counter()
    dynamic_strings = 0
    finance_scripts = Counter()
    for p, text in html_text.items():
        first = p.parts[0] if p.parts else ""
        locale_key = first if first in LOCALE_DIRS else None
        if locale_key:
            locale_counts[locale_key] += 1
            if is_finance_page(p):
                locale_finance_counts[locale_key] += 1
                if len(locale_examples.setdefault(locale_key, [])) < 5:
                    locale_examples[locale_key].append(p.as_posix())
        if is_finance_page(p):
            mode = page_i18n_mode(text)
            if mode == "runtime":
                runtime_pages.append(p.as_posix())
            elif mode == "metadata-only":
                hreflang_pages.append(p.as_posix())
            else:
                none_pages.append(p.as_posix())
            dynamic_strings += len(re.findall(r"(?:textContent|innerHTML|insertAdjacentHTML)\s*=", text))
            for script in re.findall(r"<(?:script|link)[^>]+(?:src|href)=[\"']([^\"']+)", text, re.I):
                if script.endswith(".js") or ".js?" in script:
                    finance_scripts[script.split("?")[0]] += 1
        lang = locale_of_html(text)
        if lang:
            lang_values[lang] += 1

    i18n_files = [p.as_posix() for p in json_files + js if "i18n" in p.as_posix().lower() or p.as_posix().startswith("i18n/")]
    locale_pack_files = [p.as_posix() for p in json_files if p.as_posix().startswith("i18n/")]
    runtime_candidates = [p.as_posix() for p in js if "i18n" in p.as_posix().lower()]
    root_finance = [p for p in finance if not (p.parts and p.parts[0] in LOCALE_DIRS)]
    missing_static = {}
    for loc in LOCALES:
        if loc == "zh-TW":
            continue
        candidates = {"zh-CN": {"zh-cn", "zh-CN"}.copy()}.get(loc, {loc})
        matches = [p.as_posix() for p in html if p.parts and p.parts[0] in candidates and is_finance_page(p)]
        missing_static[loc] = len(root_finance) - len(matches)

    return {
        "repo": str(repo),
        "head": read(repo / ".git/HEAD").strip(),
        "html_pages": len(html),
        "js_files": len(js),
        "json_files": len(json_files),
        "finance_pages": len(finance),
        "root_finance_pages": len(root_finance),
        "locale_counts": dict(sorted(locale_counts.items())),
        "locale_finance_counts": dict(sorted(locale_finance_counts.items())),
        "locale_examples": locale_examples,
        "expected_locales": LOCALES,
        "static_finance_missing_by_locale": missing_static,
        "implementation_target_pages": len(target_pages),
        "implementation_target_runtime_pages": sum(page_i18n_mode(html_text[p]) == 'runtime' for p in target_pages),
        "runtime_finance_pages": len(runtime_pages),
        "metadata_only_finance_pages": len(hreflang_pages),
        "unlocalized_finance_pages": len(none_pages),
        "dynamic_dom_assignments_in_finance_pages": dynamic_strings,
        "html_lang_values": dict(lang_values),
        "i18n_files": i18n_files,
        "locale_pack_files": locale_pack_files,
        "runtime_candidates": runtime_candidates,
        "finance_script_refs": dict(finance_scripts.most_common()),
        "sample_runtime_pages": runtime_pages[:12],
        "sample_unlocalized_pages": none_pages[:12],
    }


def markdown_report(results: list[dict]) -> str:
    lines = [
        "# GugoPro Finance i18n Audit Matrix",
        "",
        f"Audit date: {date.today().isoformat()}",
        "",
        "This is an engineering audit of the two repositories. `runtime` means a page uses a shared client-side i18n runtime; `metadata-only` means hreflang is present without evidence that page content is translated; `none` means no i18n marker was detected. Static locale counts are not treated as proof of full content parity.",
        "",
        "## Executive matrix",
        "",
        "| Repository | HTML | Finance pages | Root finance pages | Runtime pages | Metadata-only | Unlocalized | Locale dirs found |",
        "|---|---:|---:|---:|---:|---:|---:|---|",
    ]
    for r in results:
        lines.append(f"| `{Path(r['repo']).name}` | {r['html_pages']} | {r['finance_pages']} | {r['root_finance_pages']} | {r['runtime_finance_pages']} | {r['metadata_only_finance_pages']} | {r['unlocalized_finance_pages']} | {', '.join(f'{k}={v}' for k,v in r['locale_counts'].items()) or 'none'} |")
    lines += [
        "",
        "## Implemented shared-runtime target surface",
        "",
        "| Repository | Target pages | Target pages using runtime | Resource catalog keys |",
        "|---|---:|---:|---:|",
    ]
    for r in results:
        catalog_path = Path(r['repo']) / 'i18n/catalog.json'
        try:
            resource_keys = len(json.loads(catalog_path.read_text(encoding='utf-8')).get('strings', []))
        except (OSError, json.JSONDecodeError):
            resource_keys = 0
        lines.append(f"| `{Path(r['repo']).name}` | {r['implementation_target_pages']} | {r['implementation_target_runtime_pages']} | {resource_keys} |")
    lines += [
        "",
        "## Eight-locale coverage matrix",
        "",
        "| Repository | zh-TW | zh-CN | en | ja | de | fr | es | pt |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in results:
        counts = r["locale_finance_counts"]
        lines.append("| `{} ` | {} | {} | {} | {} | {} | {} | {} | {} |".format(Path(r['repo']).name, *[counts.get(loc, 0) for loc in LOCALES]))
    lines += [
        "",
        "## Findings and implementation boundary",
        "",
        "The audit distinguishes three different delivery models: independent static locale pages, a shared page with client-side locale resources, and pages that contain no localization marker. A shared runtime can preserve one DOM/CSS layout while translating content, but it does not automatically prove that every page has complete semantic translation or that every canvas/SVG label is localized.",
        "",
        "Pages with no runtime or static locale counterpart are the highest-priority gap. Pages with hreflang only require content verification before they can be described as translated. The report also records dynamic DOM assignment density so interactive tools can be checked separately from static headings and labels.",
        "",
        "## Per-repository detail",
        "",
    ]
    for r in results:
        lines += [
            f"### `{Path(r['repo']).name}`",
            "",
            f"The repository contains {r['html_pages']} HTML pages, of which {r['finance_pages']} are in the finance surface. It has {r['runtime_finance_pages']} finance pages using runtime markers, {r['metadata_only_finance_pages']} with metadata-only markers, and {r['unlocalized_finance_pages']} without an i18n marker. The scan found {r['dynamic_dom_assignments_in_finance_pages']} dynamic DOM assignment sites in finance pages.",
            "",
            "| Locale | Finance HTML files | Static counterparts missing versus root finance set |",
            "|---|---:|---:|",
        ]
        for loc in LOCALES:
            lines.append(f"| `{loc}` | {r['locale_finance_counts'].get(loc, 0)} | {r['static_finance_missing_by_locale'].get(loc, 'n/a')} |")
        lines += [
            "",
            f"I18n-related files: {', '.join('`'+p+'`' for p in r['i18n_files'][:20]) or 'none detected'}.",
            "",
            f"Runtime candidates: {', '.join('`'+p+'`' for p in r['runtime_candidates'][:20]) or 'none detected'}.",
            "",
        ]
    lines += [
        "## Priority order",
        "",
        "1. Keep the deployment source repositories separate and do not copy a page from one host into the other without verifying the Pages source.",
        "2. Complete shared runtime coverage for all finance pages before attempting independent static copies; this avoids eight divergent HTML templates.",
        "3. Add explicit keys for dynamic tool labels, validation messages, chart legends and aria labels; static headings alone are insufficient.",
        "4. Add visual and DOM smoke tests at 1440×900 and 390×844 for all eight locale parameters that are actually supported by the selected runtime.",
        "5. Use native-finance review for terminology before claiming publication-grade localization. Machine translation is a draft, not a quality certificate.",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("repos", nargs="+", type=Path)
    parser.add_argument("--json-out", type=Path, required=True)
    parser.add_argument("--md-out", type=Path, required=True)
    args = parser.parse_args()
    results = [audit_repo(repo.resolve()) for repo in args.repos]
    args.json_out.write_text(json.dumps({"audit_date": date.today().isoformat(), "locales": LOCALES, "repositories": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.md_out.write_text(markdown_report(results), encoding="utf-8")
    print(f"AUDIT repositories={len(results)} locales={len(LOCALES)} markdown={args.md_out} json={args.json_out}")


if __name__ == "__main__":
    main()
