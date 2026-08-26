# Quant upgrade research notes

## Official sources consulted

* **TAIFEX TAIEX Futures contract page**: https://www.taifex.com.tw/enl/eng2/tX
  * The page identifies the TAIEX Futures underlying index, code TX / ticker TXF, delivery-month structure, regular and after-hours sessions, contract size, minimum price fluctuation, price limits, settlement method, and position-limit notes. Actual contract terms must be rechecked against the current official page before any live trade.
* **CME Group — Introduction to Futures**: https://www.cmegroup.com/education/courses/introduction-to-futures
  * The official course separates contract specifications, trading codes, expiry and settlement, tick movements, price limits, notional value, mark-to-market, margin, rolls, hedgers, speculators, volume, and open interest. The article uses this as a concept index only; product-specific rules remain exchange-specific.
* **FRED API documentation**: https://fred.stlouisfed.org/docs/api/fred/
  * The FRED documentation describes series observations, releases, vintages, real-time periods, API versions and errors. The new tools do not fetch or invent live FRED values; they ask users to paste verified research data when a calculation needs a time series.

## Data and model boundaries

The new tools are client-side only. The Volatility Z-Score tool accepts user-supplied daily returns and calculates rolling sample standard deviation and the standardized position of the latest rolling volatility within the supplied history. The Futures Basis tool accepts same-time spot, front-month and next-month prices, days to expiry, multiplier and contracts; it calculates Basis, Basis percentage, simplified annualized Basis and calendar spread. The Kelly tool uses user-supplied trade-journal summary statistics to calculate Full Kelly, fractional Kelly and an approximate stop-distance position cap.

Demonstration values in article prose are explicitly labeled as non-market examples. Pages do not use those values as market data defaults. The tools display validation errors for missing or inconsistent inputs, and the copy states that exchange rules, price timestamps, contract multipliers, currency, fees, slippage, margin and liquidity must be verified independently. The output is research education, not a live quote, execution signal or personalized financial advice.

## Local regression evidence

On 2026-08-26, the local static preview served the upgraded pages without console errors. The Academy home reported 22 lesson cards and 14 interactive tools, exposed one quant-lab section, and showed zero remaining `data-api-key`, `gugopro_gemini_api_key`, or `requireGugoproGeminiApiKey` markers. The existing learning-progress behavior still stored a clicked lesson ID in `localStorage`.

The Volatility Z-Score tool accepted a 40-value test sequence supplied only at test time and returned 21 rolling windows, current volatility 1.06%, history mean 1.00%, and Z 0.65. The Futures Basis tool accepted the article's labeled non-market example inputs (spot 22,000; front 22,040; next 22,100; 30 days; multiplier 200; one contract) and returned Basis 40.00 points, Basis 0.182%, annualized Basis 2.21%, calendar spread 60.00 points and NT$8,000 nominal Basis. The Kelly tool accepted test statistics (55% win rate; 1.8R average win; 1R average loss; Half Kelly; NT$200,000 account; 4% stop distance) and returned Full Kelly 30.00%, Fractional Kelly 15.00%, risk budget NT$30,000 and stop-distance position cap NT$750,000.

The new quantitative articles exposed five chapter anchors each, Article Schema, official-source links where applicable, and valid Academy tool links. Desktop widths were 1,265px against a 1,280px viewport. Same-origin 390px iframe checks reported 375px scroll width with no horizontal overflow; article 15 measured 6,047px height and article 16 measured 6,249px height, confirming that the long-form pages were not constrained by tool single-screen styles.

A sequential same-origin 390px iframe sweep covered all 14 Academy tools. All pages loaded within the bounded wait, had scrollWidth 375px (viewport 390px), had at least one calculation/action button, and had zero API Key controls. Existing tools retained their prior local calculation surfaces while the three new tools added their own result HUDs.

## Production deployment evidence

The initial implementation commit was `d6610580d9d04d8a9a33802005056b896904a81b`; the final safety-refined `origin/main` is `a8209a981c2a36d976eaf17ddcb1aa8cdb464b0a`. GitHub Pages runs `32958800306` and `32959413686` completed successfully. The repository's actual serving path is `https://gugopro.com/academy/`; the separate `https://academy.gugopro.com/academy/` path returned GitHub Pages 404 and was not reported as a successful production URL. The final production URL was verified at `https://gugopro.com/academy/index.html?qa=a8209a9`.

