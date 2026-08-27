(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let lastAnalysis = null;
  const moneyFormat = new Intl.NumberFormat('zh-TW', {minimumFractionDigits: 2, maximumFractionDigits: 2});

  function money(value) { return `NT$ ${moneyFormat.format(value)}`; }
  function signed(value, digits = 2) { return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}R`; }
  function setText(id, value) { $(id).textContent = value; }
  function clearNode(id) { $(id).replaceChildren(); }

  function clearOutput(message = '等待有效輸入') {
    for (const id of ['expectancy','count','win-rate','avg-win','avg-loss','profit-factor','max-loss-streak','max-drawdown','total-r']) setText(id, '—');
    setText('result-message', message);
    setText('chart-caption', '—');
    clearNode('breakdown-rows');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = '尚未計算';
    row.append(cell);
    $('breakdown-rows').append(row);
    clearNode('equity-bars');
  }

  function setStatus(message, kind = '') {
    $('status').textContent = message;
    $('status').className = kind ? `practical-status ${kind}` : 'practical-status';
  }

  function parseResults() {
    const raw = $('trade-results').value.trim();
    if (!raw) return {error: '請貼入至少 5 筆已完成交易的 R 結果。'};
    const tokens = raw.split(/[\s,，;；]+/).filter(Boolean);
    const values = tokens.map((token) => Number(token.replace(/[rR]$/, '')));
    if (values.length < 5) return {error: '至少需要 5 筆交易結果，才能開始這個簡化統計。'};
    if (!values.every(Number.isFinite)) return {error: '資料含有無法解析的項目；請只輸入數字或數字加 R，例如 -1、2.4R。'};
    return {values};
  }

  function calculate(values, rMoney) {
    const wins = values.filter((value) => value > 0);
    const losses = values.filter((value) => value < 0);
    const breakeven = values.filter((value) => value === 0);
    const winRate = wins.length / values.length;
    const lossRate = losses.length / values.length;
    const totalWin = wins.reduce((sum, value) => sum + value, 0);
    const totalLossAbs = losses.reduce((sum, value) => sum + Math.abs(value), 0);
    const avgWin = wins.length ? totalWin / wins.length : 0;
    const avgLoss = losses.length ? totalLossAbs / losses.length : 0;
    const expectancy = values.reduce((sum, value) => sum + value, 0) / values.length;
    const profitFactor = totalLossAbs > 0 ? totalWin / totalLossAbs : Number.POSITIVE_INFINITY;
    let running = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let maxDrawdownPeakIndex = 0;
    let maxDrawdownTroughIndex = 0;
    let drawdownPeakIndex = 0;
    let currentLossStreak = 0;
    let maxLossStreak = 0;
    const equity = [];
    values.forEach((value, index) => {
      running += value;
      equity.push(running);
      if (running > peak) {
        peak = running;
        drawdownPeakIndex = index;
      }
      const drawdown = running - peak;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPeakIndex = drawdownPeakIndex;
        maxDrawdownTroughIndex = index;
      }
      if (value < 0) {
        currentLossStreak += 1;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      } else {
        currentLossStreak = 0;
      }
    });
    return {values, wins, losses, breakeven, winRate, lossRate, totalWin, totalLossAbs, avgWin, avgLoss, expectancy, profitFactor, equity, maxDrawdown, maxDrawdownPeakIndex, maxDrawdownTroughIndex, maxLossStreak, rMoney};
  }

  function breakdownRow(label, value, note, className = '') {
    const row = document.createElement('tr');
    [label, value, note].forEach((text, index) => {
      const cell = document.createElement('td');
      cell.textContent = text;
      if (index === 1 && className) cell.className = className;
      row.append(cell);
    });
    $('breakdown-rows').append(row);
  }

  function render(analysis) {
    lastAnalysis = analysis;
    setText('expectancy', signed(analysis.expectancy));
    setText('result-message', analysis.expectancy > 0 ? '這組已完成交易在目前 R 口徑下呈現正平均結果；請再檢查樣本外與分組差異。' : analysis.expectancy < 0 ? '這組已完成交易在目前 R 口徑下呈現負平均結果。' : '這組已完成交易在目前 R 口徑下平均損益兩平。');
    setText('count', String(analysis.values.length));
    setText('win-rate', `${(analysis.winRate * 100).toFixed(2)}%`);
    setText('avg-win', analysis.wins.length ? `+${analysis.avgWin.toFixed(2)}R` : '無獲利');
    setText('avg-loss', analysis.losses.length ? `-${analysis.avgLoss.toFixed(2)}R` : '無虧損');
    setText('profit-factor', Number.isFinite(analysis.profitFactor) ? analysis.profitFactor.toFixed(2) : '∞');
    setText('max-loss-streak', `${analysis.maxLossStreak} 筆`);
    setText('max-drawdown', signed(analysis.maxDrawdown));
    setText('total-r', signed(analysis.equity.at(-1) || 0));
    clearNode('breakdown-rows');
    breakdownRow('獲利／虧損／損益兩平', `${analysis.wins.length} / ${analysis.losses.length} / ${analysis.breakeven.length}`, '正數／負數／零值交易筆數');
    breakdownRow('總獲利', `+${analysis.totalWin.toFixed(2)}R`, '僅加總正數交易', 'positive');
    breakdownRow('總虧損', `-${analysis.totalLossAbs.toFixed(2)}R`, '取負數交易的絕對值', 'negative');
    breakdownRow('最大回撤峰谷', `${analysis.maxDrawdownPeakIndex + 1} → ${analysis.maxDrawdownTroughIndex + 1}`, `回撤 ${signed(analysis.maxDrawdown)}，依交易順序計算`);
    if (Number.isFinite(analysis.rMoney) && analysis.rMoney > 0) breakdownRow('累積金額結果', money((analysis.equity.at(-1) || 0) * analysis.rMoney), `以 1R = ${money(analysis.rMoney)}`);
    clearNode('equity-bars');
    const maxAbs = Math.max(...analysis.equity.map((value) => Math.abs(value)), 1);
    analysis.equity.slice(-80).forEach((value) => {
      const bar = document.createElement('i');
      const height = Math.max(4, Math.abs(value) / maxAbs * 62);
      bar.style.height = `${height}px`;
      bar.title = signed(value);
      if (value < 0) bar.className = 'loss';
      if (value === 0) bar.className = 'zero';
      $('equity-bars').append(bar);
    });
    setText('chart-caption', `峰值 ${signed(Math.max(...analysis.equity, 0))}；最後 ${signed(analysis.equity.at(-1) || 0)}`);
    setStatus('分析完成：結果只反映貼入的已完成交易 R 序列。', 'ok');
  }

  function recalculate() {
    const parsed = parseResults();
    if (parsed.error) {
      clearOutput('輸入尚未形成有效交易統計');
      setStatus(`輸入錯誤：${parsed.error}`, 'error');
      return;
    }
    const rMoney = Number($('r-money').value);
    if ($('r-money').value.trim() && (!Number.isFinite(rMoney) || rMoney <= 0)) {
      clearOutput('金額換算輸入無效');
      setStatus('輸入錯誤：1R 金額若填寫，必須是大於 0 的有限數字。', 'error');
      return;
    }
    render(calculate(parsed.values, rMoney));
  }

  $('calculate').addEventListener('click', recalculate);
  $('clear').addEventListener('click', () => { clearOutput('已清除結果；可貼入新的交易紀錄。'); setStatus('結果已清除。'); });
  $('trade-results').addEventListener('input', () => setStatus('資料已變更，按下分析交易紀錄後更新。'));
  $('r-money').addEventListener('input', () => setStatus('金額換算已變更，按下分析交易紀錄後更新。'));
  clearOutput('請貼入交易紀錄');
})();
