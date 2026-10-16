# 8-language i18n machine-draft implementation

本次把主站既有 `academy/` 與 `articles/investment/` 的 47 個 catalog-backed 財經頁統一接上與 Academy 相同的 client-side runtime。`zh-TW` 是單一 HTML／CSS／DOM 母版；其他七種語言透過 `?lang=` 與 `localStorage` 選擇本地 JSON 資源，不建立分叉的靜態 HTML。

## Coverage

| Item | Result |
|---|---:|
| Single-template target pages | 47 (`academy/` 28 + `articles/investment/` 19) |
| Catalog strings | 3,222 |
| Locale resource files | 8 plus existing dynamic packs |
| Key parity | 3,222 / 3,222 for every locale |
| Runtime and hreflang injection | 47 / 47 pages |
| Translation status | `machine-draft`; native-finance review required |

The runtime translates static text, selected attributes, dynamically inserted DOM text, SVG text, and Canvas `fillText`／`strokeText` calls where catalog or dynamic phrase coverage exists. It does not add market-data requests, trading signals, account actions, or server-side collection to calculators.

## Draft generation and safety

Existing shared locale resources and dynamic templates were retained, then marked with explicit `translationStatus: machine-draft`, `reviewRequired: true`, and glossary metadata. The token repair and verifier protect `${...}` expressions, URLs, HTML／SVG fragments, backticks, JSON／JS／DOM／API tokens, tickers, and finance terms including `Futures`, `Arbitrage`, `Beta`, `Z-Score`, `Grid Trading`, `ETF`, `DCF`, `MACD`, `RSI`, `KDJ`, `ATR`, `R:R`, `Pip`, `Swap`, `Forward`, and `NDF`.

> `machine-draft` is an engineering bridge, not a publication-quality translation certificate. Native-finance review is required before advertising the pages as professionally localized, especially for risk disclosures, tax language, regulatory references, derivatives terminology and calculator validation messages.

The current batch intentionally does not claim the unrelated converter, health, AI, games, or other non-catalog utility pages. Those pages need a separate extraction and review pass before they can safely share these finance resources.

## Verification commands

```bash
python3 scripts/verify_i18n.py --repo . --mode site
python3 scripts/verify_machine_draft.py --repo .
node --check i18n/gugopro-i18n.js
```
