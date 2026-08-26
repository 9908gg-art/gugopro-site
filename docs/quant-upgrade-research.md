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

Commit `d6610580d9d04d8a9a33802005056b896904a81b` was pushed to `origin/main`; GitHub Pages run `32958800306` completed successfully. The repository's actual serving path is `https://gugopro.com/academy/`; the separate `https://academy.gugopro.com/academy/` path returned GitHub Pages 404 and was not reported as a successful production URL. The final production URL was verified at `https://gugopro.com/academy/index.html?qa=d661058`.

The production Academy home reported 22 lesson cards, 14 tool cards, one `#quant-lab` navigation link, one CollectionPage JSON-LD block, zero API Key controls, scrollWidth 1,265px against a 1,280px viewport, and no captured console errors. The production Volatility Z-Score tool accepted the same test-only 40-return sequence and returned current volatility 1.06%, 21 windows and Z 0.65 with 21 rendered bars. Production Futures Basis and Kelly iframe checks both loaded successfully at 390px with 375px scroll width; the test-only Basis case returned 0.182%, 2.21%, 60.00 points and NT$8,000, while the Kelly case returned 30.00% Full Kelly, 15.00% Half Kelly, NT$30,000 risk budget and NT$750,000 stop-distance position cap.

The production Quant Research article loaded successfully with five chapter anchors, five jump links, four Academy tool links, Article Schema, no console errors, and a 390px iframe scrollWidth of 375px. The `academy.gugopro.com` hostname was kept as a documented 404 observation rather than silently substituted.

## Blank-start safety refinement

After review, the Kelly tool was changed to start with blank user-specific fields and no automatic calculation. Its initial status is instructional and all result metrics are `—`; the Half Kelly selector remains a parameter choice, not a result. A subsequent test-only input run still returned Full Kelly 30.00%, Fractional Kelly 15.00%, NT$30,000 risk budget and NT$750,000 stop-distance position cap. Invalid input now clears all five metrics and the chart before showing the error state.
