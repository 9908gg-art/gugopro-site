# 全站 SEO 靜態／動態標題稽核與驗證報告

- 執行日期：2026-10-18
- 靜態 Title/H1 映射檔案：72 / 72 通過，0 失敗。
- 全站內容頁缺失 H1：0。GSC 驗證檔視為非內容資產。
- 動態 `document.title` 賦值：掃描到 11 處，均已分類；已修復的硬編碼衝突通過驗證。
- 動態檢查：8 項通過，0 失敗。
- JSON-LD 與 AdSense 程式碼：72 個映射頁均未改動。

> 附件所寫「通過 71 個檔案」與映射表不一致：首頁 3 + 工具 12 + 專欄 57 = 72；本報告依實際 72 筆映射計數，不虛報為 71。

## 動態標題檢查

| 檔案 | 賦值數 | 修復／狀態 |
|---|---:|---|
| `i18n/gugopro-i18n.js` | 1 | INTENTIONAL — conditional user-locale translation; source locale preserves the original title. |
| `tools/ai-media/ai-video-tracker.html` | 1 | FIXED — applyLang now uses the approved zh-TW, Japanese, and English full titles. |
| `tools/ai/tarot-master.html` | 1 | FIXED — both zh-TW metadata sources now match the mapped title; other locales remain localized. |
| `tools/ai/ziwei-astrology.html` | 1 | FIXED — zh-TW uses the mapped seoTitle; non-zh locales retain their existing title fallback. |
| `tools/converter-en.js` | 1 | INACTIVE — legacy helper is not referenced by any HTML page; left unchanged. |
| `tools/english/l-player-study.html` | 2 | FIXED — title now always comes from the current language pageTitle; default Podcast sample no longer overrides the tab title. |
| `tools/health/tdee-macros-calculator.html` | 2 | FIXED — both dynamic updates use localized seoTitle; zh-TW matches the mapped static title. |
| `tools/health/weight-loss-planner.html` | 2 | FIXED — both dynamic updates use localized seoTitle; zh-TW matches the mapped static title. |

## 動態檢查明細

- **L-Player (zh/en/ja)**：PASS — both assignments and all three localized pageTitle values are aligned
- **YouTube tracker (zh-TW/ja/en)**：PASS — applyLang uses all three approved full titles
- **Tarot metadata**：PASS — zh-TW metaTitle and localized document.title source match
- **Zi Wei**：PASS — zh-TW COPY.seoTitle matches the static SEO title; other locales retain fallback
- **tools/health/tdee-macros-calculator.html**：PASS — both title updates use localized seoTitle; zh-TW matches the static title
- **tools/health/weight-loss-planner.html**：PASS — both title updates use localized seoTitle; zh-TW matches the static title
- **Shared I18n translator**：PASS — retained as conditional translation; source locale returns the original title
- **Legacy converter-en.js**：PASS — assignment is in an orphan script with no HTML references

## 完整 document.title 賦值清單

- `i18n/gugopro-i18n.js:116` — `ue(document.title);if(title!==document.title)document.title=title;`
- `tools/ai/tarot-master.html:8689` — `document.title = localizedMeta?.title || \`${interfaceText('appName')} | GugoPro\`;`
- `tools/ai/ziwei-astrology.html:295` — `}){document.documentElement.lang=COPY.locale;document.title=COPY.seoTitle||(COPY.title+' | GugoPro');const select=document.getElementById('locale-select');if(select){select.replaceChildren();SUPPORTED_LOCALES.forEach(locale=>{const item=I18N[locale];`
- `tools/ai-media/ai-video-tracker.html:262` — `ntElement.lang=lang;$('language').value=lang;document.title=lang==='zh-TW'?"YouTube 續集與新季追蹤器｜跨頻道自動找下一集、新季數與短劇連載 - GugoPro":lang==='ja'?"YouTube 続編・新シーズン追跡｜次のエピソード・新シーズン自動検索 - GugoPro":"YouTube Sequel & Season Tracker | Find Next Episodes & Seasons -`
- `tools/converter-en.js:57` — `document.title = translate(document.title);`
- `tools/english/l-player-study.html:1508` — `if ($("mainPageTitle")) document.title = trainT("pageTitle");`
- `tools/english/l-player-study.html:3068` — `document.title = trainT("pageTitle");`
- `tools/health/tdee-macros-calculator.html:1358` — `document.title = copy.seoTitle || \`${copy.appName} | GugoPro\`;`
- `tools/health/tdee-macros-calculator.html:3008` — `document.title = copy.seoTitle || \`${copy.appName} | GugoPro\`;`
- `tools/health/weight-loss-planner.html:1329` — `document.title = copy.seoTitle || \`${copy.appName} | GugoPro\`;`
- `tools/health/weight-loss-planner.html:3117` — `document.title = copy.seoTitle || \`${copy.appName} | GugoPro\`;`

## 執行結果

- 靜態 SEO 檔案：**72 通過 / 0 失敗**。
- 動態標題驗證：**8 通過 / 0 失敗**。
- 本次修改的靜態映射頁：0；動態標題檔案：0。
