/* GugoPro browser-local document tools */
(function () {
    'use strict';

    var C = window.ConverterCommon;
    if (!C) return;
    var en = C.isEnglish();
    var text = function (zh, english) { return en ? english : zh; };
    var t = function (kind, name) { return document.getElementById(kind + '-' + name); };

    function status(element, message, kind) { C.setStatus(element, message, kind); }
    function progress(kind, value) { C.setProgress(t(kind, 'progress-bar'), t(kind, 'progress-label'), value); }
    function escape(value) { return C.escapeHtml(value == null ? '' : value); }
    function isPdf(file) { return /\.pdf$/i.test(file.name) || file.type === 'application/pdf'; }
    function isSheet(file) { return /\.(csv|xlsx?|xls)$/i.test(file.name); }
    function safeBase(name) { return String(name || 'document').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 42) || 'document'; }

    function renderFiles(element, files, options) {
        if (!element) return;
        options = options || {};
        element.innerHTML = '';
        files.forEach(function (file, index) {
            var row = document.createElement('div');
            row.className = 'file-list-item';
            var icon = document.createElement('i');
            icon.className = options.icon || 'fa-solid fa-file';
            var name = document.createElement('span');
            name.className = 'file-list-name';
            name.textContent = file.name;
            var detail = document.createElement('small');
            detail.textContent = options.detail ? options.detail(index, file) : C.formatBytes(file.size);
            row.appendChild(icon);
            row.appendChild(name);
            row.appendChild(detail);
            if (options.reorder) {
                var up = document.createElement('button');
                up.type = 'button';
                up.className = 'file-list-move';
                up.disabled = index === 0;
                up.setAttribute('aria-label', text('向上移動 ' + file.name, 'Move ' + file.name + ' up'));
                up.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
                up.addEventListener('click', function () { if (options.onMove) options.onMove(index, index - 1); });
                var down = document.createElement('button');
                down.type = 'button';
                down.className = 'file-list-move';
                down.disabled = index === files.length - 1;
                down.setAttribute('aria-label', text('向下移動 ' + file.name, 'Move ' + file.name + ' down'));
                down.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
                down.addEventListener('click', function () { if (options.onMove) options.onMove(index, index + 1); });
                row.appendChild(up);
                row.appendChild(down);
            }
            if (options.remove !== false) {
                var remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'file-list-remove';
                remove.setAttribute('aria-label', text('移除 ' + file.name, 'Remove ' + file.name));
                remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                remove.addEventListener('click', function () { if (options.onRemove) options.onRemove(index); });
                row.appendChild(remove);
            }
            element.appendChild(row);
        });
    }

    function renderRows(element, rows, title) {
        if (!element) return;
        var sample = (rows || []).slice(0, 12);
        var head = sample[0] || [];
        var columns = Math.min(Math.max(head.length, 1), 8);
        var html = '<h3>' + escape(title || text('表格預覽', 'Table preview')) + '</h3><div class="converter-table-wrap"><table class="converter-table"><thead><tr>';
        for (var h = 0; h < columns; h += 1) html += '<th>' + escape(head[h] == null ? '' : head[h]) + '</th>';
        html += '</tr></thead><tbody>';
        sample.slice(1).forEach(function (row) {
            html += '<tr>';
            for (var c = 0; c < columns; c += 1) html += '<td>' + escape(row[c] == null ? '' : row[c]) + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table></div><p class="converter-hint">' + escape(text('預覽最多顯示前 12 列與 8 欄；匯出仍使用完整資料。', 'Preview shows up to 12 rows and 8 columns; exports still use the complete data.')) + '</p>';
        element.innerHTML = html;
    }

    function readWorkbook(file) {
        if (file.name.toLowerCase().endsWith('.csv')) {
            return C.readText(file).then(function (value) { return XLSX.read(value, { type: 'string' }); });
        }
        return C.readArrayBuffer(file).then(function (buffer) { return XLSX.read(buffer, { type: 'array' }); });
    }

    function rowsFromSheet(workbook, sheetName) {
        var sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
        return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    }

    function bind(kind, onFiles) {
        C.bindDropzone(t(kind, 'dropzone'), t(kind, 'file'), onFiles);
    }

    function requireLib(kind, names) {
        var missing = names.filter(function (name) { return !window[name]; });
        if (missing.length) {
            status(t(kind, 'status'), text('必要的前端函式庫尚未載入：' + missing.join('、') + '。請重新整理頁面。', 'A required browser library is not ready: ' + missing.join(', ') + '. Please reload the page.'), 'error');
            return false;
        }
        return true;
    }

    function initPdfMerge(kind) {
        var files = [], outputBlob = null, outputName = 'merged-document.pdf';
        var list = t(kind, 'list'), run = t(kind, 'run'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        function drawList() {
            renderFiles(list, files, { icon: 'fa-solid fa-file-pdf', detail: function (index, file) { return C.formatBytes(file.size); }, reorder: true, onMove: function (from, to) { if (to < 0 || to >= files.length) return; var moved = files.splice(from, 1)[0]; files.splice(to, 0, moved); drawList(); }, onRemove: function (index) { files.splice(index, 1); drawList(); run.disabled = !files.length; } });
        }
        function add(incoming) {
            var accepted = incoming.filter(isPdf);
            if (accepted.length) files = files.concat(accepted);
            drawList();
            run.disabled = !files.length;
            download.disabled = true;
            if (!accepted.length) return status(stat, text('請選擇 PDF 檔案。', 'Choose PDF files.'), 'error');
            status(stat, text(files.length + ' 個 PDF 已就緒，請拖曳箭頭調整合併順序。', files.length + ' PDFs ready. Use the arrows to set merge order.'), 'success');
        }
        function execute() {
            if (!files.length) return status(stat, text('請先選擇至少一個 PDF。', 'Choose at least one PDF first.'), 'error');
            if (!requireLib(kind, ['PDFLib'])) return;
            run.disabled = true; download.disabled = true; outputBlob = null; progress(kind, 0);
            var chain = PDFLib.PDFDocument.create();
            files.forEach(function (file, index) {
                chain = chain.then(function (target) { return C.readArrayBuffer(file).then(function (buffer) { return PDFLib.PDFDocument.load(buffer); }).then(function (source) { return target.copyPages(source, source.getPageIndices()); }).then(function (pages) { pages.forEach(function (page) { target.addPage(page); }); progress(kind, ((index + 1) / files.length) * 88); return target; }); });
            });
            chain.then(function (target) { return target.save(); }).then(function (bytes) { outputBlob = new Blob([bytes], { type: 'application/pdf' }); outputName = files.length === 1 ? safeBase(files[0].name) + '-merged.pdf' : 'pdf-merged-batch.pdf'; progress(kind, 100); status(stat, text(files.length + ' 個 PDF 已合併，可以下載。', files.length + ' PDFs were merged and are ready to download.'), 'success'); download.disabled = false; run.disabled = false; }).catch(function (error) { progress(kind, 0); status(stat, text('PDF 合併失敗：' + (error.message || '檔案格式不受支援。'), 'PDF merge failed: ' + (error.message || 'the file format may not be supported.')), 'error'); run.disabled = false; });
        }
        bind(kind, add); run.addEventListener('click', execute); download.addEventListener('click', function () { if (outputBlob) C.downloadBlob(outputBlob, outputName); }); clear.addEventListener('click', function () { files = []; outputBlob = null; drawList(); run.disabled = true; download.disabled = true; progress(kind, 0); status(stat, text('請選擇一個或多個 PDF 檔案。', 'Choose one or more PDF files.')); });
    }

    function initPdfRotate(kind) {
        var file = null, pageCount = 0, outputBlob = null, outputName = 'rotated-document.pdf';
        var input = t(kind, 'file'), list = t(kind, 'list'), run = t(kind, 'run'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        function add(incoming) {
            file = incoming.filter(isPdf)[0] || null;
            if (!file) return status(stat, text('請選擇 PDF 檔案。', 'Choose a PDF file.'), 'error');
            renderFiles(list, [file], { icon: 'fa-solid fa-file-pdf', remove: false });
            run.disabled = true; download.disabled = true; progress(kind, 10);
            C.readArrayBuffer(file).then(function (buffer) { return PDFLib.PDFDocument.load(buffer); }).then(function (doc) { pageCount = doc.getPageCount(); run.disabled = false; progress(kind, 100); status(stat, text('已讀取 ' + pageCount + ' 頁 PDF，請選擇頁面範圍與旋轉角度。', pageCount + '-page PDF ready. Choose a page scope and rotation.'), 'success'); }).catch(function () { progress(kind, 0); status(stat, text('無法讀取此 PDF。', 'This PDF could not be read.'), 'error'); });
        }
        function execute() {
            if (!file || !pageCount) return status(stat, text('請先選擇可讀取的 PDF。', 'Choose a readable PDF first.'), 'error');
            if (!requireLib(kind, ['PDFLib'])) return;
            run.disabled = true; download.disabled = true; var scope = t(kind, 'scope').value; var angle = Number(t(kind, 'angle').value); progress(kind, 20);
            C.readArrayBuffer(file).then(function (buffer) { return PDFLib.PDFDocument.load(buffer); }).then(function (doc) { doc.getPages().forEach(function (page, index) { var selected = scope === 'all' || (scope === 'odd' && index % 2 === 0) || (scope === 'even' && index % 2 === 1); if (selected) { var existing = page.getRotation().angle || 0; page.setRotation(PDFLib.degrees((existing + angle) % 360)); } }); progress(kind, 78); return doc.save(); }).then(function (bytes) { outputBlob = new Blob([bytes], { type: 'application/pdf' }); outputName = safeBase(file.name) + '-rotated.pdf'; progress(kind, 100); status(stat, text('PDF 頁面旋轉完成，可以下載。', 'PDF page rotation is complete and ready to download.'), 'success'); download.disabled = false; run.disabled = false; }).catch(function (error) { progress(kind, 0); status(stat, text('PDF 旋轉失敗：' + (error.message || '格式不受支援。'), 'PDF rotation failed: ' + (error.message || 'the format may not be supported.')), 'error'); run.disabled = false; });
        }
        bind(kind, add); run.addEventListener('click', execute); download.addEventListener('click', function () { if (outputBlob) C.downloadBlob(outputBlob, outputName); }); clear.addEventListener('click', function () { file = null; pageCount = 0; outputBlob = null; list.innerHTML = ''; run.disabled = true; download.disabled = true; progress(kind, 0); status(stat, text('請選擇一個 PDF 檔案。', 'Choose one PDF file.')); });
    }

    function hexColor(value) {
        var raw = String(value || '#5cd6ff').replace('#', '');
        if (raw.length === 3) raw = raw.split('').map(function (part) { return part + part; }).join('');
        var number = parseInt(raw, 16);
        if (!Number.isFinite(number)) number = 0x5cd6ff;
        return PDFLib.rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255);
    }

    function safePdfText(value) { return String(value == null ? '' : value).replace(/[^\x20-\x7E]/g, '?'); }    function initPdfWatermark(kind) {
        var file = null, pageCount = 0, outputBlob = null, outputName = 'watermarked-document.pdf';
        var list = t(kind, 'list'), run = t(kind, 'run'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        var opacity = t(kind, 'opacity'), opacityLabel = t(kind, 'opacity-label');
        opacity.addEventListener('input', function () { opacityLabel.textContent = opacity.value + '%'; });
        function add(incoming) { file = incoming.filter(isPdf)[0] || null; if (!file) return status(stat, text('請選擇 PDF 檔案。', 'Choose a PDF file.'), 'error'); renderFiles(list, [file], { icon: 'fa-solid fa-file-pdf', remove: false }); C.readArrayBuffer(file).then(function (buffer) { return PDFLib.PDFDocument.load(buffer); }).then(function (doc) { pageCount = doc.getPageCount(); run.disabled = false; status(stat, text('已讀取 ' + pageCount + ' 頁，輸入浮水印文字後即可處理。', pageCount + ' pages ready. Enter watermark text to process.'), 'success'); }).catch(function () { status(stat, text('無法讀取此 PDF。', 'This PDF could not be read.'), 'error'); }); }
        function execute() { if (!file || !pageCount) return status(stat, text('請先選擇可讀取的 PDF。', 'Choose a readable PDF first.'), 'error'); if (!requireLib(kind, ['PDFLib'])) return; var watermark = t(kind, 'text').value.trim(); if (!watermark) return status(stat, text('請輸入浮水印文字。', 'Enter watermark text.'), 'error'); run.disabled = true; download.disabled = true; progress(kind, 15); C.readArrayBuffer(file).then(function (buffer) { return PDFLib.PDFDocument.load(buffer); }).then(function (doc) { return doc.embedFont(PDFLib.StandardFonts.Helvetica).then(function (font) { var safeWatermark = safePdfText(watermark); var size = Number(t(kind, 'size').value) || 36; var angle = Number(t(kind, 'angle').value) || 35; var alpha = Math.max(0.05, Math.min(1, Number(opacity.value) / 100)); var color = hexColor(t(kind, 'color').value); doc.getPages().forEach(function (page) { var width = page.getWidth(), height = page.getHeight(), widthAtSize = font.widthOfTextAtSize(safeWatermark, size); page.drawText(safeWatermark, { x: Math.max(16, (width - widthAtSize) / 2), y: height / 2, size: size, font: font, color: color, opacity: alpha, rotate: PDFLib.degrees(angle) }); }); progress(kind, 82); return doc.save(); }); }).then(function (bytes) { outputBlob = new Blob([bytes], { type: 'application/pdf' }); outputName = safeBase(file.name) + '-watermarked.pdf'; progress(kind, 100); status(stat, text('已在 ' + pageCount + ' 頁加入文字浮水印，可以下載。', 'Text watermark added to ' + pageCount + ' pages and is ready to download.'), 'success'); download.disabled = false; run.disabled = false; }).catch(function (error) { progress(kind, 0); status(stat, text('浮水印處理失敗：' + (error.message || '格式不受支援。'), 'Watermarking failed: ' + (error.message || 'the format may not be supported.')), 'error'); run.disabled = false; }); }
        bind(kind, add); run.addEventListener('click', execute); download.addEventListener('click', function () { if (outputBlob) C.downloadBlob(outputBlob, outputName); }); clear.addEventListener('click', function () { file = null; pageCount = 0; outputBlob = null; list.innerHTML = ''; run.disabled = true; download.disabled = true; progress(kind, 0); status(stat, text('請選擇一個 PDF 檔案。', 'Choose one PDF file.')); });
    }

    function initPdfPageNumber(kind) {
        var file = null, pageCount = 0, outputBlob = null, outputName = 'numbered-document.pdf';
        var list = t(kind, 'list'), run = t(kind, 'run'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        function add(incoming) { file = incoming.filter(isPdf)[0] || null; if (!file) return status(stat, text('請選擇 PDF 檔案。', 'Choose a PDF file.'), 'error'); renderFiles(list, [file], { icon: 'fa-solid fa-file-pdf', remove: false }); C.readArrayBuffer(file).then(function (buffer) { return PDFLib.PDFDocument.load(buffer); }).then(function (doc) { pageCount = doc.getPageCount(); run.disabled = false; status(stat, text('已讀取 ' + pageCount + ' 頁，請設定頁碼格式、位置與對齊。', pageCount + ' pages ready. Set the format, position and alignment.'), 'success'); }).catch(function () { status(stat, text('無法讀取此 PDF。', 'This PDF could not be read.'), 'error'); }); }
        function execute() { if (!file || !pageCount) return status(stat, text('請先選擇可讀取的 PDF。', 'Choose a readable PDF first.'), 'error'); if (!requireLib(kind, ['PDFLib'])) return; var format = t(kind, 'format').value || '{page} / {total}'; run.disabled = true; download.disabled = true; progress(kind, 15); C.readArrayBuffer(file).then(function (buffer) { return PDFLib.PDFDocument.load(buffer); }).then(function (doc) { return doc.embedFont(PDFLib.StandardFonts.Helvetica).then(function (font) { var size = Number(t(kind, 'size').value) || 10; var position = t(kind, 'position').value; var align = t(kind, 'align').value; doc.getPages().forEach(function (page, index) { var label = safePdfText(format.replace(/\{page\}/g, String(index + 1)).replace(/\{total\}/g, String(pageCount))); var width = page.getWidth(), height = page.getHeight(), textWidth = font.widthOfTextAtSize(label, size); var x = align === 'left' ? 24 : (align === 'right' ? width - textWidth - 24 : (width - textWidth) / 2); var y = position === 'top' ? height - size - 20 : 20; page.drawText(label, { x: Math.max(12, x), y: y, size: size, font: font, color: PDFLib.rgb(0.18, 0.22, 0.28) }); }); progress(kind, 82); return doc.save(); }); }).then(function (bytes) { outputBlob = new Blob([bytes], { type: 'application/pdf' }); outputName = safeBase(file.name) + '-numbered.pdf'; progress(kind, 100); status(stat, text('已完成 ' + pageCount + ' 頁頁碼，可以下載。', 'Page numbers were added to ' + pageCount + ' pages and are ready to download.'), 'success'); download.disabled = false; run.disabled = false; }).catch(function (error) { progress(kind, 0); status(stat, text('頁碼處理失敗：' + (error.message || '格式不受支援。'), 'Page numbering failed: ' + (error.message || 'the format may not be supported.')), 'error'); run.disabled = false; }); }
        bind(kind, add); run.addEventListener('click', execute); download.addEventListener('click', function () { if (outputBlob) C.downloadBlob(outputBlob, outputName); }); clear.addEventListener('click', function () { file = null; pageCount = 0; outputBlob = null; list.innerHTML = ''; run.disabled = true; download.disabled = true; progress(kind, 0); status(stat, text('請選擇一個 PDF 檔案。', 'Choose one PDF file.')); });
    }

    function uniqueSheetName(base, used) { var clean = String(base || 'Sheet').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet'; var name = clean, number = 2; while (used[name]) { var suffix = ' ' + number; name = clean.slice(0, 31 - suffix.length) + suffix; number += 1; } used[name] = true; return name; }

    function initExcelMerge(kind) {
        var files = [], outputBlob = null, outputName = 'merged-workbook.xlsx';
        var list = t(kind, 'list'), preview = t(kind, 'preview'), run = t(kind, 'run'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        function drawList() { renderFiles(list, files, { icon: 'fa-solid fa-file-excel', detail: function (index, file) { return C.formatBytes(file.size); }, onRemove: function (index) { files.splice(index, 1); drawList(); run.disabled = !files.length; } }); }
        function add(incoming) { var accepted = incoming.filter(isSheet); if (accepted.length) files = files.concat(accepted); drawList(); run.disabled = !files.length; download.disabled = true; if (!accepted.length) return status(stat, text('請選擇 CSV、XLSX 或 XLS 檔案。', 'Choose CSV, XLSX or XLS files.'), 'error'); status(stat, text(files.length + ' 個試算表已就緒，會將所有工作表彙整到同一個活頁簿。', files.length + ' spreadsheets ready. All sheets will be collected into one workbook.'), 'success'); readWorkbook(files[0]).then(function (book) { renderRows(preview, rowsFromSheet(book), files[0].name); }).catch(function () { status(stat, text('第一個試算表無法解析。', 'The first spreadsheet could not be parsed.'), 'error'); }); }
        function execute() { if (!files.length) return status(stat, text('請先選擇至少一個試算表。', 'Choose at least one spreadsheet first.'), 'error'); if (!requireLib(kind, ['XLSX'])) return; run.disabled = true; download.disabled = true; outputBlob = null; progress(kind, 5); var output = XLSX.utils.book_new(), used = {}, chain = Promise.resolve(); files.forEach(function (file, fileIndex) { chain = chain.then(function () { return readWorkbook(file); }).then(function (book) { book.SheetNames.forEach(function (sheetName) { var rows = rowsFromSheet(book, sheetName); XLSX.utils.book_append_sheet(output, XLSX.utils.aoa_to_sheet(rows), uniqueSheetName(safeBase(file.name) + ' - ' + sheetName, used)); }); progress(kind, ((fileIndex + 1) / files.length) * 82); }); }); chain.then(function () { var array = XLSX.write(output, { bookType: 'xlsx', type: 'array' }); outputBlob = new Blob([array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); outputName = 'merged-workbook.xlsx'; progress(kind, 100); status(stat, text(files.length + ' 個檔案已合併為一個 Excel 活頁簿。', files.length + ' files were merged into one Excel workbook.'), 'success'); download.disabled = false; run.disabled = false; }).catch(function (error) { progress(kind, 0); status(stat, text('Excel 合併失敗：' + (error.message || '格式不受支援。'), 'Excel merge failed: ' + (error.message || 'the format may not be supported.')), 'error'); run.disabled = false; }); }
        bind(kind, add); run.addEventListener('click', execute); download.addEventListener('click', function () { if (outputBlob) C.downloadBlob(outputBlob, outputName); }); clear.addEventListener('click', function () { files = []; outputBlob = null; list.innerHTML = ''; preview.innerHTML = ''; run.disabled = true; download.disabled = true; progress(kind, 0); status(stat, text('請選擇一個或多個試算表檔案。', 'Choose one or more spreadsheets.')); });
    }

    function initExcelSplit(kind) {
        var file = null, workbook = null, outputBlob = null, outputName = 'split-workbook-sheets.zip';
        var list = t(kind, 'list'), preview = t(kind, 'preview'), run = t(kind, 'run'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        function drawSheets() { list.innerHTML = ''; if (!workbook) return; workbook.SheetNames.forEach(function (name, index) { var row = document.createElement('div'); row.className = 'file-list-item'; var icon = document.createElement('i'); icon.className = 'fa-solid fa-table-list'; var label = document.createElement('span'); label.className = 'file-list-name'; label.textContent = name; var detail = document.createElement('small'); detail.textContent = text('工作表 ' + (index + 1), 'Sheet ' + (index + 1)); row.appendChild(icon); row.appendChild(label); row.appendChild(detail); list.appendChild(row); }); }
        function add(incoming) { file = incoming.filter(isSheet)[0] || null; if (!file) return status(stat, text('請選擇 XLSX、XLS 或 CSV 檔案。', 'Choose an XLSX, XLS or CSV file.'), 'error'); readWorkbook(file).then(function (book) { workbook = book; drawSheets(); renderRows(preview, rowsFromSheet(book), file.name + ' · ' + book.SheetNames[0]); run.disabled = false; status(stat, text('已讀取 ' + book.SheetNames.length + ' 個工作表，準備拆分成 ZIP。', book.SheetNames.length + ' worksheets ready to split into a ZIP.'), 'success'); }).catch(function () { workbook = null; run.disabled = true; status(stat, text('無法解析此活頁簿。', 'This workbook could not be parsed.'), 'error'); }); }
        function execute() { if (!file || !workbook) return status(stat, text('請先選擇含有工作表的 Excel 檔案。', 'Choose an Excel workbook with worksheets first.'), 'error'); if (!requireLib(kind, ['XLSX', 'JSZip'])) return; run.disabled = true; download.disabled = true; outputBlob = null; progress(kind, 10); var zip = new JSZip(); workbook.SheetNames.forEach(function (sheetName, index) { var book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, workbook.Sheets[sheetName], sheetName.slice(0, 31)); var array = XLSX.write(book, { bookType: 'xlsx', type: 'array' }); zip.file((String(index + 1).padStart(2, '0') + '-' + sheetName.replace(/[^a-z0-9_-]+/gi, '-').slice(0, 48) + '.xlsx'), new Blob([array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); progress(kind, 10 + ((index + 1) / workbook.SheetNames.length) * 70); }); zip.generateAsync({ type: 'blob' }, function (meta) { progress(kind, 80 + meta.percent * 0.2); }).then(function (blob) { outputBlob = blob; outputName = safeBase(file.name) + '-sheets.zip'; progress(kind, 100); status(stat, text(workbook.SheetNames.length + ' 個工作表已拆分並打包 ZIP。', workbook.SheetNames.length + ' worksheets were split and packaged as a ZIP.'), 'success'); download.disabled = false; run.disabled = false; }).catch(function (error) { progress(kind, 0); status(stat, text('Excel 分割失敗：' + (error.message || '格式不受支援。'), 'Excel split failed: ' + (error.message || 'the format may not be supported.')), 'error'); run.disabled = false; }); }
        bind(kind, add); run.addEventListener('click', execute); download.addEventListener('click', function () { if (outputBlob) C.downloadBlob(outputBlob, outputName); }); clear.addEventListener('click', function () { file = null; workbook = null; outputBlob = null; list.innerHTML = ''; preview.innerHTML = ''; run.disabled = true; download.disabled = true; progress(kind, 0); status(stat, text('請選擇一個 Excel 活頁簿。', 'Choose one Excel workbook.')); });
    }



    function downloadText(kind, textValue, name) {
        C.downloadBlob(new Blob([textValue], { type: 'text/plain;charset=utf-8' }), name);
    }

    function copyOutput(kind) {
        var value = t(kind, 'output-text').textContent || '';
        if (!value || /^Waiting for an output file\.|^等待輸出檔案。$/.test(value)) return status(t(kind, 'status'), text('目前沒有可複製的結果。', 'There is no output to copy yet.'), 'error');
        var done = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(value) : Promise.resolve().then(function () { var area = document.createElement('textarea'); area.value = value; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); });
        done.then(function () { status(t(kind, 'status'), text('結果已複製到剪貼簿。', 'The result was copied to the clipboard.'), 'success'); }).catch(function () { status(t(kind, 'status'), text('無法複製，請手動選取文字。', 'Copy was blocked; select the text manually.'), 'error'); });
    }

    function initPdfToImages(kind) {
        var file = null, pdf = null, images = [], zipBlob = null, format = t(kind, 'format'), scale = t(kind, 'scale'), quality = t(kind, 'quality'), qualityLabel = t(kind, 'quality-label');
        var list = t(kind, 'list'), preview = t(kind, 'preview'), run = t(kind, 'run'), single = t(kind, 'single-download'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        quality.addEventListener('input', function () { qualityLabel.textContent = quality.value + '%'; });
        function add(incoming) { file = incoming.filter(isPdf)[0] || null; images = []; zipBlob = null; run.disabled = true; download.disabled = true; single.disabled = true; preview.innerHTML = ''; if (!file) return status(stat, text('請選擇 PDF 檔案。', 'Choose a PDF file.'), 'error'); renderFiles(list, [file], { icon: 'fa-solid fa-file-pdf', remove: false }); if (!window.pdfjsLib) return status(stat, text('pdf.js 尚未載入，請重新整理。', 'pdf.js is not ready; please reload.'), 'error'); progress(kind, 10); C.readArrayBuffer(file).then(function (buffer) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = window.pdfjsLib.GlobalWorkerOptions.workerSrc || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; return window.pdfjsLib.getDocument({ data: buffer }).promise; }).then(function (doc) { pdf = doc; progress(kind, 100); status(stat, text('已讀取 ' + doc.numPages + ' 頁，請設定格式與解析度。', doc.numPages + ' pages ready. Choose format and scale.'), 'success'); run.disabled = false; }).catch(function () { progress(kind, 0); status(stat, text('無法讀取此 PDF。', 'This PDF could not be read.'), 'error'); }); }
        function renderPage(pageNumber) { return pdf.getPage(pageNumber).then(function (page) { var viewport = page.getViewport({ scale: Number(scale.value) || 2 }); var canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height); var context = canvas.getContext('2d'); var ext = format.value === 'jpg' ? 'jpg' : 'png'; return page.render({ canvasContext: context, viewport: viewport }).promise.then(function () { return new Promise(function (resolve, reject) { canvas.toBlob(function (blob) { if (!blob) return reject(new Error('Canvas export failed')); resolve({ blob: blob, name: 'page-' + String(pageNumber).padStart(3, '0') + '.' + ext, canvas: canvas }); }, ext === 'jpg' ? 'image/jpeg' : 'image/png', Number(quality.value) / 100); }); }); }); }
        function execute() { if (!pdf) return status(stat, text('請先選擇可讀取的 PDF。', 'Choose a readable PDF first.'), 'error'); if (!requireLib(kind, ['pdfjsLib', 'JSZip'])) return; run.disabled = true; download.disabled = true; single.disabled = true; images = []; zipBlob = null; preview.innerHTML = ''; var chain = Promise.resolve(); for (var index = 1; index <= pdf.numPages; index += 1) { (function (pageNumber) { chain = chain.then(function () { return renderPage(pageNumber); }).then(function (result) { images.push(result); var figure = document.createElement('figure'); figure.className = 'converter-image-thumb'; var image = document.createElement('img'); image.src = URL.createObjectURL(result.blob); image.alt = text('第 ' + pageNumber + ' 頁預覽', 'Page ' + pageNumber + ' preview'); var caption = document.createElement('figcaption'); caption.textContent = result.name; figure.appendChild(image); figure.appendChild(caption); preview.appendChild(figure); progress(kind, (pageNumber / pdf.numPages) * 78); }); }(index)); } chain.then(function () { var zip = new JSZip(); images.forEach(function (item) { zip.file(item.name, item.blob); }); return zip.generateAsync({ type: 'blob' }); }).then(function (blob) { zipBlob = blob; progress(kind, 100); status(stat, text(images.length + ' 頁圖片已產生，可下載第一頁或 ZIP。', images.length + ' page images are ready. Download the first page or the ZIP.'), 'success'); download.disabled = false; single.disabled = false; run.disabled = false; }).catch(function (error) { progress(kind, 0); status(stat, text('PDF 轉圖片失敗：' + (error.message || 'Canvas export failed.'), 'PDF image export failed: ' + (error.message || 'Canvas export failed.')), 'error'); run.disabled = false; }); }
        bind(kind, add); run.addEventListener('click', execute); single.addEventListener('click', function () { if (images[0]) C.downloadBlob(images[0].blob, images[0].name); }); download.addEventListener('click', function () { if (zipBlob) C.downloadBlob(zipBlob, safeBase(file.name) + '-images.zip'); }); clear.addEventListener('click', function () { file = null; pdf = null; images = []; zipBlob = null; list.innerHTML = ''; preview.innerHTML = ''; run.disabled = true; download.disabled = true; single.disabled = true; progress(kind, 0); status(stat, text('請選擇一個 PDF 檔案。', 'Choose one PDF file.')); });
    }

    function extractPdfLines(page) { return page.getTextContent().then(function (content) { var items = (content.items || []).map(function (item) { var transform = item.transform || [1, 0, 0, 1, 0, 0]; return { text: item.str || '', x: transform[4] || 0, y: transform[5] || 0 }; }).filter(function (item) { return item.text; }).sort(function (a, b) { return Math.abs(a.y - b.y) > 3 ? b.y - a.y : a.x - b.x; }); var lines = []; items.forEach(function (item) { var current = lines[lines.length - 1]; if (!current || Math.abs(current.y - item.y) > 3) lines.push({ y: item.y, text: item.text }); else current.text += ' ' + item.text; }); return lines.map(function (line) { return line.text.trim(); }).join('\n'); }); }

    function initPdfToText(kind) {
        var file = null, pdf = null, outputText = '', list = t(kind, 'list'), run = t(kind, 'run'), copy = t(kind, 'copy'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        function add(incoming) { file = incoming.filter(isPdf)[0] || null; outputText = ''; run.disabled = true; download.disabled = true; if (copy) copy.disabled = true; if (!file) return status(stat, text('請選擇 PDF 檔案。', 'Choose a PDF file.'), 'error'); renderFiles(list, [file], { icon: 'fa-solid fa-file-pdf', remove: false }); C.readArrayBuffer(file).then(function (buffer) { return window.pdfjsLib.getDocument({ data: buffer }).promise; }).then(function (doc) { pdf = doc; status(stat, text('已讀取 ' + doc.numPages + ' 頁，準備提取文字。', doc.numPages + ' pages ready. Ready to extract text.'), 'success'); run.disabled = false; }).catch(function () { status(stat, text('無法讀取此 PDF。', 'This PDF could not be read.'), 'error'); }); }
        function execute() { if (!pdf) return status(stat, text('請先選擇可讀取的 PDF。', 'Choose a readable PDF first.'), 'error'); if (!requireLib(kind, ['pdfjsLib'])) return; run.disabled = true; download.disabled = true; if (copy) copy.disabled = true; outputText = ''; progress(kind, 5); var chain = Promise.resolve(); for (var index = 1; index <= pdf.numPages; index += 1) { (function (pageNumber) { chain = chain.then(function () { return pdf.getPage(pageNumber); }).then(extractPdfLines).then(function (pageText) { outputText += (outputText ? '\n\n' : '') + '--- Page ' + pageNumber + ' ---\n' + pageText; progress(kind, 5 + (pageNumber / pdf.numPages) * 85); }); }(index)); } chain.then(function () { t(kind, 'output-text').textContent = outputText.trim(); status(stat, text(pdf.numPages + ' 頁文字已提取，可以複製或下載 TXT。', pdf.numPages + ' pages of text were extracted. Copy or download the TXT.'), 'success'); download.disabled = false; if (copy) copy.disabled = false; run.disabled = false; }).catch(function (error) { progress(kind, 0); status(stat, text('文字提取失敗：' + (error.message || '格式不受支援。'), 'Text extraction failed: ' + (error.message || 'the format may not be supported.')), 'error'); run.disabled = false; }); }
        bind(kind, add); run.addEventListener('click', execute); if (copy) copy.addEventListener('click', function () { copyOutput(kind); }); download.addEventListener('click', function () { if (outputText) downloadText(kind, outputText, safeBase(file.name) + '.txt'); }); clear.addEventListener('click', function () { file = null; pdf = null; outputText = ''; list.innerHTML = ''; t(kind, 'output-text').textContent = text('等待輸出檔案。', 'Waiting for an output file.'); run.disabled = true; download.disabled = true; if (copy) copy.disabled = true; progress(kind, 0); status(stat, text('請選擇一個 PDF 檔案。', 'Choose one PDF file.')); });
    }

    function spreadsheetMarkdown(rows) { var data = rows || []; if (!data.length) return ''; var width = data.reduce(function (max, row) { return Math.max(max, row.length); }, 1); function cell(value) { return String(value == null ? '' : value).replace(/[|\r\n]+/g, ' ').trim(); } var header = data[0] || []; var lines = ['| ' + Array.from({ length: width }, function (_, i) { return cell(header[i]); }).join(' | ') + ' |', '| ' + Array.from({ length: width }, function () { return '---'; }).join(' | ') + ' |']; data.slice(1).forEach(function (row) { lines.push('| ' + Array.from({ length: width }, function (_, i) { return cell(row[i]); }).join(' | ') + ' |'); }); return lines.join('\n'); }
    function spreadsheetHtml(rows) { var data = rows || []; if (!data.length) return '<table>\n  <thead><tr><th></th></tr></thead>\n  <tbody></tbody>\n</table>'; var width = data.reduce(function (max, row) { return Math.max(max, row.length); }, 1); function cell(value) { return escape(value == null ? '' : value); } var header = data[0] || []; var lines = ['<table>', '  <thead>', '    <tr>' + Array.from({ length: width }, function (_, i) { return '<th>' + cell(header[i]) + '</th>'; }).join('') + '</tr>', '  </thead>', '  <tbody>']; data.slice(1).forEach(function (row) { lines.push('    <tr>' + Array.from({ length: width }, function (_, i) { return '<td>' + cell(row[i]) + '</td>'; }).join('') + '</tr>'); }); lines.push('  </tbody>', '</table>'); return lines.join('\n'); }

    function initExcelToMarkdown(kind) {
        var file = null, rows = [], outputText = '', list = t(kind, 'list'), preview = t(kind, 'preview'), run = t(kind, 'run'), copy = t(kind, 'copy'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        function add(incoming) { file = incoming.filter(isSheet)[0] || null; rows = []; outputText = ''; run.disabled = true; download.disabled = true; copy.disabled = true; if (!file) return status(stat, text('請選擇 XLSX、XLS 或 CSV。', 'Choose an XLSX, XLS or CSV file.'), 'error'); renderFiles(list, [file], { icon: 'fa-solid fa-file-excel', remove: false }); readWorkbook(file).then(function (book) { rows = rowsFromSheet(book); renderRows(preview, rows, file.name); run.disabled = false; status(stat, text('已讀取第一張工作表，準備轉成 Markdown。', 'The first worksheet is ready to convert to Markdown.'), 'success'); }).catch(function () { status(stat, text('無法解析此試算表。', 'This spreadsheet could not be parsed.'), 'error'); }); }
        function execute() { if (!rows.length) return status(stat, text('請先選擇可讀取的試算表。', 'Choose a readable spreadsheet first.'), 'error'); if (!requireLib(kind, ['XLSX'])) return; outputText = spreadsheetMarkdown(rows); t(kind, 'output-text').textContent = outputText; progress(kind, 100); status(stat, text('Markdown 表格已產生，可以複製或下載。', 'The Markdown table is ready to copy or download.'), 'success'); download.disabled = false; copy.disabled = false; }
        bind(kind, add); run.addEventListener('click', execute); copy.addEventListener('click', function () { copyOutput(kind); }); download.addEventListener('click', function () { if (outputText) downloadText(kind, outputText, safeBase(file.name) + '.md'); }); clear.addEventListener('click', function () { file = null; rows = []; outputText = ''; list.innerHTML = ''; preview.innerHTML = ''; t(kind, 'output-text').textContent = text('等待輸出檔案。', 'Waiting for an output file.'); run.disabled = true; copy.disabled = true; download.disabled = true; progress(kind, 0); });
    }

    function initExcelToHtml(kind) {
        var file = null, rows = [], outputText = '', list = t(kind, 'list'), preview = t(kind, 'preview'), visual = t(kind, 'visual'), run = t(kind, 'run'), copy = t(kind, 'copy'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        function add(incoming) { file = incoming.filter(isSheet)[0] || null; rows = []; outputText = ''; run.disabled = true; download.disabled = true; copy.disabled = true; if (!file) return status(stat, text('請選擇 XLSX、XLS 或 CSV。', 'Choose an XLSX, XLS or CSV file.'), 'error'); renderFiles(list, [file], { icon: 'fa-solid fa-file-excel', remove: false }); readWorkbook(file).then(function (book) { rows = rowsFromSheet(book); renderRows(preview, rows, file.name); run.disabled = false; status(stat, text('已讀取第一張工作表，準備轉成 HTML。', 'The first worksheet is ready to convert to HTML.'), 'success'); }).catch(function () { status(stat, text('無法解析此試算表。', 'This spreadsheet could not be parsed.'), 'error'); }); }
        function execute() { if (!rows.length) return status(stat, text('請先選擇可讀取的試算表。', 'Choose a readable spreadsheet first.'), 'error'); if (!requireLib(kind, ['XLSX'])) return; outputText = spreadsheetHtml(rows); t(kind, 'output-text').textContent = outputText; visual.innerHTML = outputText; progress(kind, 100); status(stat, text('HTML 表格已產生，可以查看預覽、複製或下載。', 'The HTML table is ready with a visual preview.'), 'success'); download.disabled = false; copy.disabled = false; }
        bind(kind, add); run.addEventListener('click', execute); copy.addEventListener('click', function () { copyOutput(kind); }); download.addEventListener('click', function () { if (outputText) downloadText(kind, '<!doctype html>\n' + outputText, safeBase(file.name) + '.html'); }); clear.addEventListener('click', function () { file = null; rows = []; outputText = ''; list.innerHTML = ''; preview.innerHTML = ''; visual.innerHTML = text('HTML 表格視覺預覽會顯示在這裡。', 'The visual HTML table preview will appear here.'); t(kind, 'output-text').textContent = text('等待輸出檔案。', 'Waiting for an output file.'); run.disabled = true; copy.disabled = true; download.disabled = true; progress(kind, 0); });
    }

    function docxHtmlToMarkdown(source) { var body = new DOMParser().parseFromString(source, 'text/html').body; function walk(node) { var result = ''; Array.from(node.childNodes || []).forEach(function (child) { if (child.nodeType === 3) return result += child.nodeValue.replace(/\s+/g, ' '); if (child.nodeType !== 1) return; var tag = child.tagName.toLowerCase(), content = walk(child).trim(); if (/^h[1-6]$/.test(tag)) result += '\n\n' + '#'.repeat(Number(tag[1])) + ' ' + content + '\n\n'; else if (tag === 'p' || tag === 'div') result += '\n\n' + content + '\n\n'; else if (tag === 'strong' || tag === 'b') result += '**' + content + '**'; else if (tag === 'em' || tag === 'i') result += '*' + content + '*'; else if (tag === 'a') result += '[' + content + '](' + (child.getAttribute('href') || '') + ')'; else if (tag === 'br') result += '\n'; else if (tag === 'li') result += '- ' + content + '\n'; else if (tag === 'ul' || tag === 'ol') result += '\n' + content + '\n'; else result += content; }); return result; } return walk(body).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'; }

    function initWordToMarkdown(kind) {
        var file = null, outputText = '', list = t(kind, 'list'), format = t(kind, 'format'), run = t(kind, 'run'), copy = t(kind, 'copy'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        function add(incoming) { file = incoming.filter(function (item) { return /\.docx$/i.test(item.name) || item.type.indexOf('word') >= 0; })[0] || null; run.disabled = true; download.disabled = true; copy.disabled = true; if (!file) return status(stat, text('請選擇 DOCX 檔案。', 'Choose a DOCX file.'), 'error'); renderFiles(list, [file], { icon: 'fa-solid fa-file-word', remove: false }); run.disabled = false; status(stat, text('DOCX 已就緒，選擇格式後即可轉換。', 'DOCX is ready. Choose a format and convert.'), 'success'); }
        function execute() { if (!file) return status(stat, text('請先選擇 DOCX 檔案。', 'Choose a DOCX file first.'), 'error'); if (!requireLib(kind, ['mammoth'])) return; run.disabled = true; download.disabled = true; copy.disabled = true; progress(kind, 10); C.readArrayBuffer(file).then(function (buffer) { return mammoth.convertToHtml({ arrayBuffer: buffer }); }).then(function (result) { var markdown = docxHtmlToMarkdown(result.value); outputText = format.value === 'txt' ? new DOMParser().parseFromString(result.value, 'text/html').body.textContent.replace(/\s+/g, ' ').trim() + '\n' : markdown; t(kind, 'output-text').textContent = outputText; progress(kind, 100); status(stat, text('DOCX 已轉成 ' + (format.value === 'txt' ? 'TXT' : 'Markdown') + '，可以複製或下載。', 'DOCX was converted to ' + (format.value === 'txt' ? 'TXT' : 'Markdown') + '. Copy or download the result.'), 'success'); download.disabled = false; copy.disabled = false; run.disabled = false; }).catch(function (error) { progress(kind, 0); status(stat, text('Word 轉換失敗：' + (error.message || '格式不受支援。'), 'Word conversion failed: ' + (error.message || 'the format may not be supported.')), 'error'); run.disabled = false; }); }
        bind(kind, add); run.addEventListener('click', execute); copy.addEventListener('click', function () { copyOutput(kind); }); download.addEventListener('click', function () { if (outputText) downloadText(kind, outputText, safeBase(file.name) + (format.value === 'txt' ? '.txt' : '.md')); }); clear.addEventListener('click', function () { file = null; outputText = ''; list.innerHTML = ''; t(kind, 'output-text').textContent = text('等待輸出檔案。', 'Waiting for an output file.'); run.disabled = true; copy.disabled = true; download.disabled = true; progress(kind, 0); });
    }

    function sanitizeHtmlSource(source) { var body = new DOMParser().parseFromString(source, 'text/html').body; Array.from(body.querySelectorAll('script, iframe, object, embed, link, meta')).forEach(function (node) { node.remove(); }); return body.innerHTML.trim(); }

    function initHtmlToDocx(kind) {
        var file = null, outputBlob = null, list = t(kind, 'list'), source = t(kind, 'source'), run = t(kind, 'run'), download = t(kind, 'download'), clear = t(kind, 'clear'), stat = t(kind, 'status');
        function add(incoming) { file = incoming.filter(function (item) { return /\.html?$/i.test(item.name) || item.type === 'text/html'; })[0] || null; if (!file) return status(stat, text('請選擇 HTML 檔案，或直接貼上內容。', 'Choose an HTML file or paste content directly.'), 'error'); renderFiles(list, [file], { icon: 'fa-solid fa-code', remove: false }); C.readText(file).then(function (value) { source.value = value; run.disabled = false; status(stat, text('HTML 已載入，可以檢查內容後輸出 DOCX。', 'HTML loaded. Review it and export DOCX.'), 'success'); }).catch(function () { status(stat, text('無法讀取 HTML 檔案。', 'This HTML file could not be read.'), 'error'); }); }
        function execute() { var htmlSource = sanitizeHtmlSource(source.value); if (!htmlSource) return status(stat, text('請先輸入或載入 HTML。', 'Enter or load HTML first.'), 'error'); if (!requireLib(kind, ['htmlDocx'])) return; run.disabled = true; download.disabled = true; progress(kind, 35); try { outputBlob = window.htmlDocx.asBlob('<!doctype html><html><head><meta charset="utf-8"></head><body>' + htmlSource + '</body></html>'); progress(kind, 100); status(stat, text('HTML 已封裝成 DOCX，可以下載。', 'HTML was packaged as DOCX and is ready to download.'), 'success'); download.disabled = false; run.disabled = false; } catch (error) { progress(kind, 0); status(stat, text('HTML 轉 DOCX 失敗：' + (error.message || '格式不受支援。'), 'HTML to DOCX failed: ' + (error.message || 'the format may not be supported.')), 'error'); run.disabled = false; } }
        bind(kind, add); source.addEventListener('input', function () { run.disabled = !source.value.trim(); }); run.addEventListener('click', execute); download.addEventListener('click', function () { if (outputBlob) C.downloadBlob(outputBlob, safeBase(file ? file.name : 'html-document') + '.docx'); }); clear.addEventListener('click', function () { file = null; outputBlob = null; list.innerHTML = ''; source.value = ''; run.disabled = true; download.disabled = true; progress(kind, 0); });
    }

    function init(kind) {
        if (kind === 'pdf-merge') return initPdfMerge(kind);
        if (kind === 'pdf-rotate') return initPdfRotate(kind);
        if (kind === 'pdf-watermark') return initPdfWatermark(kind);
        if (kind === 'pdf-pagenumber') return initPdfPageNumber(kind);
        if (kind === 'excel-merge') return initExcelMerge(kind);
        if (kind === 'excel-split') return initExcelSplit(kind);
        if (kind === 'pdf-to-images') return initPdfToImages(kind);
        if (kind === 'pdf-to-text') return initPdfToText(kind);
        if (kind === 'excel-to-markdown') return initExcelToMarkdown(kind);
        if (kind === 'excel-to-html') return initExcelToHtml(kind);
        if (kind === 'word-to-markdown') return initWordToMarkdown(kind);
        if (kind === 'html-to-docx') return initHtmlToDocx(kind);
    }
    window.ConverterDocumentTools = { init: init };
}());
