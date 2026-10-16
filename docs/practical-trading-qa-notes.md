# 第 13 類實戰交易 QA 紀錄

## 本輪範圍

本輪新增第 13 類實戰交易總覽文章、3 個新增純前端工具，以及 Academy／文章索引／registry／sitemap／生成腳本同步：

- `articles/investment/17-practical-trading.html`
- `academy/tools/practical-trade-plan.html` + `practical-trade-plan.js`
- `academy/tools/trade-journal-analyzer.html` + `trade-journal-analyzer.js`
- `academy/tools/trade-rule-checklist.html` + `trade-rule-checklist.js`

## 靜態與模型驗證

2026-08-27 本地執行：

- `verify_practical_trading.py`: PASS；article_chars=14216、article_chapters=9、practical_tools=3、registry=synchronized、sitemap=ok、errors=0。
- `verify_academy.py`: PASS；academy_html=46、missing_links=[]、missing_required=[]、sitemap_xml=ok、academy_lessons=22、academy_tools=19。
- `verify_quant_upgrade.py`: PASS；new_tools=3、practical_trading_tools=3、new_articles=2、schema=ok、sitemap=ok。
- `verify_research_contract.py`: PASS；sources=4、datasets=3、observation_fixtures=ok、response_fixtures=ok、secret_scan=ok。
- Python `py_compile`、三個新 JS `node --check`、`data/investment-list.json`／`data/tools-list.json` JSON parse、sitemap XML parse、`git diff --check`: PASS。

## 瀏覽器回歸：實戰計畫與部位檢查器

本地 URL：`http://127.0.0.1:8125/academy/tools/practical-trade-plan.html`

測試輸入：多頭；帳戶 100,000；單筆風險 1%；乘數 1；Entry 100；Stop 95；Target 115；進／出場手續費各 0.10%；進／出場滑價各 0.05%；固定費 0。

結果：

- 實際進場假設 100.05；停損成交假設 94.9525。
- 每單位風險 NT$5.29；最大整數部位 188 單位。
- 成本後 R:R 顯示 2.77R；預算使用率 99.50%。
- 外部 resource 中 API／quote／market／WebSocket 關鍵字為空。
- 將 Stop 改為 105 形成無效多頭價格關係後，結果單位清空為「—」、表格保留 1 個「尚未計算」列，狀態正確顯示輸入錯誤；恢復合法輸入後可重新計算。
- Console 無新增 JavaScript error。

## 待完成

尚需完成交易日誌分析器與交易前規則檢查器瀏覽器互動回歸、390×844 截圖、production smoke test、safe rebase／push、Pages success 與 Telegram completion notification。

## 邊界

本輪工具只處理使用者輸入的假設與已完成交易 R 序列，不抓取即時行情、不自動下單、不把流程完成度當作交易訊號；期貨、選擇權、槓桿與跨市場商品仍需另行核對契約、保證金、乘數、稅費與成交規則。

## 瀏覽器回歸：交易日誌分析器

本地 URL：`http://127.0.0.1:8125/academy/tools/trade-journal-analyzer.html`

測試序列：`3, -1, 0.5, -1, 2`，1R 金額輸入 NT$1,000。結果為交易 5 筆、勝率 60.00%、平均獲利 +1.83R、平均虧損 −1.00R、Profit Factor 2.75、期望值 +0.70R、最大連續虧損 1 筆、最大 R 回撤 −1.50R、累積 +3.50R；表格產生 5 行，金額換算可用。

同一序列改為 `3R, -1R, 0.5R, -1R, 2R` 後仍正確解析，期望值 +0.70R、累積 +3.50R。插入 `not-a-number` 後，結果清空為「—」、表格回到 1 個「尚未計算」列，並顯示資料解析錯誤。Console 無新增 JavaScript error；resource 關鍵字 API／quote／market／WebSocket 為空。

## 瀏覽器回歸：交易前規則檢查器

本地 URL：`http://127.0.0.1:8125/academy/tools/trade-rule-checklist.html`

初始狀態為 0/8。勾選進場條件、部位與風險預算、不交易條件後，結果正確顯示 3/8、已完成 3、待補 5、完成比例 38%、狀態「部分完成」，逐項表產生 8 行。再勾選全部項目後，結果正確顯示 8/8、100%、狀態「完整」，仍明確保留「完成度不代表策略有效」的提醒。按「全部取消」後回到 0/8、待補 8、狀態「待補充」。Console 無新增 JavaScript error，resource 關鍵字 API／quote／market／WebSocket 為空。

## 390×844 RWD 視覺檢查

已產生 `/tmp/practical-trading-article-390.png`、`/tmp/practical-trade-plan-390.png`、`/tmp/trade-journal-analyzer-390.png` 與 `/tmp/trade-rule-checklist-390.png`。文章截圖確認長文標題、段落、badge 與橫向章節導航在手機寬度內可讀；交易日誌分析器截圖確認標題、說明、卡片與輸入框沒有文字重疊或水平溢出。四個頁面均採 390×844 輸出，其他三張工具截圖同步產生供交付附件與後續 production 比對。