The production Academy home at `a8209a9` reported 22 lesson cards, 14 tool cards, one `#quant-lab` navigation link, one CollectionPage JSON-LD block, zero API Key controls, scrollWidth 1,265px against a 1,280px viewport, and no captured console errors. The production Volatility Z-Score tool accepted the same test-only 40-return sequence and returned current volatility 1.06%, 21 windows and Z 0.65 with 21 rendered bars. Production Futures Basis and Kelly iframe checks both loaded successfully at 390px with 375px scroll width; the test-only Basis case returned 0.182%, 2.21%, 60.00 points and NT$8,000. The final Kelly production check started with blank user-specific fields and all result metrics `—`; after test-only inputs it returned 30.00% Full Kelly, 15.00% Half Kelly, NT$30,000 risk budget and NT$750,000 stop-distance position cap.

The production Quant Research article loaded successfully with five chapter anchors, five jump links, four Academy tool links, Article Schema, no console errors, and a 390px iframe scrollWidth of 375px. The `academy.gugopro.com` hostname was kept as a documented 404 observation rather than silently substituted.

## Blank-start safety refinement

After review, the Kelly tool was changed to start with blank user-specific fields and no automatic calculation. Its initial status is instructional and all result metrics are `—`; the Half Kelly selector remains a parameter choice, not a result. A subsequent test-only input run still returned Full Kelly 30.00%, Fractional Kelly 15.00%, NT$30,000 risk budget and NT$750,000 stop-distance position cap. Invalid input now clears all five metrics and the chart before showing the error state.

## Phase 0–1 公開資料研究層本地實作回歸（2026-08-26）

- 新增 `research/source-registry.json`、`research/datasets/catalog.json`、`research/schemas/`、`research/fixtures/`、`research/README.md`、`scripts/verify_research_contract.py`、`scripts/ingest_public_data.py` 與 `academy/research/` 研究入口。
- Source registry 已登錄 4 個來源（FRED、SEC EDGAR、TAIFEX 契約規格、CME futures education）；dataset catalog 已登錄 `fred:DGS10`、`sec:submissions`、`taifex:TX:specification` 三個 dataset。因 live adapter、伺服器憑證與授權核准尚未部署，四個 source 的 `enabled` 與三個 dataset 的 `quality_status` 均誠實維持未啟用／不可用。
- FRED 官方 fixture `research/fixtures/fred-DGS10.csv` 取自 2026-08-18 至 2026-08-24 的官方 `fredgraph.csv` 回應，SHA-256 為 `7cdd03b0863d17a1deed3a63e97181bbe02971cb9007808c92ce14524255884d`。fixture ingestion 成功解析 5 rows、回傳 `status=ok`／`quality_status=fresh`；無 `FRED_API_KEY` 的 live ingestion 以 exit code 2 回傳 `MISSING_SERVER_CREDENTIAL`、`status=error`、`data=null`、`quality_status=unavailable`。
- `python3 scripts/verify_research_contract.py` 通過：sources=4、datasets=3、observation_fixtures=ok、response_fixtures=ok、secret_scan=ok。既有 `verify_quant_upgrade.py`、`verify_academy.py`、Python compile、Node syntax 與 `git diff --check` 也通過；現有 Academy 驗證為 39 個 HTML，未發現 missing links 或 missing required。
- 本地 `academy/research/index.html` DOM 回歸顯示「已載入本地契約」、4 張 source cards、3 張 dataset cards、3 個 `尚未啟用` badge、4 個官方來源連結、Console errors=[]；同源 390px iframe 回報 clientWidth=375、scrollWidth=375、4 source cards、3 dataset cards、status 已載入本地契約。
- Academy 首頁已由生成器冪等補入唯一 `href="research/"` 公開資料研究層入口，保留 22 個課程章節、14 個工具與唯一 `#quant-lab`。連續執行生成器兩次後 `research_entry_count=1`、`quant_lab_count=1`。

- 最終本地研究頁回歸（`phase1-final-local`）：桌面 DOM 顯示 `已載入本地契約`、registry/catalog 皆為 1.0.0、4 個 source cards、3 個 dataset cards、3 個 `尚未啟用` quality badges、4 個官方來源連結、Console errors=[]；desktop scrollWidth=1265、viewport=1280。
- 研究頁同源 390px iframe 回歸：clientWidth=375、scrollWidth=375、4 個 source cards、3 個 dataset cards、`已載入本地契約`、3 個 unavailable badges。
- 最終 Academy 首頁回歸：`#quant-lab` 唯一存在，`href="research/"` 研究層入口在量化研究區段出現一次，仍有 22 個課程章節與 14 個工具；新增入口卡片文字為「公開資料研究層／來源登錄、資料契約、快照 hash、as-of 與品質狀態」。
