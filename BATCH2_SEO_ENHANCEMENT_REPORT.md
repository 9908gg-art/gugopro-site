# 第 2 批：基礎生活理財與量化工具群 SEO 內容深化報告

執行日期：2026-09-06

## 執行摘要

本批次已完成 7 個理財／量化工具頁的 SEO 內容深化。每頁均新增可見的計算公式或方法假設、三步驟使用流程與三題財經痛點 FAQ，並加入與可見內容一致的 `HowTo`、`FAQPage` 與金融工具頁型 Schema。內容明確標示情境估算、資料限制與非個人化建議，避免將試算結果誤呈為保證報酬、正式報稅結果或交易訊號。

## 已處理頁面

| 類別 | 頁面 |
|---|---|
| 長期理財 | `tools/compound-interest.html`、`tools/etf-dividend-calculator.html`、`tools/realestate-amortization.html`、`tools/converter-finance-salary-tax.html` |
| 量化與風控 | `tools/risk-reward-calculator.html`、`tools/risk-reward-scanner.html` |
| 交易教學 | `tools/tradingview-guide.html` |

## 內容重點

複利頁說明一次投入與定期投入的未來值估算；ETF 頁說明年度股息、殖利率與再投入假設；房貸頁提供本息攤還付款與總利息公式；薪資稅頁區分估算課稅所得、有效稅率與正式申報；R:R 頁說明風報比、風險金額與部位數的關係；TradingView 頁則以期望值作為回測理解框架，並提示滑價、費用、資料品質與過度擬合風險。

所有頁面的 FAQ 均涵蓋真實使用痛點，例如殖利率不等於安全性、浮動利率不能用單一固定情境代表、停損距離與部位大小的反向關係、掃描結果不是交易訊號，以及回測獲利不代表未來獲利。

## Schema 與驗證

| Schema 類型 | 結果 |
|---|---:|
| `SoftwareApplication` 金融工具頁 | 6／6 |
| `Article` TradingView 指南 | 1／1 |
| `HowTo` | 7／7，每頁 3 步 |
| `FAQPage` | 7／7，每頁 3 題 |
| 可見 FAQ 與 JSON-LD 一致性 | 7／7 |
| 第 2 批本地引用缺失 | 0 |
| 廣告預留空位 | 0 |

`risk-reward-scanner.html` 仍是相容入口，新增內容說明它會導向原生 Scanner，並清楚標示掃描結果不是交易建議。全站檢查維持 436 個 HTML、5,824 個本地參照且缺失 0 個。

## 注意事項

本批內容屬教育與工具使用說明，不構成投資、稅務、貸款或交易建議。正式報稅、借貸決策與下單前，應以官方文件、金融機構資料及合格專業人士意見核對。Schema 僅標記頁面上已可見的內容，不宣稱搜尋引擎一定顯示豐富結果。

## 參考規範

[1]: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
[2]: https://developers.google.com/search/docs/appearance/structured-data/faqpage
[3]: https://developers.google.com/search/docs/appearance/structured-data/how-to
