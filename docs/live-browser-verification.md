# Live browser verification

The current working tree was served at `https://8000-irmsqs9ijx73nx26bdgqi-0c708526.sg2.manus.computer` and opened in the sandbox browser.

On `tools/converter-pdf-pagenumber.html?lang=ja`, the live DOM reported `document.documentElement.lang === "ja"`, exactly one `#gugo-locale-select`, its options were `zh-TW`, `en`, and `ja`, zero legacy `.converter-language-link`, `.lang-selector`, `.lang-dropdown`, or `.lang-btn` nodes, and no pending first-paint flag after load. The rendered page and controls were visibly Japanese while the shared selector remained the sole interface language control.

On `tools/converter-pdf-merge.html?lang=en`, the rendered page showed a single `#gugo-locale-select` with `zh-TW`, `en`, and `ja`. The live DOM reported `lang: "en"`, zero `.locale-control`/page-local `*-language` header controls, zero legacy language nodes, and one loaded shared runtime resource.

On `tools/health/tdee-macros-calculator.html`, the live DOM reported one AI-owned `#interface-lang` with eight catalog values (`zh-TW`, `zh-CN`, `en`, `ja`, `de`, `fr`, `es`, `pt`), zero shared `#gugo-locale-select` elements, zero loaded `gugopro-i18n.js` resources, and zero legacy language nodes. This confirms that its own catalog remains independent.

On `tools/ai/english-speaking-tutor.html`, the live DOM reported no shared selector, no `#ui-language-section`/`#ui-language-select` unfinished panel, one working `#btn-lang-toggle`, four functional practice/lookup/study language controls, and zero loaded `gugopro-i18n.js` resources.

On `terms.html?lang=ja`, the live DOM reported `lang: "ja"`, exactly one shared selector with values `zh-TW`, `en`, and `ja`, and zero legacy language nodes. The localized terms content and navigation rendered in Japanese.
