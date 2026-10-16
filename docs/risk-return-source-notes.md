# 風險報酬與最大回撤：來源筆記（第三輪）

## 研究範圍

本輪工具與文章將以使用者輸入的歷史價格或報酬序列做 deterministic、client-side 的研究計算，不抓取即時行情，也不將歷史指標轉成個人化交易建議。所有序列應標註頻率、樣本期間、價格是否為 adjusted close，以及是否已納入股利、費用與稅費。

## 已讀來源與可採用內容

### [1] William F. Sharpe, The Sharpe Ratio（Stanford University；重刊自 The Journal of Portfolio Management, Fall 1994）
URL: http://web.stanford.edu/~wfsharpe/art/sr/sr.htm

來源明確區分 ex-ante 與 ex-post Sharpe。歷史（ex-post）版本可表達為歷史期間的平均差異報酬除以該差異報酬的歷史標準差；差異報酬可相對於無風險資產或 benchmark 定義。Sharpe 亦指出指標依賴觀測期間，年化在序列無自相關等條件下才有簡化關係；複利與序列相關會使關係更複雜。只用平均值與標準差也無法涵蓋偏態、尾端風險與其他分布差異。

第三輪工具採用教育化 ex-post 口徑：若使用者輸入報酬 r_t（百分比）、每期無風險／最低可接受報酬 MAR m_t，則超額報酬 e_t = r_t − m_t；Sharpe_period = mean(e_t) / sample_sd(e_t)。當使用者選擇年化且資料頻率為日／週／月時，工具以頻率對應的 sqrt(periods per year) 年化平均與波動；提示此簡化需要對序列相關與非交易日口徑另行覆核。

### [2] Charles Schwab, How to Use the Sortino Ratio（2026-06-10）
URL: https://www.schwab.com/learn/story/using-sortino-ratio-to-gauge-downside-risk

來源將 Sortino 描述為 Sharpe 的變體，使用 downside risk／downside deviation，而非總波動度；核心概念為超額報酬除以下行偏差，且較高值代表歷史上每單位下行風險的報酬較高。來源同時提醒 Sortino 建立在歷史資料，應作為進一步分析的起點，不保證未來結果。

第三輪工具採用指定 MAR 的 downside deviation：只取低於 MAR 的短缺（r_t − MAR_t < 0），以樣本平方平均根計算 downside deviation，Sortino = mean(r_t − MAR_t) / downside_deviation。若沒有低於 MAR 的觀測，工具應顯示「無下行觀測／無法形成 downside deviation」，不可輸出虛構的無限值。

## 待補來源

1. 最大回撤（MDD）定義、peak-to-trough 順序、回撤深度／持續時間／恢復期。
2. Calmar／Recovery Factor 與其不可直接比較的樣本限制。
3. 風險報酬比與期望值的教育口徑；避免把單筆 R:R 與歷史策略 Sharpe 混為一談。
4. 使用者輸入序列的資料契約、樣本門檻與交易日年化因子。

## 初步風險邊界

不可將 Sharpe > 1、MDD < 20% 或其他固定門檻寫成普遍「優質」保證。歷史樣本可能有選樣偏誤、倖存者偏誤、調整價格／未調整價格混用、交易成本遺漏與資料頻率不一致；工具須將這些限制放在可見位置。

## 最大回撤與恢復分析來源

### [3] CFA Institute Inside Investing, Sculpting Investment Portfolios: Maximum Drawdown and Optimal Portfolio Strategy
URL: https://blogs.cfainstitute.org/insideinvesting/2013/02/12/sculpting-investment-portfolios-maximum-drawdown-and-optimal-portfolio-strategy/

來源將 MDD 描述為指定分析期間內，由最高局部峰值到後續最低局部谷值的累積損失；一般 drawdown 是從前一個局部高點到後續谷值的下降，期間可以有多個 drawdown，但最大回撤只有一個。來源也提醒，MDD 對不改變峰值／谷值的額外平穩觀測不敏感，與波動度及 downside deviation 的資訊性不同；只把 MDD 當成唯一決策標準需要謹慎，搭配 drawdown distribution、Calmar 等指標較完整。

