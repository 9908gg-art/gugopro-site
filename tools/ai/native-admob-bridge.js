(function (root) {
  'use strict';

  const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
  let plugin = null;
  let initialized = false;

  function getPlugin() {
    if (plugin) return plugin;
    const capacitor = root.Capacitor;
    plugin = capacitor?.Plugins?.AdMob || (typeof capacitor?.registerPlugin === 'function' ? capacitor.registerPlugin('AdMob') : null);
    return plugin;
  }

  function isNative() {
    return Boolean(root.Capacitor?.isNativePlatform?.());
  }

  function markSlot(enabled) {
    const slot = document.getElementById('admob-banner-slot');
    if (!slot) return;
    slot.dataset.enabled = enabled ? 'true' : 'false';
    slot.dataset.adUnitId = TEST_BANNER_ID;
    slot.setAttribute('aria-hidden', enabled ? 'false' : 'true');
  }

  async function initialize() {
    const admob = getPlugin();
    if (!isNative() || !admob || typeof admob.initialize !== 'function') return false;
    if (!initialized) {
      await admob.initialize({ initializeForTesting: true });
      initialized = true;
    }
    return true;
  }

  async function showTestBanner() {
    const admob = getPlugin();
    if (!isNative() || !admob || typeof admob.showBanner !== 'function') return false;
    await initialize();
    await admob.showBanner({
      adId: TEST_BANNER_ID,
      adSize: 'BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0
    });
    markSlot(true);
    return true;
  }

  async function hideTestBanner() {
    const admob = getPlugin();
    if (!isNative() || !admob || typeof admob.hideBanner !== 'function') return false;
    await admob.hideBanner();
    markSlot(false);
    return true;
  }

  root.GugoAdMob = Object.freeze({
    testBannerId: TEST_BANNER_ID,
    isNative,
    initialize,
    showTestBanner,
    hideTestBanner
  });
})(window);
