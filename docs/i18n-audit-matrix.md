# GugoPro Finance i18n Audit Matrix

Audit date: 2026-08-27

This is an engineering audit of the two repositories. `runtime` means a page uses a shared client-side i18n runtime; `metadata-only` means hreflang is present without evidence that page content is translated; `none` means no i18n marker was detected. Static locale counts are not treated as proof of full content parity.

## Executive matrix

| Repository | HTML | Finance pages | Root finance pages | Runtime pages | Metadata-only | Unlocalized | Locale dirs found |
|---|---:|---:|---:|---:|---:|---:|---|
| `gugopro-academy` | 327 | 171 | 99 | 99 | 0 | 72 | en=34, es=34, ja=34, ko=34, vi=34, zh-cn=34 |
| `gugopro-site` | 272 | 260 | 148 | 64 | 16 | 180 | de=4, en=90, es=4, fr=4, ja=4, pt=4, zh-CN=4 |

## Implemented shared-runtime target surface

| Repository | Target pages | Target pages using runtime | Resource catalog keys |
|---|---:|---:|---:|
| `gugopro-academy` | 99 | 99 | 4150 |
| `gugopro-site` | 47 | 47 | 3222 |

## Eight-locale coverage matrix

| Repository | zh-TW | zh-CN | en | ja | de | fr | es | pt |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `gugopro-academy ` | 0 | 0 | 12 | 12 | 0 | 0 | 12 | 0 |
| `gugopro-site ` | 0 | 4 | 88 | 4 | 4 | 4 | 4 | 4 |

## Findings and implementation boundary

The audit distinguishes three different delivery models: independent static locale pages, a shared page with client-side locale resources, and pages that contain no localization marker. A shared runtime can preserve one DOM/CSS layout while translating content, but it does not automatically prove that every page has complete semantic translation or that every canvas/SVG label is localized.

Pages with no runtime or static locale counterpart are the highest-priority gap. Pages with hreflang only require content verification before they can be described as translated. The report also records dynamic DOM assignment density so interactive tools can be checked separately from static headings and labels.

## Per-repository detail

### `gugopro-academy`

The repository contains 327 HTML pages, of which 171 are in the finance surface. It has 99 finance pages using runtime markers, 0 with metadata-only markers, and 72 without an i18n marker. The scan found 66 dynamic DOM assignment sites in finance pages.

| Locale | Finance HTML files | Static counterparts missing versus root finance set |
|---|---:|---:|
| `zh-TW` | 0 | n/a |
| `zh-CN` | 0 | 87 |
| `en` | 12 | 87 |
| `ja` | 12 | 87 |
| `de` | 0 | 99 |
| `fr` | 0 | 99 |
| `es` | 12 | 87 |
| `pt` | 0 | 99 |

I18n-related files: `i18n/catalog.json`, `i18n/de.json`, `i18n/en.json`, `i18n/es.json`, `i18n/fr.json`, `i18n/glossary.json`, `i18n/ja.json`, `i18n/pt.json`, `i18n/zh-CN.json`, `i18n/zh-TW.json`, `i18n-source-catalog.json`, `i18n/gugopro-i18n.js`.

Runtime candidates: `i18n/gugopro-i18n.js`.

### `gugopro-site`

The repository contains 272 HTML pages, of which 260 are in the finance surface. It has 64 finance pages using runtime markers, 16 with metadata-only markers, and 180 without an i18n marker. The scan found 1998 dynamic DOM assignment sites in finance pages.

| Locale | Finance HTML files | Static counterparts missing versus root finance set |
|---|---:|---:|
| `zh-TW` | 0 | n/a |
| `zh-CN` | 4 | 144 |
| `en` | 88 | 60 |
| `ja` | 4 | 144 |
| `de` | 4 | 144 |
| `fr` | 4 | 144 |
| `es` | 4 | 144 |
| `pt` | 4 | 144 |

I18n-related files: `docs/i18n-audit-matrix.json`, `i18n/catalog.json`, `i18n/de.dynamic.json`, `i18n/de.json`, `i18n/en.dynamic.json`, `i18n/en.json`, `i18n/es.dynamic.json`, `i18n/es.json`, `i18n/fr.dynamic.json`, `i18n/fr.json`, `i18n/glossary.json`, `i18n/ja.dynamic.json`, `i18n/ja.json`, `i18n/phrases.json`, `i18n/pt.dynamic.json`, `i18n/pt.json`, `i18n/zh-CN.dynamic.json`, `i18n/zh-CN.json`, `i18n/zh-TW.dynamic.json`, `i18n/zh-TW.json`.

Runtime candidates: `i18n/gugopro-i18n.js`.

## Priority order

1. Keep the deployment source repositories separate and do not copy a page from one host into the other without verifying the Pages source.
2. Complete shared runtime coverage for all finance pages before attempting independent static copies; this avoids eight divergent HTML templates.
3. Add explicit keys for dynamic tool labels, validation messages, chart legends and aria labels; static headings alone are insufficient.
4. Add visual and DOM smoke tests at 1440×900 and 390×844 for all eight locale parameters that are actually supported by the selected runtime.
5. Use native-finance review for terminology before claiming publication-grade localization. Machine translation is a draft, not a quality certificate.
