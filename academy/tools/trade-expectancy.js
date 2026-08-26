(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ids = [
    'direction', 'win-rate', 'entry', 'stop', 'target', 'position-size', 'trades',
    'entry-fee', 'exit-fee', 'entry-slip', 'exit-slip', 'entry-fixed', 'exit-fixed'
  ];
  let lastOutcome = null;

  const moneyFormat = new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const priceFormat = new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

  function numberValue(id) {
    return Number($(id).value);
  }

  function money(value) {
    return `NT$ ${moneyFormat.format(value)}`;
  }

  function price(value) {
    return priceFormat.format(value);
  }

  function signedR(value) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(4)}R`;
  }

  function percent(value) {
    return `${(value * 100).toFixed(2)}%`;
  }

  function setText(id, value) {
    $(id).textContent = value;
  }

  function clearOutput(message = '等待有效輸入') {
    lastOutcome = null;
    for (const id of ['expectancy-r', 'planned-rr', 'net-win-r', 'net-loss-r', 'expectancy-money', 'break-even', 'expected-total', 'actual-entry']) {
      setText(id, '—');
    }
    setText('result-message', message);
    setText('cost-direction', '—');
    setText('win-bar-label', '—');
    setText('loss-bar-label', '—');
    setText('bar-caption', '—');
    $('win-bar').style.width = '0%';
    $('loss-bar').style.width = '0%';
    $('win-bar').setAttribute('aria-valuenow', '0');
    $('loss-bar').setAttribute('aria-valuenow', '0');
    $('outcome-rows').replaceChildren();
    const empty = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = '尚未計算';
    empty.append(cell);
    $('outcome-rows').append(empty);
    $('download')?.setAttribute('disabled', 'disabled');
  }

  function setStatus(message, type = '') {
    const status = $('status');
    status.textContent = message;
    status.className = type ? `status ${type}` : 'status';
  }

  function validate(model) {
    const prices = [model.entry, model.stop, model.target];
    if (!prices.every((value) => Number.isFinite(value) && value > 0)) {
      return '進場價、停損價與目標價必須是大於 0 的有限數字。';
    }
    if (model.direction === 'long' && !(model.stop < model.entry && model.entry < model.target)) {
      return '多頭條件必須是 Stop < Entry < Target。';
    }
    if (model.direction === 'short' && !(model.target < model.entry && model.entry < model.stop)) {
      return '空頭條件必須是 Target < Entry < Stop。';
    }
    if (!Number.isFinite(model.winRate) || model.winRate < 0 || model.winRate > 100) {
      return '勝率必須介於 0% 與 100% 之間。';
    }
    if (!Number.isFinite(model.positionSize) || model.positionSize <= 0) {
      return '部位數量必須大於 0。';
    }
    if (!Number.isInteger(model.trades) || model.trades <= 0) {
      return '評估交易筆數必須是正整數。';
    }
    const rates = [model.entryFee, model.exitFee, model.entrySlip, model.exitSlip];
    if (!rates.every((value) => Number.isFinite(value) && value >= 0 && value < 100)) {
      return '手續費與滑價百分比必須介於 0%（含）與 100%（不含）之間。';
    }
    if (![model.entryFixed, model.exitFixed].every((value) => Number.isFinite(value) && value >= 0)) {
      return '固定費用不可為負數。';
    }
    return '';
  }

  function readModel() {
    return {
      direction: $('direction').value,
      winRate: numberValue('win-rate'),
      entry: numberValue('entry'),
      stop: numberValue('stop'),
      target: numberValue('target'),
      positionSize: numberValue('position-size'),
      trades: numberValue('trades'),
      entryFee: numberValue('entry-fee'),
      exitFee: numberValue('exit-fee'),
      entrySlip: numberValue('entry-slip'),
      exitSlip: numberValue('exit-slip'),
      entryFixed: numberValue('entry-fixed'),
      exitFixed: numberValue('exit-fixed'),
    };
  }

  function executionPrices(model) {
    const entrySlip = model.entrySlip / 100;
    const exitSlip = model.exitSlip / 100;
    if (model.direction === 'long') {
      return {
        actualEntry: model.entry * (1 + entrySlip),
        actualWinExit: model.target * (1 - exitSlip),
        actualLossExit: model.stop * (1 - exitSlip),
      };
    }
    return {
      actualEntry: model.entry * (1 - entrySlip),
      actualWinExit: model.target * (1 + exitSlip),
      actualLossExit: model.stop * (1 + exitSlip),
    };
  }

  function pnl(model, actualEntry, actualExit) {
    const unitPnl = model.direction === 'long'
      ? actualExit - actualEntry
      : actualEntry - actualExit;
    return unitPnl * model.positionSize;
  }

  function fees(model, actualEntry, actualExit) {
    const entryRate = model.entryFee / 100;
    const exitRate = model.exitFee / 100;
    return (
      Math.abs(actualEntry) * model.positionSize * entryRate
      + Math.abs(actualExit) * model.positionSize * exitRate
      + model.entryFixed
      + model.exitFixed
    );
  }

  function calculate(model) {
    const error = validate(model);
    if (error) {
      clearOutput('輸入尚未形成有效模型');
      setStatus(`輸入錯誤：${error}`, 'error');
      return null;
    }

    const plannedRiskPerUnit = Math.abs(model.entry - model.stop);
    const plannedRewardPerUnit = Math.abs(model.target - model.entry);
    const plannedRiskTotal = plannedRiskPerUnit * model.positionSize;
    const plannedRR = plannedRewardPerUnit / plannedRiskPerUnit;
    const { actualEntry, actualWinExit, actualLossExit } = executionPrices(model);
    const grossWinPnl = pnl(model, actualEntry, actualWinExit);
    const grossLossPnl = pnl(model, actualEntry, actualLossExit);
    const winFees = fees(model, actualEntry, actualWinExit);
    const lossFees = fees(model, actualEntry, actualLossExit);
    const netWinPnl = grossWinPnl - winFees;
    const netLossPnl = grossLossPnl - lossFees;
    const netWinR = netWinPnl / plannedRiskTotal;
    const netLossR = netLossPnl / plannedRiskTotal;
    const winRate = model.winRate / 100;
    const expectancyR = winRate * netWinR + (1 - winRate) * netLossR;
    const expectancyMoney = winRate * netWinPnl + (1 - winRate) * netLossPnl;
    const denominator = netWinR - netLossR;
    const breakEven = denominator > 0 ? (-netLossR) / denominator : Number.NaN;

    return {
      model,
      plannedRiskPerUnit,
      plannedRewardPerUnit,
      plannedRR,
      actualEntry,
      actualWinExit,
      actualLossExit,
      grossWinPnl,
      grossLossPnl,
      winFees,
      lossFees,
      netWinPnl,
      netLossPnl,
      netWinR,
      netLossR,
      expectancyR,
      expectancyMoney,
      breakEven,
      expectedTotal: expectancyMoney * model.trades,
    };
  }

  function addOutcomeRow(label, gross, cost, net, netR, className) {
    const row = document.createElement('tr');
    const values = [label, money(gross), `-${money(cost)}`, money(net), signedR(netR)];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index === 3 || index === 4) cell.className = className;
      row.append(cell);
    });
    $('outcome-rows').append(row);
  }

  function render(outcome) {
    lastOutcome = outcome;
    const { model } = outcome;
    setText('expectancy-r', signedR(outcome.expectancyR));
    setText('result-message', outcome.expectancyR > 0
      ? '在目前成本、勝率與盈虧假設下，模型呈現正期望；仍需用真實紀錄驗證。'
      : outcome.expectancyR < 0
        ? '在目前成本、勝率與盈虧假設下，模型呈現負期望。'
        : '在目前成本、勝率與盈虧假設下，模型理論損益兩平。');
    setText('planned-rr', `${outcome.plannedRR.toFixed(2)}R`);
    setText('net-win-r', signedR(outcome.netWinR));
    setText('net-loss-r', signedR(outcome.netLossR));
    setText('expectancy-money', money(outcome.expectancyMoney));
    setText('break-even', Number.isFinite(outcome.breakEven) ? percent(outcome.breakEven) : '無法形成');
    setText('expected-total', money(outcome.expectedTotal));
    setText('actual-entry', price(outcome.actualEntry));
    setText('cost-direction', model.direction === 'long' ? '買貴／賣便宜' : '賣便宜／買貴');

    $('outcome-rows').replaceChildren();
    addOutcomeRow('達到目標', outcome.grossWinPnl, outcome.winFees, outcome.netWinPnl, outcome.netWinR, 'positive');
    addOutcomeRow('觸發停損', outcome.grossLossPnl, outcome.lossFees, outcome.netLossPnl, outcome.netLossR, 'negative');

    const winAbs = Math.abs(outcome.netWinR);
    const lossAbs = Math.abs(outcome.netLossR);
    const totalAbs = winAbs + lossAbs;
    const winWidth = totalAbs > 0 ? (winAbs / totalAbs) * 100 : 0;
    const lossWidth = totalAbs > 0 ? (lossAbs / totalAbs) * 100 : 0;
    $('win-bar').style.width = `${winWidth}%`;
    $('loss-bar').style.width = `${lossWidth}%`;
    $('win-bar').setAttribute('aria-valuenow', winWidth.toFixed(2));
    $('loss-bar').setAttribute('aria-valuenow', lossWidth.toFixed(2));
    setText('win-bar-label', signedR(outcome.netWinR));
    setText('loss-bar-label', signedR(outcome.netLossR));
    setText('bar-caption', `每筆期望 ${signedR(outcome.expectancyR)}`);
    $('expectancy-r').classList.toggle('positive', outcome.expectancyR >= 0);
    $('expectancy-r').classList.toggle('negative', outcome.expectancyR < 0);
    $('download')?.removeAttribute('disabled');
    setStatus('計算完成：結果只反映目前輸入的情境與交易成本假設。', 'ok');
  }

  function calculateAndRender() {
    const outcome = calculate(readModel());
    if (outcome) render(outcome);
  }

  function downloadCsv() {
    if (!lastOutcome) {
      setStatus('請先完成一次有效計算，再下載 CSV。', 'error');
      return;
    }
    const o = lastOutcome;
    const rows = [
      ['欄位', '數值'],
      ['方向', o.model.direction === 'long' ? '多頭' : '空頭'],
      ['計畫R:R', o.plannedRR.toFixed(6)],
      ['獲利情境毛結果', o.grossWinPnl.toFixed(6)],
      ['獲利情境成本', o.winFees.toFixed(6)],
      ['獲利情境淨結果', o.netWinPnl.toFixed(6)],
      ['獲利情境淨R', o.netWinR.toFixed(6)],
      ['停損情境毛結果', o.grossLossPnl.toFixed(6)],
      ['停損情境成本', o.lossFees.toFixed(6)],
      ['停損情境淨結果', o.netLossPnl.toFixed(6)],
      ['停損情境淨R', o.netLossR.toFixed(6)],
      ['勝率', (o.model.winRate / 100).toFixed(6)],
      ['每筆期望R', o.expectancyR.toFixed(6)],
      ['每筆金額期望', o.expectancyMoney.toFixed(6)],
      ['損益兩平勝率', Number.isFinite(o.breakEven) ? o.breakEven.toFixed(6) : 'NA'],
      ['評估交易筆數', String(o.model.trades)],
      ['評估期間期望', o.expectedTotal.toFixed(6)],
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')}`;
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'trade-expectancy-result.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  ids.forEach((id) => {
    $(id).addEventListener('input', calculateAndRender);
    $(id).addEventListener('change', calculateAndRender);
  });
  $('calculate').addEventListener('click', calculateAndRender);
  $('clear').addEventListener('click', () => {
    clearOutput('已清除結果；修改輸入後可重新計算。');
    setStatus('結果已清除。輸入變更時會重新計算。');
  });
  $('download')?.addEventListener('click', downloadCsv);
  clearOutput('正在載入預設示範');
  calculateAndRender();
})();
