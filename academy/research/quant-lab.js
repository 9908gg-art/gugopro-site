(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const fixturePath = '../../research/fixtures/fred-SP500.csv';
  const annualization = 252;
  let lastRun = null;

  const text = (value, fallback = '—') => value === null || value === undefined || value === '' ? fallback : String(value);
  const number = (value) => value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
  const fmtNumber = (value, digits = 4) => {
    const n = number(value);
    return n === null ? '—' : n.toFixed(digits);
  };
  const fmtPct = (value, digits = 2) => {
    const n = number(value);
    return n === null ? '—' : `${(n * 100).toFixed(digits)}%`;
  };
  const escapeDate = (value) => text(value);

  function setStatus(label, detail, className = '') {
    $('quant-status').textContent = label;
    $('quant-status').className = className;
    $('quant-status-detail').textContent = detail;
  }

  function clearResults() {
    lastRun = null;
    $('quant-results').hidden = true;
    $('quant-error').hidden = true;
    $('quant-error').textContent = '';
    $('download-quant').disabled = true;
    $('meta-snapshot').textContent = '—';
    $('meta-asof').textContent = '—';
    $('feature-table').replaceChildren();
    $('metric-list').replaceChildren();
    $('split-table').replaceChildren();
    $('chart-summary').textContent = '執行研究後顯示文字摘要。';
    const canvas = $('equity-chart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function showError(error) {
    if (window.console && typeof window.console.error === 'function') window.console.error('phase2 research failed', error && error.stack ? error.stack : error);
    clearResults();
    const message = error && error.message ? error.message : '研究資料或參數無法通過契約。';
    $('quant-error').textContent = `研究未完成：${message} 不會顯示未經驗證的結果。`;
    $('quant-error').hidden = false;
    setStatus('研究失敗', '請修正資料／參數後重試；目前結果已清空。', 'catalog-error');
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`日期格式無效：${value}`);
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) throw new Error(`日期無效：${value}`);
    return value;
  }

  function parseCsv(raw, datasetId, sourceId) {
    if (!raw || !raw.trim()) throw new Error('CSV 是空白的。');
    const lines = raw.replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/);
    if (lines.length < 4) throw new Error('CSV 至少需要三筆帶日期的觀測。');
    const headers = lines[0].split(',').map((item) => item.trim());
    if (headers[0] !== 'observation_date' || headers.length !== 2) throw new Error('CSV 必須是 observation_date 加上一個價格欄位。');
    const rows = [];
    let previousDate = '';
    const seen = new Set();
    for (let index = 1; index < lines.length; index += 1) {
      const fields = lines[index].split(',');
      if (fields.length !== 2) throw new Error(`CSV 第 ${index + 1} 行欄位數不符。`);
      const observationDate = parseDate(fields[0].trim());
      if (seen.has(observationDate) || (previousDate && observationDate <= previousDate)) throw new Error('日期必須嚴格遞增且不可重複。');
      seen.add(observationDate);
      previousDate = observationDate;
      const rawValue = fields[1].trim();
      let close = null;
      if (rawValue && rawValue !== '.') {
        close = Number(rawValue);
        if (!Number.isFinite(close) || close <= 0) throw new Error(`價格必須是正的有限數值：${observationDate}`);
      }
      rows.push({ date: observationDate, close, datasetId, sourceId });
    }
    if (rows.length < 3) throw new Error('CSV 至少需要三筆觀測。');
    return rows;
  }

  async function sha256(raw) {
    if (!window.crypto || !window.crypto.subtle) throw new Error('此瀏覽器沒有可用的 SHA-256 Web Crypto，無法建立 provenance。');
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  function completeRows(rows) {
    const complete = rows.filter((row) => row.close !== null);
    if (complete.length < 3) throw new Error('保留來源缺漏後，完整價格觀測少於三筆。');
    return { rows: complete, dropped: rows.length - complete.length };
  }

  function std(values) {
    if (!values || values.length < 2) return null;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(Math.max(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1), 0));
  }

  function rollingStd(values, endIndex, window) {
    if (endIndex + 1 < window) return null;
    const sample = values.slice(endIndex - window + 1, endIndex + 1);
    if (sample.length !== window || sample.some((value) => value === null)) return null;
    return std(sample);
  }

  function makeFeatures(rows, snapshotId) {
    const closes = rows.map((row) => row.close);
    const returns = [null];
    for (let index = 1; index < closes.length; index += 1) returns.push(closes[index] / closes[index - 1] - 1);
    const rollingVol = closes.map((_, index) => rollingStd(returns, index, 20));
    let runningPeak = null;
    return rows.map((row, index) => {
      runningPeak = runningPeak === null ? row.close : Math.max(runningPeak, row.close);
      const history = rollingVol.slice(Math.max(0, index - 59), index + 1).filter((value) => value !== null);
      const mean = history.length >= 2 ? history.reduce((sum, value) => sum + value, 0) / history.length : null;
      const volStd = history.length >= 2 ? std(history) : null;
      const currentVol = rollingVol[index];
      const zscore = currentVol !== null && mean !== null && volStd !== null && volStd > 0 ? (currentVol - mean) / volStd : null;
      const missingRate = 0;
      return {
        dataset_id: row.datasetId,
        source_id: row.sourceId,
        feature_as_of: row.date,
        available_at: row.date,
        timezone: 'source_defined',
        currency: 'USD',
        adjustment: 'source_defined',
        snapshot_id: snapshotId,
        feature_version: '1.0.0',
        schema_version: '1.0.0',
        price: row.close,
        return_1d: returns[index],
        abs_return_1d: returns[index] === null ? null : Math.abs(returns[index]),
        realized_vol_20: currentVol,
        vol_zscore_60: zscore,
        drawdown: row.close / runningPeak - 1,
        missing_rate_20: missingRate,
        quality_flags: []
      };
    });
  }

  function futureLabels(features, horizon) {
    return features.map((feature, index) => {
      const future = features.slice(index + 1, index + horizon + 1);
      if (future.length !== horizon) return { feature_as_of: feature.feature_as_of, label_end: null, horizon, annualization, future_realized_vol: null, regime: null, label_version: '1.0.0', quality_flags: ['incomplete_future_window'], trainable: false };
      const futureReturns = [];
      let previous = feature.price;
      future.forEach((row) => { futureReturns.push(row.price / previous - 1); previous = row.price; });
      const deviation = std(futureReturns);
      const futureVol = deviation === null ? null : deviation * Math.sqrt(annualization);
      return { feature_as_of: feature.feature_as_of, label_end: future[future.length - 1].feature_as_of, horizon, annualization, future_realized_vol: futureVol, regime: null, label_version: '1.0.0', quality_flags: futureVol === null ? ['insufficient_future_returns'] : [], trainable: futureVol !== null };
    });
  }

  function quantile(values, probability) {
    const ordered = [...values].sort((a, b) => a - b);
    const position = (ordered.length - 1) * probability;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return ordered[lower];
    return ordered[lower] * (upper - position) + ordered[upper] * (position - lower);
  }

  function learnCutoffs(labels, trainSize, horizon) {
    const values = labels.slice(0, trainSize).filter((row) => row.trainable).map((row) => row.future_realized_vol);
    if (values.length < 6) throw new Error('訓練前綴需要至少六個完整 future-volatility labels。');
    const lowHigh = quantile(values, 1 / 3);
    const middleHigh = quantile(values, 2 / 3);
    return { low_high: lowHigh, middle_high: middleHigh, train_start: 0, train_end: trainSize, horizon, label_version: '1.0.0' };
  }

  function applyCutoffs(labels, cutoffs) {
    return labels.map((row) => ({ ...row, regime: row.trainable ? (row.future_realized_vol <= cutoffs.low_high ? 'low' : row.future_realized_vol <= cutoffs.middle_high ? 'middle' : 'high') : null, cutoff_source: cutoffs }));
  }

  function movingAverage(prices, endIndex, window) {
    if (endIndex + 1 < window) return null;
    const sample = prices.slice(endIndex - window + 1, endIndex + 1);
    return sample.reduce((sum, value) => sum + value, 0) / window;
  }

  function maxDrawdown(equity) {
    let peak = equity[0] || 1;
    let worst = 0;
    equity.forEach((value) => { peak = Math.max(peak, value); worst = Math.min(worst, value / peak - 1); });
    return worst;
  }

  function runBacktest(features, config, evaluationStart) {
    if (config.slowWindow <= config.fastWindow) throw new Error('Slow MA 必須大於 Fast MA。');
    if (evaluationStart < 1 || evaluationStart >= features.length - 1) throw new Error('訓練／評估切分沒有留下有效測試區間。');
    const prices = features.map((row) => row.price);
    const positions = prices.map((_, index) => {
      const fast = movingAverage(prices, index, config.fastWindow);
      const slow = movingAverage(prices, index, config.slowWindow);
      return fast !== null && slow !== null && fast > slow ? 1 : 0;
    });
    let strategyEquity = 1;
    let benchmarkEquity = 1;
    let evalStrategy = 1;
    let evalBenchmark = 1;
    let previousPosition = 0;
    const strategyReturns = [];
    const equity = [];
    const benchmark = [];
    const rows = [];
    let entries = 0;
    let turnover = 0;
    for (let index = 0; index < prices.length - 1; index += 1) {
      const assetReturn = prices[index + 1] / prices[index] - 1;
      const position = positions[index];
      const turnoverToday = Math.abs(position - previousPosition);
      const cost = turnoverToday * config.costBps / 10000;
      const strategyReturn = position * assetReturn - cost;
      strategyEquity *= 1 + strategyReturn;
      benchmarkEquity *= 1 + assetReturn;
      const inEvaluation = index >= evaluationStart;
      if (inEvaluation) {
        evalStrategy *= 1 + strategyReturn;
        evalBenchmark *= 1 + assetReturn;
        strategyReturns.push(strategyReturn);
        equity.push(evalStrategy);
        benchmark.push(evalBenchmark);
        if (position === 1 && previousPosition === 0) entries += 1;
        turnover += turnoverToday;
      }
      rows.push({ date: features[index + 1].feature_as_of, signalDate: features[index].feature_as_of, position, assetReturn, cost, strategyReturn, equity: strategyEquity, benchmarkEquity, evaluationEquity: inEvaluation ? evalStrategy : null, evaluationBenchmark: inEvaluation ? evalBenchmark : null });
      previousPosition = position;
    }
    const volatility = std(strategyReturns);
    const totalReturn = evalStrategy - 1;
    const benchmarkReturn = evalBenchmark - 1;
    return {
      metrics: { periods: strategyReturns.length, total_return: totalReturn, benchmark_total_return: benchmarkReturn, excess_return: totalReturn - benchmarkReturn, annualized_return: (1 + totalReturn) ** (annualization / strategyReturns.length) - 1, benchmark_annualized_return: (1 + benchmarkReturn) ** (annualization / strategyReturns.length) - 1, annualized_volatility: volatility === null ? null : volatility * Math.sqrt(annualization), sharpe: volatility === null || volatility === 0 ? null : (strategyReturns.reduce((sum, value) => sum + value, 0) / strategyReturns.length / volatility) * Math.sqrt(annualization), max_drawdown: maxDrawdown(equity), benchmark_max_drawdown: maxDrawdown(benchmark), entry_count: entries, turnover_total: turnover, cost_bps: config.costBps, fast_window: config.fastWindow, slow_window: config.slowWindow, evaluation_start: evaluationStart, evaluation_end: features.length - 1, backtest_version: '1.0.0' },
      rows,
      contract: { execution: 'signal at close t, execute at next bar t+1', position: 'long-only 0/1', transaction_cost: 'turnover * cost_bps / 10000', benchmark: 'buy and hold from each evaluated next-bar return' }
    };
  }

  function walkForward(features, config, trainSize, testSize, censorGap) {
    const splits = [];
    let testStart = trainSize + censorGap;
    let splitNumber = 1;
    while (testStart < features.length && splits.length < 20) {
      const testEnd = Math.min(testStart + testSize, features.length);
      if (testEnd <= testStart) break;
      const result = runBacktest(features.slice(0, testEnd), config, testStart);
      splits.push({ split_id: `wf-${String(splitNumber).padStart(2, '0')}`, train_start: 0, train_end: testStart - censorGap, test_start: testStart, test_end: testEnd, censor_gap: censorGap, train_as_of_start: features[0].feature_as_of, train_as_of_end: features[testStart - censorGap - 1].feature_as_of, test_as_of_start: features[testStart].feature_as_of, test_as_of_end: features[testEnd - 1].feature_as_of, ...result.metrics });
      splitNumber += 1;
      testStart = testEnd;
    }
    if (!splits.length) throw new Error('資料長度不足以建立 walk-forward 測試窗。');
    return splits;
  }

  function drawChart(rows) {
    const canvas = $('equity-chart');
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = 260;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const points = rows.filter((row) => row.evaluationEquity !== null);
    if (points.length < 2) return;
    const values = points.flatMap((row) => [row.evaluationEquity, row.evaluationBenchmark]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const margin = { top: 18, right: 14, bottom: 26, left: 46 };
    const x = (index) => margin.left + (index / (points.length - 1)) * (width - margin.left - margin.right);
    const y = (value) => margin.top + (1 - ((value - min) / ((max - min) || 1))) * (height - margin.top - margin.bottom);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--line') || '#d9e2ec';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(margin.left, y(1)); ctx.lineTo(width - margin.right, y(1)); ctx.stroke();
    const drawLine = (key, color) => { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); points.forEach((row, index) => { const px = x(index); const py = y(row[key]); if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }); ctx.stroke(); };
    drawLine('evaluationEquity', '#f97316');
    drawLine('evaluationBenchmark', '#2563eb');
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted') || '#52606d';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('策略', margin.left, 13); ctx.fillStyle = '#f97316'; ctx.fillRect(margin.left + 32, 5, 20, 3); ctx.fillStyle = '#52606d'; ctx.fillText('Benchmark', margin.left + 64, 13); ctx.fillStyle = '#2563eb'; ctx.fillRect(margin.left + 124, 5, 20, 3);
    ctx.fillStyle = '#52606d'; ctx.fillText(points[0].date, margin.left, height - 7); ctx.fillText(points[points.length - 1].date, Math.max(margin.left, width - 90), height - 7);
    ctx.fillText(max.toFixed(2), 4, margin.top + 4); ctx.fillText(min.toFixed(2), 4, height - margin.bottom + 4);
  }

  function appendMetric(label, value, detail) {
    const wrapper = document.createElement('div');
    wrapper.className = 'metric-row';
    const labelNode = document.createElement('span'); labelNode.textContent = label;
    const valueNode = document.createElement('b'); valueNode.textContent = value;
    const detailNode = document.createElement('small'); detailNode.textContent = detail;
    wrapper.append(labelNode, valueNode, detailNode); $('metric-list').append(wrapper);
  }

  function renderRun(result) {
    const latest = result.features[result.features.length - 1];
    const metrics = result.combined.metrics;
    $('quant-results').hidden = false;
    $('result-summary').textContent = `${result.walkForward.length} 個 held-out windows；固定參數 baseline_only。`;
    $('result-source-rows').textContent = String(result.sourceRows);
    $('result-source-gap').textContent = `完整 ${result.completeRows}；未插值排除 ${result.droppedRows}`;
    $('result-labels').textContent = String(result.trainableLabels);
    $('result-splits').textContent = String(result.walkForward.length);
    $('result-censor-gap').textContent = `censor gap ${result.parameters.censorGap} rows`;
    $('result-excess').textContent = fmtPct(result.summary.meanExcessReturn);
    $('latest-feature-asof').textContent = `as-of ${latest.feature_as_of}`;
    $('meta-snapshot').textContent = result.snapshotId;
    $('meta-asof').textContent = `${result.features[0].feature_as_of} → ${latest.feature_as_of}`;
    const featureRows = [['price', fmtNumber(latest.price, 2), '來源 close；source_defined adjustment'], ['return_1d', fmtPct(latest.return_1d), 'close_t / close_t-1 − 1'], ['realized_vol_20', fmtPct(latest.realized_vol_20), '20 筆報酬 sample std × √252'], ['vol_zscore_60', fmtNumber(latest.vol_zscore_60, 3), '相對近 60 筆 rolling volatility'], ['drawdown', fmtPct(latest.drawdown), 'close / running peak − 1'], ['missing_rate_20', fmtPct(latest.missing_rate_20), '來源缺漏率；未以插值填補']];
    const featureBody = $('feature-table'); featureBody.replaceChildren(); featureRows.forEach(([name, value, formula]) => { const tr = document.createElement('tr'); [name, value, formula].forEach((cell) => { const td = document.createElement('td'); td.textContent = cell; tr.append(td); }); featureBody.append(tr); });
    $('metric-list').replaceChildren();
    appendMetric('策略測試總報酬', fmtPct(metrics.total_return), '固定 MA baseline；含成本');
    appendMetric('Buy-and-hold', fmtPct(metrics.benchmark_total_return), '同一評估區間');
    appendMetric('Annualized volatility', fmtPct(metrics.annualized_volatility), 'daily sample std × √252');
    appendMetric('Sharpe（無風險利率 0）', fmtNumber(metrics.sharpe, 3), '研究摘要，不是推薦');
    appendMetric('最大回撤', fmtPct(metrics.max_drawdown), '由測試 equity curve 計算');
    appendMetric('進場次數', String(metrics.entry_count), `turnover ${fmtNumber(metrics.turnover_total, 2)}`);
    const splitBody = $('split-table'); splitBody.replaceChildren(); result.walkForward.forEach((split) => { const tr = document.createElement('tr'); [split.split_id, `${split.train_as_of_end} → ${split.test_as_of_start}`, fmtPct(split.total_return), fmtPct(split.benchmark_total_return), fmtPct(split.excess_return), fmtPct(split.max_drawdown), String(split.entry_count)].forEach((cell) => { const td = document.createElement('td'); td.textContent = cell; tr.append(td); }); splitBody.append(tr); });
    drawChart(result.combined.rows);
    $('chart-summary').textContent = `橘線為策略、藍線為 benchmark；${result.combined.contract.execution}。圖表只顯示評估區間，非即時資料。`;
    const mean = result.summary.meanExcessReturn;
    setStatus('研究完成', `snapshot ${result.snapshotId.slice(0, 20)}…；結果僅供研究。`, 'catalog-ok');
    $('download-quant').disabled = false;
    $('quant-error').hidden = true;
    void mean;
  }

  async function loadInput() {
    const localFile = $('local-csv').files && $('local-csv').files[0];
    if (localFile) return { raw: await localFile.text(), datasetId: 'user:local-csv', sourceId: 'user_supplied', fileName: localFile.name };
    const response = await fetch(`${fixturePath}?v=1.0.0`, { cache: 'no-store', headers: { Accept: 'text/csv' } });
    if (!response.ok) throw new Error(`官方 fixture HTTP ${response.status}`);
    return { raw: await response.text(), datasetId: 'fred:SP500', sourceId: 'fred', fileName: 'fred-SP500.csv' };
  }

  async function runResearch() {
    clearResults();
    setStatus('執行中', '正在解析來源、計算特徵與建立 held-out windows…');
    try {
      const values = {
        fastWindow: Number($('fast-window').value), slowWindow: Number($('slow-window').value), costBps: Number($('cost-bps').value), trainSize: Number($('train-size').value), testSize: Number($('test-size').value), censorGap: Number($('censor-gap').value), horizon: Number($('label-horizon').value)
      };
      if (![values.fastWindow, values.slowWindow, values.costBps, values.trainSize, values.testSize, values.censorGap, values.horizon].every(Number.isFinite)) throw new Error('所有研究參數都必須是有限數值。');
      if (values.fastWindow < 2 || values.slowWindow <= values.fastWindow || values.costBps < 0 || values.trainSize < 60 || values.testSize < 10 || values.censorGap < 0 || values.horizon < 2) throw new Error('研究參數未通過範圍或 fast／slow 關係檢查。');
      const input = await loadInput();
      const snapshotId = await sha256(input.raw);
      const sourceRows = parseCsv(input.raw, input.datasetId, input.sourceId);
      const complete = completeRows(sourceRows);
      const features = makeFeatures(complete.rows, snapshotId);
      if (values.trainSize >= features.length - 1) throw new Error('訓練前綴過長，沒有留下 held-out 測試資料。');
      const labels = futureLabels(features, values.horizon);
      const cutoffs = learnCutoffs(labels, values.trainSize, values.horizon);
      const labeled = applyCutoffs(labels, cutoffs);
      const config = { fastWindow: values.fastWindow, slowWindow: values.slowWindow, costBps: values.costBps };
      const combined = runBacktest(features, config, values.trainSize);
      const walk = walkForward(features, config, values.trainSize, values.testSize, values.censorGap);
      const deltas = walk.map((split) => split.excess_return);
      const summary = { splitCount: walk.length, meanExcessReturn: deltas.reduce((sum, value) => sum + value, 0) / deltas.length, windowsBeatingBenchmark: deltas.filter((value) => value > 0).length, worstExcessReturn: Math.min(...deltas), modelStatus: 'baseline_only' };
      lastRun = {
        snapshotId,
        research_run_id: `phase2-ma-${snapshotId.slice(7, 19)}`,
        run_version: '1.0.0',
        created_at: new Date().toISOString(),
        input: { dataset_id: input.datasetId, source_id: input.sourceId, raw_snapshot_id: snapshotId, file_name: input.fileName, point_in_time: true, personal_data: input.sourceId === 'user_supplied', source_observation_count: sourceRows.length, complete_observation_count: complete.rows.length, missing_source_rows_excluded_without_imputation: complete.dropped },
        parameters: { ...values, annualization },
        features: features,
        feature_manifest: { feature_set_id: `${input.datasetId}:price-risk-v1`, dataset_id: input.datasetId, source_id: input.sourceId, snapshot_id: snapshotId, feature_version: '1.0.0', schema_version: '1.0.0', feature_as_of_start: features[0].feature_as_of, feature_as_of_end: features[features.length - 1].feature_as_of, features: ['return_1d', 'abs_return_1d', 'realized_vol_20', 'vol_zscore_60', 'drawdown', 'missing_rate_20'], lineage: 'Each row uses only close observations dated on or before feature_as_of.' },
        label_contract: { label_version: '1.0.0', horizon: values.horizon, annualization, future_window_starts_after_feature_as_of: true, cutoffs_learned_on_train_only: true, regime_cutoffs: cutoffs, incomplete_future_rows_excluded_from_training: true },
        labels: labeled,
        combined,
        walkForward: walk,
        summary,
        sourceRows: sourceRows.length,
        completeRows: complete.rows.length,
        droppedRows: complete.dropped,
        trainableLabels: labeled.filter((row) => row.trainable).length,
        limitations: ['Educational deterministic baseline only.', 'No slippage, taxes, market impact, leverage, shorting, delisting or live order routing.', 'No model output or buy/sell instruction.', 'Source adjustment policy and missing rows affect results.']
      };
      renderRun(lastRun);
    } catch (error) {
      showError(error);
    }
  }

  $('run-quant').addEventListener('click', runResearch);
  $('reset-quant').addEventListener('click', () => { clearResults(); setStatus('等待執行', '未載入任何結果；所有輸入與結果會留在本機頁面。'); });
  $('download-quant').addEventListener('click', () => {
    if (!lastRun) return;
    const blob = new Blob([JSON.stringify(lastRun, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${lastRun.research_run_id}.json`; anchor.click();
    URL.revokeObjectURL(url);
  });
  window.addEventListener('resize', () => { if (lastRun) drawChart(lastRun.combined.rows); });
})();
