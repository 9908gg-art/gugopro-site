/* Converter Hub navigation — local-only tool pages */
(function () {
    'use strict';

    var en = /^en(?:-|$)/i.test(document.documentElement.lang || '');
    var labels = en ? {
        hub: 'Converter Hub',
        subtitles: 'Subtitle Converter',
        image: 'Image Converter',
        data: 'Data Converter',
        pdf: 'Images to PDF',
        markdown: 'Markdown Converter',
        base64: 'Base64 / SVG Codec',
        audio: 'Audio Converter',
        color: 'Color Converter',
        excelPdf: 'Excel / CSV to PDF',
        pdfSplit: 'PDF Page Splitter',
        imageBatch: 'Batch Image Converter',
        subtitlesBatch: 'Batch Subtitle Sync',
        imageEnhance: 'Image Quality Enhancer',
        imageCropper: 'ID Photo & Social Cropper',
        imageBgRemover: 'Solid Background Remover',
        imageWatermark: 'Privacy Watermark & Mosaic',
        universalPdf: 'Universal PDF Converter',
        textEncoding: 'Text Width & Encoding',
        hashGenerator: 'Secure Hash & Passwords',
        svgRaster: 'SVG to High-Resolution Image',
        contact: 'Contact Us',
        overview: 'All site tools'
    } : {
        hub: '轉檔工具專區',
        subtitles: '字幕格式轉換器',
        image: '多功能影像處理器',
        data: '結構化數據轉換器',
        pdf: '圖片合併轉 PDF',
        markdown: 'Markdown 雙向轉換器',
        base64: 'Base64 / SVG 編解碼器',
        audio: '音訊格式轉換器',
        color: '色彩代碼轉換器',
        excelPdf: 'Excel / CSV 轉 PDF',
        pdfSplit: 'PDF 頁面拆分與提取',
        imageBatch: '多圖批次轉檔與壓縮',
        subtitlesBatch: '字幕批次同步調時器',
        imageEnhance: '圖片畫質與色彩增強器',
        imageCropper: '證件照與社群比例裁切器',
        imageBgRemover: '純色背景去除器',
        imageWatermark: '圖片隱私浮水印與馬賽克工具',
        universalPdf: '萬用轉 PDF 神器',
        textEncoding: '文字全半形與編碼轉換器',
        hashGenerator: '安全雜湊與強密碼生成器',
        svgRaster: 'SVG 向量圖轉高清圖',
        contact: '聯絡我們',
        overview: '主站工具總覽'
    };
    var home = '../index.html#tools-section';
    var links = [
        ['converter-hub.html', labels.hub],
        ['converter-subtitles.html', labels.subtitles],
        ['converter-image.html', labels.image],
        ['converter-data.html', labels.data],
        ['converter-image-pdf.html', labels.pdf],
        ['converter-markdown.html', labels.markdown],
        ['converter-base64.html', labels.base64],
        ['converter-audio.html', labels.audio],
        ['converter-color.html', labels.color],
        ['converter-excel-pdf.html', labels.excelPdf],
        ['converter-pdf-split.html', labels.pdfSplit],
        ['converter-image-batch.html', labels.imageBatch],
        ['converter-subtitles-batch.html', labels.subtitlesBatch],
        ['converter-image-enhance.html', labels.imageEnhance],
        ['converter-image-cropper.html', labels.imageCropper],
        ['converter-image-bgremover.html', labels.imageBgRemover],
        ['converter-image-watermark.html', labels.imageWatermark],
        ['converter-universal-pdf.html', labels.universalPdf],
        ['converter-text-encoding.html', labels.textEncoding],
        ['converter-hash-generator.html', labels.hashGenerator],
        ['converter-svg-raster.html', labels.svgRaster],
        ['../contact.html', labels.contact],
        [home, labels.overview]
    ];

    function initDropdowns() {
        var langButton = document.querySelector('.lang-btn');
        var langSelector = document.querySelector('.lang-selector');
        var toolsButton = document.querySelector('.tools-btn');
        var toolsSelector = document.querySelector('.tools-selector');
        var dropdown = document.querySelector('.tools-dropdown');
        if (dropdown) dropdown.innerHTML = links.map(function (item) { return '<a href="' + item[0] + '">' + item[1] + '</a>'; }).join('');

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
            if (toolsSelector && !toolsSelector.contains(event.target)) toolsSelector.classList.remove('show-dropdown');
            if (langSelector && !langSelector.contains(event.target)) langSelector.classList.remove('show-dropdown');
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                if (toolsSelector) toolsSelector.classList.remove('show-dropdown');
                if (langSelector) langSelector.classList.remove('show-dropdown');
            }
        });
    }

    function initHubSearch() {
        var input = document.getElementById('converter-search');
        var cards = Array.prototype.slice.call(document.querySelectorAll('.converter-tool-card'));
        var count = document.getElementById('converter-search-count');
        if (!input || !cards.length) return;
        input.addEventListener('input', function () {
            var query = input.value.trim().toLowerCase();
            var visible = 0;
            cards.forEach(function (card) {
                var match = !query || card.textContent.toLowerCase().indexOf(query) !== -1;
                card.hidden = !match;
                if (match) visible += 1;
            });
            if (count) count.textContent = visible + (en ? ' tools shown' : ' 個工具顯示');
        });
    }

    function initAll() { initDropdowns(); initHubSearch(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
}());
