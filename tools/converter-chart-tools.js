(function () {
    'use strict';

    var C = window.ConverterCommon || {};
    var palette = ['#55d6ff', '#c084fc', '#53e0a1', '#ffbd73', '#ff7aa8', '#8da7ff', '#f5df75'];
    var funnelPalettes = {
        ocean: ['#55d6ff', '#61c7ed', '#6bb7d8', '#759fbd', '#8b8fa8'],
        sunset: ['#ffbd73', '#ff9c7d', '#ff7aa8', '#d989c7', '#a681dc'],
        forest: ['#53e0a1', '#6dcf92', '#88bc83', '#9fae78', '#b2a26d']
    };

    function get(id) { return document.getElementById(id); }
    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function csvSplit(line) {
        var result = [], current = '', quoted = false;
        for (var i = 0; i < line.length; i += 1) {
            var char = line[i];
            if (char === '"') {
                if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
                else { quoted = !quoted; }
            } else if (char === ',' && !quoted) { result.push(current.trim()); current = ''; }
            else { current += char; }
        }
        result.push(current.trim());
        return result;
    }

    function parseRows(text) {
        return String(text || '').trim().split(/\r?\n/).map(function (line) { return csvSplit(line); }).filter(function (row) {
            return row.some(function (cell) { return cell !== ''; });
        });
    }

    function parseTable(text, kind) {
        var rows = parseRows(text);
        if (rows.length < 2) throw new Error(C.t ? C.t('至少需要標題列與一列數據。', 'Add a header row and at least one data row.') : 'Add a header row and at least one data row.');
        var header = rows[0];
        if (kind === 'scatter') {
            var xIndex = header.map(function (v) { return v.toLowerCase(); }).indexOf('x');
            var yIndex = header.map(function (v) { return v.toLowerCase(); }).indexOf('y');
            var rIndex = header.map(function (v) { return v.toLowerCase(); }).indexOf('r');
            if (xIndex < 0) xIndex = 0;
            if (yIndex < 0) yIndex = 1;
            var points = rows.slice(1).map(function (row, index) {
                var x = Number(row[xIndex]);
                var y = Number(row[yIndex]);
                var r = rIndex >= 0 ? Number(row[rIndex]) : 6;
                return { x: x, y: y, r: Number.isFinite(r) ? clamp(r, 3, 28) : 6, label: row[0] || ('Point ' + (index + 1)) };
            }).filter(function (point) { return Number.isFinite(point.x) && Number.isFinite(point.y); });
            if (!points.length) throw new Error(C.t ? C.t('找不到有效的 X／Y 數值。', 'No valid X/Y values were found.') : 'No valid X/Y values were found.');
            return { labels: points.map(function (point) { return point.label; }), points: points };
        }
        var labels = rows.slice(1).map(function (row, index) { return row[0] || ('Item ' + (index + 1)); });
        var datasets = header.slice(1).map(function (name, seriesIndex) {
            return { label: name || ('Series ' + (seriesIndex + 1)), data: rows.slice(1).map(function (row) {
                var value = Number(row[seriesIndex + 1]);
                return Number.isFinite(value) ? value : 0;
            }) };
        }).filter(function (dataset) { return dataset.data.some(function (value) { return Number.isFinite(value); }); });
        if (!datasets.length) throw new Error(C.t ? C.t('找不到有效的數值欄位。', 'No numeric data series was found.') : 'No numeric data series was found.');
        return { labels: labels, datasets: datasets };
    }

    function alpha(hex, value) {
        var clean = String(hex || '#55d6ff').replace('#', '');
        if (clean.length === 3) clean = clean.split('').map(function (char) { return char + char; }).join('');
        var number = parseInt(clean, 16);
        if (!Number.isFinite(number)) return 'rgba(85,214,255,' + value + ')';
        return 'rgba(' + ((number >> 16) & 255) + ',' + ((number >> 8) & 255) + ',' + (number & 255) + ',' + value + ')';
    }

    function dataUrlBlob(dataUrl, mime) {
        var binary = atob(dataUrl.split(',')[1]);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }

    var percentageLabelsPlugin = {
        id: 'gugoproPercentageLabels',
        afterDatasetsDraw: function (chart) {
            var meta = chart.getDatasetMeta(0);
            var values = chart.data.datasets[0].data || [];
            var total = values.reduce(function (sum, value) { return sum + Math.max(0, Number(value) || 0); }, 0);
            if (!meta || !meta.data || !total) return;
            var ctx = chart.ctx;
            ctx.save();
            ctx.fillStyle = '#f5fbff';
            ctx.font = '700 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            meta.data.forEach(function (arc, index) {
                var angle = (arc.startAngle + arc.endAngle) / 2;
                var radius = (arc.innerRadius + arc.outerRadius) / 2 + (arc.outerRadius - arc.innerRadius) * 0.35;
                var x = arc.x + Math.cos(angle) * radius;
                var y = arc.y + Math.sin(angle) * radius;
                ctx.fillText(((Number(values[index]) || 0) / total * 100).toFixed(1) + '%', x, y);
            });
            ctx.restore();
        }
    };

    var trendLinePlugin = {
        id: 'gugoproTrendLine',
        afterDatasetsDraw: function (chart) {
            var dataset = chart.data.datasets[0];
            if (!dataset || !dataset.data || dataset.data.length < 2 || !chart.scales.x || !chart.scales.y) return;
            var points = dataset.data.filter(function (point) { return Number.isFinite(point.x) && Number.isFinite(point.y); });
            if (points.length < 2) return;
            var meanX = points.reduce(function (sum, point) { return sum + point.x; }, 0) / points.length;
            var meanY = points.reduce(function (sum, point) { return sum + point.y; }, 0) / points.length;
            var denominator = points.reduce(function (sum, point) { return sum + Math.pow(point.x - meanX, 2); }, 0);
            if (!denominator) return;
            var slope = points.reduce(function (sum, point) { return sum + (point.x - meanX) * (point.y - meanY); }, 0) / denominator;
            var intercept = meanY - slope * meanX;
            var xs = points.map(function (point) { return point.x; });
            var minX = Math.min.apply(Math, xs), maxX = Math.max.apply(Math, xs);
            var ctx = chart.ctx;
            ctx.save();
            ctx.strokeStyle = '#ffbd73';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 5]);
            ctx.beginPath();
            ctx.moveTo(chart.scales.x.getPixelForValue(minX), chart.scales.y.getPixelForValue(slope * minX + intercept));
            ctx.lineTo(chart.scales.x.getPixelForValue(maxX), chart.scales.y.getPixelForValue(slope * maxX + intercept));
            ctx.stroke();
            ctx.restore();
        }
    };

    var funnelPlugin = {
        id: 'gugoproFunnel',
        afterDraw: function (chart) {
            var values = chart.data.datasets[0].data || [];
            var labels = chart.data.labels || [];
            var area = chart.chartArea;
            if (!area || !values.length) return;
            var max = Math.max.apply(Math, values.map(function (value) { return Number(value) || 0; })) || 1;
            var row = area.height / values.length;
            var colors = chart.options.plugins.gugoproFunnel.colors || funnelPalettes.ocean;
            var ctx = chart.ctx;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            values.forEach(function (value, index) {
                var ratio = clamp((Number(value) || 0) / max, 0.12, 1);
                var topWidth = area.width * (0.34 + ratio * 0.66);
                var nextValue = values[index + 1] == null ? value : values[index + 1];
                var nextRatio = clamp((Number(nextValue) || 0) / max, 0.12, 1);
                var bottomWidth = area.width * (0.34 + nextRatio * 0.66);
                var center = area.left + area.width / 2;
                var top = area.top + row * index + 4;
                var bottom = area.top + row * (index + 1) - 4;
                ctx.beginPath();
                ctx.moveTo(center - topWidth / 2, top);
                ctx.lineTo(center + topWidth / 2, top);
                ctx.lineTo(center + bottomWidth / 2, bottom);
                ctx.lineTo(center - bottomWidth / 2, bottom);
                ctx.closePath();
                ctx.fillStyle = colors[index % colors.length];
                ctx.globalAlpha = 0.9;
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = 'rgba(255,255,255,.34)';
                ctx.stroke();
                ctx.fillStyle = '#071018';
                ctx.font = '800 12px Inter, sans-serif';
                ctx.fillText(String(labels[index] || ''), center, top + row * 0.42);
                ctx.font = '700 11px Inter, sans-serif';
                ctx.fillText(String(value), center, top + row * 0.70);
            });
            ctx.restore();
        }
    };

    function baseOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 220 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#cbe5f2', usePointStyle: true, padding: 12 } },
                tooltip: { backgroundColor: 'rgba(7,14,24,.94)', titleColor: '#f5fbff', bodyColor: '#cbe5f2', borderColor: 'rgba(85,214,255,.24)', borderWidth: 1 }
            },
            scales: {
                x: { ticks: { color: '#93afc0' }, grid: { color: 'rgba(138,160,190,.12)' } },
                y: { beginAtZero: true, ticks: { color: '#93afc0' }, grid: { color: 'rgba(138,160,190,.12)' } }
            }
        };
    }

    function init(config) {
        var dataInput = get('chart-data');
        var canvas = get('chart-canvas');
        var renderButton = get('chart-render');
        var sampleButton = get('chart-sample');
        var clearButton = get('chart-clear');
        var downloadPng = get('chart-download-png');
        var downloadSvg = get('chart-download-svg');
        var copyData = get('chart-copy-data');
        var status = get('chart-status');
        var progressBar = get('chart-progress-bar');
        var progressLabel = get('chart-progress-label');
        var titleInput = get('chart-title');
        var modeInput = get('chart-mode');
        var colorInput = get('chart-color');
        var optionInput = get('chart-option');
        var alphaInput = get('chart-alpha');
        var alphaOutput = get('chart-alpha-output');
        var importZone = get('chart-import-drop');
        var importInput = get('chart-import-file');
        var chart = null;
        if (!dataInput || !canvas || !window.Chart) {
            if (status) C.setStatus(status, C.t ? C.t('Chart.js 尚未載入，請重新整理。', 'Chart.js did not load; please refresh.') : 'Chart.js did not load; please refresh.', 'error');
            return;
        }

        function setStatus(message, kind) { if (C.setStatus) C.setStatus(status, message, kind); else if (status) status.textContent = message; }
        function setProgress(value) { if (C.setProgress) C.setProgress(progressBar, progressLabel, value); }
        function currentMode() { return modeInput ? modeInput.value : ''; }
        function currentAccent() { return colorInput ? colorInput.value : '#55d6ff'; }
        function buildChart() {
            var parsed = parseTable(dataInput.value, config.kind);
            var mode = currentMode();
            var accent = currentAccent();
            var options = baseOptions();
            var data;
            var plugins = [];
            var type = 'bar';
            var name = config.slug;
            if (config.kind === 'bar') {
                data = { labels: parsed.labels, datasets: parsed.datasets.map(function (dataset, index) {
                    return { label: dataset.label, data: dataset.data, backgroundColor: alpha(palette[index % palette.length], 0.78), borderColor: palette[index % palette.length], borderWidth: 1, borderRadius: 5, borderSkipped: false };
                }) };
                options.indexAxis = mode === 'horizontal' ? 'y' : 'x';
                options.scales.x.stacked = mode === 'stacked';
                options.scales.y.stacked = mode === 'stacked';
                options.plugins.legend.position = 'bottom';
            } else if (config.kind === 'line') {
                type = 'line';
                var stepped = mode === 'stepped';
                var area = mode === 'area';
                data = { labels: parsed.labels, datasets: parsed.datasets.map(function (dataset, index) {
                    var lineColor = index === 0 ? accent : palette[(index + 1) % palette.length];
                    return { label: dataset.label, data: dataset.data, borderColor: lineColor, backgroundColor: alpha(lineColor, area ? 0.22 : 0.06), fill: area, tension: stepped ? 0 : 0.32, stepped: stepped, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2.5 };
                }) };
                options.scales.y.beginAtZero = false;
                options.plugins.legend.position = 'bottom';
            } else if (config.kind === 'pie') {
                type = mode === 'doughnut' ? 'doughnut' : 'pie';
                var pieValues = parsed.datasets[0].data;
                data = { labels: parsed.labels, datasets: [{ label: parsed.datasets[0].label, data: pieValues, backgroundColor: pieValues.map(function (_, index) { return palette[index % palette.length]; }), borderColor: '#101925', borderWidth: 2, hoverOffset: 8 }] };
                options.scales = {};
                options.plugins.legend.position = 'right';
                options.plugins.tooltip.callbacks = { label: function (context) { var total = context.dataset.data.reduce(function (sum, value) { return sum + (Number(value) || 0); }, 0); var value = Number(context.raw) || 0; return ' ' + context.label + ': ' + value + ' (' + (total ? (value / total * 100).toFixed(1) : '0.0') + '%)'; } };
                if (optionInput && optionInput.checked) plugins.push(percentageLabelsPlugin);
            } else if (config.kind === 'radar') {
                type = 'radar';
                var opacity = alphaInput ? clamp(Number(alphaInput.value) / 100, 0.08, 0.75) : 0.22;
                data = { labels: parsed.labels, datasets: parsed.datasets.map(function (dataset, index) { var color = index === 0 ? accent : palette[(index + 2) % palette.length]; return { label: dataset.label, data: dataset.data, borderColor: color, backgroundColor: alpha(color, opacity), pointBackgroundColor: color, pointBorderColor: '#071018', pointRadius: 3, borderWidth: 2 }; }) };
                options.scales = { r: { beginAtZero: true, angleLines: { color: 'rgba(138,160,190,.15)' }, grid: { color: 'rgba(138,160,190,.16)' }, pointLabels: { color: '#cbe5f2', font: { size: 11 } }, ticks: { color: '#93afc0', backdropColor: 'transparent' } } };
                options.plugins.legend.position = 'bottom';
            } else if (config.kind === 'scatter') {
                type = mode === 'bubble' ? 'bubble' : 'scatter';
                data = { datasets: [{ label: C.t ? C.t('資料點', 'Data points') : 'Data points', data: parsed.points, backgroundColor: alpha(accent, 0.75), borderColor: accent, borderWidth: 1.5 }] };
                options.scales.x = { type: 'linear', position: 'bottom', ticks: { color: '#93afc0' }, grid: { color: 'rgba(138,160,190,.12)' } };
                options.scales.y = { beginAtZero: false, ticks: { color: '#93afc0' }, grid: { color: 'rgba(138,160,190,.12)' } };
                options.plugins.legend.position = 'bottom';
                if (optionInput && optionInput.checked) plugins.push(trendLinePlugin);
            } else if (config.kind === 'funnel') {
                type = 'bar';
                var values = parsed.datasets[0].data;
                var funnelColors = funnelPalettes[mode] || funnelPalettes.ocean;
                data = { labels: parsed.labels, datasets: [{ label: parsed.datasets[0].label, data: values, backgroundColor: 'rgba(0,0,0,0)', borderWidth: 0 }] };
                options.indexAxis = 'y';
                options.scales = { x: { display: false, min: 0, max: Math.max.apply(Math, values) * 1.05 }, y: { display: false } };
                options.plugins.legend.display = false;
                options.plugins.tooltip.enabled = false;
                options.plugins.gugoproFunnel = { colors: funnelColors };
                plugins.push(funnelPlugin);
            }
            if (chart) chart.destroy();
            chart = new window.Chart(canvas.getContext('2d'), { type: type, data: data, options: options, plugins: plugins });
            canvas.setAttribute('aria-label', titleInput && titleInput.value ? titleInput.value : config.title);
            return chart;
        }

        function render() {
            setProgress(12);
            try {
                setProgress(46);
                buildChart();
                setProgress(100);
                setStatus(C.t ? C.t('圖表已在本機即時更新。', 'Chart updated locally in your browser.') : 'Chart updated locally in your browser.', 'success');
                if (downloadPng) downloadPng.disabled = false;
                if (downloadSvg) downloadSvg.disabled = false;
                if (copyData) copyData.disabled = false;
            } catch (error) {
                setProgress(0);
                setStatus(error.message || (C.t ? '資料格式無法解析。' : 'The data format could not be parsed.'), 'error');
                if (downloadPng) downloadPng.disabled = true;
                if (downloadSvg) downloadSvg.disabled = true;
            }
        }

        function downloadChart(format) {
            if (!chart) return;
            var dataUrl = canvas.toDataURL('image/png', 1);
            var slug = config.slug || 'chart';
            if (format === 'svg') {
                var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + canvas.width + '" height="' + canvas.height + '" viewBox="0 0 ' + canvas.width + ' ' + canvas.height + '"><image href="' + dataUrl + '" width="' + canvas.width + '" height="' + canvas.height + '"/></svg>';
                if (C.downloadBlob) C.downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), slug + '.svg');
            } else if (C.downloadBlob) C.downloadBlob(dataUrlBlob(dataUrl, 'image/png'), slug + '.png');
        }

        function copyText(value) {
            if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(value);
            var helper = document.createElement('textarea'); helper.value = value; document.body.appendChild(helper); helper.select(); document.execCommand('copy'); helper.remove(); return Promise.resolve();
        }

        if (renderButton) renderButton.addEventListener('click', render);
        if (sampleButton) sampleButton.addEventListener('click', function () { dataInput.value = config.sample; render(); });
        if (clearButton) clearButton.addEventListener('click', function () { dataInput.value = ''; if (chart) { chart.destroy(); chart = null; } setProgress(0); setStatus(C.t ? '已清除本機資料。' : 'Local data cleared.', ''); if (downloadPng) downloadPng.disabled = true; if (downloadSvg) downloadSvg.disabled = true; });
        if (downloadPng) downloadPng.addEventListener('click', function () { downloadChart('png'); });
        if (downloadSvg) downloadSvg.addEventListener('click', function () { downloadChart('svg'); });
        if (copyData) copyData.addEventListener('click', function () { copyText(dataInput.value).then(function () { setStatus(C.t ? '資料已複製；內容未離開瀏覽器。' : 'Data copied; it stayed in your browser.', 'success'); }); });
        [titleInput, modeInput, colorInput, optionInput, alphaInput].forEach(function (element) { if (element) element.addEventListener('input', render); if (element) element.addEventListener('change', render); });
        if (alphaInput && alphaOutput) alphaInput.addEventListener('input', function () { alphaOutput.textContent = alphaInput.value + '%'; });
        if (C.bindDropzone && importZone && importInput) C.bindDropzone(importZone, importInput, function (files) { var file = files[0]; if (!file) return; C.readText(file).then(function (text) { dataInput.value = text; render(); }); });
        render();
        window.ConverterChartTools = { init: init, render: render };
    }

    window.ConverterChartTools = { init: init };
}());
