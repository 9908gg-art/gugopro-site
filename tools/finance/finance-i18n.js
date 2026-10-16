(function () {
  'use strict';
  var SUPPORTED = ['zh-TW', 'zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt'];
  var NATIVE = { 'zh-TW': '繁體中文', 'zh-CN': '简体中文', en: 'English', ja: '日本語', de: 'Deutsch', fr: 'Français', es: 'Español', pt: 'Português' };
  var current = (document.documentElement.lang || 'zh-TW').toLowerCase();
  current = current === 'zh-hant-tw' || current === 'zh-tw' ? 'zh-TW' : current === 'zh-hans' || current === 'zh-cn' ? 'zh-CN' : SUPPORTED.indexOf(current) >= 0 ? current : 'zh-TW';
  var sourcePath = location.pathname.replace(/^\/(?:zh-CN|en|ja|de|fr|es|pt)(?=\/)/, '') || '/tools/';
  var translations = {};
  var fragments = [];
  var ready = false;
  function norm(value) { return String(value == null ? '' : value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); }
  function lookup(value) { return translations[norm(value)]; }
  function replaceValue(value) {
    var raw = String(value == null ? '' : value), exact = lookup(raw);
    if (exact !== undefined) return exact;
    var output = raw;
    fragments.forEach(function (pair) { if (pair[0] && output.indexOf(pair[0]) >= 0) output = output.split(pair[0]).join(pair[1]); });
    return output;
  }
  function translateNode(node) {
    if (!node || !node.nodeValue || !node.parentElement || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].indexOf(node.parentElement.tagName) >= 0 || node.parentElement.closest('[data-finance-i18n-ignore]')) return;
    var output = replaceValue(node.nodeValue); if (output !== node.nodeValue) node.nodeValue = output;
  }
  function walk(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [], node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(translateNode);
  }
  function translateAttributes() {
    document.querySelectorAll('input,textarea,select,option,[title],[aria-label],[alt],[data-label],meta[content]').forEach(function (el) {
      ['placeholder', 'title', 'aria-label', 'alt', 'data-label', 'content'].forEach(function (attr) {
        if (!el.hasAttribute(attr)) return;
        var raw = el.getAttribute(attr), output = replaceValue(raw); if (output !== raw) el.setAttribute(attr, output);
      });
    });
  }
  function translateConfig(config) {
    if (!config) return config;
    var clone = JSON.parse(JSON.stringify(config));
    function deep(value) { if (Array.isArray(value)) return value.map(deep); if (value && typeof value === 'object') { Object.keys(value).forEach(function (key) { value[key] = deep(value[key]); }); return value; } return typeof value === 'string' ? replaceValue(value) : value; }
    return deep(clone);
  }
  function installChartBridge() {
    if (!window.Chart || window.__gugoFinanceChartBridge) return;
    var Original = window.Chart;
    function FinanceChart(ctx, config) { return new Original(ctx, translateConfig(config)); }
    FinanceChart.prototype = Original.prototype;
    Object.keys(Original).forEach(function (key) { try { FinanceChart[key] = Original[key]; } catch (e) {} });
    window.Chart = FinanceChart;
    window.__gugoFinanceChartBridge = true;
  }
  function patchConverterLinks() {
    document.querySelectorAll('.tools-dropdown a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || /^https?:|^mailto:|^\//i.test(href)) return;
      var clean = href.replace(/^\.\//, '').replace(/^\.\.\//, '');
      var prefix = current === 'en' ? '/en/tools/' : '/tools/';
      a.setAttribute('href', prefix + clean);
    });
  }
  function mountSwitcher() {
    var host = document.querySelector('.nav-actions') || document.querySelector('.top-nav') || document.querySelector('.main-header') || document.body;
    if (!host || document.getElementById('gugo-finance-locale-select')) return;
    var select = document.createElement('select'); select.id = 'gugo-finance-locale-select'; select.className = 'gugo-finance-locale-select'; select.setAttribute('aria-label', 'Language');
    SUPPORTED.forEach(function (code) { var option = document.createElement('option'); option.value = code; option.textContent = NATIVE[code]; select.appendChild(option); });
    select.value = current; host.appendChild(select);
    select.addEventListener('change', function () { var target = select.value === 'zh-TW' ? sourcePath : '/' + select.value + sourcePath; location.assign(target); });
  }
  function addStyles() {
    if (document.getElementById('gugo-finance-i18n-style')) return;
    var style = document.createElement('style'); style.id = 'gugo-finance-i18n-style'; style.textContent = '.gugo-finance-locale-select{appearance:none;box-sizing:border-box;min-width:116px;height:36px;padding:0 28px 0 10px;border:1px solid rgba(255,255,255,.28);border-radius:9px;background:#141824;color:#fff;color-scheme:dark;font:inherit;font-size:13px;font-weight:800;line-height:1.2;cursor:pointer;background-image:linear-gradient(45deg,transparent 50%,#fff 50%),linear-gradient(135deg,#fff 50%,transparent 50%);background-position:calc(100% - 15px) 15px,calc(100% - 10px) 15px;background-size:5px 5px;background-repeat:no-repeat}.gugo-finance-locale-select option{background:#141824;color:#fff;font-weight:700}.gugo-finance-locale-select:focus{outline:2px solid rgba(249,115,22,.35);outline-offset:1px}@media(max-width:650px){.gugo-finance-locale-select{min-width:108px;height:34px;font-size:12px}}'; document.head.appendChild(style);
  }
  function init(data) {
    var map = current === 'zh-TW' ? {} : ((data.translations || {})[current] || {});
    translations = map;
    Object.keys(map).sort(function (a, b) { return b.length - a.length; }).forEach(function (source) { if (source.length >= 3 && source !== map[source]) fragments.push([source, map[source]]); });
    document.documentElement.lang = current;
    addStyles(); mountSwitcher(); installChartBridge();
    walk(document.body); translateAttributes(); patchConverterLinks(); ready = true;
    new MutationObserver(function (records) { if (!ready) return; records.forEach(function (record) { if (record.type === 'characterData') translateNode(record.target); else record.addedNodes && Array.prototype.forEach.call(record.addedNodes, function (n) { if (n.nodeType === Node.TEXT_NODE) translateNode(n); else if (n.nodeType === Node.ELEMENT_NODE) walk(n); }); }); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  function load() { fetch('/tools/finance/finance-i18n.json?v=20260827', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('finance i18n ' + r.status); return r.json(); }).then(init).catch(function (error) { console.warn('[GugoPro finance i18n] resource load failed', error); addStyles(); mountSwitcher(); installChartBridge(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true }); else load();
}());
