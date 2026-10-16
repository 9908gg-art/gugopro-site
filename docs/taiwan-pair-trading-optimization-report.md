# GugoPro 台灣市場配對交易子系統優化完成報告

## 1. 執行摘要

本次重構維持純日 K 架構，將配對掃描流程由「全市場下載後直接做相關性」升級為先做量價與波動性過濾，再進行相關係數、Beta、殘差均值回歸特徵與隔日沖回測。掃描器仍以 TWSE 官方上市普通股主檔與 TAIFEX 官方股票／ETF 期貨清單建立標的宇宙，並以公開 OHLCV 日資料完成靜態 JSON 輸出。

本次現場執行成功產出 **120 組配對**。掃描基準日期為 TWSE ROC 日期 `1150908`，分析窗口為最近 60 個共同交易日，所有輸出配對均符合 `Pearson r >= 0.85` 與報告的 ADF-style 殘差檢定門檻 `p < 0.05`。

## 2. 異動檔案

| 檔案 | 主要異動 |
| --- | --- |
| `scripts/pairs_scanner.py` | OHLCV 快取格式、20 日成交量／成交值濾網、14 日 ATR%、殘差半衰期、ADF-style p-value、T 收盤至 T+1 開收盤回測、配對 JSON 欄位與資料品質說明。 |
| `data/tw-market/pairs-scan-results.json` | 重新產出的 120 組配對資料，新增 `adf_p_value`、`residual_half_life_days`、`next_day_backtest`、`filter_counts` 與回測參數。 |
| `tools/tw-market/taiwan-pair-trading.html` | 雷達表新增 ADF p-value、半衰期、60 日勝率；分析面板新增 ADF、半衰期、T+1 勝率與淨報酬；回測區改以日 K 隔日沖語意呈現。 |
| `scripts/check_tw_pairs.py` | 新增全市場濾網、ADF、半衰期、隔日沖回測欄位與前端指標驗證。 |
| `.github/workflows/update-pairs-data.yml` | 保留平日盤後排程、10 分鐘上限與 16 workers，使用新掃描器參數更新靜態資料。 |
| `docs/taiwan-pair-trading-optimization-report.md` | 本完成報告。 |

## 3. 量價與波動性濾網統計

本次掃描結果如下：

| 階段 | 標的數量 | 說明 |
| --- | ---: | --- |
| 官方 TWSE 上市普通股宇宙 | 1,088 | 由 `t187ap03_L` 動態取得，沒有成交值排名截斷。 |
| 最新日成交量基本檢查通過 | 1,047 | 用於排除最新日完全無量或缺少快照的標的。 |
| 20 日量價雙重濾網後 | 432 | 20 日均量至少 150,000 股、20 日均成交值至少 TWD 50,000,000，且 14 日 ATR% 至少 1.0%。 |
| 進入矩陣分析的 instrument | 625 | 432 個現貨加上可對應的股票期貨與核心指數期貨代理。 |
| TAIFEX 股票／ETF 期貨清單 | 353 | 由 TAIFEX 官方股票期貨標的證券名單取得。 |
| 最終配對 | 120 | `r >= 0.85`、ADF-style p-value `< 0.05` 且通過變異數與資料完整性檢查。 |

濾網的成交量單位以股表示；換算為台股常用張數時，150,000 股約為 1,500 張。成交值門檻直接使用 TWD。

## 4. 配對模型與均值回歸條件

每個候選配對使用最近 60 個共同交易日的收盤價序列計算 Pearson correlation 與 OLS hedge beta。價差定義為：

> `Spread = Price_A - Beta × Price_B`

掃描器接著對價差殘差計算 20 日與 60 日均值／標準差、目前 Z-Score、殘差半衰期，以及 ADF-style residual stationarity p-value。實作採用無截距的殘差差分 t-statistic 近似與保守的 5% critical region，避免在 GitHub Actions 中引入重量級統計套件；因此 JSON 欄位明確標示為 `adf_p_value`，研究使用時仍建議以 `statsmodels.tsa.stattools.adfuller` 或其他正式 ADF 實作複核。

本次輸出所有配對均通過 `r >= 0.85` 與 `adf_p_value < 0.05`。半衰期為 AR(1)-style 殘差回歸速度估計，單位為交易日。

