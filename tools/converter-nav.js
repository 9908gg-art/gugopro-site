/* Converter Hub navigation — local-only tool pages */
(function () {
    'use strict';

    function initDropdowns() {
        var langButton = document.querySelector('.lang-btn');
        var langSelector = document.querySelector('.lang-selector');
        var toolsButton = document.querySelector('.tools-btn');
        var toolsSelector = document.querySelector('.tools-selector');

        if (toolsButton && toolsSelector) {
            toolsButton.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (langSelector) langSelector.classList.remove('show-dropdown');
                toolsSelector.classList.toggle('show-dropdown');
            });
        }

        if (langButton && langSelector) {
            langButton.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (toolsSelector) toolsSelector.classList.remove('show-dropdown');
                langSelector.classList.toggle('show-dropdown');
            });
        }

        document.addEventListener('click', function (event) {
            if (toolsSelector && !toolsSelector.contains(event.target)) {
                toolsSelector.classList.remove('show-dropdown');
            }
            if (langSelector && !langSelector.contains(event.target)) {
                langSelector.classList.remove('show-dropdown');
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                if (toolsSelector) toolsSelector.classList.remove('show-dropdown');
                if (langSelector) langSelector.classList.remove('show-dropdown');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDropdowns);
    } else {
        initDropdowns();
    }
}());
