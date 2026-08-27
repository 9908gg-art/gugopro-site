(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const inputIds = ['direction','account','risk-percent','multiplier','entry','stop','target','entry-fee','exit-fee','entry-slip','exit-slip','entry-fixed','exit-fixed'];
  const moneyFormat = new Intl.NumberFormat('zh-TW', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const numberFormat = new Intl.NumberFormat('zh-TW', {minimumFractionDigits: 4, maximumFractionDigits: 4});

  function num(id) { return Number($(id).value); }
  function money(value) { return `NT$ ${moneyFormat.format(value)}`; }
  function number(value) { return numberFormat.format(value); }
  function signed(value, digits = 4) { return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`; }
  function clearNode(id) { $(id).replaceChildren(); }
  function setText(id, value) { $(id).textContent = value; }

  function clearOutput(message = '等待有效輸入') {
    for (const id of ['max-units','risk-budget','risk-per-unit','notional','worst-loss','budget-usage','net-rr','actual-entry','actual-stop']) setText(id, '—');
    setText('result-message', message);
    clearNode('breakdown-rows');
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = '尚未計算';
    row.append(cell);
    $('breakdown-rows').append(row);
  }

  function status(message, kind = '') {
    $('status').textContent = message;
    $('status').className = kind ? `practical-status ${kind}` : 'practical-status';
  }

  function readModel() {
    return {
      direction: $('direction').value,
      account: num('account'),
      riskPercent: num('risk-percent'),
      multiplier: num('multiplier'),
      entry: num('entry'),
      stop: num('stop'),
      target: num('target'),
      entryFee: num('entry-fee'),
      exitFee: num('exit-fee'),
      entrySlip: num('entry-slip'),
      exitSlip: num('exit-slip'),
      entryFixed: num('entry-fixed'),
      exitFixed: num('exit-fixed'),
    };
  }

  function validate(model) {
    const finitePositive = [model.account, model.multiplier, model.entry, model.stop, model.target].every((value) => Number.isFinite(value) && value > 0);
    if (!finitePositive) return '帳戶、乘數與三個價格都必須是大於 0 的有限數字。';
    if (model.direction === 'long' && !(model.stop < model.entry && model.entry < model.target)) return '多頭條件必須是 Stop < Entry < Target。';
    if (model.direction === 'short' && !(model.target < model.entry && model.entry < model.stop)) return '空頭條件必須是 Target < Entry < Stop。';
    if (!Number.isFinite(model.riskPercent) || model.riskPercent <= 0 || model.riskPercent >= 100) return '單筆風險上限必須介於 0% 與 100% 之間。';
    const rates = [model.entryFee, model.exitFee, model.entrySlip, model.exitSlip];
    if (!rates.every((value) => Number.isFinite(value) && value >= 0 && value < 100)) return '手續費與滑價必須介於 0%（含）與 100%（不含）之間。';
    if (![model.entryFixed, model.exitFixed].every((value) => Number.isFinite(value) && value >= 0)) return '固定費用不可為負數。';
    return '';
  }

  function execution(model) {
    const entrySlip = model.entrySlip / 100;
    const exitSlip = model.exitSlip / 100;
    if (model.direction === 'long') return {entry: model.entry * (1 + entrySlip), stop: model.stop * (1 - exitSlip), target: model.target * (1 - exitSlip)};
    return {entry: model.entry * (1 - entrySlip), stop: model.stop * (1 + exitSlip), target: model.target * (1 + exitSlip)};
  }

  function fee(model, entry, exit, units = 1) {
    return Math.abs(entry) * units * model.entryFee / 100 + Math.abs(exit) * units * model.exitFee / 100 + model.entryFixed + model.exitFixed;
  }

  function calculate(model) {
    const error = validate(model);
    if (error) return {error};
    const actual = execution(model);
    const priceRisk = Math.abs(actual.entry - actual.stop) * model.multiplier;
    const variableCost = fee(model, actual.entry, actual.stop, 1) - model.entryFixed - model.exitFixed;
    const unitRisk = priceRisk + variableCost;
    const fixedCost = model.entryFixed + model.exitFixed;
    const budget = model.account * model.riskPercent / 100;
    const availableBudget = budget - fixedCost;
    const maxUnits = availableBudget > 0 ? Math.floor(availableBudget / unitRisk) : 0;
    const notional = maxUnits * actual.entry * model.multiplier;
    const worstLoss = maxUnits * unitRisk + fixedCost;
    const budgetUsage = budget > 0 ? worstLoss / budget : Number.NaN;
    const grossRewardPerUnit = Math.abs(actual.target - actual.entry) * model.multiplier;
    const targetCostPerUnit = fee(model, actual.entry, actual.target, 1);
    const netRewardPerUnit = grossRewardPerUnit - targetCostPerUnit;
    const netRR = unitRisk > 0 ? netRewardPerUnit / unitRisk : Number.NaN;
    return {model, actual, priceRisk, variableCost, unitRisk, fixedCost, budget, availableBudget, maxUnits, notional, worstLoss, budgetUsage, grossRewardPerUnit, targetCostPerUnit, netRewardPerUnit, netRR};
  }

  function breakdownRow(label, value, note, className = '') {
    const row = document.createElement('tr');
    const cells = [label, value, note];
    cells.forEach((item, index) => {
      const cell = document.createElement('td');
      cell.textContent = item;
      if (index === 1 && className) cell.className = className;
      row.append(cell);
    });
    $('breakdown-rows').append(row);
  }

  function render(result) {
    if (result.error) {
      clearOutput('輸入尚未形成有效交易計畫');
      status(`輸入錯誤：${result.error}`, 'error');
      return;
    }
    const {model, actual} = result;
    setText('max-units', `${result.maxUnits.toLocaleString('zh-TW')} 單位`);
    setText('result-message', result.maxUnits > 0 ? '這是依目前風險預算與成本假設得到的最大整數部位，不是交易建議。' : '目前成本或風險預算不足以容納 1 個整數單位。');
    setText('risk-budget', money(result.budget));
    setText('risk-per-unit', money(result.unitRisk));
    setText('notional', money(result.notional));
    setText('worst-loss', money(result.worstLoss));
    setText('budget-usage', `${(result.budgetUsage * 100).toFixed(2)}%`);
    setText('net-rr', Number.isFinite(result.netRR) ? `${result.netRR.toFixed(2)}R` : '無法形成');
    setText('actual-entry', number(actual.entry));
    setText('actual-stop', number(actual.stop));
    clearNode('breakdown-rows');
    breakdownRow('價格風險／單位', money(result.priceRisk), '納入不利滑價後的進場與停損成交價');
    breakdownRow('變動成本／單位', money(result.variableCost), '按 1 個單位的進／出場成交金額估算');
    breakdownRow('固定成本', money(result.fixedCost), '每次進場與出場各計一次');
    breakdownRow('目標淨報酬／單位', money(result.netRewardPerUnit), '目標價差扣除目標情境成本', result.netRewardPerUnit > 0 ? 'positive' : 'negative');
    breakdownRow('最大整數部位', `${result.maxUnits.toLocaleString('zh-TW')} 單位`, '以 floor 捨去不足一單位的部分', result.maxUnits > 0 ? 'positive' : 'negative');
    status('計算完成：結果只反映目前輸入的交易計畫與成本假設。', 'ok');
  }

  function recalculate() { render(calculate(readModel())); }
  inputIds.forEach((id) => { $(id).addEventListener('input', recalculate); $(id).addEventListener('change', recalculate); });
  $('calculate').addEventListener('click', recalculate);
  $('clear').addEventListener('click', () => { clearOutput('已清除結果；輸入新的交易計畫後可重新檢查。'); status('結果已清除。'); });
  clearOutput('請填入交易計畫');
})();
