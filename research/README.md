# GugoPro Research Layer｜Phase 0–2

這個目錄是 GugoPro Academy 公開資料研究層的契約與可重建基礎。它目前**不提供即時行情服務**，也不在公開 HTML、JavaScript 或 JSON 中保存 API key、token、cookie、密碼或帳戶資料。

## 目錄結構

| 路徑 | 用途 |
|---|---|
| `source-registry.json` | 來源能力、官方 URL、頻率、CORS／key／授權邊界與 freshness SLA |
| `datasets/catalog.json` | 可查 dataset_id、時間／幣別／調整口徑與目前品質狀態 |
| `schemas/` | observation、provenance、response envelope 的 JSON Schema |
| `fixtures/` | 帶來源與快照 hash 的公開測試 fixture；不是即時資料 feed |
| `snapshots/` | 本機 ingestion 輸出位置，已由 `.gitignore` 排除，不可提交原始快照 |

## 契約原則

每筆 normalized observation 必須帶 `source_id`、`dataset_id`、`observation_time`、`as_of_date`、`retrieved_at`、`frequency`、`timezone`、`currency`、`adjustment`、`value`、`unit`、`vintage`、`raw_snapshot_id`、`quality_flags`、`license_ref` 與 `schema_version`。真實的零值可以存在；系統禁止的是在來源失敗時自行合成零值。

研究 API 的 envelope 以 `ok`、`partial`、`stale`、`error` 區分狀態。`error` 不得攜帶可被誤讀為新觀測的結果；`stale` 必須明示最後 as-of；`partial` 必須保存缺漏資訊。任何解析器或來源 schema 變更都要升版，而不是覆寫舊 snapshot。

## 本地驗證

在 repo 根目錄執行：

```bash
python3 scripts/verify_research_contract.py
```

預期輸出包含：

```text
research contract: PASS
sources=4
datasets=3
observation_fixtures=ok
response_fixtures=ok
secret_scan=ok
```

## Fixture ingestion

使用保存的官方 FRED `fredgraph.csv` fixture，不需要網路或憑證：

```bash
python3 scripts/ingest_public_data.py \
  --dataset fred:DGS10 \
  --raw-file research/fixtures/fred-DGS10.csv \
  --output /tmp/fred-DGS10-envelope.json
```

輸出會包含 `status`、`row_count`、`quality_status` 與 `snapshot_id` 摘要；完整 envelope 可供契約測試使用。這個命令不會把測試輸出寫回 Git 追蹤的 snapshots 目錄。

Live FRED ingestion 只能在伺服器端執行，且需要環境變數 `FRED_API_KEY`。本 repo 的 GitHub Pages 靜態前端不應直接呼叫需要 key 的端點；沒有 key、上游 timeout、HTTP 429／5xx 或 schema drift 時，程式會輸出 `error`，不會填入假資料。

## Phase 2：可重現特徵與回測

Phase 2 以研究用的 FRED `SP500` 版本化 fixture 為輸入，將「來源觀測 → 完整序列 → point-in-time features → future-volatility labels → expanding walk-forward baseline」拆成可檢查的步驟。fixture 取自官方 FRED `fredgraph.csv`，時間範圍為 `2025-08-26` 至 `2026-08-25`，共 261 個日曆 rows；其中 10 個空值觀測只計數並排除，不做 forward fill、interpolation 或零值替代，因此完整 close view 為 251 rows。其原始檔 SHA-256 為 `sha256:60a9cfa243bcf1a4ded04b59a43aac6cc0b9e74a4cd1c0e65473e78d1e532369`，來源與取用說明保存在 `research/fixtures/fred-SP500.manifest.txt`。

特徵計算遵守 point-in-time 邊界：`return_1d`、20 筆 realized volatility、近 60 筆 volatility Z-Score、drawdown 與缺漏率只使用 `feature_as_of` 當日或以前的觀測。future realized volatility label 則只使用 feature date 之後的 H=20 個完整價格觀測；尾端不完整窗口標記為不可訓練。regime tercile cutoffs 只由訓練前綴學習，不能用 held-out labels 回頭調整。Phase 2 目前沒有訓練或發布 ML classifier；`baseline_only` 代表固定的 long-only 0／1 moving-average benchmark。

回測預設 fast MA=20、slow MA=60、成本=10 bps，訊號在 close t 形成、下一根 bar t+1 執行；成本為 `turnover × cost_bps / 10000`，benchmark 為同一評估窗的 buy-and-hold。expanding walk-forward 預設 train=120 rows、test=40 rows、censor gap=1，所有測試窗保留為 held-out。這些假設不含滑價、稅費、市場衝擊、槓桿、放空、停牌、退市與完整公司行動修正；結果僅供研究，不能解讀為交易指示或未來表現保證。

在 repo 根目錄可重建 Phase 2：

```bash
python3 scripts/run_phase2_research.py \
  --csv research/fixtures/fred-SP500.csv \
  --created-at 2026-08-26T00:00:00Z \
  --output /tmp/phase2-run.json
python3 scripts/verify_phase2_research.py
```

公開的 [Phase 2 量化工作台](../academy/research/quant-lab.html) 只讀取版本庫中的 fixture 或使用者主動選取的本機 CSV；不呼叫即時行情、不上傳本機檔案，並在來源／參數／結果無法通過檢查時清空結果。頁面會顯示 snapshot、as-of、完整／缺漏 counts、特徵表、回測成本、walk-forward split 與限制。FRED source registry 仍維持未啟用，fixture 是測試資料，不應稱為 live 或 current quote。

## 公開來源

- FRED API：<https://fred.stlouisfed.org/docs/api/fred/>
- SEC EDGAR APIs：<https://www.sec.gov/search-filings/edgar-application-programming-interfaces>
- TAIFEX TAIEX Futures：<https://www.taifex.com.tw/enl/eng2/tX>
- CME Introduction to Futures：<https://www.cmegroup.com/education/courses/introduction-to-futures>

資料來源的使用條款、更新頻率、CORS、request identity 與實際 coverage 仍須在 live adapter 啟用前重新覆核。這一層只提供研究與教育基礎，不是個人化投資、交易或風險承受度建議。