第三輪工具以正值顯示回撤深度：running_peak_t = max(value_0...value_t)，drawdown_t = value_t / running_peak_t − 1；MDD = min(drawdown_t)。峰值、谷值必須保持時間順序，不可用全序列最大值與最小值直接相減。工具另計算最大回撤發生時的峰值索引、谷值索引、從谷值回到前峰值的恢復期（若資料在結束時尚未回復則標示 ongoing），並提供目前距離歷史高點的回撤狀態。

### [4] Choi et al., Maximum Drawdown, Recovery, and Momentum（MDPI, 2021）
URL: https://www.mdpi.com/1911-8074/14/11/542

搜尋摘要指出研究將 maximum drawdown、recovery 與 momentum 放在同一研究框架，並提到 MDD 也用於 Calmar 與 Sterling 等基金／避險基金績效衡量。第三輪不把研究結論或任何固定 Calmar 門檻當成交易規則；只以來源作為「深度、持續時間與恢復速度應分開觀察」的研究背景，工具將 recovery days 與 MDD 並列而不合併成單一建議分數。

## 第三輪預計模型契約

### 輸入

- 歷史價格序列：使用者貼入一欄或逗號／空白／換行分隔的正數價格；順序由舊到新。
- 或歷史報酬序列：使用者貼入百分比報酬；若同時採用兩種資料型態，必須明確讓使用者選擇，不默認兩者混用。
- 報酬頻率：每日、每週、每月或自訂 periods/year；預設每日 252，僅用於年化轉換。
- 無風險／最低可接受報酬（MAR）：以每期百分比輸入，預設 0；工具不得把 0 解釋成無風險資產收益的市場事實。
- 起始資金可選：只用於把報酬序列映射成權益曲線與貨幣損失，不改變百分比指標。

### 輸出

- 累積報酬、年化報酬（若資料期數及頻率足夠）、樣本波動與年化波動。
- Sharpe（超額平均報酬／樣本標準差）與 Sortino（超額平均報酬／下行偏差）。
- 最大回撤百分比與貨幣值、峰值／谷值觀測位置、最大回撤恢復期。
- Recovery factor 僅在模型契約明確時計算；若以累積淨利／|MDD|，必須標示它不是 Calmar，避免將不同指標混稱。
- 回撤序列、權益／價格索引序列的可讀表格或 SVG／CSS 圖，不產生假的市場時間戳。

### 不可輸出的情形

樣本不足、價格小於等於 0、非有限值、報酬率無法解析、標準差為零、沒有任何低於 MAR 的觀測、期間或年化因子不合法時，顯示明確錯誤並清空受影響的結果，不以 0、無限大或假行情替代。所有結果均為歷史樣本描述，不代表未來報酬、最大損失上限或個人化風控建議。

## Repo 基線盤點（2026-08-27）

- 目前 `origin/main` 與本地 `main` 同步，最新基線為 `fcc140e`；工作樹在第三輪開始時乾淨。
- 既有專題文章 `articles/investment/06-sharpe-mdd-risk-control.html` 只有數個短段落、FAQ 與舊版歷史 VaR CTA；其中「Sharpe > 1」「MDD < 15%–20%」「Calmar > 2」等門檻未附可靠依據，不應直接保留為普遍標準，第三輪會改成樣本與情境限制說明。
- 既有 `academy/tools/var-calculator.html` 使用預填的人工報酬序列，缺少完整錯誤清空與現代 RWD／來源邊界，第三輪新工具不沿用其假行情預填方式；新工具只接受使用者貼入價格或報酬序列。
- `academy/tools/volatility-zscore.html` 已提供滾動波動度雛形，但內嵌圖表使用 `innerHTML`，且與 Sharpe、Sortino、MDD 沒有同頁整合；第三輪採安全 DOM API 並用單一分析工具呈現完整回撤／風險摘要。
- `academy/index.html` 的 `#tools` 現有 14 個工具卡片，第三輪需新增工具卡並同步更新可驗證的數量，不得手寫不存在的工具數字；文章與工具都應加入雙向內鏈。
- 現有共用 `academy.css` 提供 `.quant-page`、`.tool-layout`、`.metric-grid`、`.bar-chart`、`.source-box` 與 850／430px 斷點，可作為一致性基線；新頁另以語意化 class 補足回撤圖與表格，不改變靜態 GitHub Pages 架構。
