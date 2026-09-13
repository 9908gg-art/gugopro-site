(() => {
  'use strict';
  const CATALOG_URL = '../../i18n/tutor-ui-catalog.json';
  const STORAGE_KEY = 'gugopro_tutor_ui_lang';
  const FALLBACK = 'zh-TW';
  const LANGUAGE_OPTIONS = [
    ['zh-TW', '繁體中文'], ['zh-CN', '简体中文'], ['en-US', 'English'], ['ja-JP', '日本語'],
    ['ko-KR', '한국어'], ['fr-FR', 'Français'], ['de-DE', 'Deutsch'], ['es-ES', 'Español'],
    ['th-TH', 'ไทย'], ['vi-VN', 'Tiếng Việt'], ['id-ID', 'Bahasa Indonesia'], ['pt-BR', 'Português'],
    ['it-IT', 'Italiano'], ['ru-RU', 'Русский'], ['ar-SA', 'العربية'], ['hi-IN', 'हिन्दी'],
    ['ms-MY', 'Bahasa Melayu'], ['nl-NL', 'Nederlands'], ['pl-PL', 'Polski'], ['tr-TR', 'Türkçe']
  ];
  const trackedText = new Set();
  const trackedAttrs = new Map();
  let catalog = null;
  let locale = FALLBACK;
  let applying = false;

  const validLocale = value => LANGUAGE_OPTIONS.some(([code]) => code === value) ? value : FALLBACK;
  const savedLocale = () => {
    const queryLocale = new URLSearchParams(location.search).get('uiLang');
    if (queryLocale) return validLocale(queryLocale);
    try { return validLocale(localStorage.getItem(STORAGE_KEY)); } catch (_) { return FALLBACK; }
  };
  const nativeName = code => (LANGUAGE_OPTIONS.find(([value]) => value === code) || LANGUAGE_OPTIONS[0])[1];
  const normalize = source => String(source ?? '').replace(/\s+/g, ' ').trim();
  const translate = source => {
    const value = normalize(source);
    const direct = catalog?.translations?.[locale]?.[value];
    if (direct !== undefined) return direct;
    const quota = value.match(/^配額重置倒數：約\s*(\d+)\s*小時\s*(\d+)\s*分鐘$/);
    if (quota) return `${translate('配額重置倒數：約')} ${quota[1]} ${translate('小時')} ${quota[2]} ${translate('分鐘')}`;
    const usage = value.match(/^(\d+)\s*次\s*\/\s*剩餘\s*(.*)$/);
    if (usage) return `${usage[1]} ${translate('次 / 剩餘')} ${usage[2]}`;
    return source;
  };

  function shouldIgnore(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    if (parent.closest('script, style, noscript, textarea, input, select, option, .msg-learning, .msg-my, [data-user-content]')) return true;
    return false;
  }

  function trackTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || shouldIgnore(node)) return;
    if (!node.datasetTutorUiSource) node.datasetTutorUiSource = normalize(node.nodeValue);
    trackedText.add(node);
  }

  function trackElementAttributes(element) {
    if (!(element instanceof Element)) return;
    for (const attr of ['placeholder', 'title', 'aria-label', 'data-label']) {
      if (!element.hasAttribute(attr)) continue;
      if (!trackedAttrs.has(element)) trackedAttrs.set(element, {});
      const record = trackedAttrs.get(element);
      if (!(attr in record)) record[attr] = element.getAttribute(attr);
    }
  }

  function scan(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) trackTextNode(walker.currentNode);
    if (root.nodeType === Node.ELEMENT_NODE) trackElementAttributes(root);
    root.querySelectorAll?.('*').forEach(trackElementAttributes);
  }

  function applyTranslations() {
    if (!catalog || applying) return;
    applying = true;
    scan();
    trackedText.forEach(node => {
      if (node.isConnected && node.datasetTutorUiSource) {
        const original = node.nodeValue;
        const translated = translate(node.datasetTutorUiSource);
        const leading = original.match(/^\s*/)?.[0] || '';
        const trailing = original.match(/\s*$/)?.[0] || '';
        node.nodeValue = `${leading}${translated}${trailing}`;
      }
    });
    trackedAttrs.forEach((record, element) => {
      if (!element.isConnected) return;
      Object.entries(record).forEach(([attr, source]) => element.setAttribute(attr, translate(source)));
    });
    document.documentElement.lang = locale;
    document.documentElement.dataset.tutorUiLang = locale;
    const toggle = document.getElementById('btn-lang-toggle');
    if (toggle) {
      const label = toggle.querySelector('#lang-display-label');
      if (label) label.textContent = nativeName(locale);
      toggle.setAttribute('aria-label', `${translate('介面語言')}：${nativeName(locale)}`);
    }
    const interfaceSelect = document.getElementById('ui-language-select');
    if (interfaceSelect) interfaceSelect.value = locale;
    applying = false;
  }

  function buildInterfaceSection() {
    const sideMenu = document.getElementById('side-menu');
    if (!sideMenu || document.getElementById('ui-language-section')) return;
    const section = document.createElement('div');
    section.id = 'ui-language-section';
    section.className = 'menu-section tutor-interface-language-section';
    section.innerHTML = '<div class="menu-title">🌐 <span data-tutor-ui-source="介面語言">介面語言</span></div><select id="ui-language-select" class="lang-select" aria-label="選擇介面語言"></select><small class="capsule-speech-mode-description" data-tutor-ui-source="介面語言會套用到導師所有選單、按鈕、設定、教材與學習面板。">介面語言會套用到導師所有選單、按鈕、設定、教材與學習面板。</small>';
    const select = section.querySelector('#ui-language-select');
    LANGUAGE_OPTIONS.forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code; option.textContent = name;
      select.appendChild(option);
    });
    select.value = locale;
    select.addEventListener('change', () => setLocale(select.value));
    const anchor = sideMenu.querySelector('.speech-mode-section, .capsule-speech-mode-section, .model-settings-section');
    if (anchor) anchor.before(section); else sideMenu.prepend(section);
    scan(section);
  }

  function setLocale(value) {
    locale = validLocale(value);
    try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) {}
    applyTranslations();
    window.dispatchEvent(new CustomEvent('gugopro:tutor-ui-language-change', { detail: { lang: locale } }));
  }

  function init() {
    locale = savedLocale();
    buildInterfaceSection();
    scan();
    applyTranslations();
    const observer = new MutationObserver(records => {
      if (applying) return;
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) trackTextNode(node);
        else if (node.nodeType === Node.ELEMENT_NODE) { scan(node); }
      }));
      applyTranslations();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.GugoGetTutorUiLanguage = () => locale;
    window.GugoSetTutorUiLanguage = setLocale;
  }

  fetch(CATALOG_URL).then(response => response.json()).then(data => {
    catalog = data;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }).catch(error => console.error('[tutor-ui-i18n]', error));
})();
