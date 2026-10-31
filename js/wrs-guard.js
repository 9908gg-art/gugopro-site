(function() {
  if (typeof window === 'undefined') return;
  try {
    var k = '__wrs_quota_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
  } catch (e) {
    try {
      var mem = {};
      var dummy = {
        getItem: function(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function(k, v) { mem[k] = String(v); },
        removeItem: function(k) { delete mem[k]; },
        clear: function() { mem = {}; },
        key: function(i) { return Object.keys(mem)[i] || null; },
        get length() { return Object.keys(mem).length; }
      };
      Object.defineProperty(window, 'localStorage', { value: dummy, configurable: true, enumerable: true, writable: true });
    } catch (_) {}
  }
  try {
    var sk = '__wrs_session_test__';
    window.sessionStorage.setItem(sk, '1');
    window.sessionStorage.removeItem(sk);
  } catch (e) {
    try {
      var sMem = {};
      var sDummy = {
        getItem: function(k) { return Object.prototype.hasOwnProperty.call(sMem, k) ? sMem[k] : null; },
        setItem: function(k, v) { sMem[k] = String(v); },
        removeItem: function(k) { delete sMem[k]; },
        clear: function() { sMem = {}; },
        key: function(i) { return Object.keys(sMem)[i] || null; },
        get length() { return Object.keys(sMem).length; }
      };
      Object.defineProperty(window, 'sessionStorage', { value: sDummy, configurable: true, enumerable: true, writable: true });
    } catch (_) {}
  }
})();
