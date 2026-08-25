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
        audioCutter: 'Audio Cutter & Trimmer',
        audioVolume: 'Audio Volume Booster',
        audioFade: 'Audio Fade In / Out',
        audioReverse: 'Audio Reverser',
        audioMerge: 'Multi-Track Audio Merger',
        videoFrameCapture: 'Video Frame Capture',
        videoToGif: 'Video to GIF Converter',
        videoExtractAudio: 'Video Audio Extractor',
        videoRotate: 'Video Rotate & Flip Corrector',
        videoSpeed: 'Video Speed Controller',
        videoMute: 'Video Mute & Audio Track Remover',
        videoCrop: 'Video Crop Tool',
        audioFormat: 'Audio Format Converter',
        pdfRemovePages: 'PDF Remove & Extract Pages',
        officePassword: 'Secure Password Generator',
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
        pdfMerge: 'PDF Merger',
        pdfRotate: 'PDF Page Rotator',
        pdfWatermark: 'PDF Text Watermark',
        pdfPageNumber: 'PDF Page Numberer',
        excelMerge: 'Excel Workbook Merger',
        excelSplit: 'Excel Worksheet Splitter',
        pdfToImages: 'PDF to Images',
        pdfToText: 'PDF to Text',
        excelToMarkdown: 'Excel / CSV to Markdown',
        excelToHtml: 'Excel to HTML Table',
        wordToMarkdown: 'Word DOCX to Markdown / TXT',
        htmlToDocx: 'HTML to Word DOCX',
        textEncoding: 'Text Width & Encoding',
        hashGenerator: 'Secure Hash & Passwords',
        cryptoAes: 'AES Text Encryptor',
        cryptoJwt: 'JWT Decoder & Verifier',
        cryptoEncode: 'URL / UTF-8 / HTML Codec',
        cryptoChecksum: 'Checksum & Hash Verifier',
        cryptoUuid: 'UUID / CUID Batch Generator',
        chartBar: 'Bar & Column Chart Builder',
        chartLine: 'Line & Area Chart Builder',
        chartPie: 'Pie & Doughnut Chart Builder',
        chartRadar: 'Radar & Multi-Dimension Chart',
        chartScatter: 'Scatter & Bubble Analysis',
        chartFunnel: 'Funnel & Conversion Chart',
        officeQrCode: 'QR Code Quick Generator',
        officeBarcode: 'Barcode Generator',
        officeTextImage: 'Text-to-Image Note Maker',
        officeMarkdown: 'Live Markdown Editor & Preview',
        officePomodoro: 'Focused Pomodoro Timer',
        officeJson: 'JSON Formatter & Minifier',
        svgRaster: 'SVG to High-Resolution Image',
        imageMerge: 'Image Merge & Collage',
        imageSplitter: 'Image Grid Splitter',
        gifMaker: 'GIF Animation Maker',
        imageColorPicker: 'Image Color Picker & Palette',
        unitLength: 'Length & Distance Converter',
        unitWeight: 'Weight & Mass Converter',
        unitArea: 'Area & Land Converter',
        unitVolume: 'Volume & Capacity Converter',
        unitTemperature: 'Temperature Scale Converter',
        unitData: 'Digital Storage & Data Converter',
        unitSpeed: 'Speed & Pace Converter',
        unitPressure: 'Pressure Converter',
        financeDca: 'DCA & Compound Calculator',
        financeMortgage: 'Mortgage Amortization Calculator',
        financeDividend: 'Dividend Cash Flow Calculator',
        financeTrading: 'Trading Breakeven Calculator',
        financeLeverage: 'Leverage Liquidation Calculator',
        financeSalary: 'Salary Tax Calculator',
        aiTutor: 'Multilingual AI Speaking Tutor',
        aiTranslator: 'Real-time Bilingual Translator',
        aiTarot: 'AI Tarot Master',
        aiQuota: 'Gemini API Quota Monitor',
        aiAmazon: 'Amazon AI Product Finder',
        aiNutrition: 'AI Nutritionist & TDEE Planner',
        aiFitness: 'AI Fitness & Weight Loss Coach',
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
        audioCutter: '視覺化音訊剪輯與裁切器',
        audioVolume: '音訊音量調整與增益器',
        audioFade: '音訊淡入淡出效果器',
        audioReverse: '音訊倒放效果器',
        audioMerge: '多段音訊合併拼接器',
        videoFrameCapture: '影片截圖／影格提取器',
        videoToGif: '影片轉 GIF 動態圖轉換器',
        videoExtractAudio: '影片提取音訊／WAV／MP3 導出器',
        videoRotate: '影片旋轉與翻轉修正器',
        videoSpeed: '影片變速與快慢動作調整器',
        videoMute: '影片靜音與音軌移除器',
        videoCrop: '影片畫面裁切器',
        audioFormat: '音訊格式萬能轉換器',
        pdfRemovePages: 'PDF 頁面自訂刪除與提取器',
        officePassword: '高強度隨機密碼產生器',
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
        pdfMerge: 'PDF 多檔合併器',
        pdfRotate: 'PDF 頁面旋轉與修正器',
        pdfWatermark: 'PDF 防盜文字浮水印',
        pdfPageNumber: 'PDF 自動頁碼添加器',
        excelMerge: '多 Excel 工作簿合併器',
        excelSplit: 'Excel 工作表分割器',
        pdfToImages: 'PDF 轉圖片提取器',
        pdfToText: 'PDF 提取純文字工具',
        excelToMarkdown: 'Excel / CSV 轉 Markdown',
        excelToHtml: 'Excel 轉 HTML 表格',
        wordToMarkdown: 'Word DOCX 轉 Markdown / TXT',
        htmlToDocx: 'HTML 轉 Word DOCX',
        textEncoding: '文字全半形與編碼轉換器',
        hashGenerator: '安全雜湊與強密碼生成器',
        cryptoAes: 'AES 文字對稱加解密器',
        cryptoJwt: 'JWT Token 解析與驗證工具',
        cryptoEncode: 'URL／UTF-8／HTML 實體編解碼器',
        cryptoChecksum: '雜湊值比對校驗器',
        cryptoUuid: 'UUID／CUID 批次生成器',
        chartBar: '柱狀圖／長條圖產生器',
        chartLine: '折線圖／面積圖繪製器',
        chartPie: '圓餅圖／環形圖產生器',
        chartRadar: '雷達圖／多維度評估圖',
        chartScatter: '散點圖／氣泡圖分析儀',
        chartFunnel: '漏斗圖／轉化率分析圖',
        officeQrCode: 'QR Code 快速產生器',
        officeBarcode: '條形碼／條碼生成器',
        officeTextImage: '文字轉圖片便簽生成器',
        officeMarkdown: 'Markdown 即時編輯與預覽器',
        officePomodoro: '高效番茄鐘工作計時器',
        officeJson: 'JSON 格式化與壓縮檢視器',
        svgRaster: 'SVG 向量圖轉高清圖',
        imageMerge: '圖片拼接工具',
        imageSplitter: '圖片九宮格／多格分割器',
        gifMaker: 'GIF 動畫製作器',
        imageColorPicker: '圖片調色盤／顏色吸取器',
        unitLength: '長度與距離轉換器',
        unitWeight: '重量與質量轉換器',
        unitArea: '面積與地坪轉換器',
        unitVolume: '體積與容量轉換器',
        unitTemperature: '溫度與溫標轉換器',
        unitData: '數位儲存與數據流量轉換器',
        unitSpeed: '速度與配速轉換器',
        unitPressure: '壓力與氣壓轉換器',
        financeDca: '定期定額與複利試算器',
        financeMortgage: '房貸本息攤還試算器',
        financeDividend: '股息現金流試算器',
        financeTrading: '交易損益兩平試算器',
        financeLeverage: '槓桿強平價格試算器',
        financeSalary: '薪資所得稅試算器',
        aiTutor: 'AI 多國語言對話導師',
        aiTranslator: 'AI 同聲傳譯與即時雙語翻譯器',
        aiTarot: 'AI 塔羅占卜大師',
        aiQuota: 'Gemini API 官方額度查詢',
        aiAmazon: 'Amazon AI 智慧選品助手',
        aiNutrition: 'AI 專屬營養師',
        aiFitness: 'AI 減肥瘦身教練',
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
        ['converter-audio-cutter.html', labels.audioCutter],
        ['converter-audio-volume.html', labels.audioVolume],
        ['converter-audio-fade.html', labels.audioFade],
        ['converter-audio-reverse.html', labels.audioReverse],
        ['converter-audio-merge.html', labels.audioMerge],
        ['converter-video-frame-capture.html', labels.videoFrameCapture],
        ['converter-video-to-gif.html', labels.videoToGif],
        ['converter-video-extract-audio.html', labels.videoExtractAudio],
        ['converter-video-rotate.html', labels.videoRotate],
        ['converter-video-speed.html', labels.videoSpeed],
        ['converter-video-mute.html', labels.videoMute],
        ['converter-video-crop.html', labels.videoCrop],
        ['converter-audio-format.html', labels.audioFormat],
        ['converter-pdf-remove-pages.html', labels.pdfRemovePages],
        ['converter-office-password.html', labels.officePassword],
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
        ['converter-pdf-merge.html', labels.pdfMerge],
        ['converter-pdf-rotate.html', labels.pdfRotate],
        ['converter-pdf-watermark.html', labels.pdfWatermark],
        ['converter-pdf-pagenumber.html', labels.pdfPageNumber],
        ['converter-excel-merge.html', labels.excelMerge],
        ['converter-excel-split.html', labels.excelSplit],
        ['converter-pdf-to-images.html', labels.pdfToImages],
        ['converter-pdf-to-text.html', labels.pdfToText],
        ['converter-excel-to-markdown.html', labels.excelToMarkdown],
        ['converter-excel-to-html.html', labels.excelToHtml],
        ['converter-word-to-markdown.html', labels.wordToMarkdown],
        ['converter-html-to-docx.html', labels.htmlToDocx],
        ['converter-text-encoding.html', labels.textEncoding],
        ['converter-hash-generator.html', labels.hashGenerator],
        ['converter-crypto-aes.html', labels.cryptoAes],
        ['converter-crypto-jwt.html', labels.cryptoJwt],
        ['converter-crypto-encode.html', labels.cryptoEncode],
        ['converter-crypto-checksum.html', labels.cryptoChecksum],
        ['converter-crypto-uuid.html', labels.cryptoUuid],
        ['converter-chart-bar.html', labels.chartBar],
        ['converter-chart-line.html', labels.chartLine],
        ['converter-chart-pie.html', labels.chartPie],
        ['converter-chart-radar.html', labels.chartRadar],
        ['converter-chart-scatter.html', labels.chartScatter],
        ['converter-chart-funnel.html', labels.chartFunnel],
        ['converter-office-qrcode.html', labels.officeQrCode],
        ['converter-office-barcode.html', labels.officeBarcode],
        ['converter-office-text-to-image.html', labels.officeTextImage],
        ['converter-office-markdown-editor.html', labels.officeMarkdown],
        ['converter-office-pomodoro.html', labels.officePomodoro],
        ['converter-office-json-formatter.html', labels.officeJson],
        ['converter-svg-raster.html', labels.svgRaster],
        ['converter-image-merge.html', labels.imageMerge],
        ['converter-image-splitter.html', labels.imageSplitter],
        ['converter-gif-maker.html', labels.gifMaker],
        ['converter-image-colorpicker.html', labels.imageColorPicker],
        ['converter-unit-length.html', labels.unitLength],
        ['converter-unit-weight.html', labels.unitWeight],
        ['converter-unit-area.html', labels.unitArea],
        ['converter-unit-volume.html', labels.unitVolume],
        ['converter-unit-temperature.html', labels.unitTemperature],
        ['converter-unit-data.html', labels.unitData],
        ['converter-unit-speed.html', labels.unitSpeed],
        ['converter-unit-pressure.html', labels.unitPressure],
        ['converter-finance-dca-compound.html', labels.financeDca],
        ['converter-finance-mortgage.html', labels.financeMortgage],
        ['converter-finance-dividend-target.html', labels.financeDividend],
        ['converter-finance-trading-breakeven.html', labels.financeTrading],
        ['converter-finance-leverage-liquidation.html', labels.financeLeverage],
        ['converter-finance-salary-tax.html', labels.financeSalary],
        ['/tools/ai/english-speaking-tutor.html', labels.aiTutor],
        ['/tools/ai/realtime-translator.html', labels.aiTranslator],
        ['/tools/ai/tarot-master.html', labels.aiTarot],
        ['https://quota.gugopro.com/', labels.aiQuota],
        ['/amazon/', labels.aiAmazon],
        ['/tools/health/tdee-macros-calculator.html', labels.aiNutrition],
        ['/tools/health/weight-loss-planner.html', labels.aiFitness],
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
        if (document.body.classList.contains('dashboard-page')) return;
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

    function initFullCardNavigation() {
        var cards = document.querySelectorAll('.converter-tool-card, .tool-card');
        Array.prototype.forEach.call(cards, function (card) {
            if (card.getAttribute('data-full-card-navigation') === 'true') return;
            var target = card.querySelector('a[href]');
            if (!target) return;
            card.setAttribute('data-full-card-navigation', 'true');
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'link');
            if (!card.getAttribute('aria-label')) {
                var heading = card.querySelector('h3, h4');
                if (heading) card.setAttribute('aria-label', heading.textContent.trim());
            }
            card.addEventListener('click', function (event) {
                if (event.defaultPrevented || event.target.closest('a, button, input, select, textarea, label')) return;
                target.click();
            });
            card.addEventListener('keydown', function (event) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                target.click();
            });
        });
    }

    function initDashboard() {
        if (!document.body.classList.contains('dashboard-page')) return;
        var input = document.getElementById('converter-search');
        var cards = Array.prototype.slice.call(document.querySelectorAll('.dashboard-category-section .converter-tool-card:not([data-count-exclude])'));
        var companions = Array.prototype.slice.call(document.querySelectorAll('[data-companion="true"] .converter-tool-card'));
        var sections = Array.prototype.slice.call(document.querySelectorAll('.dashboard-category-section'));
        var count = document.getElementById('converter-search-count');
        var noResults = document.getElementById('dashboard-no-results');
        var menu = document.getElementById('dashboard-menu-toggle');
        var closeButton = document.getElementById('dashboard-sidebar-close');
        var overlay = document.getElementById('dashboard-overlay');
        var page = document.body;
        var activeFilter = 'all';

        function closeMenu() {
            page.classList.remove('dashboard-menu-open');
            if (menu) menu.setAttribute('aria-expanded', 'false');
        }

        function matchesQuery(card, query) {
            return !query || card.textContent.toLowerCase().indexOf(query) !== -1;
        }

        function updateBadges(query) {
            var totals = { images: 0, 'audio-tools': 0, 'video-tools': 0, 'document-process': 0, 'document-convert': 0, 'smart-text': 0, security: 0, 'data-charts': 0, 'office-tools': 0, 'unit-converter': 0, 'finance-tools': 0, 'ai-tools': 0 };
            var total = 0;
            cards.forEach(function (card) {
                if (!matchesQuery(card, query)) return;
                var key = card.getAttribute('data-category');
                if (Object.prototype.hasOwnProperty.call(totals, key)) totals[key] += 1;
                total += 1;
            });
            companions.forEach(function (card) { if (matchesQuery(card, query)) total += 1; });
            document.querySelectorAll('[data-dashboard-count]').forEach(function (badge) {
                var key = badge.getAttribute('data-dashboard-count');
                badge.textContent = key === 'all' ? String(total) : String(totals[key] || 0);
            });
            document.querySelectorAll('[data-dashboard-section-count]').forEach(function (badge) {
                var key = badge.getAttribute('data-dashboard-section-count');
                badge.textContent = String(totals[key] || 0);
            });
            return total;
        }

        function applyFilter() {
            var query = input ? input.value.trim().toLowerCase() : '';
            var visible = 0;
            cards.forEach(function (card) {
                var categoryMatch = activeFilter === 'all' || card.getAttribute('data-category') === activeFilter;
                var queryMatch = matchesQuery(card, query);
                card.hidden = !(categoryMatch && queryMatch);
                if (!card.hidden) visible += 1;
            });
            companions.forEach(function (card) {
                var categoryMatch = activeFilter === 'all' || activeFilter === 'smart-text';
                var queryMatch = matchesQuery(card, query);
                card.hidden = !(categoryMatch && queryMatch);
                if (!card.hidden) visible += 1;
            });
            sections.forEach(function (section) {
                var key = section.getAttribute('data-dashboard-category');
                var sectionMatch = activeFilter === 'all' || key === activeFilter;
                var hasVisibleCard = !!section.querySelector('.converter-tool-card:not([hidden]):not([data-count-exclude])');
                var emptySelection = section.getAttribute('data-empty-category') === 'true' && key === activeFilter && !query;
                section.hidden = !(sectionMatch && (hasVisibleCard || emptySelection));
            });
            var matchingTotal = updateBadges(query);
            var isEmptySelection = activeFilter !== 'all' && !query && document.querySelector('[data-dashboard-category="' + activeFilter + '"][data-empty-category="true"]');
            if (count) count.textContent = visible + (en ? ' tools shown' : ' 個工具顯示');
            if (noResults) noResults.hidden = visible > 0 || !!isEmptySelection;
            if (matchingTotal === 0 && activeFilter === 'all' && noResults) noResults.hidden = false;
        }

        document.querySelectorAll('[data-dashboard-filter]').forEach(function (button) {
            button.addEventListener('click', function () {
                activeFilter = button.getAttribute('data-dashboard-filter') || 'all';
                document.querySelectorAll('[data-dashboard-filter]').forEach(function (item) { item.classList.toggle('is-active', item === button); });
                applyFilter();
                closeMenu();
                if (activeFilter !== 'all') {
                    var section = document.getElementById('dashboard-category-' + activeFilter);
                    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
        if (input) input.addEventListener('input', applyFilter);
        if (menu) menu.addEventListener('click', function () {
            var open = !page.classList.contains('dashboard-menu-open');
            page.classList.toggle('dashboard-menu-open', open);
            menu.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        if (closeButton) closeButton.addEventListener('click', closeMenu);
        if (overlay) overlay.addEventListener('click', closeMenu);
        document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeMenu(); });
        applyFilter();
    }

    function initAll() { initDropdowns(); initHubSearch(); initDashboard(); initFullCardNavigation(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
}());
