# Phase 2 local browser QA notes

- Preview: `http://127.0.0.1:4174/academy/research/quant-lab.html`
- Initial state: `等待執行`; results hidden; no external network request for market data.
- After default run: `研究完成`; official fixture snapshot rendered as `sha256:60a9cfa243bcf1a4ded04b59a43aac6cc0b9e74a4cd1c0e65473e78d1e532369`.
- Rendered counts: source rows 261, complete rows 251, missing rows excluded without imputation 10, trainable labels 231, held-out windows 4.
- Rendered baseline summary: average excess return `-1.01%`; all four windows do not beat benchmark; baseline status only.
- Rendered controls and output: fast/slow MA, bps cost, train/test sizes, censor gap, future volatility horizon, feature table, metrics, equity canvas, split table, limitations.
- First attempt exposed a `snapshotId` undefined runtime error; fixed by carrying `snapshotId` at top-level of the browser run manifest. Re-run completed successfully.
- No secret, credential, live feed, buy/sell status, or generated market value is present in the page.

## Invalid-parameter regression

With an existing successful result on screen, changing Slow MA from 60 to 15 while Fast MA remained 20 and pressing run produced `研究失敗` with `研究參數未通過範圍或 fast／slow 關係檢查。`; the result section, snapshot, tables and chart were cleared. No console error was emitted for this expected validation path.

## Local CSV regression

A repo-external malformed local CSV was uploaded through the file control. With legal MA parameters, the parser rejected it with `CSV 至少需要三筆帶日期的觀測。`; the status remained `研究失敗`, the results stayed hidden, and provenance remained blank. The file was kept outside the repository and was not uploaded anywhere.

A 390×844 headless screenshot also completed successfully. The narrow layout stacked provenance cards and controls without visual clipping; the page is intentionally scrollable because this is a research document, not a single-screen calculator.
