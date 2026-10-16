(function () {
  'use strict';

  const STORAGE_KEY = 'gugopro_academy_watchlist_v1';
  const MAX_ITEMS = 50;

  function readItems() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.symbol === 'string' && item.symbol.trim()) : [];
    } catch (error) {
      return [];
    }
  }

  function writeItems(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
      window.dispatchEvent(new CustomEvent('gugo-watchlist-updated'));
      return true;
    } catch (error) {
      return false;
    }
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function mount(config) {
    const prefix = config.prefix;
    const cleanSymbol = config.cleanSymbol;
    const findMeta = config.findMeta;
    const onSelect = config.onSelect;
    const select = document.getElementById(`${prefix}-quick-symbol`);
    const input = document.getElementById(`${prefix}-symbol-search`);
    const addButton = document.getElementById(`${prefix}-watchlist-add`);
    const manageButton = document.getElementById(`${prefix}-watchlist-manage`);
    const closeButton = document.getElementById(`${prefix}-watchlist-close`);
    const clearButton = document.getElementById(`${prefix}-watchlist-clear`);
    const panel = document.getElementById(`${prefix}-watchlist-panel`);
    const optionGroup = document.getElementById(`${prefix}-watchlist-options`);
    const itemsElement = document.getElementById(`${prefix}-watchlist-items`);
    const countElement = document.getElementById(`${prefix}-watchlist-count`);
    const feedbackElement = document.getElementById(`${prefix}-watchlist-feedback`);
    if (!select || !input || !addButton || !manageButton || !panel || !optionGroup || !itemsElement) return null;

    let items = readItems();
    let feedbackTimer = null;

    function normalizedItem(symbol, stored = {}) {
      const normalized = cleanSymbol(symbol);
      if (!normalized) return null;
      const meta = findMeta(normalized) || {};
      return {
        symbol: normalized,
        name: stored.name || meta.name || normalized,
        market: stored.market || meta.market || '自訂商品',
        category: stored.category || meta.category || 'custom',
        group: stored.group || meta.group || '自訂代碼',
        source: stored.source || meta.source || '公開行情',
        tv: stored.tv || meta.tv || ''
      };
    }

    function showFeedback(message, isError = false) {
      if (!feedbackElement) return;
      window.clearTimeout(feedbackTimer);
      feedbackElement.textContent = message;
      feedbackElement.classList.toggle('is-error', isError);
      feedbackTimer = window.setTimeout(() => { feedbackElement.textContent = ''; feedbackElement.classList.remove('is-error'); }, 3600);
    }

    function selectSymbol(symbol) {
      const normalized = cleanSymbol(symbol);
      if (select) select.value = normalized;
      if (input) input.value = normalized;
      panel.hidden = true;
      manageButton.setAttribute('aria-expanded', 'false');
      onSelect(normalized);
    }

    function renderOptions() {
      optionGroup.replaceChildren();
      optionGroup.label = items.length ? `⭐ 我的自訂清單 (${items.length})` : '⭐ 我的自訂清單（尚未加入）';
      optionGroup.disabled = false;
      items.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.symbol;
        option.textContent = `${item.symbol} · ${item.name}`;
        optionGroup.appendChild(option);
      });
      if (countElement) countElement.textContent = String(items.length);
    }

    function renderItems() {
      itemsElement.replaceChildren();
      if (!items.length) {
        itemsElement.appendChild(createElement('p', 'watchlist-empty', '目前尚未加入商品；先輸入代碼，再按「加入自訂」。'));
      } else {
        items.forEach((item) => {
          const row = createElement('div', 'watchlist-item');
          const copy = createElement('div', 'watchlist-item-copy');
          copy.appendChild(createElement('strong', '', item.symbol));
          copy.appendChild(createElement('span', '', `${item.name} · ${item.market}`));
          const actions = createElement('div', 'watchlist-item-actions');
          const load = createElement('button', 'watchlist-load', '載入');
          load.type = 'button'; load.dataset.watchlistLoad = item.symbol;
          const remove = createElement('button', 'watchlist-remove', '刪除');
          remove.type = 'button'; remove.dataset.watchlistRemove = item.symbol;
          actions.append(load, remove);
          row.append(copy, actions);
          itemsElement.appendChild(row);
        });
      }
      if (clearButton) clearButton.disabled = !items.length;
    }

    function render() {
      items = readItems().map((item) => normalizedItem(item.symbol, item)).filter(Boolean).slice(0, MAX_ITEMS);
      renderOptions();
      renderItems();
    }

    function addCurrent() {
      const raw = String(input.value || '').trim();
      if (!raw) { showFeedback('請先輸入商品代碼。', true); input.focus(); return; }
      const item = normalizedItem(raw);
      if (!item) { showFeedback('無法辨識此商品代碼。', true); return; }
      items = [item, ...items.filter((entry) => entry.symbol !== item.symbol)].slice(0, MAX_ITEMS);
      if (!writeItems(items)) { showFeedback('瀏覽器拒絕寫入 localStorage。', true); return; }
      render();
      showFeedback(`已加入 ${item.symbol}，資料只保存在此瀏覽器。`);
      selectSymbol(item.symbol);
    }

    function togglePanel(force) {
      panel.hidden = force === undefined ? !panel.hidden : !force;
      manageButton.setAttribute('aria-expanded', String(!panel.hidden));
    }

    addButton.addEventListener('click', addCurrent);
    manageButton.addEventListener('click', () => togglePanel());
    closeButton?.addEventListener('click', () => togglePanel(false));
    clearButton?.addEventListener('click', () => {
      if (!items.length) return;
      items = [];
      writeItems(items);
      render();
      showFeedback('自訂清單已清空。');
    });
    itemsElement.addEventListener('click', (event) => {
      const load = event.target.closest('[data-watchlist-load]');
      const remove = event.target.closest('[data-watchlist-remove]');
      if (load) { const symbol = load.dataset.watchlistLoad; selectSymbol(symbol); showFeedback(`已載入 ${symbol}。`); }
      if (remove) {
        const symbol = remove.dataset.watchlistRemove;
        items = items.filter((item) => item.symbol !== symbol);
        writeItems(items); render(); showFeedback(`已從自訂清單移除 ${symbol}。`);
      }
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest(`.${prefix}-watchlist-wrap`)) togglePanel(false);
    });
    window.addEventListener('storage', (event) => { if (event.key === STORAGE_KEY) render(); });
    window.addEventListener('gugo-watchlist-updated', render);
    render();
    return { render, addCurrent, getItems: () => items.slice(), selectSymbol };
  }

  window.GugoWatchlist = { mount, storageKey: STORAGE_KEY };
})();
