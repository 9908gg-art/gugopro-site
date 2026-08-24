(function () {
    'use strict';
    var C = window.ConverterCommon || {};
    function get(id) { return document.getElementById(id); }
    function en() { return /^en(?:-|$)/i.test(document.documentElement.lang || ''); }
    function tr(zh, english) { return en() ? english : zh; }
    function status(id, message, kind) { if (C.setStatus) C.setStatus(get(id), message, kind); else if (get(id)) get(id).textContent = message; }
    function progress(prefix, value) { if (C.setProgress) C.setProgress(get(prefix + '-progress-bar'), get(prefix + '-progress-label'), value); }
    function copyText(value, id) {
        var promise;
        if (navigator.clipboard && navigator.clipboard.writeText) promise = navigator.clipboard.writeText(value);
        else { var area = document.createElement('textarea'); area.value = value; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); promise = Promise.resolve(); }
        promise.then(function () { status(id, tr('內容已複製；資料未離開瀏覽器。', 'Content copied; it stayed in your browser.'), 'success'); });
    }
    function downloadCanvas(canvas, filename) {
        canvas.toBlob(function (blob) { if (blob && C.downloadBlob) C.downloadBlob(blob, filename); }, 'image/png');
    }
    function safeText(value) { return C.escapeHtml ? C.escapeHtml(value) : String(value || ''); }

    function initQr() {
        var input = get('office-qr-input'), type = get('office-qr-type'), size = get('office-qr-size'), level = get('office-qr-level');
        var dark = get('office-qr-dark'), light = get('office-qr-light'), canvas = get('office-qr-canvas');
        var payload = '';
        function makePayload() {
            var raw = input.value.trim(), mode = type.value;
            if (mode === 'wifi') {
                var fields = {};
                raw.split(/\r?\n|;/).forEach(function (part) { var pair = part.split('='); if (pair.length > 1) fields[pair.shift().trim().toUpperCase()] = pair.join('=').trim(); });
                var security = fields.SECURITY || 'WPA';
                return 'WIFI:T:' + security + ';S:' + (fields.SSID || raw) + ';P:' + (fields.PASSWORD || '') + ';;';
            }
            if (mode === 'vcard') {
                var lines = raw.split(/\r?\n/), name = lines[0] || tr('GugoPro 聯絡人', 'GugoPro Contact'), phone = lines[1] || '', email = lines[2] || '', org = lines[3] || 'GugoPro';
                return 'BEGIN:VCARD\nVERSION:3.0\nFN:' + name + '\nORG:' + org + '\nTEL:' + phone + '\nEMAIL:' + email + '\nEND:VCARD';
            }
            return raw;
        }
        function options() { return { width: Number(size.value) || 280, margin: 2, errorCorrectionLevel: level.value, color: { dark: dark.value, light: light.value } }; }
        function render() {
            if (!window.QRCode || !canvas) { status('office-qr-status', tr('QRCode 函式庫尚未載入，請重新整理。', 'The QRCode library did not load; please refresh.'), 'error'); return; }
            payload = makePayload();
            if (!payload) { status('office-qr-status', tr('請先輸入要編碼的內容。', 'Enter content to encode first.'), 'error'); progress('office-qr', 0); return; }
            progress('office-qr', 35);
            window.QRCode.toCanvas(canvas, payload, options(), function (error) {
                if (error) { status('office-qr-status', tr('QR Code 無法繪製，請檢查內容。', 'The QR Code could not be rendered; check the content.'), 'error'); progress('office-qr', 0); return; }
                progress('office-qr', 100); status('office-qr-status', tr('QR Code 已在本機產生，可以下載 PNG 或 SVG。', 'QR Code generated locally; PNG or SVG is ready.'), 'success');
                get('office-qr-download-png').disabled = false; get('office-qr-download-svg').disabled = false;
            });
        }
        [input, type, size, level, dark, light].forEach(function (element) { if (element) { element.addEventListener('input', render); element.addEventListener('change', render); } });
        get('office-qr-render').addEventListener('click', render);
        get('office-qr-sample').addEventListener('click', function () { type.value = 'wifi'; input.value = 'SSID=GugoPro-Office\nPASSWORD=browser-local\nSECURITY=WPA'; render(); });
        get('office-qr-clear').addEventListener('click', function () { input.value = ''; payload = ''; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); get('office-qr-download-png').disabled = true; get('office-qr-download-svg').disabled = true; progress('office-qr', 0); status('office-qr-status', tr('已清除本機內容。', 'Local content cleared.')); });
        get('office-qr-download-png').addEventListener('click', function () { if (payload) downloadCanvas(canvas, 'gugopro-qr.png'); });
        get('office-qr-download-svg').addEventListener('click', function () { if (!payload || !window.QRCode) return; window.QRCode.toString(payload, Object.assign({ type: 'svg' }, options()), function (error, svg) { if (!error && C.downloadBlob) C.downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), 'gugopro-qr.svg'); }); });
        render();
    }

    function initBarcode() {
        var input = get('office-barcode-input'), format = get('office-barcode-format'), line = get('office-barcode-line'), bg = get('office-barcode-bg'), svg = get('office-barcode-svg');
        function render() {
            if (!window.JsBarcode || !svg) { status('office-barcode-status', tr('JsBarcode 尚未載入，請重新整理。', 'JsBarcode did not load; please refresh.'), 'error'); return; }
            var value = input.value.trim();
            if (!value) { status('office-barcode-status', tr('請輸入條碼內容。', 'Enter barcode content.'), 'error'); progress('office-barcode', 0); return; }
            try {
                progress('office-barcode', 40);
                window.JsBarcode(svg, value, { format: format.value, lineColor: line.value, background: bg.value, width: 2.2, height: 112, displayValue: true, fontSize: 17, margin: 12, textMargin: 5 });
                progress('office-barcode', 100); status('office-barcode-status', tr('條碼已在本機產生，可以下載高畫質 PNG 或 SVG。', 'Barcode generated locally; high-resolution PNG or SVG is ready.'), 'success');
                get('office-barcode-download-png').disabled = false; get('office-barcode-download-svg').disabled = false;
            } catch (error) { progress('office-barcode', 0); status('office-barcode-status', tr('此格式不接受目前的內容，請檢查數字長度。', 'This format does not accept the current value; check its digit length.'), 'error'); get('office-barcode-download-png').disabled = true; get('office-barcode-download-svg').disabled = true; }
        }
        [input, format, line, bg].forEach(function (element) { element.addEventListener('input', render); element.addEventListener('change', render); });
        get('office-barcode-render').addEventListener('click', render);
        get('office-barcode-sample').addEventListener('click', function () { format.value = 'CODE128'; input.value = 'GUGOPRO-OFFICE-2026'; render(); });
        get('office-barcode-clear').addEventListener('click', function () { input.value = ''; svg.innerHTML = ''; get('office-barcode-download-png').disabled = true; get('office-barcode-download-svg').disabled = true; progress('office-barcode', 0); status('office-barcode-status', tr('已清除本機內容。', 'Local content cleared.')); });
        get('office-barcode-download-svg').addEventListener('click', function () { if (C.downloadBlob) { var xml = new XMLSerializer().serializeToString(svg); C.downloadBlob(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }), 'gugopro-barcode.svg'); } });
        get('office-barcode-download-png').addEventListener('click', function () { var xml = new XMLSerializer().serializeToString(svg); var blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }); var url = URL.createObjectURL(blob), image = new Image(); image.onload = function () { var canvas = document.createElement('canvas'); canvas.width = Math.max(900, svg.viewBox.baseVal.width || 900); canvas.height = 300; var ctx = canvas.getContext('2d'); ctx.fillStyle = bg.value; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 40, 45, canvas.width - 80, 190); URL.revokeObjectURL(url); downloadCanvas(canvas, 'gugopro-barcode.png'); }; image.src = url; });
        render();
    }

    function initTextImage() {
        var input = get('office-text-image-input'), theme = get('office-text-image-theme'), fontSize = get('office-text-image-size'), canvas = get('office-text-image-canvas'), sizeOutput = get('office-text-image-size-output');
        var lastBlob = null;
        var themes = { midnight: ['#0b1325', '#152d4b', '#f4fbff', '#55d6ff'], paper: ['#f7efe1', '#fffaf2', '#273247', '#cc7a35'], mint: ['#071f1c', '#123c34', '#ecfff9', '#53e0a1'] };
        function wrap(ctx, text, maxWidth) { var lines = []; String(text || '').split(/\r?\n/).forEach(function (paragraph) { var line = ''; Array.from(paragraph || ' ').forEach(function (char) { var test = line + char; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = char; } else line = test; }); lines.push(line || ''); }); return lines; }
        function render() {
            var value = input.value.trim() || tr('在這裡寫下公告、待辦清單或會議重點。', 'Write an announcement, task list or meeting notes here.');
            var palette = themes[theme.value] || themes.midnight, width = 1200, ctx = canvas.getContext('2d');
            ctx.font = '600 ' + Number(fontSize.value) + 'px Inter, sans-serif'; sizeOutput.textContent = fontSize.value + 'px';
            var lines = wrap(ctx, value, width - 170), lineHeight = Number(fontSize.value) * 1.55, height = Math.max(420, lines.length * lineHeight + 190);
            canvas.width = width; canvas.height = height;
            var gradient = ctx.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, palette[0]); gradient.addColorStop(1, palette[1]); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.roundRect(72, 72, width - 144, height - 144, 30); ctx.fill();
            ctx.fillStyle = palette[2]; ctx.font = '800 ' + Number(fontSize.value) + 'px Inter, sans-serif'; lines.forEach(function (line, index) { ctx.fillText(line, 112, 150 + index * lineHeight); });
            ctx.fillStyle = palette[3]; ctx.fillRect(112, height - 118, 150, 8); ctx.font = '600 24px Inter, sans-serif'; ctx.fillText('GugoPro · browser-local', 112, height - 72);
            canvas.toBlob(function (blob) { lastBlob = blob; }); progress('office-text-image', 100); status('office-text-image-status', tr('便簽長圖已在本機更新，可以複製或下載 PNG。', 'Note image updated locally; copy or download the PNG.'), 'success'); get('office-text-image-download').disabled = false; get('office-text-image-copy').disabled = false;
        }
        [input, theme, fontSize].forEach(function (element) { element.addEventListener('input', render); element.addEventListener('change', render); });
        get('office-text-image-render').addEventListener('click', render);
        get('office-text-image-copy').addEventListener('click', function () { if (!lastBlob || !navigator.clipboard || !window.ClipboardItem) { status('office-text-image-status', tr('目前瀏覽器不支援圖片剪貼簿；請改用 PNG 下載。', 'This browser does not support image clipboard; use PNG download.'), 'error'); return; } navigator.clipboard.write([new ClipboardItem({ 'image/png': lastBlob })]).then(function () { status('office-text-image-status', tr('圖片已複製到剪貼簿。', 'Image copied to the clipboard.'), 'success'); }); });
        get('office-text-image-download').addEventListener('click', function () { if (lastBlob && C.downloadBlob) C.downloadBlob(lastBlob, 'gugopro-note.png'); });
        get('office-text-image-clear').addEventListener('click', function () { input.value = ''; var ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); lastBlob = null; get('office-text-image-download').disabled = true; get('office-text-image-copy').disabled = true; progress('office-text-image', 0); status('office-text-image-status', tr('已清除本機內容。', 'Local content cleared.')); });
        render();
    }

    function markdownToHtml(source) {
        var lines = String(source || '').replace(/\r/g, '').split('\n'), output = [], inCode = false, code = [], list = '';
        function closeList() { if (list) { output.push('</' + list + '>'); list = ''; } }
        function inline(value) { return safeText(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/_([^_]+)_/g, '<em>$1</em>'); }
        lines.forEach(function (line) { var heading, unordered, ordered, wanted; if (/^```/.test(line)) { if (!inCode) { closeList(); inCode = true; code = []; } else { output.push('<pre><code>' + safeText(code.join('\n')) + '</code></pre>'); inCode = false; } return; } if (inCode) { code.push(line); return; } if (!line.trim()) { closeList(); return; } heading = line.match(/^(#{1,6})\s+(.+)$/); if (heading) { closeList(); output.push('<h' + heading[1].length + '>' + inline(heading[2]) + '</h' + heading[1].length + '>'); return; } if (/^---+$/.test(line.trim())) { closeList(); output.push('<hr>'); return; } unordered = line.match(/^\s*[-*+]\s+(.+)$/); ordered = line.match(/^\s*\d+\.\s+(.+)$/); if (unordered || ordered) { wanted = unordered ? 'ul' : 'ol'; if (list !== wanted) { closeList(); list = wanted; output.push('<' + list + '>'); } output.push('<li>' + inline((unordered || ordered)[1]) + '</li>'); return; } if (/^>\s?/.test(line)) { closeList(); output.push('<blockquote>' + inline(line.replace(/^>\s?/, '')) + '</blockquote>'); return; } closeList(); output.push('<p>' + inline(line) + '</p>'); }); if (inCode) output.push('<pre><code>' + safeText(code.join('\n')) + '</code></pre>'); closeList(); return output.join('\n');
    }
    function initMarkdown() {
        var source = get('office-md-source'), preview = get('office-md-preview'), output = get('office-md-html-output'), count = get('office-md-count'), lastHtml = '';
        function render() { lastHtml = markdownToHtml(source.value); preview.innerHTML = lastHtml; output.value = lastHtml; count.textContent = source.value.length + tr(' 字元', ' characters'); progress('office-md', 100); status('office-md-status', tr('Markdown 已在本機即時預覽。', 'Markdown preview updated locally.'), 'success'); }
        source.addEventListener('input', render); get('office-md-render').addEventListener('click', render); get('office-md-copy-md').addEventListener('click', function () { copyText(source.value, 'office-md-status'); }); get('office-md-copy-html').addEventListener('click', function () { copyText(lastHtml, 'office-md-status'); }); get('office-md-download-md').addEventListener('click', function () { if (C.downloadText) C.downloadText(source.value, 'office-note.md', 'text/markdown;charset=utf-8'); }); get('office-md-download-html').addEventListener('click', function () { if (C.downloadText) C.downloadText(lastHtml, 'office-note.html', 'text/html;charset=utf-8'); }); get('office-md-clear').addEventListener('click', function () { source.value = ''; preview.innerHTML = ''; output.value = ''; count.textContent = '0' + tr(' 字元', ' characters'); progress('office-md', 0); status('office-md-status', tr('已清除本機內容。', 'Local content cleared.')); }); render();
    }

    function initPomodoro() {
        var display = get('office-pomo-time'), modeLabel = get('office-pomo-mode'), cycle = get('office-pomo-cycle'), bar = get('office-pomo-progress-bar'), statusId = 'office-pomo-status';
        var state = { mode: 'work', remaining: 1500, total: 1500, round: 1, timer: null };
        function modeName() { return state.mode === 'work' ? tr('工作時間', 'Focus') : state.mode === 'short' ? tr('短休息', 'Short break') : tr('長休息', 'Long break'); }
        function paint() { var minutes = Math.floor(state.remaining / 60), seconds = state.remaining % 60; display.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'); modeLabel.textContent = modeName(); cycle.textContent = tr('第 ' + state.round + ' 回合', 'Round ' + state.round); bar.style.width = Math.round((1 - state.remaining / state.total) * 100) + '%'; }
        function beep() { try { var AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return; var context = new AudioContext(), oscillator = context.createOscillator(), gain = context.createGain(); oscillator.frequency.value = 660; gain.gain.value = 0.05; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.16); } catch (error) {} }
        function nextMode() { if (state.mode === 'work') state.mode = state.round % 4 === 0 ? 'long' : 'short'; else { if (state.mode === 'long') state.round += 1; state.mode = 'work'; } state.total = state.mode === 'work' ? 1500 : state.mode === 'short' ? 300 : 900; state.remaining = state.total; paint(); }
        function tick() { if (state.remaining > 0) state.remaining -= 1; if (state.remaining === 0) { beep(); nextMode(); status(statusId, tr('時間到，已切換到下一個階段。', 'Time is up; switched to the next phase.'), 'success'); } paint(); }
        get('office-pomo-start').addEventListener('click', function () { if (!state.timer) { state.timer = window.setInterval(tick, 1000); status(statusId, tr('計時進行中；提示音只在本機播放。', 'Timer running; the cue sound plays locally.'), 'success'); } });
        get('office-pomo-pause').addEventListener('click', function () { if (state.timer) { window.clearInterval(state.timer); state.timer = null; status(statusId, tr('計時已暫停。', 'Timer paused.')); } });
        get('office-pomo-reset').addEventListener('click', function () { if (state.timer) window.clearInterval(state.timer); state.timer = null; state.mode = 'work'; state.round = 1; state.total = 1500; state.remaining = 1500; paint(); status(statusId, tr('已重設為 25 分鐘工作。', 'Reset to a 25-minute focus session.')); });
        get('office-pomo-skip').addEventListener('click', function () { nextMode(); status(statusId, tr('已切換到下一個階段。', 'Skipped to the next phase.'), 'success'); });
        paint(); progress('office-pomo', 0);
    }

    function initJson() {
        var source = get('office-json-source'), output = get('office-json-output'), errorBox = get('office-json-error'), indent = get('office-json-indent'), lastOutput = '';
        function run(compact) { try { var value = JSON.parse(source.value); lastOutput = JSON.stringify(value, null, compact ? 0 : Number(indent.value)); output.value = lastOutput; errorBox.textContent = ''; errorBox.hidden = true; progress('office-json', 100); status('office-json-status', compact ? tr('JSON 已在本機壓縮。', 'JSON minified locally.') : tr('JSON 已在本機格式化。', 'JSON formatted locally.'), 'success'); get('office-json-copy').disabled = false; get('office-json-download').disabled = false; } catch (error) { errorBox.hidden = false; errorBox.textContent = tr('語法錯誤：', 'Syntax error: ') + error.message; progress('office-json', 0); status('office-json-status', tr('請修正 JSON 語法後再試。', 'Fix the JSON syntax and try again.'), 'error'); get('office-json-copy').disabled = true; get('office-json-download').disabled = true; } }
        source.addEventListener('input', function () { if (source.value.trim()) run(false); }); indent.addEventListener('change', function () { if (source.value.trim()) run(false); }); get('office-json-format').addEventListener('click', function () { run(false); }); get('office-json-minify').addEventListener('click', function () { run(true); }); get('office-json-copy').addEventListener('click', function () { copyText(lastOutput, 'office-json-status'); }); get('office-json-download').addEventListener('click', function () { if (C.downloadText) C.downloadText(lastOutput, 'formatted.json', 'application/json;charset=utf-8'); }); get('office-json-clear').addEventListener('click', function () { source.value = ''; output.value = ''; errorBox.textContent = ''; errorBox.hidden = true; lastOutput = ''; get('office-json-copy').disabled = true; get('office-json-download').disabled = true; progress('office-json', 0); status('office-json-status', tr('已清除本機內容。', 'Local content cleared.')); }); run(false);
    }

    function init(config) { if (config.kind === 'qrcode') initQr(); else if (config.kind === 'barcode') initBarcode(); else if (config.kind === 'text-image') initTextImage(); else if (config.kind === 'markdown') initMarkdown(); else if (config.kind === 'pomodoro') initPomodoro(); else if (config.kind === 'json') initJson(); }
    window.OfficeTools = { init: init };
}());
