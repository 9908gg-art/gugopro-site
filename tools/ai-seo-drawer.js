(() => {
  'use strict';

  function bindDrawer(drawer, toggle, backdrop, close) {
    if (!drawer || !toggle || !backdrop || !close || drawer.dataset.aiSeoReady === 'true') return;
    drawer.dataset.aiSeoReady = 'true';
    let restoreFocus = null;
    const focusables = () => Array.from(drawer.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled && el.offsetParent !== null);
    const setOpen = (open) => {
      drawer.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', String(!open));
      backdrop.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
      document.documentElement.classList.toggle('ai-seo-drawer-lock', open);
      document.body.classList.toggle('ai-seo-drawer-lock', open);
      if (open) {
        restoreFocus = document.activeElement;
        close.focus({ preventScroll: true });
      } else if (restoreFocus && typeof restoreFocus.focus === 'function') {
        restoreFocus.focus({ preventScroll: true });
      }
    };

    toggle.addEventListener('click', () => setOpen(true));
    close.addEventListener('click', () => setOpen(false));
    backdrop.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (event) => {
      if (!drawer.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function initAiSeoDrawer() {
    const seo = document.querySelector('.tool-seo-content');
    if (!seo) return;

    let toggle = document.querySelector('.ai-seo-help-toggle');
    let backdrop = document.querySelector('.ai-seo-backdrop');
    let drawer = document.querySelector('.ai-seo-drawer');

    if (drawer) {
      const body = drawer.querySelector('.ai-seo-drawer__body');
      if (body && seo.parentElement !== body) body.appendChild(seo);
      bindDrawer(drawer, toggle, backdrop, drawer.querySelector('.ai-seo-drawer__close'));
      return;
    }

    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ai-seo-help-toggle';
    toggle.setAttribute('aria-controls', 'ai-seo-help-drawer');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span aria-hidden="true">ℹ️</span><span>說明與常見問題</span>';

    backdrop = document.createElement('div');
    backdrop.className = 'ai-seo-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    drawer = document.createElement('aside');
    drawer.id = 'ai-seo-help-drawer';
    drawer.className = 'ai-seo-drawer';
    drawer.setAttribute('aria-label', '說明與常見問題');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');

    const header = document.createElement('div');
    header.className = 'ai-seo-drawer__header';
    const title = document.createElement('h2');
    title.className = 'ai-seo-drawer__title';
    title.textContent = '說明與常見問題';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ai-seo-drawer__close';
    close.setAttribute('aria-label', '關閉說明與常見問題');
    close.innerHTML = '<span aria-hidden="true">×</span>';
    header.append(title, close);

    const body = document.createElement('div');
    body.className = 'ai-seo-drawer__body';
    body.appendChild(seo);
    drawer.append(header, body);
    document.body.append(toggle, backdrop, drawer);
    bindDrawer(drawer, toggle, backdrop, close);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAiSeoDrawer, { once: true });
  } else {
    initAiSeoDrawer();
  }
})();
