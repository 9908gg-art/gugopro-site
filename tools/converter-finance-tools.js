/* GugoPro Finance Tools — browser-only calculators and Chart.js visualizations. */
(function () {
  'use strict';
  var root = document.body;
  var tool = root.getAttribute('data-finance-tool') || '';
  var en = root.getAttribute('data-language') === 'en';
  var C = window.ConverterCommon;
  var chart = null;
  var generated = false;
  var copyButton = document.getElementById('finance-copy');
  var downloadButton = document.getElementById('finance-download');
  var calculateButton = document.getElementById('finance-calculate');
  var clearButton = document.getElementById('finance-clear');
  var summaryNode = document.getElementById('finance-summary');
  var statusNode = document.getElementById('finance-status');
  var canvas = document.getElementById('finance-chart');
  var table = document.getElementById('finance-table');
  var progress = document.getElementById('finance-progress-bar');
  var progressLabel = document.getElementById('finance-progress-label');
  var locale = en ? 'en-US' : 'zh-TW';
  var text = en ? {
    ready: 'Ready for a local calculation.', calculating: 'Calculating locally…', done: 'Calculation complete. Results are ready.', invalid: 'Please enter valid non-negative values.', copied: 'Summary copied locally.', copyFail: 'Copy was blocked by the browser.', clear: 'Cleared. Enter values and calculate again.', noChart: 'Chart.js did not load.'
  } : {
    ready: '準備好進行本機試算。', calculating: '正在本機計算…', done: '試算完成，結果已更新。', invalid: '請輸入有效的非負數值。', copied: '試算摘要已複製。', copyFail: '瀏覽器暫時阻擋複製。', clear: '已清除，請重新輸入並試算。', noChart: 'Chart.js 尚未載入。'
  };
  function node(id) { return document.getElementById(id); }
  function value(id, fallback) { var n = node(id); var v = Number(n && n.value); return Number.isFinite(v) ? v : fallback; }
  function textValue(id, fallback) { var n = node(id); return n && n.value ? n.value : fallback; }
  function money(n) { return (Number.isFinite(n) ? n : 0).toLocaleString(locale, { maximumFractionDigits: 2, minimumFractionDigits: 0 }); }
  function integer(n) { return (Number.isFinite(n) ? n : 0).toLocaleString(locale, { maximumFractionDigits: 0 }); }
  function pct(n) { return (Number.isFinite(n) ? n : 0).toLocaleString(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + '%'; }
  function signedMoney(n) { return (n >= 0 ? '+' : '') + money(n); }
  function setStatus(message, kind) { if (C && C.setStatus) C.setStatus(statusNode, message, kind); else if (statusNode) statusNode.textContent = message; }
  function setProgress(v) { if (C && C.setProgress) C.setProgress(progress, progressLabel, v); }
  function metric(index, label, valueText) { var n = node('finance-metric-' + index); if (n) { n.querySelector('span').textContent = label; n.querySelector('strong').textContent = valueText; } }
  function clearChart() { if (chart) { chart.destroy(); chart = null; } }
  function renderChart(config) {
    clearChart();
    if (!window.Chart || !canvas) { setStatus(text.noChart, 'error'); return; }
    chart = new window.Chart(canvas.getContext('2d'), {
      type: config.type || 'line', data: config.data,
      options: Object.assign({ responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { labels: { color: '#b9d7e8', boxWidth: 10, font: { size: 10 } } } }, scales: { x: { ticks: { color: '#88a6b8', maxTicksLimit: 8, font: { size: 9 } }, grid: { color: 'rgba(140,180,205,.10)' } }, y: { ticks: { color: '#88a6b8', font: { size: 9 } }, grid: { color: 'rgba(140,180,205,.10)' } } } }, config.options || {})
    });
  }
  function renderTable(headers, rows) {
    if (!table) return;
    if (!rows || !rows.length) { table.innerHTML = ''; table.hidden = true; return; }
    table.hidden = false;
    table.innerHTML = '<thead><tr>' + headers.map(function (h) { return '<th>' + C.escapeHtml(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td>' + C.escapeHtml(String(cell)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody>';
  }
  function summaryLines(lines) { return lines.join('\n'); }
  function renderResult(result) {
    var labels = result.metricLabels || (en ? ['Primary result', 'Total input', 'Net result', 'Rate'] : ['主要結果', '累積投入', '淨結果', '比率']);
    var values = result.metricValues || ['—', '—', '—', '—'];
    for (var i = 0; i < 4; i++) metric(i + 1, labels[i], values[i]);
    if (summaryNode) summaryNode.textContent = result.summary || '';
    renderTable(result.tableHeaders, result.tableRows);
    renderChart(result.chart);
    generated = true;
    if (copyButton) copyButton.disabled = false;
    if (downloadButton) downloadButton.disabled = false;
    setProgress(100);
    setStatus(text.done, 'success');
  }
  function runCalculation(fn) {
    setStatus(text.calculating);
    setProgress(20);
    window.setTimeout(function () {
      try {
        var result = fn();
        renderResult(result);
      } catch (error) {
        generated = false;
        if (copyButton) copyButton.disabled = true;
        if (downloadButton) downloadButton.disabled = true;
        setProgress(0);
        setStatus(error && error.message ? error.message : text.invalid, 'error');
      }
    }, 0);
  }
  function validNonNegative(ids) { return ids.every(function (id) { var field = node(id); if (!field) return false; if (field.tagName === 'SELECT') return Boolean(field.value); return value(id, NaN) >= 0; }); }
  function bindReactive(fn, ids) {
    ids.forEach(function (id) { var n = node(id); if (n) n.addEventListener('input', function () { if (generated) runCalculation(fn); }); if (n) n.addEventListener('change', function () { if (generated) runCalculation(fn); }); });
    if (calculateButton) calculateButton.addEventListener('click', function () { runCalculation(fn); });
  }
  function copySummary() {
    var content = summaryNode ? summaryNode.textContent : '';
    if (!content) return;
    var done = function () { setStatus(text.copied, 'success'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(content).then(done).catch(function () { setStatus(text.copyFail, 'error'); });
    else { var area = document.createElement('textarea'); area.value = content; document.body.appendChild(area); area.select(); try { document.execCommand('copy'); done(); } catch (e) { setStatus(text.copyFail, 'error'); } area.remove(); }
  }
  function downloadSummary() { if (!generated || !summaryNode || !C) return; var name = 'gugopro-' + tool + '-summary.txt'; C.downloadBlob(new Blob([summaryNode.textContent + '\n'], { type: 'text/plain;charset=utf-8' }), name); }
  function reset() {
    generated = false; clearChart(); renderTable([], []);
    if (copyButton) copyButton.disabled = true; if (downloadButton) downloadButton.disabled = true;
    for (var i = 1; i <= 4; i++) metric(i, en ? 'Result' : '結果', '—');
    if (summaryNode) summaryNode.textContent = en ? 'Calculate to see the local summary.' : '完成試算後會顯示本機摘要。';
    setProgress(0); setStatus(text.clear);
  }
  function dca() {
    var ids = ['dca-initial', 'dca-monthly', 'dca-return', 'dca-years', 'dca-inflation'];
    function calc() {
      if (!validNonNegative(ids) || value('dca-years', 0) <= 0) throw new Error(text.invalid);
      var initial = value('dca-initial', 0), monthly = value('dca-monthly', 0), annual = value('dca-return', 0) / 100, years = value('dca-years', 1), inflation = value('dca-inflation', 0) / 100;
      var months = Math.round(years * 12), r = Math.pow(1 + annual, 1 / 12) - 1, factor = Math.pow(1 + r, months);
      var contributions = initial + monthly * months, finalValue = initial * factor + (r === 0 ? monthly * months : monthly * ((factor - 1) / r));
      var realValue = finalValue / Math.pow(1 + inflation, years), gain = finalValue - contributions;
      var labels = [], invested = [], balance = [];
      for (var y = 0; y <= years; y++) { var m = y * 12, f = Math.pow(1 + r, m), b = initial * f + (r === 0 ? monthly * m : monthly * ((f - 1) / r)); labels.push(String(y)); invested.push(initial + monthly * m); balance.push(b); }
      return { metricLabels: en ? ['Ending assets', 'Principal invested', 'Net return', 'Real value'] : ['期末總資產', '累積投入本金', '淨投資收益', '通膨後實質值'], metricValues: [money(finalValue), money(contributions), signedMoney(gain), money(realValue)], summary: summaryLines([(en ? 'DCA & compound summary' : '定期定額與複利摘要'), (en ? 'Ending assets: ' : '期末總資產：') + money(finalValue), (en ? 'Principal invested: ' : '累積投入本金：') + money(contributions), (en ? 'Net return: ' : '淨投資收益：') + signedMoney(gain), (en ? 'Real value after inflation: ' : '通膨後實質值：') + money(realValue)]), chart: { data: { labels: labels, datasets: [{ label: en ? 'Portfolio value' : '投資組合價值', data: balance, borderColor: '#55d6ff', backgroundColor: 'rgba(85,214,255,.22)', fill: true, tension: .25 }, { label: en ? 'Principal invested' : '累積投入本金', data: invested, borderColor: '#ffbd73', backgroundColor: 'rgba(255,189,115,.10)', fill: true, tension: .15 }] } } };
    }
    bindReactive(calc, ids); return calc;
  }
  function mortgage() {
    var ids = ['mortgage-price', 'mortgage-ltv', 'mortgage-rate', 'mortgage-years', 'mortgage-grace', 'mortgage-extra'];
    function calc() {
      if (!validNonNegative(ids.filter(function (id) { return id !== 'mortgage-method'; })) || value('mortgage-years', 0) <= 0 || value('mortgage-ltv', 0) > 100) throw new Error(text.invalid);
      var price = value('mortgage-price', 0), loan = price * value('mortgage-ltv', 0) / 100, extra = Math.min(loan, value('mortgage-extra', 0)), principal = loan - extra, annual = value('mortgage-rate', 0) / 100, years = value('mortgage-years', 1), grace = Math.min(Math.max(0, years * 12 - 1), Math.round(value('mortgage-grace', 0) * 12)), n = Math.max(1, years * 12 - grace), r = annual / 12, method = textValue('mortgage-method', 'annuity');
      var balance = principal, totalInterest = 0, firstPayment = 0, rows = [];
      for (var month = 1; month <= years * 12; month++) {
        var interest = balance * r, principalPaid = 0, payment = interest;
        if (month > grace && balance > 0) { var remaining = years * 12 - month + 1; var scheduled = method === 'equal-principal' ? principal / n + balance * r : (r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n))); payment = Math.min(balance + interest, scheduled); principalPaid = Math.min(balance, payment - interest); }
        balance = Math.max(0, balance - principalPaid); totalInterest += interest; if (month === 1) firstPayment = payment; rows.push([month, money(payment), money(interest), money(principalPaid), money(balance)]);
      }
      var endLabel = en ? 'Month' : '期數', paymentLabel = en ? 'Payment' : '月付', interestLabel = en ? 'Interest' : '利息', principalLabel = en ? 'Principal' : '本金', balanceLabel = en ? 'Balance' : '餘額';
      var seriesLabels = rows.map(function (r) { return String(r[0]); });
      return { metricLabels: en ? ['First payment', 'Loan amount', 'Total interest', 'Ending balance'] : ['首月月付額', '貸款本金', '總利息支出', '期末餘額'], metricValues: [money(firstPayment), money(principal), money(totalInterest), money(balance)], summary: summaryLines([(en ? 'Mortgage amortization summary' : '房貸本息攤還摘要'), (en ? 'First payment: ' : '首月月付額：') + money(firstPayment), (en ? 'Loan after extra payment: ' : '提前還款後本金：') + money(principal), (en ? 'Total interest: ' : '總利息支出：') + money(totalInterest), (en ? 'Method: ' : '攤還方式：') + (method === 'equal-principal' ? (en ? 'Equal principal' : '本金平均') : (en ? 'Annuity' : '本息平均'))]), tableHeaders: [endLabel, paymentLabel, interestLabel, principalLabel, balanceLabel], tableRows: rows, chart: { data: { labels: seriesLabels, datasets: [{ label: en ? 'Remaining balance' : '剩餘本金', data: rows.map(function (r) { return Number(String(r[4]).replace(/,/g, '')); }), borderColor: '#55d6ff', backgroundColor: 'rgba(85,214,255,.20)', fill: true, tension: .2 }] } } };
    }
    bindReactive(calc, ids.concat(['mortgage-method'])); return calc;
  }
  function dividend() {
    var ids = ['dividend-target', 'dividend-yield', 'dividend-price', 'dividend-years', 'dividend-growth'];
    function calc() {
      if (!validNonNegative(ids) || value('dividend-yield', 0) <= 0 || value('dividend-price', 0) <= 0 || value('dividend-years', 0) <= 0) throw new Error(text.invalid);
      var target = value('dividend-target', 0), yieldRate = value('dividend-yield', 0) / 100, price = value('dividend-price', 1), years = Math.round(value('dividend-years', 1)), growth = value('dividend-growth', 0) / 100, principal = target * 12 / yieldRate, shares = Math.ceil(principal / price), actual = shares * price * yieldRate, rows = [];
      for (var y = 1; y <= years; y++) rows.push([y, money(actual * Math.pow(1 + growth, y - 1))]);
      return { metricLabels: en ? ['Required principal', 'Estimated shares', 'Monthly target', 'Yield'] : ['所需投入本金', '估算股數', '每月目標收入', '預期殖利率'], metricValues: [money(principal), integer(shares), money(target), pct(yieldRate * 100)], summary: summaryLines([(en ? 'Dividend target summary' : '存股股息現金流摘要'), (en ? 'Required principal: ' : '所需投入本金：') + money(principal), (en ? 'Estimated shares: ' : '估算股數：') + integer(shares), (en ? 'Annual cash flow at start: ' : '起始年現金流：') + money(actual), (en ? 'Assumed yield: ' : '假設年化殖利率：') + pct(yieldRate * 100)]), tableHeaders: [en ? 'Year' : '年份', en ? 'Estimated annual dividend' : '估算年度股息'], tableRows: rows, chart: { data: { labels: rows.map(function (r) { return String(r[0]); }), datasets: [{ label: en ? 'Annual dividend cash flow' : '年度股息現金流', data: rows.map(function (r) { return Number(String(r[1]).replace(/,/g, '')); }), backgroundColor: 'rgba(126,242,176,.38)', borderColor: '#7ef2b0', borderWidth: 1 }] }, type: 'bar' } };
    }
    bindReactive(calc, ids); return calc;
  }
  function trading() {
    var ids = ['trade-price', 'trade-shares', 'trade-commission', 'trade-discount', 'trade-min-fee', 'trade-tax', 'trade-target1', 'trade-target2'];
    function fees(notional) { return Math.max(notional * value('trade-commission', 0) / 100 * value('trade-discount', 100) / 100, value('trade-min-fee', 0)); }
    function netAt(exit, buyCost) { var notional = exit * value('trade-shares', 0); return notional - fees(notional) - notional * value('trade-tax', 0) / 100 - buyCost; }
    function solve(target, buyCost) { var lo = 0, hi = Math.max(value('trade-price', 1) * 3, 1); for (var i = 0; i < 80; i++) { var mid = (lo + hi) / 2; if (netAt(mid, buyCost) < target) lo = mid; else hi = mid; } return hi; }
    function calc() {
      if (!validNonNegative(ids) || value('trade-price', 0) <= 0 || value('trade-shares', 0) <= 0 || value('trade-discount', 0) <= 0) throw new Error(text.invalid);
      var price = value('trade-price', 0), shares = value('trade-shares', 0), buyNotional = price * shares, buyFee = fees(buyNotional), buyCost = buyNotional + buyFee, breakeven = solve(0, buyCost), target1 = solve(buyCost * value('trade-target1', 0) / 100, buyCost), target2 = solve(buyCost * value('trade-target2', 0) / 100, buyCost), rows = [[en ? 'Breakeven' : '損益兩平', money(breakeven)], [en ? 'Target 1' : '目標一', money(target1)], [en ? 'Target 2' : '目標二', money(target2)]];
      return { metricLabels: en ? ['Breakeven / share', 'Buy cost', 'Buy fee', 'Target 1 exit'] : ['每股損益兩平價', '買入總成本', '買入手續費', '目標一出場價'], metricValues: [money(breakeven), money(buyCost), money(buyFee), money(target1)], summary: summaryLines([(en ? 'Trading cost summary' : '交易手續費與損益兩平摘要'), (en ? 'Buy notional: ' : '買入金額：') + money(buyNotional), (en ? 'Total buy cost: ' : '買入總成本：') + money(buyCost), (en ? 'Breakeven price: ' : '每股損益兩平價：') + money(breakeven), (en ? 'Target exits: ' : '目標出場價：') + money(target1) + ' / ' + money(target2)]), tableHeaders: [en ? 'Scenario' : '情境', en ? 'Exit price' : '出場價'], tableRows: rows, chart: { type: 'bar', data: { labels: rows.map(function (r) { return r[0]; }), datasets: [{ label: en ? 'Exit price per share' : '每股出場價', data: rows.map(function (r) { return Number(String(r[1]).replace(/,/g, '')); }), backgroundColor: ['#55d6ff', '#7ef2b0', '#ffbd73'] }] } } };
    }
    bindReactive(calc, ids); return calc;
  }
  function leverage() {
    var ids = ['leverage-side', 'leverage-multiplier', 'leverage-entry', 'leverage-margin', 'leverage-maintenance', 'leverage-exit'];
    function calc() {
      if (!validNonNegative(['leverage-multiplier', 'leverage-entry', 'leverage-margin', 'leverage-maintenance', 'leverage-exit']) || value('leverage-entry', 0) <= 0 || value('leverage-multiplier', 0) < 1 || value('leverage-multiplier', 0) > 125) throw new Error(text.invalid);
      var side = textValue('leverage-side', 'long'), leverageValue = value('leverage-multiplier', 1), entry = value('leverage-entry', 1), margin = value('leverage-margin', 0), maintenance = value('leverage-maintenance', 0) / 100, exit = value('leverage-exit', entry), quantity = margin * leverageValue / entry, notional = margin * leverageValue, reserve = notional * maintenance, longSide = side === 'long', liquidation = longSide ? entry - Math.max(0, margin - reserve) / quantity : entry + Math.max(0, margin - reserve) / quantity, bankruptcy = longSide ? entry - margin / quantity : entry + margin / quantity, pnl = (exit - entry) * quantity * (longSide ? 1 : -1), roe = margin ? pnl / margin * 100 : 0;
      return { metricLabels: en ? ['Liquidation price', 'Bankruptcy price', 'Estimated PnL', 'ROE'] : ['預估強平價格', '破產價格', '預估盈虧', '保證金回報率'], metricValues: [money(Math.max(0, liquidation)), money(Math.max(0, bankruptcy)), signedMoney(pnl), pct(roe)], summary: summaryLines([(en ? 'Leverage liquidation summary' : '槓桿合約強平摘要'), (en ? 'Side: ' : '方向：') + (longSide ? 'Long' : 'Short'), (en ? 'Notional: ' : '名目倉位：') + money(notional), (en ? 'Liquidation estimate: ' : '預估強平價格：') + money(Math.max(0, liquidation)), (en ? 'Estimated PnL / ROE: ' : '預估盈虧／ROE：') + signedMoney(pnl) + ' / ' + pct(roe)]), chart: { type: 'bar', data: { labels: [en ? 'Bankruptcy' : '破產', en ? 'Liquidation' : '強平', en ? 'Entry' : '開倉', en ? 'Exit' : '平倉'], datasets: [{ label: en ? 'Price levels' : '價格位置', data: [Math.max(0, bankruptcy), Math.max(0, liquidation), entry, exit], backgroundColor: ['#ff7e9a', '#ffbd73', '#55d6ff', '#7ef2b0'] }] } } };
    }
    bindReactive(calc, ids); return calc;
  }
  function salary() {
    var ids = ['salary-income', 'salary-mode', 'salary-dependents'];
    function calc() {
      if (value('salary-income', -1) < 0 || value('salary-dependents', -1) < 0) throw new Error(text.invalid);
      var input = value('salary-income', 0), annual = textValue('salary-mode', 'annual') === 'monthly' ? input * 12 : input, dependents = Math.floor(value('salary-dependents', 0)), exemption = 101000, standard = 136000, salaryDeduction = Math.min(annual, 227000), taxable = Math.max(0, annual - salaryDeduction - standard - exemption * (1 + dependents));
      var brackets = [[610000, .05, 0], [1380000, .12, 42700], [2770000, .20, 153100], [5190000, .30, 430100], [Infinity, .40, 949100]], tax = 0, parts = [];
      for (var i = 0; i < brackets.length; i++) { var upper = brackets[i][0], rate = brackets[i][1], lower = i === 0 ? 0 : brackets[i - 1][0]; var taxablePart = Math.max(0, Math.min(taxable, upper) - lower); parts.push(taxablePart * rate); if (taxable <= upper) { tax = Math.max(0, taxable * rate - brackets[i][2]); break; } }
      var monthlyNet = (annual - tax) / 12, effective = annual ? tax / annual * 100 : 0, rows = parts.map(function (amount, index) { return [(index + 1) + (en ? ' · ' + (brackets[index][1] * 100) + '%' : ' · ' + (brackets[index][1] * 100) + '%'), money(amount)]; });
      return { metricLabels: en ? ['Annual tax', 'Monthly net pay', 'Taxable income', 'Effective rate'] : ['年度應納稅額', '每月實拿淨薪資', '課稅所得', '實質有效稅率'], metricValues: [money(tax), money(monthlyNet), money(taxable), pct(effective)], summary: summaryLines([(en ? 'Taiwan 2026 salary tax estimate' : '台灣 2026 薪資所得稅估算'), (en ? 'Annual gross income: ' : '年薪總額：') + money(annual), (en ? 'Taxable income: ' : '課稅所得：') + money(taxable), (en ? 'Estimated annual tax: ' : '估算年度稅額：') + money(tax), (en ? 'Monthly net pay: ' : '每月實拿淨薪資：') + money(monthlyNet)]), tableHeaders: [en ? 'Bracket tax portion' : '級距稅額分解', en ? 'Tax' : '稅額'], tableRows: rows, chart: { type: 'bar', data: { labels: rows.map(function (r) { return r[0]; }), datasets: [{ label: en ? 'Tax by bracket' : '各級距稅額', data: parts, backgroundColor: ['#55d6ff', '#7ef2b0', '#ffbd73', '#c084fc', '#ff7e9a'] }] } } };
    }
    bindReactive(calc, ids); return calc;
  }
  var calc;
  if (tool === 'dca-compound') calc = dca(); else if (tool === 'mortgage') calc = mortgage(); else if (tool === 'dividend-target') calc = dividend(); else if (tool === 'trading-breakeven') calc = trading(); else if (tool === 'leverage-liquidation') calc = leverage(); else if (tool === 'salary-tax') calc = salary();
  if (copyButton) copyButton.addEventListener('click', copySummary);
  if (downloadButton) downloadButton.addEventListener('click', downloadSummary);
  if (clearButton) clearButton.addEventListener('click', reset);
  if (C) C.initCommerce('converter-commerce');
  setStatus(text.ready);
  setProgress(0);
}());
