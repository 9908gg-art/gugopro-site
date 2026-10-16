# 風險報酬與最大回撤工具 QA（第三輪）

## 測試基線

本地預覽：`http://127.0.0.1:8123/academy/tools/risk-return-drawdown.html`。測試頁面使用空白歷史序列，不預填市場行情；計算只在瀏覽器進行。

## 本地瀏覽器結果

### 價格序列正常案例

輸入價格 `100,110,104,88,98,112`、起始資金 100,000、MAR 0%、每日年化因子 252，並輸入多頭 Entry 100、Stop 95、Target 115、勝率 25%。工具回報：累積報酬 12.00%、MDD -20.00%、MDD 金額 NT$ 22,000、恢復期 2 期、R:R 3.00R、期望值 0.00R；產生 6 筆權益路徑列、7 個 SVG 子元素，下載按鈕啟用。Sharpe 與 Sortino 也成功輸出有限值；數字完全由上述虛構教學序列重算，非市場行情。

### 無效資料 fail-closed

將序列改成 `100,not-a-number,104` 後按計算，狀態顯示第 2 筆不是有效數字，結果表 0 列、MDD 顯示 `—`、下載按鈕 disabled；舊結果沒有殘留。

### 報酬序列與自訂年化

切換至報酬序列，輸入 `2,-1,3,-4,5`、MAR 1%、自訂年化期數 12，工具成功回報 5 期觀測、年化報酬 12.02%、MDD -4.00%、6 筆權益路徑列。這個結果僅為公式回歸案例。

### 空頭風報比

輸入方向空頭、Entry 100、Stop 105、Target 85、勝率 50%，工具回報 R:R 3.00R、期望值 1.00R；驗證了空頭風險／報酬距離方向與多頭不同但共用同一期望值框架。

## 待完成

1. 檢查瀏覽器 console 是否零 error／warning。
2. 檢查 390×844 與桌面版的欄寬、SVG、結果表水平溢出與按鈕可讀性。
3. 跑全站 validator，之後再 commit／push／等待 Pages 成功。

## Console 與手機版

本地瀏覽器 console 檢視未出現 JavaScript error 或 warning；正常、無效、報酬序列與空頭 R:R 測試均由 UI 回報結果。

以 Chromium 390×844 headless 截圖檢查，工具採單欄 RWD；回到教學連結、區段導航、資料型態／頻率 select、歷史序列 textarea 與標籤均在內容寬度內，沒有水平溢出、文字重疊或不可辨識的壓縮。結果區在後續頁面內容中使用 2 欄 metrics、可橫向滾動的回撤表與響應式 SVG；桌面版維持左右輸入／結果雙欄。

## Validator 結果

通過：`verify_risk_return_drawdown.py`、`verify_academy.py`、`verify_research_contract.py`、`verify_quant_upgrade.py`、`node --check academy/tools/risk-return-drawdown.js`、`git diff --check`。結果為文章 9,465 字元、4 張表、MDD 案例 −20%、峰到谷索引 1→3、R:R 3.00R、無外部 fetch。

`verify_pages.py` 在未涉及本輪的 `data/amazon-categories.json` 讀取 `us_categories[0]['subcategories']` 時出現 KeyError；該 data 檔在本輪沒有 diff，且此 validator 針對 Amazon 頁面，與第三輪文章／風險工具無關。未以放寬條件掩蓋此既有 schema mismatch，交付時會明確揭露。

## 入口與 sitemap

`academy/index.html` 的互動決策工具數量由 14 更新為實際 15，並新增第三輪工具卡片；文章索引文案同步更新。`sitemap.xml` 中既有文章網址的 lastmod 更新為 2026-08-27，新工具網址加入且文章／工具各只出現一次； XML parse 與第三輪 validator 均通過。

截至此階段，與第三輪直接相關的檢查全部通過；`verify_pages.py` 的既有 Amazon `subcategories` schema mismatch 已在前一段記錄，沒有修改資料檔或以假資料繞過。

## Production regression

GitHub Pages run `32988763305` 對 commit `aa2387ba9ec16beef2a1622a18b9be1a293a21d0` 已完成 `success`。正式工具 `https://gugopro.com/academy/tools/risk-return-drawdown.html?qa=aa2387b` 實測價格序列 `100,110,104,88,98,112` 與單筆 R:R 案例，回報累積報酬 12.00%、MDD -20.00%、MDD 金額 NT$ 22,000、恢復期 2 期、R:R 3.00R，產生 6 筆 path rows、7 個 SVG children，且 performance resource 沒有 API／quote／market／WebSocket 請求。

正式文章 `https://gugopro.com/articles/investment/06-sharpe-mdd-risk-control.html?qa=aa2387b` 已公開，標題、六個主導航章節、額外完整案例、4 個 References、風報比／風險分析／既有工具 CTA 均可見；正式文章頁 console 檢視為無輸出，沒有新增 JavaScript error。

## Final production evidence

QA evidence commit `99f5216c5196a6f496248cecbf012ea90c777403` 對應的 Pages run `32989013126` 已完成 `success`。在 `?qa=99f5216` cache-busted 正式工具頁執行同一組價格／R:R smoke test，回報累積報酬 12.00%、MDD -20.00%、MDD 金額 NT$ 22,000、恢復期 2 期、R:R 3.00R、6 筆回撤路徑列；performance resource 仍無 API／quote／market／WebSocket 請求。
