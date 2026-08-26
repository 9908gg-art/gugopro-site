(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const DEFAULTS = {
    asset: 10000000,
    withdrawal: 400000,
    nominalReturn: 5,
    inflation: 2,
    years: 40,
    reserve: 1200000,
    mode: 'fixed',
    percentageRate: 4,
    flexibleCut: 20,
    trigger: 0,
    sequence: 'none'
  };
  let latest = null;

  const money = (value) => Number.isFinite(value) ? Math.round(value).toLocaleString('zh-TW') : '—';
  const pct = (value, digits = 2) => Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : '—';
  const signedPct = (value, digits = 2) => Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${(value * 100).toFixed(digits)}%` : '—';
  const finite = (value) => Number.isFinite(value);

  function setStatus(label, detail, kind = '') {
    $('status').textContent = label;
    $('status-detail').textContent = detail;
    $('status').className = `status ${kind}`.trim();
  }

  function clearCanvas() {
    const canvas = $('cashflow-chart');
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function clearResults() {
    latest = null;
    $('results').hidden = true;
    $('error').hidden = true;
    $('error').textContent = '';
    $('rows').replaceChildren();
    $('scenario-rows').replaceChildren();
    $('status-detail').textContent = '尚未執行模型；輸入與結果只留在本機頁面。';
    $('download').disabled = true;
    ['rate', 'real-return', 'end', 'deplete', 'reserve-months'].forEach((id) => { $(id).textContent = '—'; });
    clearCanvas();
  }

  function showError(error) {
    clearResults();
    const message = error && error.message ? error.message : '輸入或模型參數未通過檢查。';
    $('error').textContent = `計算未完成：${message} 不會顯示未經驗證的結果。`;
    $('error').hidden = false;
    setStatus('等待修正', '請修正輸入後重新執行；目前沒有可解讀的結果。', 'error');
  }

  function readNumber(id, label, { min = -Infinity, max = Infinity, integer = false } = {}) {
    const value = Number($(id).value);
    if (!finite(value)) throw new Error(`${label} 必須是有限數值。`);
    if (integer && !Number.isInteger(value)) throw new Error(`${label} 必須是整數。`);
    if (value < min || value > max) {
      const lower = min === Number.EPSILON ? '0' : String(min);
      const upper = max === Infinity ? '不限上限' : String(max);
      throw new Error(`${label} 必須介於 ${lower} 與 ${upper} 之間。`);
    }
    return value;
  }

  function readInputs() {
    const values = {
      asset: readNumber('asset', '退休時資產', { min: Number.EPSILON }),
      withdrawal: readNumber('withdrawal', '第一年提領', { min: 0 }),
      nominalReturn: readNumber('nominal-return', '年化名目報酬', { min: -100, max: 100 }) / 100,
      inflation: readNumber('inflation', '年通膨率', { min: -20, max: 50 }) / 100,
      years: readNumber('years', '模擬年數', { min: 1, max: 80, integer: true }),
      reserve: readNumber('reserve', '流動準備金', { min: 0 }),
      mode: $('withdrawal-mode').value,
      percentageRate: 0,
      flexibleCut: 0,
      trigger: 0,
      sequence: $('sequence').value
    };
    if (values.mode === 'percentage') {
      values.percentageRate = readNumber('percentage-rate', '資產百分比提領率', { min: 0, max: 100 }) / 100;
    }
    if (values.mode === 'flexible') {
      values.flexibleCut = readNumber('flexible-cut', '彈性減幅', { min: 0, max: 100 }) / 100;
      values.trigger = readNumber('trigger', '下跌觸發門檻', { min: -100, max: 100 }) / 100;
    }
    if (values.withdrawal > values.asset) throw new Error('第一年提領不可高於退休時資產。');
    if (!['fixed', 'percentage', 'flexible'].includes(values.mode)) throw new Error('提領規則不受支援。');
    if (!['none', 'early', 'late'].includes(values.sequence)) throw new Error('壓力情境不受支援。');
    if (values.mode === 'percentage' && values.percentageRate === 0) throw new Error('資產百分比提領率必須大於 0。');
    return values;
  }

  function returnForYear(baseReturn, year, sequence) {
    if (sequence === 'early' && (year === 1 || year === 2)) return -0.15;
    if (sequence === 'late' && (year === 10 || year === 11)) return -0.15;
    return baseReturn;
  }

  function withdrawalForYear(start, year, previousReturn, values) {
    const base = values.withdrawal * Math.pow(1 + values.inflation, year - 1);
    if (values.mode === 'percentage') return start * values.percentageRate;
    if (values.mode === 'flexible' && year > 1 && previousReturn < values.trigger) return base * (1 - values.flexibleCut);
    return base;
  }

  function simulate(values, sequence = values.sequence) {
    let balance = values.asset;
    let previousReturn = null;
    let depletionYear = null;
    const rows = [];
    for (let year = 1; year <= values.years; year += 1) {
      const start = balance;
      const annualReturn = returnForYear(values.nominalReturn, year, sequence);
      const withdrawal = withdrawalForYear(start, year, previousReturn, values);
      const endBeforeFloor = start * (1 + annualReturn) - withdrawal;
      balance = Math.max(0, endBeforeFloor);
      if (depletionYear === null && endBeforeFloor < 0) depletionYear = year;
      rows.push({ year, start, annualReturn, withdrawal, end: balance, realEnd: balance / Math.pow(1 + values.inflation, year) });
      previousReturn = annualReturn;
    }
    const firstWithdrawal = rows[0]?.withdrawal ?? 0;
    return {
      sequence,
      rows,
      finalBalance: balance,
      depletionYear,
      initialRate: values.asset ? firstWithdrawal / values.asset : null,
      reserveMonths: firstWithdrawal > 0 ? values.reserve / (firstWithdrawal / 12) : null
    };
  }

  function sequenceLabel(sequence) {
    return sequence === 'early' ? '退休初期第 1–2 年各 -15%' : sequence === 'late' ? '第 10–11 年各 -15%' : '無額外壓力路徑';
  }

  function modeLabel(values) {
    if (values.mode === 'percentage') return `資產百分比提領 ${pct(values.percentageRate, 1)}`;
    if (values.mode === 'flexible') return `固定基準＋下跌時減少 ${pct(values.flexibleCut, 1)}`;
    return '固定金額＋通膨調整';
  }

  function drawChart(result) {
    const canvas = $('cashflow-chart');
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, Math.floor(rect.width || 640));
    const height = 260;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const rows = result.rows;
    if (rows.length < 1) return;
    const values = rows.map((row) => row.end);
    const max = Math.max(...values, 1);
    const margin = { top: 28, right: 14, bottom: 30, left: 58 };
    const x = (index) => margin.left + (index / Math.max(rows.length - 1, 1)) * (width - margin.left - margin.right);
    const y = (value) => margin.top + (1 - value / max) * (height - margin.top - margin.bottom);
    const styles = getComputedStyle(document.documentElement);
    const line = styles.getPropertyValue('--line').trim() || '#d9e2ec';
    const muted = styles.getPropertyValue('--muted').trim() || '#52606d';
    context.strokeStyle = line;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(margin.left, y(0));
    context.lineTo(width - margin.right, y(0));
    context.stroke();
    context.strokeStyle = '#f97316';
    context.lineWidth = 2.5;
    context.beginPath();
    rows.forEach((row, index) => { const px = x(index); const py = y(row.end); if (index === 0) context.moveTo(px, py); else context.lineTo(px, py); });
    context.stroke();
    context.fillStyle = muted;
    context.font = '12px system-ui, sans-serif';
    context.fillText('資產餘額', margin.left, 15);
    context.fillStyle = '#f97316';
    context.fillRect(margin.left + 58, 7, 24, 3);
    context.fillStyle = muted;
    context.fillText(`第 1 年：${money(rows[0].end)}`, margin.left, height - 9);
    const finalText = `第 ${rows[rows.length - 1].year} 年：${money(rows[rows.length - 1].end)}`;
    context.fillText(finalText, Math.max(margin.left, width - 170), height - 9);
    context.fillText(money(max), 4, margin.top + 4);
    context.fillText('0', 35, height - margin.bottom + 4);
    canvas.setAttribute('aria-label', `${sequenceLabel(result.sequence)}，資產餘額由第 1 年 ${money(rows[0].end)} 變為第 ${rows[rows.length - 1].year} 年 ${money(rows[rows.length - 1].end)}`);
  }

  function appendCell(row, value, className = '') {
    const cell = document.createElement('td');
    cell.textContent = value;
    if (className) cell.className = className;
    row.append(cell);
  }

  function renderTable(result) {
    const body = $('rows');
    body.replaceChildren();
    result.rows.forEach((row) => {
      const tr = document.createElement('tr');
      appendCell(tr, String(row.year));
      appendCell(tr, money(row.start));
      appendCell(tr, signedPct(row.annualReturn));
      appendCell(tr, money(row.withdrawal));
      appendCell(tr, money(row.end));
      body.append(tr);
    });
  }

  function renderScenarioTable(values, selected) {
    const body = $('scenario-rows');
    body.replaceChildren();
    ['none', 'early', 'late'].forEach((sequence) => {
      const result = simulate(values, sequence);
      const tr = document.createElement('tr');
      appendCell(tr, sequenceLabel(sequence));
      appendCell(tr, money(result.finalBalance));
      appendCell(tr, result.depletionYear === null ? '模擬期內未耗盡' : `第 ${result.depletionYear} 年`);
      appendCell(tr, sequence === selected ? '目前圖表' : '—');
      body.append(tr);
    });
  }

  function render(values, result) {
    latest = { values, result };
    const realReturn = ((1 + values.nominalReturn) / (1 + values.inflation)) - 1;
    $('results').hidden = false;
    $('rate').textContent = pct(result.initialRate, 1);
    $('real-return').textContent = pct(realReturn, 2);
    $('end').textContent = money(result.finalBalance);
    $('deplete').textContent = result.depletionYear === null ? '模擬期內未耗盡' : `第 ${result.depletionYear} 年`;
    $('reserve-months').textContent = result.reserveMonths === null ? '—' : `${result.reserveMonths.toFixed(1)} 個月`;
    $('selected-rule').textContent = `${modeLabel(values)}；${sequenceLabel(result.sequence)}`;
    $('table-basis').textContent = `${modeLabel(values)}；${values.years} 年`;
    $('summary').textContent = `共 ${values.years} 年；單一路徑 deterministic scenario，不是成功機率。`;
    $('scenario-note').textContent = `目前選擇：${sequenceLabel(result.sequence)}。三條路徑只差在明確指定的報酬序列，其他輸入相同。`;
    renderTable(result);
    renderScenarioTable(values, result.sequence);
    drawChart(result);
    $('download').disabled = false;
    $('error').hidden = true;
    setStatus('計算完成', `${modeLabel(values)}；結果僅供教育與壓力測試。`, 'ok');
  }

  function run() {
    clearResults();
    setStatus('計算中', '正在建立年度現金流、準備金與序列報酬情境…');
    try {
      const values = readInputs();
      const result = simulate(values);
      render(values, result);
    } catch (error) {
      showError(error);
    }
  }

  function reset() {
    Object.entries(DEFAULTS).forEach(([key, value]) => {
      const id = key === 'nominalReturn' ? 'nominal-return' : key === 'percentageRate' ? 'percentage-rate' : key === 'flexibleCut' ? 'flexible-cut' : key;
      const element = $(id);
      if (element) element.value = value;
    });
    $('withdrawal-mode').value = DEFAULTS.mode;
    $('sequence').value = DEFAULTS.sequence;
    updateModeHelp();
    clearResults();
    setStatus('等待執行', '已恢復教育示範預設值；請按執行後查看結果。');
  }

  function updateModeHelp() {
    const mode = $('withdrawal-mode').value;
    $('percentage-control').hidden = mode !== 'percentage';
    $('flexible-controls').hidden = mode !== 'flexible';
    $('mode-help').textContent = mode === 'percentage'
      ? '每年提領＝年初資產 × 百分比；現金流會隨資產上下波動。'
      : mode === 'flexible'
        ? '基準提領按通膨增加；若前一年報酬低於觸發門檻，當年基準提領按設定比例下調。'
        : '每年提領以第一年金額為基準，按設定通膨率調整；不會因資產下跌自動減少。';
  }

  function markDirty() {
    if (latest || !$('results').hidden) clearResults();
    setStatus('待重新計算', '輸入已變更；按下執行後才會更新年度表與壓力比較。');
  }

  $('run').addEventListener('click', run);
  $('reset').addEventListener('click', reset);
  $('withdrawal-mode').addEventListener('change', () => { updateModeHelp(); markDirty(); });
  $('sequence').addEventListener('change', markDirty);
  ['asset', 'withdrawal', 'nominal-return', 'inflation', 'years', 'reserve', 'percentage-rate', 'flexible-cut', 'trigger'].forEach((id) => {
    $(id).addEventListener('input', markDirty);
  });
  $('download').addEventListener('click', () => {
    if (!latest) return;
    const payload = {
      tool: 'retirement-cashflow-stress-test',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      basis: 'Annual deterministic scenario; start-of-year return then withdrawal; no taxes, fees, benefits, insurance, or probability model.',
      inputs: latest.values,
      selected_scenario: latest.result.sequence,
      selected_rows: latest.result.rows,
      comparison: ['none', 'early', 'late'].map((sequence) => {
        const result = simulate(latest.values, sequence);
        return { sequence, label: sequenceLabel(sequence), final_balance: result.finalBalance, depletion_year: result.depletionYear };
      })
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'retirement-cashflow-scenario.json';
    anchor.click();
    URL.revokeObjectURL(url);
  });
  window.addEventListener('resize', () => { if (latest) drawChart(latest.result); });
  updateModeHelp();
  clearResults();
})();
