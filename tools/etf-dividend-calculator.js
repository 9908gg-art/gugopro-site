(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const n = (id) => Math.max(0, Number($(id)?.value) || 0);
  const money = (value) => Number.isFinite(value) ? value.toLocaleString('zh-TW', { maximumFractionDigits: 0 }) : '—';
  const pct = (value) => `${(value * 100).toLocaleString('zh-TW', { maximumFractionDigits: 2 })}%`;
  const pathFor = (points, width = 800, height = 300, maxValue = 1) => points.map((point, index) => `${index ? 'L' : 'M'} ${42 + (index / Math.max(1, points.length - 1)) * (width - 74)} ${height - 28 - (point / maxValue) * (height - 62)}`).join(' ');

  function drawGrid(svg, maxValue) {
    const grid = svg?.querySelector('.svg-grid-lines');
    if (!grid) return;
    const lines = [0.25, 0.5, 0.75, 1].map((ratio) => { const y = 272 - ratio * 210; return `<line x1="42" y1="${y}" x2="770" y2="${y}"/><text x="10" y="${y + 4}" class="svg-axis-label">${money(maxValue * ratio)}</text>`; }).join('');
    grid.innerHTML = lines;
  }

  function simulate() {
    const years = Math.min(60, Math.max(1, Math.floor(n('etf-years'))));
    const principal = n('etf-investment');
    const monthly = n('etf-monthly');
    const yieldRate = n('etf-yield') / 100;
    const growthRate = n('etf-growth') / 100;
    const reinvest = $('etf-reinvest')?.checked;
    const annualContribution = monthly * 12;
    let reinvestValue = principal;
    let cashValue = principal;
    let withdrawn = 0;
    const reinvestPath = [principal];
    const cashPath = [principal];
    let firstDividend = 0;
    let finalDividend = 0;
    for (let year = 1; year <= years; year += 1) {
      const startReinvest = reinvestValue;
      const startCash = cashValue;
      const dividendReinvest = startReinvest * yieldRate;
      const dividendCash = startCash * yieldRate;
      if (year === 1) firstDividend = dividendReinvest;
      finalDividend = reinvest ? dividendReinvest : dividendCash;
      withdrawn += dividendCash;
      const priceMultiplier = Math.max(0.01, 1 + growthRate);
      reinvestValue = (startReinvest + annualContribution + (reinvest ? dividendReinvest : 0)) * priceMultiplier;
      cashValue = (startCash + annualContribution) * priceMultiplier;
      reinvestPath.push(reinvest ? reinvestValue : cashValue + withdrawn);
      cashPath.push(cashValue);
    }
    const endReinvest = reinvest ? reinvestValue : cashValue + withdrawn;
    const gap = Math.max(0, endReinvest - cashValue);
    $('etf-symbol')?.addEventListener('change', () => {}, { once: true });
    ['etf-first-dividend', 'etf-final-dividend'].forEach((id) => {});
    if ($('etf-first-dividend')) $('etf-first-dividend').textContent = `NT$ ${money(firstDividend)}`;
    if ($('etf-final-dividend')) $('etf-final-dividend').textContent = `NT$ ${money(finalDividend)}`;
    if ($('etf-reinvest-value')) $('etf-reinvest-value').textContent = `NT$ ${money(endReinvest)}`;
    if ($('etf-cash-value')) $('etf-cash-value').textContent = `NT$ ${money(cashValue)}`;
    if ($('etf-withdrawn-dividend')) $('etf-withdrawn-dividend').textContent = `NT$ ${money(withdrawn)}`;
    if ($('etf-gap')) $('etf-gap').textContent = `NT$ ${money(gap)}`;
    if ($('etf-status')) $('etf-status').textContent = reinvest ? `已將年度股息納入再投入；${years} 年累計模型現金流約 NT$ ${money(withdrawn)}。` : `目前為領出現金情境；${years} 年累計領出股息約 NT$ ${money(withdrawn)}。`;
    const maxValue = Math.max(...reinvestPath, ...cashPath, 1);
    const svg = $('etf-chart');
    drawGrid(svg, maxValue);
    if ($('etf-reinvest-path')) $('etf-reinvest-path').setAttribute('d', pathFor(reinvestPath, 800, 300, maxValue));
    if ($('etf-cash-path')) $('etf-cash-path').setAttribute('d', pathFor(cashPath, 800, 300, maxValue));
    const dots = $('etf-chart-dots');
    if (dots) dots.innerHTML = [reinvestPath, cashPath].map((series, seriesIndex) => `<circle cx="${42 + (series.length - 1) / Math.max(1, series.length - 1) * 728}" cy="${272 - (series[series.length - 1] / maxValue) * 210}" r="4" class="${seriesIndex ? 'dot-cash' : 'dot-reinvest'}"/>`).join('');
  }

  function bind() {
    const select = $('etf-symbol');
    select?.addEventListener('change', () => { const option = select.options[select.selectedIndex]; if (option.dataset.yield && select.value !== 'custom') $('etf-yield').value = option.dataset.yield; simulate(); });
    ['etf-investment', 'etf-monthly', 'etf-yield', 'etf-growth', 'etf-years', 'etf-reinvest'].forEach((id) => $(id)?.addEventListener('input', simulate));
    simulate();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
