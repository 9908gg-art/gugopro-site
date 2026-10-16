# AI tool language audit

This inventory is generated from the current HTML source. **Interface locales** are the languages an AI tool declares for its UI selector; **functional locales** are tool settings such as speech pair, translation target, lookup, or study language. `Missing from baseline` compares a declared UI catalog with the site baseline of Traditional Chinese (`zh-TW`), English (`en`), and Japanese (`ja`); it does not claim that a tool must support languages it does not advertise.

- AI HTML pages audited: **28**
- AI pages with a declared UI catalog: **24**
- AI pages with only functional language controls or no UI catalog: **4**

## Tool matrix

| AI tool page | Interface locales | Functional locales | Missing from baseline UI catalog | Status |
|---|---|---|---|---|
| de/tools/ai/tarot-master.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| de/tools/ai/ziwei-astrology.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| en/tools/ai/tarot-master.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| en/tools/ai/ziwei-astrology.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| en/tools/health/tdee-macros-calculator.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| en/tools/health/weight-loss-planner.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| es/tools/ai/tarot-master.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| es/tools/ai/ziwei-astrology.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| fr/tools/ai/tarot-master.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| fr/tools/ai/ziwei-astrology.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| ja/tools/ai/tarot-master.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| ja/tools/ai/ziwei-astrology.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| ja/tools/health/tdee-macros-calculator.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| ja/tools/health/weight-loss-planner.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| pt/tools/ai/tarot-master.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| pt/tools/ai/ziwei-astrology.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| tools/ai/english-speaking-tutor.html | — | zh-TW, zh-CN, en, ja, ko, fr, de, es, th-TH, vi-VN, id-ID, pt, it-IT, ru-RU, ar-SA, hi-IN, ms-MY, nl-NL, pl-PL, tr-TR | — | functional language controls only; UI locale catalog not declared |
| tools/ai/gemini-api-quota.html | — | — | — | no language selector/catalog detected |
| tools/ai/nutrition-meal-planner.html | — | — | — | no language selector/catalog detected |
| tools/ai/nutritionist.html | zh-TW, zh-CN, en, ja, ko, es, fr, de, it-IT, pt, ru-RU, th-TH, vi-VN, id-ID, hi-IN, ar-SA | — | — | catalog declared |
| tools/ai/realtime-translator.html | zh, en, ja, zh-TW, zh-CN, fr, de, es | — | — | catalog declared |
| tools/ai/tarot-master.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| tools/ai/ziwei-astrology.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| tools/ai-media/ai-video-tracker.html | — | zh-TW, en, ja | — | functional language controls only; UI locale catalog not declared |
| tools/health/tdee-macros-calculator.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| tools/health/weight-loss-planner.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| zh-CN/tools/ai/tarot-master.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |
| zh-CN/tools/ai/ziwei-astrology.html | zh-TW, zh-CN, en, ja, de, fr, es, pt | — | — | catalog declared |

## Control details

| AI tool page | Declared controls |
|---|---|
| de/tools/ai/tarot-master.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| de/tools/ai/ziwei-astrology.html | `interface:locale-select=dynamic` |
| en/tools/ai/tarot-master.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| en/tools/ai/ziwei-astrology.html | `interface:locale-select=dynamic` |
| en/tools/health/tdee-macros-calculator.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| en/tools/health/weight-loss-planner.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| es/tools/ai/tarot-master.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| es/tools/ai/ziwei-astrology.html | `interface:locale-select=dynamic` |
| fr/tools/ai/tarot-master.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| fr/tools/ai/ziwei-astrology.html | `interface:locale-select=dynamic` |
| ja/tools/ai/tarot-master.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| ja/tools/ai/ziwei-astrology.html | `interface:locale-select=dynamic` |
| ja/tools/health/tdee-macros-calculator.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| ja/tools/health/weight-loss-planner.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| pt/tools/ai/tarot-master.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| pt/tools/ai/ziwei-astrology.html | `interface:locale-select=dynamic` |
| tools/ai/english-speaking-tutor.html | `functional:my-lang=zh-TW,zh-CN,en-US,ja-JP,ko-KR,fr-FR,de-DE,es-ES,th-TH,vi-VN,id-ID,pt-BR,it-IT,ru-RU,ar-SA,hi-IN,ms-MY,nl-NL,pl-PL,tr-TR; functional:target-lang=en-US,ja-JP,ko-KR,zh-TW,zh-CN,fr-FR,de-DE,es-ES,th-TH,vi-VN,id-ID,pt-BR,it-IT,ru-RU,ar-SA,hi-IN,ms-MY,nl-NL,pl-PL,tr-TR; functional:word-lookup-lang=dynamic; functional:study-language=dynamic` |
| tools/ai/gemini-api-quota.html | `—` |
| tools/ai/nutrition-meal-planner.html | `—` |
| tools/ai/nutritionist.html | `interface:interface-lang=zh-TW,zh-CN,en-US,ja-JP,ko-KR,es-ES,fr-FR,de-DE,it-IT,pt-BR,ru-RU,th-TH,vi-VN,id-ID,hi-IN,ar-SA; functional:btn-lang-toggle` |
| tools/ai/realtime-translator.html | `interface:ui-lang-toggle=zh,en,ja; functional:partner-lang=dynamic; functional:self-lang=dynamic` |
| tools/ai/tarot-master.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| tools/ai/ziwei-astrology.html | `interface:locale-select=dynamic` |
| tools/ai-media/ai-video-tracker.html | `functional:language=zh-TW,en,ja` |
| tools/health/tdee-macros-calculator.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| tools/health/weight-loss-planner.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| zh-CN/tools/ai/tarot-master.html | `interface:interface-lang=zh-TW,zh-CN,en,ja,de,fr,es,pt; functional:btn-lang-toggle` |
| zh-CN/tools/ai/ziwei-astrology.html | `interface:locale-select=dynamic` |
