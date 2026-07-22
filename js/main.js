// ===== GugoPro - Main JavaScript =====

(function() {
    'use strict';

    // Affiliate tags
    const AFFILIATE_TAGS = {
        en: '9908qq-20',
        ja: 'gugopro-22'
    };

    // Amazon search URLs
    const AMAZON_SEARCH = {
        en: 'https://www.amazon.com/s?k=',
        ja: 'https://www.amazon.co.jp/s?k='
    };

    // Current language
    let currentLang = 'en';

    // ===== Language Detection & Switching =====
    function detectLanguage() {
        // Check localStorage first
        const saved = localStorage.getItem('gugopro-lang');
        if (saved && (saved === 'en' || saved === 'ja')) {
            return saved;
        }

        // Detect browser language
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang && browserLang.toLowerCase().startsWith('ja')) {
            return 'ja';
        }

        return 'en';
    }

    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('gugopro-lang', lang);

        // Update all translatable elements
        document.querySelectorAll('[data-' + lang + ']').forEach(function(el) {
            var text = el.getAttribute('data-' + lang);
            if (text) {
                el.textContent = text;
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = lang === 'ja' ? 'ja' : 'en';

        // Update active language buttons
        document.querySelectorAll('.lang-btn').forEach(function(btn) {
            btn.classList.remove('active');
        });
        document.querySelectorAll('#lang-' + lang + ', #mobile-lang-' + lang).forEach(function(btn) {
            btn.classList.add('active');
        });

        // Update affiliate links
        updateAffiliateLinks();
    }

    function updateAffiliateLinks() {
        var searchBase = AMAZON_SEARCH[currentLang];
        var tag = AFFILIATE_TAGS[currentLang];

        // Update product link buttons
        document.querySelectorAll('.product-link').forEach(function(link) {
            var searchQuery = link.getAttribute('data-search-' + currentLang) || link.getAttribute('data-search-en');
            if (searchQuery) {
                var url = searchBase + encodeURIComponent(searchQuery) + '&tag=' + tag;
                link.href = url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer nofollow';
            }
        });

        // Update clickable product cards
        document.querySelectorAll('.product-card').forEach(function(card) {
            var link = card.querySelector('.product-link');
            if (link) {
                var searchQuery = link.getAttribute('data-search-' + currentLang) || link.getAttribute('data-search-en');
                if (searchQuery) {
                    var url = searchBase + encodeURIComponent(searchQuery) + '&tag=' + tag;
                    card.setAttribute('data-href', url);
                }
            }
        });
    }

    // ===== Make Product Cards Clickable =====
    function initClickableCards() {
        document.addEventListener('click', function(e) {
            var card = e.target.closest('.product-card');
            if (card) {
                var href = card.getAttribute('data-href');
                if (href) {
                    window.open(href, '_blank', 'noopener,noreferrer');
                }
            }
        });
    }

    // ===== Mobile Menu =====
    function initMobileMenu() {
        var menuBtn = document.getElementById('mobile-menu-btn');
        var menu = document.getElementById('mobile-menu');
        var closeBtn = document.getElementById('mobile-menu-close');

        if (menuBtn && menu && closeBtn) {
            menuBtn.addEventListener('click', function() {
                menu.classList.add('active');
                document.body.style.overflow = 'hidden';
            });

            closeBtn.addEventListener('click', function() {
                menu.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    }

    // ===== Language Button Events =====
    function initLanguageButtons() {
        var enBtn = document.getElementById('lang-en');
        var jaBtn = document.getElementById('lang-ja');
        var mobileEnBtn = document.getElementById('mobile-lang-en');
        var mobileJaBtn = document.getElementById('mobile-lang-ja');

        if (enBtn) {
            enBtn.addEventListener('click', function() { setLanguage('en'); });
        }
        if (jaBtn) {
            jaBtn.addEventListener('click', function() { setLanguage('ja'); });
        }
        if (mobileEnBtn) {
            mobileEnBtn.addEventListener('click', function() { setLanguage('en'); });
        }
        if (mobileJaBtn) {
            mobileJaBtn.addEventListener('click', function() { setLanguage('ja'); });
        }
    }

    // ===== Smooth Scroll =====
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                var targetId = this.getAttribute('href');
                if (targetId === '#') return;
                var target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ===== Initialize =====
    function init() {
        var lang = detectLanguage();
        setLanguage(lang);
        initClickableCards();
        initMobileMenu();
        initLanguageButtons();
        initSmoothScroll();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
