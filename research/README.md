# GugoPro Research Layer｜Phase 0–1

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

## 公開來源

- FRED API：<https://fred.stlouisfed.org/docs/api/fred/>
- SEC EDGAR APIs：<https://www.sec.gov/search-filings/edgar-application-programming-interfaces>
- TAIFEX TAIEX Futures：<https://www.taifex.com.tw/enl/eng2/tX>
- CME Introduction to Futures：<https://www.cmegroup.com/education/courses/introduction-to-futures>

資料來源的使用條款、更新頻率、CORS、request identity 與實際 coverage 仍須在 live adapter 啟用前重新覆核。這一層只提供研究與教育基礎，不是個人化投資、交易或風險承受度建議。
