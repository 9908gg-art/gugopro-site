#!/usr/bin/env python3
"""Apply the same v6 in-site safety guards to amazon-jp/index.html.
Idempotent: skips sections that are already applied."""
import re

SRC = 'amazon-jp/index.html'
s = open(SRC).read()

GUARD_BLOCK = """  /* ---------- Hard-code safety guards (Tier 1/2 must never carry Amazon URLs) ---------- */
  function markInSite(el) {
    el.setAttribute('data-no-external', '1');
  }
  function assertNoAmazonIn(el, ctx) {
    var html = el.outerHTML || '';
    if (/https?:\\/\\/www\\.amazon\\.co?\\.jp/.test(html)) {
      throw new Error('[GugoPro] Amazon URL detected inside ' + ctx + ' — Tier 1/2 elements are forbidden to carry Amazon links');
    }
  }
  /* Unified in-site expand API required by spec: openSubPanel(categoryId). Tier 2 cards
     enter through this function, stay inside GugoPro, and expand their leaf tiles
     in an accordion sub-panel; they never open Amazon. */
  window.openSubPanel = function (categoryId) {
    goCat(categoryId);
  };
  /* Global capture-phase interception: any element marked data-no-external is allowed
     to trigger in-site expand only; block the default if it would navigate to Amazon. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-no-external]');
    if (!el) { return; }
    if (el.href && /https?:\\/\\/www\\.amazon\\.co?\\.jp/.test(el.href)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.warn('[GugoPro] Blocked forbidden Amazon navigation from Tier 1/2 element');
    }
  }, true);

"""

# 1. Guard block (before goRoot), only if not already present
if 'window.openSubPanel' not in s:
    nav_marker = '  function goRoot() {'
    assert s.count(nav_marker) == 1, s.count(nav_marker)
    s = s.replace(nav_marker, GUARD_BLOCK + nav_marker, 1)

# 2. dept-head marker + assertion (avoid double-apply)
marker = "head.setAttribute('tabindex', '0');\n    head.innerHTML =\n      '<div class=\"dept-icon\">"
if marker in s and "markInSite(head);\n" not in s:
    s = s.replace(marker, marker.replace("head.innerHTML =", "markInSite(head);\n    head.innerHTML =", 1), 1)
assert1 = "'<i class=\"fa-solid fa-chevron-down dept-toggle\"></i>';\n    head.addEventListener('click'"
if assert1 in s and "assertNoAmazonIn(head, 'dept-head')" not in s:
    s = s.replace(assert1, "assertNoAmazonIn(head, 'dept-head');\n    " + assert1, 1)

# 3. cat-head inside dept accordion
marker = "ch.setAttribute('tabindex', '0');\n      ch.innerHTML =\n        '<span class=\"n\">'"
if marker in s and "markInSite(ch);\n" not in s:
    s = s.replace(marker, marker.replace("ch.innerHTML =", "markInSite(ch);\n      ch.innerHTML =", 1), 1)
assert2 = "'<i class=\"fa-solid fa-caret-right\"></i>';\n      ch.addEventListener('click'"
if assert2 in s and "assertNoAmazonIn(ch, 'cat-head')" not in s:
    s = s.replace(assert2, "assertNoAmazonIn(ch, 'cat-head');\n      " + assert2, 1)

# 4. cat-card in dept view (JP has no kw line: innerHTML directly after tabindex set)
marker = "card.setAttribute('tabindex', '0');\n      card.innerHTML =\n        '<div class=\"cat-name\">'"
if marker in s and "markInSite(card);\n" not in s:
    s = s.replace(marker, marker.replace("card.innerHTML =", "markInSite(card);\n      card.innerHTML =", 1), 1)
assert3 = "'<span class=\"enter\"><i class=\"fa-solid fa-arrow-right\"></i> カテゴリに入る</span>';\n      card.addEventListener('click', function () { goCat(cat.id); });"
if assert3 in s and "assertNoAmazonIn(card, 'cat-card')" not in s:
    s = s.replace(assert3, assert3.replace("card.addEventListener(", "assertNoAmazonIn(card, 'cat-card');\n      card.addEventListener(", 1))

open(SRC, 'w').write(s)
print('openSubPanel present:', 'window.openSubPanel' in s)
print('markInSite(usages beyond block):', s.count('markInSite(') - 1)
print('assertNoAmazonIn usages:', s.count('assertNoAmazonIn(') - 1)
print('data-no-external attr uses:', s.count("data-no-external"))
print('window.open count:', s.count('window.open('))