## 5. 隔日沖回測邏輯

回測避免 look-ahead bias，流程固定如下：

1. 在交易日 **T 收盤後**使用截至 T 的 Z-Score 判定訊號。
2. 僅當 `|Z_T| >= 2.0` 時產生交易。
3. 於 **T+1 開盤價**建立兩腿對沖部位。
4. 於 **T+1 收盤價**完整平倉，不留隔夜部位。
5. 正向價差偏離採取 short A / long Beta×B；負向偏離採取 long A / short Beta×B。
6. 以兩腿開盤名目價值估算報酬，並扣除預設雙邊總摩擦成本 **0.375%**（`cost_rate_round_trip = 0.00375`）。
7. 輸出最近 60 日的交易次數、勝率、累積淨報酬與交易報酬序列。

前端內建的自訂 CSV 回測也預設單邊成本率 `0.1875%`，即雙邊合計約 0.375%；使用者可按券商手續費折讓、當沖證交稅、滑價與商品類型自行調整。

## 6. 本次實際輸出摘要

本次產出檔案中的統計摘要如下：

- TWSE 全市場：**1,088 檔**。
- 量價波動性濾網後：**432 檔**。
- TAIFEX 股票／ETF 期貨：**353 檔**。
- 分析 instruments：**625 個**。
- 配對數：**120 組**。
- 每組歷史資料：**60 日**。
- 最佳配對：`2363 / 2369`。
- 最佳配對 correlation：`0.92866`。
- 最佳配對 Z-Score：`2.7904`。
- 最佳配對 ADF-style p-value：`0.0474`。
- 最佳配對殘差半衰期：`2.6781` 日。
- 最佳配對 60 日隔日沖回測：21 筆交易、57.14% 勝率、17.10% 累積淨報酬（含 0.375% 雙邊成本估計）。

上述績效僅為規則化歷史估計，不代表未來報酬，也未取代正式的成交明細、借券、漲跌停、撮合優先序與實際券商費率模型。

## 7. 驗證結果

本地驗證已完成：

- `python3 scripts/check_tw_pairs.py`：通過，`errors=0`。
- JSON 格式驗證：通過。
- `python3 -m py_compile scripts/pairs_scanner.py scripts/check_tw_pairs.py`：通過。
- 前端 inline JavaScript Node syntax check：通過。
- `git diff --check`：通過。
- 瀏覽器載入：通過，120 行雷達資料正常渲染。
- 前端 ADF p-value、half-life、60 日勝率與 T+1 淨報酬欄位：正常顯示。
- 搜尋 `2363`：返回 4 組關聯配對。
- 選取配對並執行內建 60 日回測：正常產生交易次數與勝率。
- 瀏覽器 Console：未發現 runtime error。

GitHub Actions 仍設定為平日 `07:00 UTC`（台北時間 15:00），採 `timeout-minutes: 10`、16 workers 與 120 組輸出上限。掃描器會繼續使用資料快取降低下一次排程的網路負擔。

## 8. 維護與實盤注意事項

首先，Yahoo Finance 是公開歷史資料 fallback，個股期貨連續結算價與 SGX 富台期的公開代號覆蓋並不完整。期貨相關配對仍可能使用現貨方向性 proxy，實盤前必須替換為實際可交易的期貨結算價、換月規則與合約乘數。

其次，近似 ADF p-value 不應視為完整統計套件的最終推論。上線前應以正式 ADF／Engle–Granger、滾動樣本外檢定與多重比較修正重新驗證，並檢查結構斷裂、除權息、產業集中與共同市場因子。

再次，隔日沖淨報酬仍未完整模擬漲跌停無法成交、排隊、借券可得性、融券費、期貨保證金變化、個股期貨換月、實際滑價與盤中流動性。`0.375%` 是保守的研究預設，不是保證足夠或適用所有標的。

最後，GitHub Actions 產出的 JSON 應視為研究資料快照，不是自動下單訊號。任何真實資金使用前，應以小額、紙上交易與獨立成交紀錄進行樣本外驗證，並建立停損、最大部位、單日最大損失與資料中斷保護。
