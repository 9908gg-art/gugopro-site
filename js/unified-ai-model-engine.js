/* GugoPro Unified AI Model Queue Engine
 * Shared by AI Tutor, Nutritionist, Weight Loss Coach and Amazon Finder.
 * Model catalog and quota data are dynamic; no API key or model name is hardcoded here.
 */
(function (root) {
  'use strict';

  const QUOTA_MODELS_URL = 'https://quota.gugopro.com/gemini_rate_limits.json';
  const GEMINI_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  const REQUEST_TIMEOUT_MS = 10000;
  const CATALOG_TTL_MS = 5 * 60 * 1000;
  const MODEL_TEXT_CAPABILITIES = new Set(['text_generation', 'chat_dialog']);
  const MODEL_EXCLUDED_TOKENS = /embedding|aqa|tts|speech|audio|live|ocr|image[_-]?gen|robotics|computer[-_]?use|deep[-_]?research|veo|lyria/i;

  function create(options) {
    const config = Object.assign({
      storagePrefix: 'gugopro_ai_shared',
      disabledKey: '',
      preferenceKey: '',
      elements: {},
      quotaSource: 'quota.gugopro.com enabled chat models',
      i18n: null
    }, options || {});

    function tx(key, fallback, values) {
      let dictionary = {};
      try { dictionary = typeof config.i18n === 'function' ? (config.i18n() || {}) : (config.i18n || {}); } catch (_) { dictionary = {}; }
      let text = dictionary[key] ?? fallback;
      return String(text).replace(/\{(\w+)\}/g, (_, name) => values && values[name] !== undefined ? String(values[name]) : `{${name}}`);
    }

    const disabledKey = config.disabledKey || `${config.storagePrefix}_disabled_models_v1`;
    const preferenceKey = config.preferenceKey || `${config.storagePrefix}_model_preference_v1`;
    let availableModels = [];
    let disabledModels = loadDisabledModels();
    const busyStates = new Map();
    let currentModel = null;
    let currentModelIndex = 0;
    let catalogPromise = null;
    let lastCatalogUpdatedAt = null;
    let syncingQuota = false;
    let modelOptionsSignature = '';

    function el(name) {
      const id = config.elements[name] || name;
      return root.document.getElementById(id);
    }

    function getApiKey() {
      const raw = String(root.localStorage.getItem('gugopro_gemini_api_key') || root.localStorage.getItem('gemini_api_key') || '').trim();
      if (!raw) return '';
      if (!raw.startsWith('obf_')) return raw;
      try { return decodeURIComponent(root.atob(raw.slice(4))).trim(); } catch (_) { return ''; }
    }

    function getModelDailyQuota(model) {
      const rawQuota = model?.free_quota ?? model?.freeQuota ?? model?.rpd_limit ?? model?.daily_limit ?? model?.quota ?? 0;
      const match = String(rawQuota).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
      const quota = Number(match ? match[0] : rawQuota);
      return Number.isFinite(quota) ? quota : 0;
    }

    function getModelRpmLimit(model) {
      const raw = model?.rpm_limit ?? model?.rpmLimit ?? model?.requests_per_minute ?? model?.rpm ?? 0;
      const match = String(raw).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
      const limit = Number(match ? match[0] : raw);
      return Number.isFinite(limit) ? limit : 0;
    }

    function isChatModelRecord(model) {
      if (!model || typeof model !== 'object') return false;
      if (model.is_free_tier !== true || model.requires_billing_account === true || model.is_rest_compatible === false) return false;
      if (getModelDailyQuota(model) <= 0) return false;
      const name = String(model.api_name || model.name || '').toLowerCase();
      const category = String(model.category || '').toLowerCase();
      const capabilities = Array.isArray(model.capabilities) ? model.capabilities.map(item => String(item).toLowerCase()) : [];
      const hasTextCapability = capabilities.some(capability => MODEL_TEXT_CAPABILITIES.has(capability));
      const isTextOut = category.includes('text-out') || category.includes('text out');
      if (!hasTextCapability || MODEL_EXCLUDED_TOKENS.test(name)) return false;
      if (!isTextOut && /embedding|aqa|tts|speech|audio|live|ocr|image|vision|map|grounding|search|robotics|computer|deep[-_ ]?research/i.test(category)) return false;
      return true;
    }

    function normaliseModel(model) {
      if (!isChatModelRecord(model)) return null;
      const name = String(model.api_name || model.name || '').replace(/^models\//, '').trim();
      if (!name || !/^[a-zA-Z0-9][a-zA-Z0-9.\-]+$/.test(name)) return null;
      if (Array.isArray(model.supportedGenerationMethods) && !model.supportedGenerationMethods.includes('generateContent')) return null;
      const capabilities = Array.isArray(model.capabilities) ? [...new Set(model.capabilities.map(item => String(item).trim()).filter(Boolean))] : [];
      return {
        api_name: name,
        display_name: String(model.display_name || name),
        score: Number.isFinite(Number(model.model_score)) ? Number(model.model_score) : 0,
        dailyQuota: getModelDailyQuota(model),
        rpmLimit: getModelRpmLimit(model),
        category: String(model.category || ''),
        fine_category_name_zh: String(model.fine_category_name_zh || ''),
        capabilities,
        is_free_tier: true,
        requires_billing_account: false,
        is_rest_compatible: true,
        is_verified_live: model.is_verified_live === true
      };
    }

    function mergeModels(rawModels) {
      const unique = new Map();
      rawModels.forEach(model => {
        const item = normaliseModel(model);
        if (!item) return;
        const existing = unique.get(item.api_name);
        if (!existing) {
          unique.set(item.api_name, item);
          return;
        }
        existing.score = Math.max(existing.score, item.score);
        existing.dailyQuota = Math.max(existing.dailyQuota || 0, item.dailyQuota || 0);
        existing.rpmLimit = Math.max(existing.rpmLimit || 0, item.rpmLimit || 0);
        existing.is_verified_live = existing.is_verified_live || item.is_verified_live;
        if ((!existing.display_name || existing.display_name === existing.api_name) && item.display_name) existing.display_name = item.display_name;
        item.capabilities.forEach(capability => { if (!existing.capabilities.includes(capability)) existing.capabilities.push(capability); });
      });
      return Array.from(unique.values()).sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || a.display_name.localeCompare(b.display_name));
    }

    function loadDisabledModels() {
      try {
        const saved = JSON.parse(root.localStorage.getItem(disabledKey) || '[]');
        return new Set(Array.isArray(saved) ? saved.map(item => String(item)).filter(Boolean) : []);
      } catch (_) {
        return new Set();
      }
    }

    function persistDisabledModels() {
      root.localStorage.setItem(disabledKey, JSON.stringify(Array.from(disabledModels)));
    }

    function isModelEnabled(apiName) { return Boolean(apiName) && !disabledModels.has(apiName); }
    function getModelByName(apiName) { return availableModels.find(model => model.api_name === apiName) || null; }
    function getModelDisplayName(apiName) { return getModelByName(apiName)?.display_name || apiName || 'Unknown model'; }
    function getSavedPreference() { return String(root.localStorage.getItem(preferenceKey) || '').trim(); }
    function persistPreference(apiName) { if (apiName) root.localStorage.setItem(preferenceKey, String(apiName)); else root.localStorage.removeItem(preferenceKey); }
    function getEnabledModels() { return availableModels.filter(model => isModelEnabled(model.api_name)); }

    function getModelQueue() {
      const queue = [...getEnabledModels()];
      const preferred = getSavedPreference();
      const index = queue.findIndex(model => model.api_name === preferred);
      if (index > 0) {
        const selected = queue.splice(index, 1)[0];
        queue.unshift(selected);
      }
      return queue;
    }

    function reconcileCurrentModel() {
      const queue = getModelQueue();
      currentModel = queue[0]?.api_name || null;
      currentModelIndex = Math.max(0, queue.findIndex(model => model.api_name === currentModel));
      if (currentModel && !getSavedPreference()) persistPreference(currentModel);
      return queue;
    }

    function getModelUsageCount(apiName) {
      const tracker = root.GugoProGlobalAIQuota;
      if (!tracker || !apiName) return 0;
      if (typeof tracker.getModelUsage === 'function') return tracker.getModelUsage(apiName);
      return tracker.getSnapshot?.().modelUsage?.[apiName] || 0;
    }

    function getBusyLabel(apiName) {
      const state = busyStates.get(apiName);
      if (!state) return '';
      return state.status === 'TIMEOUT' ? tx('busyTimeout', 'Busy · timeout') : tx('busyStatus', 'Busy · {status}', { status: state.status });
    }

    function appendText(parent, tag, className, text) {
      const node = root.document.createElement(tag);
      node.className = className;
      node.textContent = text;
      parent.appendChild(node);
      return node;
    }

    function getModelOptionsSignature() {
      let locale = '';
      try { locale = typeof config.i18n === 'function' ? String(config.i18n()?.locale || '') : String(config.i18n?.locale || ''); } catch (_) { locale = ''; }
      return JSON.stringify({
        locale,
        models: availableModels.map(model => [model.api_name, model.display_name, model.score, model.dailyQuota, model.rpmLimit, getModelUsageCount(model.api_name)]),
        disabled: [...disabledModels].sort(),
        preferred: getSavedPreference(),
        current: currentModel,
        busy: [...busyStates.entries()].map(([name, state]) => [name, state.status]).sort((a, b) => a[0].localeCompare(b[0]))
      });
    }

    function renderModelOptions() {
      const container = el('modelOptions');
      if (!container) return;
      const signature = getModelOptionsSignature();
      if (signature === modelOptionsSignature) return;
      modelOptionsSignature = signature;
      container.replaceChildren();
      if (!availableModels.length) {
        appendText(container, 'p', 'model-empty', tx('modelEmpty', 'No eligible free chat models loaded yet. Refresh to retry.'));
        return;
      }
      availableModels.forEach(model => {
        const enabled = isModelEnabled(model.api_name);
        const preferred = getSavedPreference() === model.api_name;
        const current = currentModel === model.api_name;
        const option = root.document.createElement('div');
        option.className = `model-option ${enabled ? '' : 'is-disabled'} ${preferred ? 'is-preferred' : ''} ${current ? 'is-current' : ''}`.trim();
        option.dataset.model = model.api_name;
        option.setAttribute('role', 'listitem');
        option.addEventListener('click', () => { if (enabled) setPreferredModel(model.api_name); });
        const body = root.document.createElement('div');
        body.className = 'model-option-body';
        const heading = root.document.createElement('div');
        heading.className = 'model-option-heading';
        appendText(heading, 'strong', 'model-option-name', model.display_name);
        appendText(heading, 'span', 'model-score', `★ ${Number(model.score || 0).toFixed(1)}`);
        body.appendChild(heading);
        const used = getModelUsageCount(model.api_name);
        const quota = Number(model.dailyQuota || 0);
        const rpm = Number(model.rpmLimit || 0);
        appendText(body, 'div', 'model-option-quota', `${tx('rpd', 'RPD')}: ${quota} · ${tx('rpm', 'RPM')}: ${rpm || '—'} · ${tx('used', 'Used')}: ${used}`);
        if (quota > 0) {
          const meter = root.document.createElement('div');
          meter.className = 'model-quota-bar';
          meter.setAttribute('role', 'progressbar');
          meter.setAttribute('aria-label', tx('quotaUsageAria', `${model.display_name} daily quota usage`, { name: model.display_name }));
          meter.setAttribute('aria-valuemin', '0');
          meter.setAttribute('aria-valuemax', String(quota));
          meter.setAttribute('aria-valuenow', String(Math.min(quota, Math.max(0, used))));
          const fill = root.document.createElement('span');
          fill.className = 'model-quota-fill';
          fill.style.width = `${Math.min(100, Math.max(0, (used / quota) * 100))}%`;
          meter.appendChild(fill);
          body.appendChild(meter);
        }
        if (quota > 0 && used >= quota) appendText(body, 'div', 'model-busy-badge model-quota-exhausted', tx('quotaExhausted', 'Quota exhausted today'));
        const busy = getBusyLabel(model.api_name);
        if (busy) appendText(body, 'div', 'model-busy-badge', busy);
        option.appendChild(body);
        const control = root.document.createElement('label');
        control.className = 'model-option-control';
        const toggle = root.document.createElement('input');
        toggle.type = 'checkbox'; toggle.className = 'model-toggle'; toggle.checked = enabled; toggle.setAttribute('role', 'switch'); toggle.setAttribute('aria-checked', String(enabled)); toggle.setAttribute('aria-label', tx('enableModel', 'Enable {name}', { name: model.display_name }));
        toggle.addEventListener('click', event => event.stopPropagation());
        toggle.addEventListener('change', event => { event.stopPropagation(); setModelEnabled(model.api_name, toggle.checked); });
        control.appendChild(toggle);
        appendText(control, 'span', 'model-toggle-label', enabled ? tx('on', 'ON') : tx('off', 'OFF'));
        option.appendChild(control);
        container.appendChild(option);
      });
    }

    function setModelSettingsStatus(text, state) {
      const status = el('modelSettingsStatus');
      if (!status) return;
      status.textContent = text;
      status.className = `model-settings-status ${state || ''}`.trim();
    }

    function renderCurrentModelStatus() {
      const status = el('modelCurrentStatus');
      if (!status) return;
      status.textContent = currentModel ? tx('currentModel', 'Current model: {name}', { name: getModelDisplayName(currentModel) }) + (getBusyLabel(currentModel) ? ` · ${getBusyLabel(currentModel)}` : '') : tx('currentModelNone', 'Current model: not loaded');
    }

    function renderQuota(snapshot) {
      const tracker = root.GugoProGlobalAIQuota;
      if (!tracker) return;
      if (!syncingQuota) {
        syncingQuota = true;
        try {
          tracker.resetIfNewPacificDay();
          const limit = getEnabledModels().reduce((total, model) => total + Math.max(0, Number(model.dailyQuota) || 0), 0);
          tracker.setDailyLimit(limit, config.quotaSource);
        } finally {
          syncingQuota = false;
        }
      }
      const current = snapshot || tracker.getSnapshot();
      const limitEl = el('quotaLimit'); const usedEl = el('quotaUsed'); const statusEl = el('quotaStatus'); const resetEl = el('quotaReset');
      if (limitEl) limitEl.textContent = current.dailyLimit === null ? tx('unavailable', 'Unavailable') : `${current.dailyLimit} ${tx('requests', 'requests')}`;
      if (usedEl) usedEl.textContent = `${current.usedCount} ${tx('used', 'used')} · ${current.remainingCount === null ? '—' : `${current.remainingCount} ${tx('left', 'left')}`}`;
      if (statusEl) {
        const exhausted = current.dailyLimit !== null && current.remainingCount !== null && current.remainingCount <= 0;
        statusEl.classList.toggle('exhausted', exhausted);
        statusEl.textContent = exhausted ? tx('quotaExhausted', 'Today’s shared free quota is exhausted.') : '';
      }
      if (resetEl) {
        try {
          const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', timeZoneName: 'longOffset' });
          const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(part => [part.type, part.value]));
          const offsetMatch = String(parts.timeZoneName || '').match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
          const offsetMinutes = offsetMatch ? (offsetMatch[1] === '-' ? -1 : 1) * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3] || 0)) : -480;
          const nextMidnight = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1) - offsetMinutes * 60 * 1000;
          const minutes = Math.ceil(Math.max(0, nextMidnight - Date.now()) / 60000);
          resetEl.textContent = tx('resetIn', 'Pacific reset in {h}h {m}m', { h: Math.floor(minutes / 60), m: minutes % 60 });
        } catch (_) { resetEl.textContent = tx('resetUnavailable', 'Reset countdown unavailable'); }
      }
    }

    function setBusyStatus(apiName, status) {
      if (!apiName) return;
      if (status === null || status === undefined || status === '') busyStates.delete(apiName);
      else busyStates.set(apiName, { status: String(status), updatedAt: Date.now() });
      renderModelOptions(); renderCurrentModelStatus();
    }

    function setPreferredModel(apiName) {
      const model = getModelByName(apiName);
      if (!model || !isModelEnabled(apiName)) return;
      persistPreference(apiName); reconcileCurrentModel();
      setModelSettingsStatus(tx('selectedModel', 'Selected {name}; it is now first in the enabled queue.', { name: model.display_name }), '');
      renderModelOptions(); renderCurrentModelStatus();
    }

    function setModelEnabled(apiName, enabled) {
      if (!getModelByName(apiName)) return;
      if (enabled) disabledModels.delete(apiName); else disabledModels.add(apiName);
      persistDisabledModels(); reconcileCurrentModel();
      const count = getEnabledModels().length;
      setModelSettingsStatus(count ? tx(enabled ? 'enabledModel' : 'disabledModel', `${enabled ? 'Enabled' : 'Disabled'} {name} · {count} model(s) in queue.`, { name: getModelDisplayName(apiName), count }) : tx('noModelEnabled', 'No model is enabled. Turn on at least one model.'), count ? '' : 'error');
      renderModelOptions(); renderCurrentModelStatus(); renderQuota();
    }

    async function fetchJsonWithTimeout(url) {
      const controller = new AbortController();
      const timer = root.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        return await root.fetch(url, { cache: 'no-store', signal: controller.signal });
      } catch (error) {
        if (error.name === 'AbortError') throw createApiError('TIMEOUT', null, [], { timedOut: true });
        throw error;
      } finally { root.clearTimeout(timer); }
    }

    async function fetchLatestModel({ silent = false, force = false } = {}) {
      if (catalogPromise) return catalogPromise;
      if (!force && availableModels.length && lastCatalogUpdatedAt && Date.now() - lastCatalogUpdatedAt.getTime() < CATALOG_TTL_MS) return availableModels.slice();
      setModelSettingsStatus(tx('loadingCatalog', 'Loading the dynamic free Gemini model catalog…'), 'loading');
      catalogPromise = (async () => {
        try {
          const response = await fetchJsonWithTimeout(QUOTA_MODELS_URL);
          if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
          const data = await response.json();
          const raw = Array.isArray(data) ? data : (data.models || []);
          availableModels = mergeModels(raw);
          reconcileCurrentModel();
          lastCatalogUpdatedAt = new Date();
          renderModelOptions(); renderCurrentModelStatus(); renderQuota();
          const time = lastCatalogUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setModelSettingsStatus(tx('loadedCatalog', 'Loaded {total} eligible free model(s) · {enabled} enabled · updated {time}.', { total: availableModels.length, enabled: getEnabledModels().length, time }), availableModels.length ? '' : 'error');
          return availableModels;
        } catch (error) {
          availableModels = []; currentModel = null; currentModelIndex = 0;
          renderModelOptions(); renderCurrentModelStatus(); renderQuota();
          setModelSettingsStatus(tx('catalogUnavailable', 'Model catalog is temporarily unavailable. Refresh to retry.'), 'error');
          if (!silent) console.warn('[GugoPro Unified AI] Model catalog error:', error);
          return [];
        } finally { catalogPromise = null; }
      })();
      return catalogPromise;
    }

    function createApiError(status, model, attemptedModels, metadata) {
      const error = new Error(status === 'TIMEOUT' ? `Gemini request exceeded ${REQUEST_TIMEOUT_MS / 1000} seconds` : `Gemini API returned HTTP ${status}`);
      error.status = status; error.model = model; error.attemptedModels = attemptedModels || [];
      Object.assign(error, metadata || {});
      return error;
    }

    async function fetchGeminiWithTimeout(endpoint, payload, modelName, attemptedModels) {
      const controller = new AbortController();
      const timer = root.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await root.fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
        const data = response.ok ? await response.json() : null;
        return { response, data };
      } catch (error) {
        if (error.name === 'AbortError') throw createApiError('TIMEOUT', modelName, attemptedModels, { timedOut: true });
        throw error;
      } finally { root.clearTimeout(timer); }
    }

    async function request(payload, parseResponse, callbacks) {
      const apiKey = getApiKey();
      if (!apiKey) throw createApiError('NO_KEY', null, []);
      const queue = getModelQueue();
      if (!queue.length) throw createApiError(503, null, [], { circuitBreaker: true });
      const attemptedModels = [];
      let lastError = null;
      let allBusy = true;
      for (let index = 0; index < queue.length; index += 1) {
        const modelName = queue[index].api_name;
        attemptedModels.push(modelName); currentModel = modelName; currentModelIndex = index;
        renderModelOptions(); renderCurrentModelStatus();
        callbacks?.onAttempt?.(modelName, index, queue.length);
        const endpoint = `${GEMINI_MODELS_URL}/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        try {
          const result = await fetchGeminiWithTimeout(endpoint, payload, modelName, attemptedModels);
          if (result.response.ok) {
            const parsed = parseResponse ? parseResponse(result.data) : result.data;
            persistPreference(modelName); busyStates.delete(modelName); currentModel = modelName; currentModelIndex = index;
            const tracker = root.GugoProGlobalAIQuota;
            if (tracker) tracker.recordUsage(1, modelName);
            renderModelOptions(); renderCurrentModelStatus(); renderQuota();
            return { result: parsed, model: modelName, attemptedModels };
          }
          lastError = createApiError(result.response.status, modelName, attemptedModels);
          if ([503, 429, 500].includes(result.response.status)) setBusyStatus(modelName, result.response.status);
          if (![503, 429, 500].includes(result.response.status)) allBusy = false;
          if ([503, 429, 500].includes(result.response.status) && index < queue.length - 1) {
            const next = queue[index + 1].api_name;
            callbacks?.onSwitch?.(modelName, next, result.response.status);
            continue;
          }
          break;
        } catch (error) {
          lastError = error;
          const status = error.status;
          if ([503, 429, 500, 'TIMEOUT'].includes(status)) {
            if ([503, 429, 'TIMEOUT'].includes(status)) setBusyStatus(modelName, status);
            if (![503, 429, 'TIMEOUT'].includes(status)) allBusy = false;
            if (index < queue.length - 1) {
              const next = queue[index + 1].api_name;
              callbacks?.onSwitch?.(modelName, next, status);
              continue;
            }
            break;
          }
          allBusy = false;
          throw error;
        }
      }
      const finalError = lastError || createApiError(503, queue[queue.length - 1]?.api_name, attemptedModels);
      finalError.attemptedModels = attemptedModels;
      finalError.circuitBreaker = allBusy && attemptedModels.length === queue.length;
      throw finalError;
    }

    function setModels(models) {
      availableModels = mergeModels(Array.isArray(models) ? models : []);
      reconcileCurrentModel(); renderModelOptions(); renderCurrentModelStatus(); renderQuota();
      setModelSettingsStatus(tx('loadedTestCatalog', 'Loaded {total} model(s) for local test or preview.', { total: availableModels.length }), availableModels.length ? '' : 'error');
      return availableModels;
    }

    function init() {
      renderModelOptions(); renderCurrentModelStatus(); renderQuota();
      root.addEventListener('gugopro:quota-updated', event => { renderQuota(event.detail || null); renderModelOptions(); });
      root.addEventListener('storage', event => {
        if (event.key === disabledKey) { disabledModels = loadDisabledModels(); reconcileCurrentModel(); renderModelOptions(); renderQuota(); }
        if (event.key === preferenceKey) { reconcileCurrentModel(); renderModelOptions(); renderCurrentModelStatus(); }
      });
      fetchLatestModel({ silent: true });
    }

    return {
      init, refresh: fetchLatestModel, request, getApiKey, getModels: () => availableModels.slice(), getEnabledModels: () => getEnabledModels().slice(), getQueue: () => getModelQueue().slice(),
      setModels, setModelEnabled, setPreferredModel, setBusyStatus, getModelUsageCount,
      render: () => { renderModelOptions(); renderCurrentModelStatus(); renderQuota(); },
      getState: () => ({ availableModels: availableModels.slice(), enabledModels: getEnabledModels().slice(), queue: getModelQueue().slice(), currentModel, currentModelIndex, busyStates: Object.fromEntries(busyStates) }),
      constants: { QUOTA_MODELS_URL, GEMINI_MODELS_URL, REQUEST_TIMEOUT_MS }
    };
  }

  root.GugoProUnifiedAI = { create };
})(window);
