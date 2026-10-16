// GugoPro Academy shared browser runtime.
(function () {
  'use strict';

  function changeLanguage(lang) {
    var aliases = {
      'zh-tw': 'zh-TW', 'zh-TW': 'zh-TW', 'zh-cn': 'zh-CN', 'zh-CN': 'zh-CN',
      en: 'en', ja: 'ja', de: 'de', fr: 'fr', es: 'es', pt: 'pt'
    };
    var locale = aliases[lang] || 'zh-TW';
    try { localStorage.setItem('gugopro_locale', locale); } catch (error) { /* private mode */ }
    var url = new URL(window.location.href);
    url.searchParams.set('lang', locale);
    window.location.assign(url.toString());
  }
  window.changeLanguage = changeLanguage;

  function initDropdowns() {
    var langBtn = document.querySelector('.lang-btn');
    var langSelector = document.querySelector('.lang-selector');
    var mobileToggle = document.querySelector('.mobile-nav-toggle');
    var primaryNav = document.querySelector('.primary-nav');
    if (langBtn && langSelector) {
      langBtn.addEventListener('click', function (event) {
        event.preventDefault(); event.stopPropagation();
        langSelector.classList.toggle('show-dropdown');
      });
    }
    document.querySelectorAll('.lang-dropdown a').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault(); event.stopPropagation();
        var match = (this.getAttribute('onclick') || '').match(/changeLanguage\(['"]([^'"]+)['"]\)/);
        if (match) changeLanguage(match[1]);
      });
    });
    if (mobileToggle && primaryNav) {
      mobileToggle.addEventListener('click', function () {
        var open = primaryNav.classList.toggle('is-open');
        mobileToggle.setAttribute('aria-expanded', String(open));
      });
    }
    document.addEventListener('click', function (event) {
      if (langSelector && !langSelector.contains(event.target)) langSelector.classList.remove('show-dropdown');
    });
  }

  function initKnowledgeTree() {
    var grid = document.getElementById('knowledge-grid');
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.knowledge-card'));
    var empty = document.getElementById('knowledge-empty');
    var search = document.getElementById('knowledge-search');
    var activeFilter = 'all';
    function render() {
      var query = (search ? search.value : '').trim().toLowerCase();
      var visible = 0;
      cards.forEach(function (card) {
        var matchesFilter = activeFilter === 'all' || card.dataset.category === activeFilter;
        var matchesSearch = !query || (card.dataset.search || '').toLowerCase().includes(query);
        var show = matchesFilter && matchesSearch;
        card.hidden = !show;
        if (show) visible += 1;
      });
      if (empty) empty.hidden = visible !== 0;
    }
    var chips = Array.prototype.slice.call(document.querySelectorAll('#knowledge-tree .filter-chip'));
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (item) { item.classList.remove('is-active'); item.setAttribute('aria-selected', 'false'); });
        chip.classList.add('is-active'); chip.setAttribute('aria-selected', 'true'); activeFilter = chip.dataset.filter || 'all'; render();
      });
    });
    if (search) search.addEventListener('input', render);
    document.addEventListener('keydown', function (event) {
      if (event.key === '/' && document.activeElement !== search) { event.preventDefault(); if (search) search.focus(); }
      if (event.key === 'Escape' && search) { search.value = ''; render(); search.blur(); }
    });
    render();
  }

  function initKnowledgeCardLinks() {
    var grid = document.getElementById('knowledge-grid');
    if (!grid) return;
    grid.querySelectorAll('.knowledge-card').forEach(function (card) {
      var link = card.querySelector('a.text-link[href]');
      if (!link || card.dataset.cardLinkBound === 'true') return;
      card.dataset.cardLinkBound = 'true';
      card.dataset.cardLink = link.getAttribute('href');
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      var heading = card.querySelector('h3');
      card.setAttribute('aria-label', '開啟' + (heading ? heading.textContent.trim() : '此主題') + '指南');

      card.addEventListener('click', function (event) {
        var interactive = event.target && event.target.closest ? event.target.closest('a,button,input,select,textarea,label') : null;
        if (interactive) return;
        window.location.href = link.href;
      });
      card.addEventListener('keydown', function (event) {
        if (event.target !== card || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        link.click();
      });
    });
  }

  function initGuideNavigation() {
    var sidebar = document.querySelector('.guide-sidebar');
    if (!sidebar) return;
    var current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    sidebar.querySelectorAll('a[href]').forEach(function (link) {
      var href = (link.getAttribute('href') || '').split('#')[0].split('?')[0];
      var target = href.split('/').pop().toLowerCase();
      if (target && target === current && /\.html$/.test(target)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  function initGuideChapterScrollspy() {
    var nav = document.querySelector('.guide-chapter-nav');
    if (!nav) return;

    var controls = Array.prototype.slice.call(nav.querySelectorAll('a, button'));
    if (!controls.length) return;

    function targetIdFor(control) {
      var href = control.getAttribute('href') || '';
      var hashIndex = href.indexOf('#');
      var raw = hashIndex >= 0 ? href.slice(hashIndex + 1) : (control.getAttribute('data-target') || control.getAttribute('aria-controls') || '');
      try { return decodeURIComponent(raw).trim(); } catch (error) { return raw.trim(); }
    }

    var controlTargets = controls.map(function (control) {
      return { control: control, id: targetIdFor(control) };
    });
    var targetIds = controlTargets.map(function (item) { return item.id; }).filter(Boolean);
    var chapters = Array.prototype.slice.call(document.querySelectorAll('section[id], div[id^="chapter-"], div[id^="module-"], .guide-module[id]')).filter(function (chapter) {
      return targetIds.indexOf(chapter.id) !== -1;
    });
    if (!chapters.length) return;

    function setActive(id) {
      controlTargets.forEach(function (item) {
        var active = item.id === id;
        item.control.classList.toggle('active', active);
        if (active) item.control.setAttribute('aria-current', 'true');
        else item.control.removeAttribute('aria-current');
      });
    }

    function syncHash() {
      var hash = (window.location.hash || '').slice(1);
      try { hash = decodeURIComponent(hash); } catch (error) { /* Keep the raw hash. */ }
      if (targetIds.indexOf(hash) !== -1) setActive(hash);
    }

    function chooseVisibleChapter(ids) {
      var focusLine = window.innerHeight * 0.25;
      var candidate = null;
      var nearest = Infinity;
      ids.forEach(function (id) {
        var chapter = document.getElementById(id);
        if (!chapter) return;
        var rect = chapter.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
        var distance = Math.abs(rect.top - focusLine);
        if (distance < nearest) { nearest = distance; candidate = chapter; }
      });
      if (candidate) setActive(candidate.id);
    }

    var initialHash = (window.location.hash || '').slice(1);
    try { initialHash = decodeURIComponent(initialHash); } catch (error) { /* Keep the raw hash. */ }
    setActive(targetIds.indexOf(initialHash) !== -1 ? initialHash : chapters[0].id);

    controlTargets.forEach(function (item) {
      item.control.addEventListener('click', function (event) {
        var target = item.id ? document.getElementById(item.id) : null;
        if (!target) return;
        event.preventDefault();
        setActive(item.id);
        var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#' + item.id);
        else window.location.hash = item.id;
      });
    });

    if ('IntersectionObserver' in window) {
      var intersecting = {};
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) intersecting[entry.target.id] = true;
          else delete intersecting[entry.target.id];
        });
        chooseVisibleChapter(Object.keys(intersecting));
      }, { root: null, rootMargin: '-20% 0px -70% 0px', threshold: [0, 0.01, 0.2, 0.5] });
      chapters.forEach(function (chapter) { observer.observe(chapter); });

      var scrollTick = false;
      window.addEventListener('scroll', function () {
        if (scrollTick) return;
        scrollTick = true;
        window.requestAnimationFrame(function () {
          scrollTick = false;
          if (Object.keys(intersecting).length) chooseVisibleChapter(Object.keys(intersecting));
        });
      }, { passive: true });
    } else {
      var fallbackTick = false;
      var fallback = function () {
        if (fallbackTick) return;
        fallbackTick = true;
        window.requestAnimationFrame(function () {
          fallbackTick = false;
          chooseVisibleChapter(chapters.map(function (chapter) { return chapter.id; }));
        });
      };
      window.addEventListener('scroll', fallback, { passive: true });
      fallback();
    }

    window.addEventListener('hashchange', syncHash);
    window.addEventListener('popstate', syncHash);
  }

  function initSiteConfig() {
    fetch('/config.json', { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('config unavailable');
      return response.json();
    }).then(function (config) {
      if (!config.kofi_url) return;
      document.querySelectorAll('[data-kofi-link]').forEach(function (link) { link.href = config.kofi_url; });
    }).catch(function () { /* Static fallback remains the Ko-fi landing page. */ });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initDropdowns();
    initKnowledgeTree();
    initKnowledgeCardLinks();
    initGuideNavigation();
    initGuideChapterScrollspy();
    initSiteConfig();
    document.querySelectorAll('.sidebar-menu a').forEach(function (link) {
      link.addEventListener('click', function () {
        document.querySelectorAll('.sidebar-menu a').forEach(function (item) { item.classList.remove('active'); });
        this.classList.add('active');
      });
    });
  });
})();
