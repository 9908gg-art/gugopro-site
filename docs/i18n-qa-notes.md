# GugoPro Finance Academy 8-language i18n QA notes

## 2026-08-27 local smoke test

Local server: `http://127.0.0.1:8127/`

The source page set contains 47 HTML pages: 1 Academy hub, Academy lesson/research pages, 19 Academy finance tools, 19 investment articles including Category 13, and the investment article index. The source catalog contains 3,222 stable strings/attributes including dynamic UI templates. Locale packs were generated for `zh-TW`, `zh-CN`, `en`, `ja`, `de`, `fr`, `es`, and `pt`; each pack has the same 3,222 keys. Dynamic template packs contain 63 CJK-bearing templates each. Code expressions and protected JavaScript placeholders were preserved by the generation validator.

### Browser evidence

- `http://127.0.0.1:8127/academy/index.html?lang=en` rendered the full Academy hub in English. The course map retained 22 chapters, the interactive lab retained 19 tools, the quant research desk remained present, and Category 13 remained present. The switcher displayed the supported locale options and the dark high-contrast selector was readable.
- The browser console probe reported `document.documentElement.lang=en`, an English title, eight selector options, i18n resources under `/i18n/`, no horizontal overflow at the browser viewport, and the expected translated hero copy.
- Selecting `zh-CN` changed the URL to `?lang=zh-CN`, set the page language to Simplified Chinese, and reloaded the same DOM/layout. The course map, tool cards, quant desk, Category 13 and footer all remained present; translated labels and descriptions rendered without missing sections.
- The local mobile viewport shown by the browser remained readable with the same grid structure; the language selector remained visible in the compact header. A separate headless 390x844 screenshot pass is still required before production deployment.

### Known architecture boundary

The implementation keeps one zh-TW DOM/CSS master and applies locale resources to text, labels, metadata and dynamic result fragments. This guarantees shared grid/flex structure, spacing tokens, card ratios and breakpoints, while allowing natural translation lengths. It does not claim mathematically identical glyph widths or translated line breaks, which are inherently language-dependent.

The runtime is client-side only. It does not fetch market data, quotes, trading signals or execute orders. All finance tool calculations remain local to the browser. Language preference is stored in `localStorage` under `gugopro_locale`; switching writes `?lang=<locale>` and reloads the same page. Canonical/hreflang metadata is generated for each page.

### English Playbook local smoke test

- `http://127.0.0.1:8127/articles/investment/18-trend-following-breakout-playbook.html?lang=en` rendered the complete English long-form article with the article title, the nine chapter navigation anchors, tables, references and internal Academy tool CTAs intact.
- The browser viewport showed the translated title and nine substantive chapter pills. The structure remained the same as the zh-TW master; the long-form article was not forced into a single-screen layout.
- The console probe checked `document.documentElement.lang`, the title, chapter hashes, table count, reference presence, internal tool link count, no-real-time-signal boundary, horizontal overflow and loaded `/i18n/` resources. The result object was logged to the browser console for later production QA.

### English tool local smoke test

- `academy/tools/position-sizing.html?lang=en&qa=header` now mounts the language selector inside the existing `.navin` header instead of creating a separate top-of-page row. The compact two-column tool layout remained intact and showed no pixels below the viewport in the browser capture.
- The default position-sizing values were visible in English. A browser click was issued against the calculate button; the result remained blank, so the existing tool event binding must be checked independently before production release. No console output was returned by the browser console viewer at that point.

### Helper and unit-boundary follow-up

The shared Academy script now provides defensive `window.num`, `window.money`, and `window.bindCalc` helpers for the legacy simple tools. The i18n phrase replacement now applies single-character units only at numeric／whitespace／punctuation boundaries; the English position-sizing selector correctly displays `日本語` rather than corrupting the option with the translation of `日`. A browser click still showed unchanged dashes, so the next check uses a direct DOM click and inspects the resulting values before finalizing.

### Shared helper cache diagnosis

The first clean navigation of `position-sizing.html` showed `window.bindCalc`, `window.num`, and `window.money` as undefined even though the HTTP response contained the updated `academy.js`. Loading the same script with a cache-busting query immediately exposed all three helpers, indicating a stale browser cache rather than a syntax error. The deployment will therefore use a versioned `academy.js` query string on Academy pages, followed by a fresh-browser smoke test. The tool page header and language selector remain correctly aligned.

### Versioned helper verification

