(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const statusText = {
    fresh: '可用',
    partial: '部分可用',
    stale: '資料過期',
    invalid: '資料無效',
    unavailable: '尚未啟用'
  };

  function text(value, fallback = '—') {
    return value === null || value === undefined || value === '' ? fallback : String(value);
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function metaItem(label, value) {
    const wrapper = element('div');
    wrapper.append(element('span', '', label), element('b', '', text(value)));
    return wrapper;
  }

  function renderSources(registry) {
    const container = $('source-list');
    container.replaceChildren();
    const sources = Array.isArray(registry.sources) ? registry.sources : [];
    if (!sources.length) {
      container.append(element('div', 'research-empty', '來源登錄目前沒有項目。'));
      return;
    }
    sources.forEach((source) => {
      const card = element('article', 'research-card');
      const top = element('div', 'card-top');
      top.append(element('strong', '', text(source.display_name, source.source_id)));
      const state = element('span', `state ${source.enabled ? 'enabled' : 'disabled'}`, source.enabled ? '已登錄／可評估' : '已登錄／未啟用');
      top.append(state);
      card.append(top);
      card.append(element('p', '', text(source.notes, '此來源尚無備註。')));
      const meta = element('div', 'meta-list');
      meta.append(
        metaItem('source_id', source.source_id),
        metaItem('資料類型', Array.isArray(source.data_classes) ? source.data_classes.join('、') : null),
        metaItem('涵蓋範圍', Array.isArray(source.coverage) ? source.coverage.join('、') : null),
        metaItem('頻率', Array.isArray(source.frequencies) ? source.frequencies.join('、') : null),
        metaItem('瀏覽器直連', source.browser_direct_allowed ? '允許（需另行審查）' : '禁止'),
        metaItem('授權索引', source.license_ref)
      );
      card.append(meta);
      const link = element('a', '', '開啟官方來源 ↗');
      link.href = text(source.official_url, '#');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `開啟 ${text(source.display_name, source.source_id)} 官方來源`);
      card.append(link);
      container.append(card);
    });
  }

  function renderDatasets(catalog) {
    const container = $('dataset-list');
    container.replaceChildren();
    const datasets = Array.isArray(catalog.datasets) ? catalog.datasets : [];
    if (!datasets.length) {
      container.append(element('div', 'research-empty', '資料集目錄目前沒有項目。'));
      return;
    }
    datasets.forEach((dataset) => {
      const card = element('article', 'dataset-card');
      const title = element('div', 'dataset-title');
      title.append(element('strong', '', text(dataset.display_name, dataset.dataset_id)), element('span', '', text(dataset.dataset_id)));
      const detail = element('div', 'dataset-detail');
      const detailParts = [
        ['來源', dataset.source_id],
        ['頻率', dataset.frequency],
        ['時間區間口徑', dataset.timezone],
        ['調整', dataset.adjustment],
        ['vintage', dataset.vintage_supported ? '支援' : '不支援'],
        ['最後 as-of', dataset.latest_as_of || '尚無成功快照']
      ];
      detailParts.forEach(([label, value]) => {
        const span = element('span');
        span.append(document.createTextNode(`${label}：`), element('b', '', text(value)));
        detail.append(span);
      });
      const quality = text(dataset.quality_status, 'unavailable');
      const badge = element('span', `quality ${quality}`, statusText[quality] || quality);
      badge.title = quality === 'unavailable' ? '目前只有 catalog metadata，沒有可顯示的觀測值。' : `資料品質狀態：${quality}`;
      card.append(title, detail, badge);
      container.append(card);
    });
  }

  function renderLoaded(registry, catalog) {
    const status = $('catalog-status');
    const updated = $('catalog-updated');
    status.textContent = '已載入本地契約';
    status.className = 'catalog-ok';
    updated.textContent = `registry ${text(registry.registry_version)} · catalog ${text(catalog.catalog_version)} · 更新 ${text(catalog.updated_at)}`;
    renderSources(registry);
    renderDatasets(catalog);
  }

  function renderError(error) {
    const message = `目錄載入失敗：${error.message || '無法讀取本地研究契約'}。本頁不會顯示未經驗證的資料。`;
    $('catalog-status').textContent = '載入失敗';
    $('catalog-status').className = 'catalog-error';
    $('catalog-updated').textContent = '請檢查本地發布檔案與網路狀態後重試。';
    $('source-list').replaceChildren(element('div', 'research-error', message));
    $('dataset-list').replaceChildren(element('div', 'research-error', message));
  }

  async function getJSON(path) {
    const response = await fetch(path, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
    return response.json();
  }

  Promise.all([
    getJSON('../../research/source-registry.json'),
    getJSON('../../research/datasets/catalog.json')
  ]).then(([registry, catalog]) => renderLoaded(registry, catalog)).catch(renderError);
})();
