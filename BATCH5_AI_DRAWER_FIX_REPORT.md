# GugoPro 第 5 批 AI 工具 UI 抽屜修復報告

執行日期：2026-09-07

## 修復目標

第 5 批 AI SEO／FAQ 內容原先直接位於部分 AI 工具的主操作區，會擠壓 100vh 對話頁、輸入框與語音控制。此次修復保留既有 SEO／FAQ 真實 DOM 與 JSON-LD，改為由右上角「ℹ️ 說明與常見問題」入口開啟右側 slide-over drawer，主操作區不再承載長篇 SEO 內容。

## 覆蓋頁面

| 頁面 | 抽屜 | SEO／FAQ 不在 `main` | FAQ 與 JSON-LD 一致 |
|---|:---:|:---:|:---:|
| `tools/ai/english-speaking-tutor.html` | 通過 | 通過 | 通過 |
| `tools/ai/realtime-translator.html` | 通過 | 通過 | 通過 |
| `tools/pdf/pdf-suite.html` | 通過 | 通過 | 通過 |
| `tools/ai/tarot-master.html` | 通過 | 通過 | 通過 |
| `tools/ai/ziwei-astrology.html` | 通過 | 通過 | 通過 |
| `tools/health/tdee-macros-calculator.html` | 通過 | 通過 | 通過 |
| `tools/health/weight-loss-planner.html` | 通過 | 通過 | 通過 |
| `tools/ai/gemini-api-quota.html` | 通過（靜態轉址頁） | 通過 | 通過 |
| `amazon/index.html` | 通過 | 通過 | 通過 |

## 實作內容

共用 `tools/ai-seo-drawer.css` 提供右側固定抽屜、暗色半透明遮罩、抽屜內獨立滾動、行動版寬度與 reduced-motion 支援。共用 `tools/ai-seo-drawer.js` 處理入口／關閉按鈕、遮罩點擊、Escape 關閉、開啟時焦點移至關閉按鈕、關閉後焦點回復、Tab focus trap 與頁面滾動鎖定。原 SEO section 被保留為同一 DOM 節點，移入 drawer body，不以 display:none 取代內容。

另為沒有 favicon 宣告的 AI 頁面補上既有 `/favicon.svg`，消除本地 Chromium 自動請求 `/favicon.ico` 所造成的 Console 404。

## 回歸測試

Playwright／Chromium 測試使用 1440×1000 與 390×844 viewport。9 個頁面均通過抽屜存在、初始關閉、開啟、FAQ 數量、Escape 關閉、焦點回復與水平溢位檢查。AI 口說導師確認 `#chat-container`、`#user-text`、`#btn-mic`、`#btn-mic-my` 存在且可見，並完成文字輸入 smoke test；即時翻譯器確認 `#partner-area`、`#self-area`、`#mode-tap`、`#mode-walkie` 存在且可見。全部頁面 Console error 為 0，桌面與手機版水平溢位為 0。

核心 script 完整性比較結果為 9／9 通過；既有 inline／external scripts 未被修改，包含 Web Speech、Web Audio、WebSocket、API 呼叫、對話與命理／抽牌邏輯。新增的 drawer script 是獨立外掛資產。

## 截圖

| 狀態 | 檔案 |
|---|---|
| 1440×1000，純淨主操作區 | `artifacts/ai-drawer/tutor-closed.png` |
| 1440×1000，右側抽屜開啟 | `artifacts/ai-drawer/tutor-drawer-open.png` |
| 390×844，右側抽屜開啟 | `artifacts/ai-drawer/tutor-mobile-drawer-open.png` |
| 390×844，翻譯器抽屜開啟 | `artifacts/ai-drawer/translator-mobile-drawer-open.png` |

完整機器測試結果位於 `artifacts/ai-drawer/summary.json`；視覺驗收觀察位於 `artifacts/ai-drawer/visual-findings.md`。