## Academy 主頁入口回歸

本地 URL：`http://127.0.0.1:8125/academy/index.html`

頁面顯示實際工具統計 19，互動工具卡從 01 到 19 均有對應入口；新增加的 17／18／19 實戰工具卡分別連到實戰計畫與部位檢查器、交易日誌分析器與交易前規則檢查器。新增 `#practical-trading` section 顯示「第 13 類實戰交易知識樹」、三個新工具與研究用途邊界；主頁 DOM 內容可讀，無假數量或不存在的相對路徑。

補充截圖觀察：`practical-trade-plan-390.png` 的交易方向、回到第 13 類、章節膠囊、帳戶資金與表單卡片在手機寬度內清楚顯示；`trade-rule-checklist-390.png` 的八項勾選卡以單欄排列，checkbox、標題與說明間距足夠，未見文字重疊或橫向溢出。兩頁均維持一致的深色 Academy 樣式與高對比輸入區。

## Production：第 13 類文章 smoke test

正式 URL：`https://gugopro.com/articles/investment/17-practical-trading.html?qa=d57ea9e`。頁面 title、Category 13 標記、九個章節錨點 `#market`／`#plan`／`#orders`／`#risk`／`#strategies`／`#backtest`／`#manage`／`#review`／`#roadmap` 均存在；文章內有交易期望值、交易日誌、交易前規則、部位檢查、MDD 工具與既有技術／回測文章內鏈。DOM 寬度檢查無水平溢出。resource 關鍵字檢查只命中 Google Fonts，沒有行情 API、quote、market 或 WebSocket 請求；此字型資源不屬於市場資料請求。

## Production：實戰計畫與部位檢查器 smoke test

正式 URL：`https://gugopro.com/academy/tools/practical-trade-plan.html?qa=d57ea9e`。同一組多頭 3R 成本案例在 production 正確顯示最大整數部位 188 單位、每單位風險 NT$5.29、成本後 R:R 2.77R、預算使用率 99.50%，狀態「計算完成」。將 Stop 改為 105 後，正式頁面正確顯示多頭價格關係錯誤、單位「—」與未計算表格；恢復合法輸入後可重算。DOM 無水平溢出，外部 resource 關鍵字 API／quote／market／WebSocket 為空。

## Production：交易日誌分析器 smoke test

正式 URL：`https://gugopro.com/academy/tools/trade-journal-analyzer.html?qa=d57ea9e`。序列 `3, -1, 0.5, -1, 2`、1R=NT$1,000 在正式版正確顯示 5 筆、勝率 60.00%、期望值 +0.70R、Profit Factor 2.75、最大連續虧損 1 筆、最大 R 回撤 −1.50R、累積 +3.50R。使用 `3R` 等後綴重新輸入仍得到 +0.70R／+3.50R；插入 `not-a-number` 後結果與表格清空並顯示解析錯誤。DOM 無水平溢出，外部 resource 關鍵字 API／quote／market／WebSocket 為空。

## Production：交易前規則檢查器 smoke test

正式 URL：`https://gugopro.com/academy/tools/trade-rule-checklist.html?qa=d57ea9e`。部分勾選三項後正式版顯示 3/8、完成比例 38%、狀態「部分完成」；勾選全部八項後顯示 8/8、100%、狀態「完整」；按「全部取消」後回到 0/8、待補 8、狀態「待補充」。DOM 無水平溢出，resource 關鍵字 API／quote／market／WebSocket 為空；頁面仍明確聲明完成度不代表交易品質、勝率或未來獲利。

## Production：Academy 主頁 smoke test

正式 URL：`https://gugopro.com/academy/index.html?qa=d57ea9e#practical-trading`。頁面 title 正常；`#tools` 實際找到 19 個工具卡；`#practical-trading` section 存在並顯示第 13 類總覽與 4 個入口；工具清單最後三張卡為 `17 / 實戰`、`18 / 實戰`、`19 / 實戰`。三個新工具連結與第 13 類文章相對路徑均可取得，DOM 無水平溢出；外部 resource 關鍵字僅命中 Google Fonts，無行情 API／quote／market／WebSocket 請求。

## Production final descendant：5699793 article smoke test

正式 URL：`https://gugopro.com/articles/investment/17-practical-trading.html?qa=5699793`。最新 origin/main descendant 的文章 title 正常，章節導航共 9 個，錨點為 `#market`、`#plan`、`#orders`、`#risk`、`#strategies`、`#backtest`、`#manage`、`#review`、`#roadmap`；文章內工具連結共 9 個，包含交易期望值、交易日誌、交易前規則、部位檢查、MDD 與研究工作台。文章仍含「本分類不提供即時訊號」邊界聲明；DOM 無水平溢出。resource 關鍵字只命中 Google Fonts，沒有行情 API／quote／market／WebSocket 請求。
