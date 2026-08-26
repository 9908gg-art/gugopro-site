/*
 * GugoPro Global AI Quota Tracker
 * Shared by same-origin AI tools.  The counter is intentionally local-only:
 * it is a UX estimate, not a server-side billing or quota authority.
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'gugopro_global_ai_quota_v1';
  var PACIFIC_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  function getPacificDate(date) {
    var parts = PACIFIC_DATE_FORMATTER.formatToParts(date || new Date());
    var values = {};
    parts.forEach(function (part) { values[part.type] = part.value; });
    return values.year + '-' + values.month + '-' + values.day;
  }

  function toFiniteNonNegative(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  }

  function normalizeModelUsage(value) {
    var output = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
    Object.keys(value).forEach(function (modelName) {
      var count = toFiniteNonNegative(value[modelName], 0);
      if (count > 0) output[String(modelName)] = Math.floor(count);
    });
    return output;
  }

  function cloneModelUsage(value) {
    var output = {};
    Object.keys(value || {}).forEach(function (modelName) {
      output[modelName] = value[modelName];
    });
    return output;
  }

  function readState() {
    var today = getPacificDate();
    var state = null;
    try {
      state = JSON.parse(root.localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (error) {
      state = null;
    }

    if (!state || typeof state !== 'object' || state.pacificDate !== today) {
      state = {
        pacificDate: today,
        usedCount: 0,
        modelUsage: {},
        dailyLimit: null,
        updatedAt: new Date().toISOString()
      };
      writeState(state);
      return state;
    }

    state.usedCount = Math.floor(toFiniteNonNegative(state.usedCount, 0));
    state.modelUsage = normalizeModelUsage(state.modelUsage);
    state.dailyLimit = state.dailyLimit === null || state.dailyLimit === undefined
      ? null
      : toFiniteNonNegative(state.dailyLimit, null);
    return state;
  }

  function writeState(state) {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('[GugoPro AI Quota] localStorage 寫入失敗:', error);
    }
  }

  function snapshot(state) {
    var remaining = state.dailyLimit === null
      ? null
      : Math.max(0, state.dailyLimit - state.usedCount);
    return {
      storageKey: STORAGE_KEY,
      pacificDate: state.pacificDate,
      usedCount: state.usedCount,
      modelUsage: cloneModelUsage(state.modelUsage),
      dailyLimit: state.dailyLimit,
      remainingCount: remaining,
      limitSource: state.limitSource || null,
      updatedAt: state.updatedAt
    };
  }

  function emit(state) {
    var detail = snapshot(state);
    try {
      root.dispatchEvent(new CustomEvent('gugopro:quota-updated', { detail: detail }));
    } catch (error) {
      // Older browsers may not expose CustomEvent; localStorage is still updated.
    }
    return detail;
  }

  function resetIfNewPacificDay() {
    return snapshot(readState());
  }

  function getSnapshot() {
    return snapshot(readState());
  }

  function getModelUsage(modelName) {
    var key = String(modelName || '').trim();
    if (!key) return 0;
    var state = readState();
    return state.modelUsage[key] || 0;
  }

  function setDailyLimit(limit, source) {
    var state = readState();
    var normalized = Number(limit);
    normalized = Number.isFinite(normalized) && normalized > 0 ? Math.floor(normalized) : null;
    var normalizedSource = source ? String(source) : state.limitSource;
    if (state.dailyLimit === normalized && state.limitSource === normalizedSource) return snapshot(state);
    state.dailyLimit = normalized;
    state.updatedAt = new Date().toISOString();
    if (normalizedSource) state.limitSource = normalizedSource;
    writeState(state);
    return emit(state);
  }

  function recordUsage(count, modelName) {
    var state = readState();
    var increment = Number(count === undefined ? 1 : count);
    if (!Number.isFinite(increment) || increment <= 0) increment = 1;
    increment = Math.floor(increment);
    state.usedCount += increment;
    var key = String(modelName || '').trim();
    if (key) state.modelUsage[key] = (state.modelUsage[key] || 0) + increment;
    state.updatedAt = new Date().toISOString();
    writeState(state);
    return emit(state);
  }

  root.GugoProGlobalAIQuota = {
    STORAGE_KEY: STORAGE_KEY,
    getPacificDate: getPacificDate,
    resetIfNewPacificDay: resetIfNewPacificDay,
    getSnapshot: getSnapshot,
    getModelUsage: getModelUsage,
    setDailyLimit: setDailyLimit,
    recordUsage: recordUsage
  };

  resetIfNewPacificDay();
})(window);
