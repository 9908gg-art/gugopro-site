/* GugoPro shared AI quota tracker — same-origin, client-side only. */
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
        dailyLimit: null,
        updatedAt: new Date().toISOString()
      };
      writeState(state);
      return state;
    }

    state.usedCount = toFiniteNonNegative(state.usedCount, 0);
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
      dailyLimit: state.dailyLimit,
      remainingCount: remaining,
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
    return emit(readState());
  }

  function getSnapshot() {
    return snapshot(readState());
  }

  function setDailyLimit(limit, source) {
    var state = readState();
    var normalized = Number(limit);
    normalized = Number.isFinite(normalized) && normalized > 0 ? Math.floor(normalized) : null;
    var normalizedSource = source ? String(source) : state.limitSource;
    if (state.dailyLimit === normalized && state.limitSource === normalizedSource) return emit(state);
    state.dailyLimit = normalized;
    state.updatedAt = new Date().toISOString();
    if (normalizedSource) state.limitSource = normalizedSource;
    writeState(state);
    return emit(state);
  }

  function recordUsage(count) {
    var state = readState();
    var increment = Number(count === undefined ? 1 : count);
    if (!Number.isFinite(increment) || increment <= 0) increment = 1;
    state.usedCount += Math.floor(increment);
    state.updatedAt = new Date().toISOString();
    writeState(state);
    return emit(state);
  }

  root.GugoProGlobalAIQuota = {
    STORAGE_KEY: STORAGE_KEY,
    getPacificDate: getPacificDate,
    resetIfNewPacificDay: resetIfNewPacificDay,
    getSnapshot: getSnapshot,
    setDailyLimit: setDailyLimit,
    recordUsage: recordUsage
  };

  resetIfNewPacificDay();
})(window);
