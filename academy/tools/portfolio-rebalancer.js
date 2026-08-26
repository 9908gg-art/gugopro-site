(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const EPS = 1e-9;
  const DEFAULT_ASSETS = [
    { name: '股票', current: 620000, target: 60 },
    { name: '債券', current: 280000, target: 30 },
    { name: '現金', current: 100000, target: 10 },
  ];

  const state = { lastResult: null };

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function formatMoney(value) {
    if (!Number.isFinite(value)) return '—';
    return `NT$ ${Math.round(value).toLocaleString('zh-TW')}`;
  }

  function formatPct(value, digits = 2) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : '—';
  }

  function formatPoints(value) {
    if (!Number.isFinite(value)) return '—';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)} 個百分點`;
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function setStatus(message, kind = '') {
    const element = $('status');
    element.textContent = message;
    element.className = `status ${kind}`.trim();
  }

  function clearResults(message = '輸入已變更，請重新計算。') {
    state.lastResult = null;
    $('summary').replaceChildren();
    $('allocation-rows').replaceChildren();
    $('cost-summary').replaceChildren();
    $('allocation-chart').replaceChildren();
    $('download').disabled = true;
    setStatus(message);
  }

  function createInput(type, value, className, ariaLabel) {
    const input = document.createElement('input');
    input.type = type;
    input.value = value;
    input.className = className;
    input.setAttribute('aria-label', ariaLabel);
    input.addEventListener('input', () => clearResults());
    return input;
  }

  function createAssetRow(asset) {
    const row = node('tr', 'asset-row');
    const nameCell = node('td');
    const valueCell = node('td');
    const targetCell = node('td');
    const actionCell = node('td');

    const nameInput = createInput('text', asset.name, 'asset-name', '資產名稱');
    const valueInput = createInput('number', asset.current, 'asset-current', '目前市值');
    valueInput.min = '0';
    valueInput.step = '1';
    const targetInput = createInput('number', asset.target, 'asset-target', '目標權重百分比');
    targetInput.min = '0';
    targetInput.max = '100';
    targetInput.step = '0.1';

    nameCell.append(nameInput);
    valueCell.append(valueInput);
    targetCell.append(targetInput);

    const remove = node('button', 'remove-asset', '移除');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      const rows = document.querySelectorAll('#asset-rows tr');
      if (rows.length <= 2) {
        setStatus('至少保留兩個資產類別，才能檢查配置。', 'error');
        return;
      }
      row.remove();
      clearResults('資產列已變更，請重新計算。');
    });
    actionCell.append(remove);
    row.append(nameCell, valueCell, targetCell, actionCell);
    return row;
  }

  function renderDefaultAssets() {
    const body = $('asset-rows');
    body.replaceChildren();
    DEFAULT_ASSETS.forEach((asset) => body.append(createAssetRow(asset)));
  }

  function readInputs() {
    const assets = [...document.querySelectorAll('#asset-rows tr')].map((row, index) => ({
      index,
      name: row.querySelector('.asset-name').value.trim(),
      current: number(row.querySelector('.asset-current').value),
      target: number(row.querySelector('.asset-target').value),
    }));
    return {
      assets,
      contribution: number($('contribution').value),
      mode: $('rebalance-mode').value,
      threshold: number($('threshold').value),
      feeRate: number($('fee-rate').value),
      minimumFee: number($('minimum-fee').value),
      taxRate: number($('tax-rate').value),
    };
  }

  function validate(input) {
    if (input.assets.length < 2) throw new Error('至少需要兩個資產類別。');
    if (input.assets.some((asset) => !asset.name)) throw new Error('每個資產列都需要名稱。');
    if (input.assets.some((asset) => !Number.isFinite(asset.current) || asset.current < 0)) {
      throw new Error('目前市值必須是 0 或以上的有效數字。');
    }
    if (input.assets.some((asset) => !Number.isFinite(asset.target) || asset.target < 0 || asset.target > 100)) {
      throw new Error('目標權重必須介於 0% 與 100%。');
    }
    const targetTotal = input.assets.reduce((sum, asset) => sum + asset.target, 0);
    if (Math.abs(targetTotal - 100) > 0.01) {
      throw new Error(`目標權重目前合計 ${targetTotal.toFixed(2)}%，必須等於 100%。`);
    }
    const currentTotal = input.assets.reduce((sum, asset) => sum + asset.current, 0);
    if (!Number.isFinite(currentTotal) || currentTotal <= 0) {
      throw new Error('目前市值合計必須大於 0。');
    }
    if (!Number.isFinite(input.contribution) || input.contribution < 0) {
      throw new Error('新增投入資金必須是 0 或以上的有效數字。');
    }
    if (!Number.isFinite(input.threshold) || input.threshold < 0 || input.threshold > 100) {
      throw new Error('偏離門檻必須介於 0 與 100 個百分點。');
    }
    if (!Number.isFinite(input.feeRate) || input.feeRate < 0 || input.feeRate > 10) {
      throw new Error('交易費率必須介於 0% 與 10%。');
    }
    if (!Number.isFinite(input.minimumFee) || input.minimumFee < 0) {
      throw new Error('最低單筆費用必須是 0 或以上。');
    }
    if (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 10) {
      throw new Error('稅費率必須介於 0% 與 10%；若不適用請輸入 0。');
    }
  }

  function compute(input) {
    validate(input);
    const currentTotal = input.assets.reduce((sum, asset) => sum + asset.current, 0);
    const futureTotal = currentTotal + input.contribution;
    const deficits = input.assets.map((asset) => Math.max(futureTotal * asset.target / 100 - asset.current, 0));
    const deficitTotal = deficits.reduce((sum, value) => sum + value, 0);
    const cashFirstApplied = input.mode === 'cash-first' ? Math.min(input.contribution, deficitTotal) : 0;
    const rows = input.assets.map((asset, index) => {
      const currentWeight = asset.current / currentTotal * 100;
      const targetValue = futureTotal * asset.target / 100;
      const rawDelta = targetValue - asset.current;
      const drift = currentWeight - asset.target;
      const triggered = Math.abs(drift) + EPS >= input.threshold;
      const contributionAllocation = input.mode === 'cash-first' && deficitTotal > 0
        ? cashFirstApplied * deficits[index] / deficitTotal
        : 0;
      let action = rawDelta;
      if (input.mode === 'threshold' && !triggered) action = 0;
      if (input.mode === 'cash-first') action = rawDelta - contributionAllocation;
      const tradeValue = Math.abs(action);
      const fee = tradeValue > EPS ? tradeValue * input.feeRate / 100 + input.minimumFee : 0;
      const tax = action < -EPS ? tradeValue * input.taxRate / 100 : 0;
      const postValue = asset.current + action;
      return {
        ...asset,
        currentWeight,
        targetValue,
        rawDelta,
        drift,
        triggered,
        contributionAllocation,
        action,
        tradeValue,
        fee,
        tax,
        postValue,
        postWeight: futureTotal > 0 ? postValue / futureTotal * 100 : NaN,
      };
    });
    const actionTotal = rows.reduce((sum, row) => sum + row.action, 0);
    const unallocatedContribution = input.contribution - actionTotal;
    const totalFee = rows.reduce((sum, row) => sum + row.fee, 0);
    const totalTax = rows.reduce((sum, row) => sum + row.tax, 0);
    const totalCost = totalFee + totalTax;
    const triggeredCount = rows.filter((row) => row.triggered).length;
    const finalDrift = rows.map((row) => ({
      name: row.name,
      weight: row.postWeight,
      target: row.target,
      drift: row.postWeight - row.target,
    }));
    return {
      createdAt: new Date().toISOString(),
      input,
      currentTotal,
      futureTotal,
      targetTotal: 100,
      rows,
      actionTotal,
      unallocatedContribution,
      totalFee,
      totalTax,
      totalCost,
      transactionCount: rows.filter((row) => row.tradeValue > EPS).length,
      triggeredCount,
      finalDrift,
    };
  }

  function renderSummary(result) {
    const items = [
      ['目前總市值', formatMoney(result.currentTotal), '目前輸入資產市值合計'],
      ['含新增資金後', formatMoney(result.futureTotal), '目前市值＋可投入資金'],
      ['理論調整淨額', formatMoney(result.actionTotal), '買入為正、減碼為負的合計'],
      ['預估成本', formatMoney(result.totalCost), '費用＋賣出稅費假設'],
      ['交易資產數', `${result.transactionCount} 個`, '理論調整額非零的資產列'],
      ['門檻觸發數', `${result.triggeredCount} 個`, '僅供門檻模式參考'],
    ];
    const fragment = document.createDocumentFragment();
    items.forEach(([label, value, note]) => {
      const card = node('div', 'metric');
      card.append(node('span', 'metric-label', label), node('strong', '', value), node('small', '', note));
      fragment.append(card);
    });
    $('summary').append(fragment);
    const modeText = {
      full: '完整回到目標權重',
      threshold: `漂移門檻：${formatPct(result.input.threshold, 2)} 個百分點`,
      'cash-first': '新資金優先補低配',
    }[result.input.mode];
    const caption = node('p', 'result-caption', `目前模式：${modeText}。結果是理論調整，不代表已成交。`);
    $('summary').prepend(caption);
  }

  function renderRows(result) {
    const fragment = document.createDocumentFragment();
    result.rows.forEach((row) => {
      const tr = node('tr');
      const actionLabel = row.action > EPS ? '買入' : row.action < -EPS ? '減碼' : '不調整';
      const actionClass = row.action > EPS ? 'buy' : row.action < -EPS ? 'sell' : 'hold';
      const cells = [
        row.name,
        formatPct(row.currentWeight, 2),
        formatPct(row.target, 2),
        formatPoints(row.drift),
        formatMoney(row.targetValue),
      ];
      cells.forEach((text) => tr.append(node('td', '', text)));
      const action = node('td', actionClass);
      action.append(node('strong', '', actionLabel), node('span', 'action-amount', row.action === 0 ? '—' : formatMoney(Math.abs(row.action))));
      tr.append(action);
      tr.append(node('td', '', formatPct(row.postWeight, 2)));
      const note = row.inputMode === 'threshold' && !row.triggered ? '未達門檻' : '';
      if (note) tr.lastChild.title = note;
      fragment.append(tr);
    });
    if (Math.abs(result.unallocatedContribution) > 0.01) {
      const tr = node('tr', 'unallocated-row');
      tr.append(node('td', '', '未配置／待決定資金'));
      tr.append(node('td', '', '—'), node('td', '', '—'), node('td', '', '—'), node('td', '', '—'));
      tr.append(node('td', 'hold', formatMoney(Math.abs(result.unallocatedContribution))));
      tr.append(node('td', '', '未納入資產權重'));
      fragment.append(tr);
    }
    $('allocation-rows').append(fragment);
  }

  function renderCost(result) {
    const items = [
      ['費率假設', formatPct(result.input.feeRate, 3)],
      ['最低單筆費用', formatMoney(result.input.minimumFee)],
      ['賣出稅費率假設', formatPct(result.input.taxRate, 3)],
      ['預估交易費', formatMoney(result.totalFee)],
      ['預估賣出稅費', formatMoney(result.totalTax)],
      ['未配置／待決定資金', formatMoney(Math.abs(result.unallocatedContribution))],
    ];
    const fragment = document.createDocumentFragment();
    items.forEach(([label, value]) => {
      const item = node('div', 'cost-item');
      item.append(node('span', '', label), node('strong', '', value));
      fragment.append(item);
    });
    $('cost-summary').append(fragment);
  }

  function renderChart(result) {
    const max = Math.max(...result.rows.map((row) => Math.max(row.currentWeight, row.target)), 1);
    const fragment = document.createDocumentFragment();
    result.rows.forEach((row) => {
      const item = node('div', 'chart-row');
      const label = node('div', 'chart-label', row.name);
      const track = node('div', 'chart-track');
      const current = node('i', 'chart-current');
      const target = node('b', 'chart-target');
      current.style.width = `${Math.max(0, Math.min(100, row.currentWeight / max * 100))}%`;
      target.style.left = `${Math.max(0, Math.min(100, row.target / max * 100))}%`;
      target.title = `目標 ${formatPct(row.target, 2)}`;
      track.append(current, target);
      item.append(label, track, node('span', '', `${formatPct(row.currentWeight, 1)} → ${formatPct(row.target, 1)}`));
      fragment.append(item);
    });
    $('allocation-chart').append(fragment);
  }

  function render(result) {
    renderSummary(result);
    renderRows(result);
    renderCost(result);
    renderChart(result);
    $('download').disabled = false;
    setStatus('計算完成：請把理論差額與費用／稅費假設交由你的實際帳戶規則覆核。', 'ok');
  }

  function calculate() {
    clearResults('正在驗證輸入…');
    try {
      const result = compute(readInputs());
      state.lastResult = result;
      render(result);
    } catch (error) {
      clearResults(`計算未完成：${error.message}`);
      setStatus(`計算未完成：${error.message}`, 'error');
    }
  }

  function download() {
    if (!state.lastResult) return;
    const blob = new Blob([JSON.stringify(state.lastResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gugopro-portfolio-rebalance-result.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function updateModeHelp() {
    const help = {
      full: '直接把每個資產拉回目標權重；適合用來看完整理論差額。',
      threshold: '只有偏離達到門檻的資產列為需要調整；未達門檻者保留現況。',
      'cash-first': '先把新增資金按低配缺口比例分配，仍不足的部分才顯示理論缺口。',
    }[$('rebalance-mode').value];
    $('mode-help').textContent = help;
    clearResults('再平衡模式已變更，請重新計算。');
  }

  $('add-asset').addEventListener('click', () => {
    $('asset-rows').append(createAssetRow({ name: '新資產', current: 0, target: 0 }));
    clearResults('已新增資產列，請填寫市值與目標權重。');
  });
  $('calculate').addEventListener('click', calculate);
  $('download').addEventListener('click', download);
  $('rebalance-mode').addEventListener('change', updateModeHelp);
  ['contribution', 'threshold', 'fee-rate', 'minimum-fee', 'tax-rate'].forEach((id) => $(id).addEventListener('input', () => clearResults()));
  $('reset').addEventListener('click', () => {
    $('contribution').value = '0';
    $('rebalance-mode').value = 'full';
    $('threshold').value = '5';
    $('fee-rate').value = '0.15';
    $('minimum-fee').value = '20';
    $('tax-rate').value = '0';
    renderDefaultAssets();
    updateModeHelp();
    clearResults('已恢復教育示範預設值。');
  });

  renderDefaultAssets();
  updateModeHelp();
  clearResults('尚未計算；輸入與結果只留在目前瀏覽器頁面。');
})();
