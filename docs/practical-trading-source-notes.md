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

## Trend-following Playbook research notes

- ScienceDirect：Moskowitz、Ooi、Pedersen，`Time series momentum`，Journal of Financial Economics 104(2), May 2012, pp. 228–250；DOI `10.1016/j.jfineco.2011.11.003`。已实际读取文章摘要：研究讨论 equity index、currency、commodity、bond futures 的 time-series momentum；观察到 1–12 个月的报酬延續性，较长期间部分反转；研究结论属于历史样本研究，不可直接等同未来交易保证。URL：https://www.sciencedirect.com/science/article/pii/S0304405X11002613
- NYU Stern 搜索结果提供的旧 PDF URL `https://w4.stern.nyu.edu/lpederse/papers/TimeSeriesMomentum.pdf` 实际浏览为 404，因此不作为引用来源；保留 ScienceDirect 文章与 DOI 作为研究引用。
- 已有官方执行风险来源继续沿用：Investor.gov Types of Orders、FINRA Order Types。此前实际读取内容支持市价、限价、停损与 trailing stop 的定义及成交价格／滑价风险。CME Group Position and Risk Management 支持先确定可承受损失、再反推部位与风险管理的教育口径。
- Playbook 模型边界：趋势追踪与突破规则用作可审计的研究框架；文章不得宣称固定胜率、固定收益或即时信号。案例需标为虚构可重算输入，历史研究结论与个人系统表现分开。

## Follow-up sources read

- AQR：`A Century of Evidence on Trend-Following Investing` 页面说明其以历史资料把 time-series momentum strategy 回溯到 1880，研究目标是检验趋势追踪是否只是近几十年的统计偶然；页面结论是该策略在其历史样本中接下来约 110 年持续盈利。本文只把它作为历史研究背景，不把研究样本当成个人系统收益承诺。URL：https://www.aqr.com/Insights/Research/Journal-Article/A-Century-of-Evidence-on-Trend-Following-Investing
- Investor.gov：`Types of Orders` 页面已实际读取。SEC 明确区分 market、limit、stop-loss；市价单保证执行但不保证成交价格，限价单以指定价或更优价格执行但可能不成交，stop order 达到 stop price 后会转成 market order。因此突破追价与停损章节会强调成交价格、跳空与滑价风险。URL：https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders
