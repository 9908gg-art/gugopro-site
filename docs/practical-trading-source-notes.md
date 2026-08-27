# 第 13 類實戰交易來源與盤點筆記

## Repo 基線（2026-08-27）

目前投資文章首頁有「初級入門」「中級實戰」「進階風控」「量化研究」四個區塊，但尚未存在獨立的「第 13 類／實戰交易」知識入口。既有可重用內容包括 `academy/lessons/19-position-sizing.html`、`academy/lessons/20-investment-checklist.html`、`articles/investment/13-technical-indicators-truth.html`、`articles/investment/14-backtesting-overfitting-guide.html`、`academy/tools/position-sizing.html`、`academy/tools/kelly-risk-budget.html`、`academy/tools/trade-expectancy.html` 與 `academy/tools/risk-return-drawdown.html`。本輪會把它們重新組成第 13 類的導覽節點，並新增可操作工具，不虛構行情或績效。

## 官方／教育來源

### Investor.gov — Types of Orders

URL: https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders

Investor.gov 將常見訂單分為 market、limit、stop-loss。市價單通常可立即執行，但不保證成交價格；限價單只在指定價格或更有利價格成交，可能完全不成交；stop order 觸及 stop price 後會轉為 market order。此口徑適合用在執行風險、滑價與停損邏輯教學，不能把 stop price 當成保證成交價。

### FINRA — Order Types

URL: https://www.finra.org/investors/investing/investment-products/stocks/order-types

FINRA 提醒報價可能延遲、交易執行需要時間，波動市場中實際成交價可能與看到的報價不同；停損單可用於管理市場風險，但應理解各類訂單的執行條件與風險。頁面也把 sell-stop 與 short position 的 stop-buy 情境分開說明，適合納入多空方向的執行檢查表。

### CME Group — Position and Risk Management

URL: https://www.cmegroup.com/education/courses/things-to-know-before-trading-cme-futures/position-and-risk-management

CME Group 的課程把風險管理放在交易前流程，強調選擇市場、管理虧損部位與適當部位大小。第 13 類工具會將這個概念轉成「先定義單筆最大損失，再反推部位」的教育模型；若未輸入契約乘數、保證金、跳動點值或交易所規則，工具不會假裝能得出期貨真實下單口數。

## 研究邊界

本輪內容將使用上述官方教育來源支持訂單與風險管理定義，不抓取即時行情，不製造歷史績效數字，也不提供任何特定標的的進出場建議。若後續加入回測工具，資料必須由使用者貼入或使用明確標註來源與 as-of 的資料；所有成本、滑價、停損成交與樣本外限制都要在介面中公開。
