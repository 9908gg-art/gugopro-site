(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const PERIODS = { daily: 252, weekly: 52, monthly: 12 };
  const MAX_POINTS = 2000;
  const MIN_RETURNS = 3;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  let historyState = null;

  const historyMetricIds = [
    'cumulative-return', 'annual-return', 'annual-volatility', 'sharpe',
    'sortino', 'mdd', 'mdd-amount', 'recovery', 'calmar',
    'recovery-factor', 'observations'
  ];

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function setStatus(message, kind = '') {
    const element = $('status');
    element.textContent = message;
    element.className = `status ${kind}`.trim();
  }

  function setMetric(id, value = '—') {
    setText(id, value);
  }

  function clearSvg() {
    $('equity-chart').replaceChildren();
  }

  function clearPathRows() {
    $('path-rows').replaceChildren();
  }

  function clearHistoryResults() {
    historyState = null;
    historyMetricIds.forEach((id) => setMetric(id));
    setText('result-headline', '等待有效序列');
    setText('result-detail', '結果只反映本次輸入資料、頻率與 MAR。');
    setText('chart-caption', '—');
    setText('table-note', '尚未計算');
    setText('drawdown-summary', '等待回撤分析');
    $('drawdown-summary').replaceChildren(
      Object.assign(document.createElement('strong'), { textContent: '等待回撤分析' }),
      Object.assign(document.createElement('span'), { textContent: '需要有效的歷史序列與起始資金。' })
    );
    clearPathRows();
    clearSvg();
    $('download').disabled = true;
  }

  function parseNumbers(text) {
    const tokens = text.trim().split(/[\s,，;；]+/).filter(Boolean);
    if (!tokens.length) return { error: '請貼入至少 3 筆歷史資料。' };
    if (tokens.length > MAX_POINTS) return { error: `資料筆數超過 ${MAX_POINTS} 筆上限，請先在來源端整理。` };
    const numbers = tokens.map(Number);
    const invalidIndex = numbers.findIndex((value) => !Number.isFinite(value));
    if (invalidIndex >= 0) return { error: `第 ${invalidIndex + 1} 筆資料不是有效數字，請清理分隔符或文字。` };
    return { numbers };
  }

  function sampleStd(values) {
    if (values.length < 2) return NaN;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function getPeriods() {
    const frequency = $('frequency').value;
    if (frequency !== 'custom') return PERIODS[frequency] || NaN;
    const custom = Number($('custom-frequency').value);
    return Number.isInteger(custom) && custom >= 1 && custom <= 1000 ? custom : NaN;
  }

  function formatPercent(value, digits = 2) {
    return Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : '—';
  }

  function formatRatio(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : '—';
  }

  function formatMoney(value) {
    return Number.isFinite(value) ? `NT$ ${Math.round(value).toLocaleString('zh-TW')}` : '—';
  }

  function createSvgElement(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function scalePoints(values, min, max, width = 720, height = 250) {
    const left = 22;
    const right = width - 18;
    const top = 22;
    const bottom = height - 24;
    const range = Math.max(max - min, 1e-9);
    return values.map((value, index) => ({
      x: left + (right - left) * (index / Math.max(values.length - 1, 1)),
      y: bottom - ((value - min) / range) * (bottom - top)
    }));
  }

  function drawChart(values, peaks, mddPeakIndex, mddTroughIndex) {
    const svg = $('equity-chart');
    clearSvg();
    const allValues = values.concat(peaks);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const points = scalePoints(values, min, max);
    const peakPoints = scalePoints(peaks, min, max);
    const equityLine = points.map((point) => `${point.x},${point.y}`).join(' ');
    const peakLine = peakPoints.map((point) => `${point.x},${point.y}`).join(' ');
    const drawdownPath = [
      `M ${peakPoints[0].x} ${peakPoints[0].y}`,
      ...peakPoints.slice(1).map((point) => `L ${point.x} ${point.y}`),
      ...points.slice().reverse().map((point) => `L ${point.x} ${point.y}`),
      'Z'
    ].join(' ');

    svg.append(
      createSvgElement('path', { d: drawdownPath, class: 'drawdown-area' }),
      createSvgElement('polyline', { points: peakLine, class: 'peak-line' }),
      createSvgElement('polyline', { points: equityLine, class: 'equity-line' })
    );

    if (Number.isInteger(mddPeakIndex)) {
      const peak = peakPoints[mddPeakIndex];
      svg.appendChild(createSvgElement('circle', { cx: peak.x, cy: peak.y, r: 5, class: 'mdd-peak' }));
    }
    if (Number.isInteger(mddTroughIndex)) {
      const trough = points[mddTroughIndex];
      svg.appendChild(createSvgElement('circle', { cx: trough.x, cy: trough.y, r: 5, class: 'mdd-trough' }));
    }

    const startLabel = createSvgElement('text', { x: 22, y: 18, class: 'chart-label' });
    startLabel.textContent = '起始';
    const endLabel = createSvgElement('text', { x: 665, y: 18, class: 'chart-label' });
    endLabel.textContent = '最新';
    svg.append(startLabel, endLabel);
  }

  function renderPathRows(values, peaks, drawdowns, mddPeakIndex, mddTroughIndex) {
    const rows = $('path-rows');
    clearPathRows();
    const start = Math.max(0, values.length - 250);
    for (let index = start; index < values.length; index += 1) {
      const row = document.createElement('tr');
      const status = index === mddPeakIndex ? 'MDD 峰值' : index === mddTroughIndex ? 'MDD 谷值' : drawdowns[index] < 0 ? '回撤中' : '新高／無回撤';
      [index, formatMoney(values[index]), formatMoney(peaks[index]), formatPercent(drawdowns[index]), status].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      rows.appendChild(row);
    }
  }

  function calculateHistory() {
    clearHistoryResults();
    const parsed = parseNumbers($('series').value);
    if (parsed.error) {
      setStatus(parsed.error, 'error');
      return;
    }

    const periods = getPeriods();
    const mar = Number($('mar').value) / 100;
    const initialCapital = Number($('initial-capital').value);
    if (!Number.isFinite(periods) || periods <= 0) {
      setStatus('年化期數無效：請選擇每日／每週／每月，或輸入 1–1000 的自訂期數。', 'error');
      return;
    }
    if (!Number.isFinite(mar) || mar <= -100 || mar > 100) {
      setStatus('MAR 無效：請輸入大於 −100% 且不超過 100% 的每期百分比。', 'error');
      return;
    }
    if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
      setStatus('起始資金無效：請輸入大於 0 的數字。', 'error');
      return;
    }

    const mode = $('input-mode').value;
    let returns;
    if (mode === 'prices') {
      if (parsed.numbers.some((value) => value <= 0)) {
        setStatus('價格序列無效：每筆價格必須大於 0，且不可含文字或空值。', 'error');
        return;
      }
      returns = parsed.numbers.slice(1).map((value, index) => value / parsed.numbers[index] - 1);
    } else {
      if (parsed.numbers.some((value) => value <= -100)) {
        setStatus('報酬序列無效：每期報酬必須大於 −100%，才能建立正值權益曲線。', 'error');
        return;
      }
      returns = parsed.numbers.map((value) => value / 100);
    }
    if (returns.length < MIN_RETURNS) {
      setStatus(mode === 'prices' ? '樣本不足：價格至少需要 4 筆，才能形成 3 期報酬。' : '樣本不足：報酬至少需要 3 筆。', 'error');
      return;
    }

    const excess = returns.map((value) => value - mar);
    const meanExcess = mean(excess);
    const sd = sampleStd(returns);
    const excessSd = sampleStd(excess);
    const downsideSquares = excess.map((value) => (value < 0 ? value ** 2 : 0));
    const downsideCount = excess.filter((value) => value < 0).length;
    const downsideDeviation = downsideCount ? Math.sqrt(downsideSquares.reduce((sum, value) => sum + value, 0) / excess.length) : NaN;

    const equity = [initialCapital];
    returns.forEach((value) => equity.push(equity.at(-1) * (1 + value)));
    const peaks = [];
    const drawdowns = [];
    const peakIndices = [];
    let runningPeak = -Infinity;
    let runningPeakIndex = 0;
    let mdd = 0;
    let mddPeakIndex = 0;
    let mddTroughIndex = 0;
    equity.forEach((value, index) => {
      if (value > runningPeak) {
        runningPeak = value;
        runningPeakIndex = index;
      }
      peaks.push(runningPeak);
      peakIndices.push(runningPeakIndex);
      const drawdown = value / runningPeak - 1;
      drawdowns.push(drawdown);
      if (drawdown < mdd) {
        mdd = drawdown;
        mddPeakIndex = runningPeakIndex;
        mddTroughIndex = index;
      }
    });

    const cumulativeReturn = equity.at(-1) / initialCapital - 1;
    const annualReturn = Math.pow(equity.at(-1) / initialCapital, periods / returns.length) - 1;
    const annualVolatility = Number.isFinite(sd) ? sd * Math.sqrt(periods) : NaN;
    const sharpe = Number.isFinite(excessSd) && excessSd > 0 ? (meanExcess / excessSd) * Math.sqrt(periods) : NaN;
    const sortino = Number.isFinite(downsideDeviation) && downsideDeviation > 0 ? (meanExcess / downsideDeviation) * Math.sqrt(periods) : NaN;
    const mddAmount = peaks[mddTroughIndex] - equity[mddTroughIndex];
    const calmar = mdd < 0 ? annualReturn / Math.abs(mdd) : NaN;
    const recoveryFactor = mddAmount > 0 ? (equity.at(-1) - initialCapital) / mddAmount : NaN;
    const currentDrawdown = drawdowns.at(-1);
    let recoveryText = '無回撤';
    let recoveryIndex = null;
    if (mdd < 0) {
      for (let index = mddTroughIndex + 1; index < equity.length; index += 1) {
        if (equity[index] >= peaks[mddTroughIndex]) {
          recoveryIndex = index;
          break;
        }
      }
      recoveryText = recoveryIndex === null ? '尚未恢復' : `${recoveryIndex - mddTroughIndex} 期`;
    }

    historyState = { returns, equity, peaks, drawdowns, periods, mar, initialCapital, mddPeakIndex, mddTroughIndex, recoveryIndex };
    setMetric('cumulative-return', formatPercent(cumulativeReturn));
    setMetric('annual-return', formatPercent(annualReturn));
    setMetric('annual-volatility', formatPercent(annualVolatility));
    setMetric('sharpe', formatRatio(sharpe));
    setMetric('sortino', formatRatio(sortino));
    setMetric('mdd', formatPercent(mdd));
    setMetric('mdd-amount', formatMoney(mddAmount));
    setMetric('recovery', recoveryText);
    setMetric('calmar', formatRatio(calmar));
    setMetric('recovery-factor', formatRatio(recoveryFactor));
    setMetric('observations', String(returns.length));
    setText('result-headline', `MDD ${formatPercent(mdd)} · ${recoveryText}`);
    setText('result-detail', `${returns.length} 期${mode === 'prices' ? '價格轉換' : '使用者輸入'}報酬 · MAR ${formatPercent(mar)} · 年化期數 ${periods}`);
    setText('chart-caption', `目前回撤 ${formatPercent(currentDrawdown)} · 顯示最近 ${Math.min(equity.length, 250)} 筆`);
    setText('table-note', equity.length > 250 ? '表格顯示最近 250 筆；指標使用完整序列。' : `共 ${equity.length} 個權益觀測點。`);
    $('drawdown-summary').replaceChildren(
      Object.assign(document.createElement('strong'), { textContent: `最大回撤 ${formatPercent(mdd)}` }),
      Object.assign(document.createElement('span'), { textContent: mdd < 0 ? `峰值第 ${mddPeakIndex} 期 → 谷值第 ${mddTroughIndex} 期；${recoveryText === '尚未恢復' ? '截至序列最後一筆仍未回到前高。' : `恢復期 ${recoveryText}。`}` : '這段序列沒有低於歷史高點的觀測。' })
    );
    drawChart(equity, peaks, mddPeakIndex, mddTroughIndex);
    renderPathRows(equity, peaks, drawdowns, mddPeakIndex, mddTroughIndex);
    $('download').disabled = false;
    const metricWarning = [
      !Number.isFinite(sharpe) ? 'Sharpe 無法形成（標準差為 0 或樣本不足）' : '',
      !Number.isFinite(sortino) ? 'Sortino 無法形成（沒有低於 MAR 的觀測或下行偏差為 0）' : '',
      !Number.isFinite(calmar) ? 'Calmar 無法形成（沒有負 MDD）' : ''
    ].filter(Boolean).join('；');
    setStatus(metricWarning ? `計算完成，但 ${metricWarning}。` : '計算完成：結果只描述本次輸入的歷史序列。', metricWarning ? 'warning' : 'ok');
  }

  function updateTradeResult() {
    const container = $('trade-result');
    const direction = $('direction').value;
    const entry = Number($('entry').value);
    const stop = Number($('stop').value);
    const target = Number($('target').value);
    const winRateRaw = $('win-rate').value.trim();
    const hasPrices = [entry, stop, target].every(Number.isFinite);
    if (!hasPrices && !winRateRaw) {
      container.replaceChildren(
        Object.assign(document.createElement('strong'), { textContent: '尚未計算單筆情境' }),
        Object.assign(document.createElement('span'), { textContent: '請輸入進場、停損與目標價。' })
      );
      return;
    }
    const risk = direction === 'long' ? entry - stop : stop - entry;
    const reward = direction === 'long' ? target - entry : entry - target;
    if (!hasPrices || !Number.isFinite(risk) || !Number.isFinite(reward) || risk <= 0 || reward <= 0) {
      container.replaceChildren(
        Object.assign(document.createElement('strong'), { textContent: 'R:R 無法計算' }),
        Object.assign(document.createElement('span'), { textContent: direction === 'long' ? '多頭需符合 Stop < Entry < Target。' : '空頭需符合 Target < Entry < Stop。' })
      );
      return;
    }
    const ratio = reward / risk;
    const hasWinRate = winRateRaw !== '';
    const winRate = Number(winRateRaw) / 100;
    const expectancy = hasWinRate && Number.isFinite(winRate) && winRate > 0 && winRate < 1 ? winRate * ratio - (1 - winRate) : NaN;
    container.replaceChildren(
      Object.assign(document.createElement('strong'), { textContent: `R:R ${ratio.toFixed(2)}R` }),
      Object.assign(document.createElement('span'), { textContent: hasWinRate ? (Number.isFinite(expectancy) ? `假設每次停損為 1R，勝率 ${winRateRaw}% 時期望值 ${expectancy.toFixed(2)}R。` : '勝率需介於 0.01% 與 99.99%。') : `風險距離 ${risk.toFixed(2)} · 報酬距離 ${reward.toFixed(2)}；尚未估算期望值。` })
    );
    container.className = `trade-result ${Number.isFinite(expectancy) && expectancy > 0 ? 'positive' : 'neutral'}`;
  }

  function downloadCsv() {
    if (!historyState) return;
    const rows = [['index', 'equity', 'running_peak', 'drawdown_percent']];
    historyState.equity.forEach((value, index) => rows.push([
      index,
      value.toFixed(6),
      historyState.peaks[index].toFixed(6),
      (historyState.drawdowns[index] * 100).toFixed(6)
    ]));
    const csv = `\ufeff${rows.map((row) => row.join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'risk-return-drawdown-path.csv';
    anchor.textContent = 'download';
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function updateFrequencyVisibility() {
    const visible = $('frequency').value === 'custom';
    $('custom-frequency-wrap').classList.toggle('hidden-field', !visible);
    $('custom-frequency-wrap').setAttribute('aria-hidden', String(!visible));
  }

  $('calculate').addEventListener('click', calculateHistory);
  $('clear').addEventListener('click', () => {
    clearHistoryResults();
    setStatus('結果已清除；輸入資料仍保留在目前頁面。');
  });
  $('download').addEventListener('click', downloadCsv);
  $('frequency').addEventListener('change', () => {
    updateFrequencyVisibility();
    clearHistoryResults();
    setStatus('頻率已變更，請重新計算。');
  });
  ['input-mode', 'series', 'mar', 'initial-capital', 'custom-frequency'].forEach((id) => {
    $(id).addEventListener('input', () => {
      clearHistoryResults();
      setStatus('資料已變更，按下計算後更新。');
    });
  });
  ['direction', 'entry', 'stop', 'target', 'win-rate'].forEach((id) => {
    $(id).addEventListener('input', updateTradeResult);
    $(id).addEventListener('change', updateTradeResult);
  });

  updateFrequencyVisibility();
  clearHistoryResults();
  updateTradeResult();
})();
