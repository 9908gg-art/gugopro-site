(function () {
    'use strict';

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB'];
        var index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        return (bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2) + ' ' + units[index];
    }

    function formatNumber(value, digits) {
        return Number(value).toLocaleString('zh-TW', {
            maximumFractionDigits: digits || 0,
            minimumFractionDigits: 0
        });
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function downloadText(text, filename, mimeType) {
        downloadBlob(new Blob([text], { type: mimeType || 'text/plain;charset=utf-8' }), filename);
    }

    function readText(file) {
        return file.text();
    }

    function readDataUrl(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function readArrayBuffer(file) {
        return file.arrayBuffer();
    }

    function setProgress(bar, label, value) {
        var safeValue = Math.max(0, Math.min(100, Math.round(value)));
        if (bar) bar.style.width = safeValue + '%';
        if (label) label.textContent = safeValue + '%';
    }

    function setStatus(element, message, kind) {
        if (!element) return;
        element.textContent = message || '';
        element.className = 'converter-status' + (kind ? ' ' + kind : '');
    }

    function renderFileInfo(element, file, extraRows) {
        if (!element || !file) return;
        var rows = [
            ['檔案名稱', file.name],
            ['檔案大小', formatBytes(file.size)],
            ['檔案類型', file.type || '瀏覽器未標示']
        ].concat(extraRows || []);
        element.innerHTML = rows.map(function (row) {
            return '<div class="converter-file-row"><span>' + escapeHtml(row[0]) + '</span><strong title="' + escapeHtml(row[1]) + '">' + escapeHtml(row[1]) + '</strong></div>';
        }).join('');
    }

    function bindDropzone(zone, input, onFiles) {
        if (!zone || !input) return;
        ['dragenter', 'dragover'].forEach(function (eventName) {
            zone.addEventListener(eventName, function (event) {
                event.preventDefault();
                zone.classList.add('is-dragover');
            });
        });
        ['dragleave', 'drop'].forEach(function (eventName) {
            zone.addEventListener(eventName, function (event) {
                event.preventDefault();
                zone.classList.remove('is-dragover');
            });
        });
        zone.addEventListener('drop', function (event) {
            var files = Array.from(event.dataTransfer.files || []);
            if (files.length) onFiles(files);
        });
        input.addEventListener('change', function () {
            var files = Array.from(input.files || []);
            if (files.length) onFiles(files);
        });
    }

    function imageFromFile(file) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var image = new Image();
            image.onload = function () {
                URL.revokeObjectURL(url);
                resolve(image);
            };
            image.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('無法讀取圖片檔案'));
            };
            image.src = url;
        });
    }

    function mimeForExtension(extension) {
        var map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
        return map[extension.toLowerCase()] || 'application/octet-stream';
    }

    function initCommerce(targetId) {
        var target = document.getElementById(targetId);
        if (!target) return;
        target.innerHTML = '<section class="converter-promo-grid" aria-label="合作與支持">' +
            '<article class="converter-promo-card tradingview">' +
                '<div class="promo-kicker"><i class="fa-solid fa-chart-line"></i> TradingView 專屬優惠</div>' +
                '<h3>把研究素材接上更完整的圖表工作流。</h3>' +
                '<p>TradingView 提供全球市場圖表、Pine Script 回測與多資產研究工具；透過 GugoPro 專屬連結註冊，可查看 30 天試用與現行優惠資格。</p>' +
                '<a class="converter-button warning" href="https://www.tradingview.com/?aff_id=168714" target="_blank" rel="noopener sponsored">查看 30 天試用與優惠 <i class="fa-solid fa-arrow-up-right-from-square"></i></a>' +
            '</article>' +
            '<article class="converter-promo-card kofi">' +
                '<div class="promo-kicker"><i class="fa-solid fa-mug-hot"></i> 支持免費工具持續更新</div>' +
                '<h3>每一杯咖啡，都是下一個工具的燃料。</h3>' +
                '<p>如果這個工具幫你省下時間，歡迎透過 Ko-fi 支持 GugoPro 的免費教學與瀏覽器工具。</p>' +
                '<a class="converter-button" href="https://ko-fi.com/R1K123XRS9" target="_blank" rel="noopener sponsored">前往 Ko-fi 贊助 <i class="fa-solid fa-heart"></i></a>' +
            '</article>' +
        '</section>' +
        '<section class="amazon-affiliate-card" aria-labelledby="amazon-tool-heading">' +
            '<div class="card-header-flex"><h2 id="amazon-tool-heading"><i class="fa-brands fa-amazon"></i> 創作者與研究者精選周邊</h2><span class="badge-promo">Amazon Hub</span></div>' +
            '<p class="amazon-desc">精選適合內容製作、資料整理與交易研究的高速儲存裝置及桌面照明。連結可能包含聯盟行銷標記，購買不會增加你的費用。</p>' +
            '<div class="amz-grid">' +
                '<a class="amz-item-card" href="https://www.amazon.com/s?k=portable+ssd+creator&tag=9908qq-20" target="_blank" rel="noopener sponsored"><div class="amz-title-flex"><div class="amz-icon-box"><i class="fa-solid fa-hard-drive"></i></div><strong>創作者高效能 SSD</strong></div><p>快取大型影像、素材庫與瀏覽器匯出檔的高速外接儲存選擇。</p><div class="amz-action-text">探索 Amazon 精選 ➜</div></a>' +
                '<a class="amz-item-card" href="https://www.amazon.com/s?k=external+hard+drive+backup&tag=9908qq-20" target="_blank" rel="noopener sponsored"><div class="amz-title-flex"><div class="amz-icon-box"><i class="fa-solid fa-database"></i></div><strong>外接硬碟與備份</strong></div><p>為課程檔案、研究資料與影片專案建立離線備份，降低單一裝置風險。</p><div class="amz-action-text">查看備份方案 ➜</div></a>' +
                '<a class="amz-item-card" href="https://www.amazon.com/s?k=monitor+light+bar+trader&tag=9908qq-20" target="_blank" rel="noopener sponsored"><div class="amz-title-flex"><div class="amz-icon-box"><i class="fa-solid fa-lightbulb"></i></div><strong>交易員螢幕掛燈</strong></div><p>多螢幕工作時提供柔和、低反光的桌面照明，提升長時間閱讀舒適度。</p><div class="amz-action-text">探索桌面周邊 ➜</div></a>' +
            '</div>' +
        '</section>';
    }

    window.ConverterCommon = {
        bindDropzone: bindDropzone,
        downloadBlob: downloadBlob,
        downloadText: downloadText,
        escapeHtml: escapeHtml,
        formatBytes: formatBytes,
        formatNumber: formatNumber,
        imageFromFile: imageFromFile,
        mimeForExtension: mimeForExtension,
        readArrayBuffer: readArrayBuffer,
        readDataUrl: readDataUrl,
        readText: readText,
        renderFileInfo: renderFileInfo,
        setProgress: setProgress,
        setStatus: setStatus,
        initCommerce: initCommerce
    };
}());
