(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const items = [...document.querySelectorAll('#checklist-items input[type="checkbox"]')];

  function setText(id, value) { $(id).textContent = value; }

  function render() {
    const done = items.filter((item) => item.checked).length;
    const remaining = items.length - done;
    const ratio = items.length ? done / items.length : 0;
    const state = done === items.length ? '完整' : done >= 6 ? '接近完成' : done >= 3 ? '部分完成' : '待補充';
    setText('score', `${done} / ${items.length}`);
    setText('done', String(done));
    setText('remaining', String(remaining));
    setText('percent', `${(ratio * 100).toFixed(0)}%`);
    setText('state', state);
    setText('result-message', done === items.length ? '清單已全部勾選；這只代表流程欄位完整，不代表策略有效。' : `還有 ${remaining} 個事前欄位未確認，請先補充紀錄或標記為不適用。`);
    const rows = document.createDocumentFragment();
    items.forEach((item) => {
      const row = document.createElement('tr');
      const label = document.createElement('td');
      label.textContent = item.dataset.label || '未命名項目';
      const status = document.createElement('td');
      status.textContent = item.checked ? '已確認' : '待確認';
      status.className = item.checked ? 'positive' : 'negative';
      const note = document.createElement('td');
      note.textContent = item.checked ? '已在交易前留下對應規則或紀錄。' : '不要在壓力中臨時發明這項規則。';
      row.append(label, status, note);
      rows.append(row);
    });
    $('breakdown-rows').replaceChildren(rows);
    $('status').textContent = `目前完成 ${done}/${items.length} 項；分數只反映流程完整度。`;
    $('status').className = done === items.length ? 'practical-status ok' : 'practical-status';
  }

  items.forEach((item) => item.addEventListener('change', render));
  $('calculate').addEventListener('click', render);
  $('clear').addEventListener('click', () => { items.forEach((item) => { item.checked = false; }); render(); });
  render();
})();