After adding `?v=20260827-i18n1` to Academy shared scripts, a fresh navigation of `position-sizing.html?lang=en&qa=versioned` showed `window.bindCalc`, `window.num`, and `window.money` as functions on first load. A direct DOM click produced the expected default calculation: 952 shares, NT$10,000 loss tolerance, NT$11 risk per share and NT$95,200 nominal position. The header language selector showed all locale labels correctly, including `日本語`.

### Dynamic output fragment test

The English tool successfully loaded `/i18n/phrases.json` with HTTP 200 and returned `股 → shares`. When a new result node containing `123 股` was inserted, the runtime’s mutation observer preserved the number and translated the unit fragment without changing layout or script execution. This confirms the resource/fragment mechanism for dynamic output text.

### Headless desktop visual comparison

Screenshots were generated at 1440×900 for all eight locales. Visual inspection of the zh-TW master and English mirror showed the same nav height, hero geometry, content max-width, statistic card positions, card widths and section start; only text glyphs differ as expected. The language control is dark, white-text, focusable and located in the existing header. Full screenshot files are retained in `/tmp/gugopro-academy-<locale>-1440x900.png`.

### Headless mobile visual comparison

Screenshots were generated at 390×844 for all eight locales. Inspection of English and French showed that the header remains compact, the language control stays visible, the hero text wraps within the same content width, CTA buttons remain usable, and the statistic cards continue in the same one-column mobile flow. Translation length changes line breaks, but does not change the responsive grid or cause horizontal overflow. Full mobile screenshot files are retained in `/tmp/gugopro-academy-<locale>-390x844.png`.

### Locale-specific hero DOM check

Chromium `--dump-dom` confirmed the following live localized h1/title pairs: zh-TW uses `把市場噪音，變成可執行的決策。`; zh-CN uses `把市场噪音，变成可执行的决策。`; English uses `Address market noise, Turn into actionable decisions.`; Japanese uses `市場ノイズを扱う、実行可能な意思決定にする。`; German uses `Marktrauschen adressieren, In umsetzbare Entscheidungen verwandeln.`; French uses `Traitez le bruit de marché, Transformer en décisions actionnables.`; Spanish uses `Trata el ruido del mercado, Convertir en decisiones accionables.`; Portuguese uses `Trate o ruído de mercado, Transformar em decisões acionáveis.`. Each page returned the expected locale code and the same Academy section counts.

### Production English smoke test

GitHub Pages run `33049628921` for commit `12197986352e8221bff9952d46557f6424958f4e` completed successfully. At `https://gugopro.com/academy/index.html?lang=en&qa=1219798`, the production browser rendered the English hero and all 22 course chapters, 19 tools, quant research desk and Category 13. The runtime loaded `gugopro-i18n.js?v=20260827-i18n1`, `catalog.json`, `en.json`, `phrases.json` and `en.dynamic.json` with HTTP 200. The debug check reported `document.documentElement.lang=en`, selector value `en`, English hero present, Traditional hero absent, and all resource URLs under `/i18n/`.

### Production visual comparison

Production screenshots for all eight locales were captured after Pages success at 1440×900 and 390×844. Visual inspection of `gugopro-production-zh-TW-1440x900.png` and `gugopro-production-en-1440x900.png` confirmed identical header height, hero background geometry, content container, CTA positions, four statistic cards and course-section start. Mobile captures use the same 390px responsive breakpoint and remain free of horizontal clipping; translated text changes line wraps only.

### Production eight-locale DOM smoke test

The retry-protected production validator completed all eight HTTPS pages successfully. Every locale returned the expected `html lang` (`zh-TW`, `zh-CN`, `en`, `ja`, `de`, `fr`, `es`, `pt`), exactly eight language options, 22 course chapters, 19 interactive tools, Category 13 content, and the versioned i18n runtime. The production titles were localized for all eight languages. The initial `resourceHints` field in the diagnostic was intentionally not used as a pass criterion because Chromium's post-JavaScript dump does not serialize performance resource entries; direct browser fetch checks on the English production page returned HTTP 200 for the runtime, catalog, locale, phrase and dynamic resources.

### Final Pages-success smoke test

After final QA commit `d90a66fd1c134287826359e8922637df50b02fb0` and Pages run `33050927580` completed successfully, the browser reopened the English Academy at `https://gugopro.com/academy/index.html?lang=en&qa=d90a66f` and the English Trend/Breakout Playbook at `https://gugopro.com/articles/investment/18-trend-following-breakout-playbook.html?lang=en&qa=d90a66f`. Both displayed English content, the eight-option selector, and the unchanged Academy／long-form article geometry. The Playbook showed all nine chapter navigation controls, its research references and internal tool links. No production DOM change was required after the smoke test.
