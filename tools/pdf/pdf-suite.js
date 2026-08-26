(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var qs = function (selector, root) { return (root || document).querySelector(selector); };
  var qsa = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  var state = {
    file: null,
    pdf: null,
    pageOrder: [],
    currentPage: 1,
    pageRotations: {},
    selectedPages: new Set(),
    pageTexts: {},
    textReady: false,
    zoom: 0.92,
    fitMode: 'fit-width',
    tool: 'select',
    annotations: {},
    annotationImages: {},
    signatures: {},
    activeSignatureId: null,
    signatureImage: '',
    renderedWidth: 0,
    renderedHeight: 0,
    imageFiles: [],
    mergeFiles: [],
    busy: false,
    outline: []
  };

  var PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  var PDF_SCRIPT = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var messages = {
    empty: '請先拖入或選擇 PDF。',
    loading: '正在本機讀取 PDF…',
    ready: 'PDF 已載入，所有檔案均留在此瀏覽器。',
    noText: '此 PDF 沒有可讀取的文字層；掃描件請另行使用 OCR。',
    choosePdf: '請選擇 PDF 檔案。',
    localNote: '本機處理完成。'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  function formatBytes(value) {
    var size = Number(value) || 0;
    if (!size) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var index = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
    return (size / Math.pow(1024, index)).toFixed(index ? 1 : 0) + ' ' + units[index];
  }

  function safeName(value) {
    return String(value || 'document').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'document';
  }

  function setStatus(value, kind) {
    var node = $('pdf-status');
    if (!node) return;
    node.textContent = value || '';
    node.className = 'pdf-status ' + (kind || '');
  }

  function setProgress(value) {
    var bar = $('pdf-progress-bar');
    if (bar) bar.style.width = Math.max(0, Math.min(100, Number(value) || 0)) + '%';
  }

  function toast(value) {
    var node = $('pdf-toast');
    if (!node) return;
    node.textContent = value;
    node.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { node.classList.remove('is-visible'); }, 2600);
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function readBuffer(file) { return file.arrayBuffer(); }

  function ensurePdfJs() {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
      return Promise.resolve(window.pdfjsLib);
    }
    if (window.__gugoproPdfJsPromise__) return window.__gugoproPdfJsPromise__;
    window.__gugoproPdfJsPromise__ = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = PDF_SCRIPT;
      script.onload = function () {
        if (!window.pdfjsLib) return reject(new Error('pdf.js 載入後不可用'));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
        resolve(window.pdfjsLib);
      };
      script.onerror = function () { reject(new Error('PDF.js 載入失敗，請確認網路連線。')); };
      document.head.appendChild(script);
    });
    return window.__gugoproPdfJsPromise__;
  }

  function requirePdfLib() {
    if (!window.PDFLib) throw new Error('pdf-lib 尚未載入。');
    return window.PDFLib;
  }

  function isPdf(file) {
    return file && (/\.pdf$/i.test(file.name) || file.type === 'application/pdf');
  }

  function setEmptyState(isEmpty) {
    var empty = $('pdf-empty-state');
    var frame = $('pdf-page-frame');
    if (empty) { empty.hidden = !isEmpty; empty.style.display = isEmpty ? 'grid' : 'none'; }
    if (frame) { frame.hidden = isEmpty; frame.style.display = isEmpty ? 'none' : 'inline-block'; }
  }

  function makeCanvas(width, height, className) {
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width));
    canvas.height = Math.max(1, Math.ceil(height));
    if (className) canvas.className = className;
    return canvas;
  }

  function getRotation(pageNumber) { return Number(state.pageRotations[pageNumber] || 0); }

  function getPageDisplayRotation(pageNumber) {
    return ((getRotation(pageNumber) % 360) + 360) % 360;
  }

  function getPageScale(page) {
    if (state.fitMode === 'fit-height') {
      return Math.max(.25, Math.min(2.25, ($('pdf-reader-stage').clientHeight - 54) / page.getViewport({ scale: 1, rotation: getPageDisplayRotation(state.currentPage) }).height));
    }
    if (state.fitMode === 'fit-page') {
      var stage = $('pdf-reader-stage');
      var base = page.getViewport({ scale: 1, rotation: getPageDisplayRotation(state.currentPage) });
      return Math.max(.25, Math.min(2.25, Math.min((stage.clientWidth - 48) / base.width, (stage.clientHeight - 48) / base.height)));
    }
    return state.zoom;
  }

  function clearReaderFrame() {
    var frame = $('pdf-page-frame');
    if (!frame) return;
    frame.replaceChildren();
    var signatureLayer = document.createElement('div');
    signatureLayer.id = 'pdf-signature-layer';
    frame.appendChild(signatureLayer);
  }

  function drawPath(context, item, width, height) {
    var points = item.points || [];
    if (points.length < 2) return;
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = item.color || '#ff9e6b';
    context.lineWidth = Math.max(2, (Number(item.width) || 4) * Math.max(width, height) / 1000);
    if (item.type === 'highlight') {
      context.globalAlpha = .28;
      context.lineWidth *= 3.5;
      context.strokeStyle = item.color || '#ffd166';
    } else if (item.type === 'underline') {
      context.lineWidth = Math.max(2, context.lineWidth * .65);
      context.globalAlpha = .9;
    } else if (item.type === 'strike') {
      context.lineWidth = Math.max(2, context.lineWidth * .6);
      context.globalAlpha = .9;
    }
    context.beginPath();
    points.forEach(function (point, index) {
      var x = point.x * width;
      var y = point.y * height;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.stroke();
    if (item.type === 'underline' || item.type === 'strike') {
      var first = points[0]; var last = points[points.length - 1];
      var extraY = item.type === 'underline' ? .025 : -.01;
      context.globalAlpha = .82;
      context.beginPath();
      context.moveTo(first.x * width, first.y * height + extraY * height);
      context.lineTo(last.x * width, last.y * height + extraY * height);
      context.stroke();
    }
    context.restore();
  }

  function renderAnnotationLayer(canvas, pageNumber) {
    var items = state.annotations[pageNumber] || [];
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    items.forEach(function (item) { drawPath(context, item, canvas.width, canvas.height); });
    state.annotationImages[pageNumber] = canvas.toDataURL('image/png');
  }

  function addSignatureOverlay(signature, pageNumber) {
    var layer = $('pdf-signature-layer');
    if (!layer) return;
    var stamp = document.createElement('div');
    stamp.className = 'pdf-signature-stamp' + (signature.id === state.activeSignatureId ? ' is-active' : '');
    stamp.dataset.signatureId = signature.id;
    stamp.style.left = (signature.x * 100) + '%';
    stamp.style.top = (signature.y * 100) + '%';
    stamp.style.width = (signature.w * 100) + '%';
    stamp.style.height = (signature.h * 100) + '%';
    stamp.style.transform = 'rotate(' + Number(signature.rotation || 0) + 'deg)';
    if (signature.dataUrl) {
      var image = document.createElement('img');
      image.src = signature.dataUrl;
      image.alt = 'Signature';
      stamp.appendChild(image);
    } else {
      stamp.textContent = 'SIGN';
    }
    var handle = document.createElement('span');
    handle.className = 'pdf-stamp-handle';
    handle.setAttribute('aria-label', 'Resize signature');
    stamp.appendChild(handle);
    layer.appendChild(stamp);

    stamp.addEventListener('pointerdown', function (event) {
      if (event.target === handle) return;
      event.preventDefault();
      state.activeSignatureId = signature.id;
      var frame = $('pdf-page-frame');
      var rect = frame.getBoundingClientRect();
      var startX = event.clientX; var startY = event.clientY;
      var initialX = signature.x; var initialY = signature.y;
      function move(moveEvent) {
        signature.x = Math.max(0, Math.min(1 - signature.w, initialX + (moveEvent.clientX - startX) / rect.width));
        signature.y = Math.max(0, Math.min(1 - signature.h, initialY + (moveEvent.clientY - startY) / rect.height));
        stamp.style.left = (signature.x * 100) + '%';
        stamp.style.top = (signature.y * 100) + '%';
      }
      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        renderMainPage();
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });

    handle.addEventListener('pointerdown', function (event) {
      event.preventDefault(); event.stopPropagation();
      var frame = $('pdf-page-frame'); var rect = frame.getBoundingClientRect();
      var startX = event.clientX; var startY = event.clientY;
      var initialW = signature.w; var initialH = signature.h;
      function move(moveEvent) {
        signature.w = Math.max(.08, Math.min(.8, initialW + (moveEvent.clientX - startX) / rect.width));
        signature.h = Math.max(.04, Math.min(.45, initialH + (moveEvent.clientY - startY) / rect.height));
        stamp.style.width = (signature.w * 100) + '%';
        stamp.style.height = (signature.h * 100) + '%';
      }
      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        renderMainPage();
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });

    stamp.addEventListener('dblclick', function (event) {
      event.preventDefault();
      signature.rotation = (Number(signature.rotation || 0) + 15) % 360;
      renderMainPage();
      toast('簽名已旋轉 15°');
    });
  }

  async function renderMainPage() {
    if (!state.pdf) return;
    var page = await state.pdf.getPage(state.currentPage);
    var rotation = getPageDisplayRotation(state.currentPage);
    var scale = getPageScale(page);
    var viewport = page.getViewport({ scale: scale, rotation: rotation });
    var frame = $('pdf-page-frame');
    if (!frame) return;
    frame.hidden = false;
    frame.classList.toggle('tool-select', state.tool === 'select');
    frame.style.width = Math.ceil(viewport.width) + 'px';
    frame.style.height = Math.ceil(viewport.height) + 'px';
    frame.style.transform = 'none';
    frame.replaceChildren();
    var canvas = makeCanvas(viewport.width, viewport.height, 'pdf-page-canvas');
    frame.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
    var overlay = makeCanvas(viewport.width, viewport.height, 'pdf-annotation-canvas');
    overlay.setAttribute('aria-label', 'PDF annotation canvas');
    frame.appendChild(overlay);
    state.renderedWidth = viewport.width;
    state.renderedHeight = viewport.height;
    renderAnnotationLayer(overlay, state.currentPage);
    var rotations = qsa('[data-page-rotation]');
    rotations.forEach(function (node) { node.textContent = getPageDisplayRotation(state.currentPage) + '°'; });
    var pageCurrent = $('pdf-current-page');
    if (pageCurrent) pageCurrent.value = String(state.currentPage);
    var pageTotal = $('pdf-total-pages');
    if (pageTotal) pageTotal.textContent = String(state.pageOrder.length || state.pdf.numPages);
    var zoomLabel = $('pdf-zoom-label');
    if (zoomLabel) zoomLabel.textContent = Math.round(scale * 100) + '%';
    bindAnnotationCanvas(overlay, state.currentPage);
    (state.signatures[state.currentPage] || []).forEach(function (signature) { addSignatureOverlay(signature, state.currentPage); });
    qsa('.pdf-thumb').forEach(function (thumb) {
      thumb.classList.toggle('is-current', Number(thumb.dataset.page) === state.currentPage);
    });
  }

  function bindAnnotationCanvas(canvas, pageNumber) {
    var start = null;
    var context = canvas.getContext('2d');
    canvas.style.pointerEvents = state.tool === 'select' ? 'none' : 'auto';
    canvas.style.cursor = state.tool === 'select' ? 'default' : 'crosshair';
    canvas.onpointerdown = function (event) {
      if (state.tool === 'select') return;
      event.preventDefault();
      var rect = canvas.getBoundingClientRect();
      start = { points: [{ x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }], color: $('annotation-color') ? $('annotation-color').value : '#ff9e6b', type: state.tool, width: Number(($('annotation-width') || {}).value) || 5 };
      canvas.setPointerCapture(event.pointerId);
    };
    canvas.onpointermove = function (event) {
      if (!start) return;
      var rect = canvas.getBoundingClientRect();
      start.points.push({ x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) });
      context.clearRect(0, 0, canvas.width, canvas.height);
      (state.annotations[pageNumber] || []).forEach(function (item) { drawPath(context, item, canvas.width, canvas.height); });
      drawPath(context, start, canvas.width, canvas.height);
    };
    canvas.onpointerup = function () {
      if (!start) return;
      if (start.points.length > 1) {
        if (!state.annotations[pageNumber]) state.annotations[pageNumber] = [];
        state.annotations[pageNumber].push(start);
        renderAnnotationLayer(canvas, pageNumber);
        renderNotesPanel();
        toast('標註已加入本頁');
      }
      start = null;
    };
  }

  async function renderThumbnails() {
    var container = $('pdf-thumbnails');
    if (!container || !state.pdf) return;
    container.replaceChildren();
    var emptyState = $('pdf-thumb-empty');
    if (emptyState) emptyState.hidden = true;
    var status = $('pdf-thumb-status');
    if (status) status.textContent = state.pageOrder.length + ' 頁';
    for (var index = 0; index < state.pageOrder.length; index += 1) {
      var pageNumber = state.pageOrder[index];
      var page = await state.pdf.getPage(pageNumber);
      var baseViewport = page.getViewport({ scale: 1, rotation: getPageDisplayRotation(pageNumber) });
      var scale = Math.min(0.22, 116 / baseViewport.width);
      var viewport = page.getViewport({ scale: scale, rotation: getPageDisplayRotation(pageNumber) });
      var thumb = document.createElement('div');
      thumb.className = 'pdf-thumb' + (pageNumber === state.currentPage ? ' is-current' : '') + (state.selectedPages.has(pageNumber) ? ' is-selected' : '');
      thumb.dataset.page = String(pageNumber);
      thumb.draggable = true;
      var canvas = makeCanvas(viewport.width, viewport.height, 'pdf-thumb-canvas');
      thumb.appendChild(canvas);
      var footer = document.createElement('div'); footer.className = 'pdf-thumb-footer';
      var label = document.createElement('span'); label.className = 'pdf-thumb-page'; label.textContent = 'P.' + pageNumber;
      var check = document.createElement('input'); check.type = 'checkbox'; check.className = 'pdf-thumb-check'; check.checked = state.selectedPages.has(pageNumber); check.setAttribute('aria-label', '選取第 ' + pageNumber + ' 頁');
      footer.appendChild(label); footer.appendChild(check); thumb.appendChild(footer);
      if (getPageDisplayRotation(pageNumber)) {
        var rotated = document.createElement('span'); rotated.className = 'pdf-thumb-overlay'; rotated.textContent = getPageDisplayRotation(pageNumber) + '°'; thumb.appendChild(rotated);
      }
      canvas.getContext('2d');
      page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport });
      thumb.addEventListener('click', function (event) {
        if (event.target && event.target.classList && event.target.classList.contains('pdf-thumb-check')) return;
        state.currentPage = Number(this.dataset.page);
        renderMainPage();
        renderThumbnails();
      });
      check.addEventListener('change', function (event) {
        var number = Number(this.closest('.pdf-thumb').dataset.page);
        if (event.target.checked) state.selectedPages.add(number); else state.selectedPages.delete(number);
        this.closest('.pdf-thumb').classList.toggle('is-selected', event.target.checked);
        updateSelectionStatus();
      });
      thumb.addEventListener('dragstart', function (event) { event.dataTransfer.setData('text/plain', this.dataset.page); this.classList.add('is-dragging'); });
      thumb.addEventListener('dragend', function () { this.classList.remove('is-dragging'); });
      thumb.addEventListener('dragover', function (event) { event.preventDefault(); this.classList.add('is-drop-target'); });
      thumb.addEventListener('dragleave', function () { this.classList.remove('is-drop-target'); });
      thumb.addEventListener('drop', function (event) {
        event.preventDefault(); this.classList.remove('is-drop-target');
        var fromPage = Number(event.dataTransfer.getData('text/plain')); var toPage = Number(this.dataset.page);
        var fromIndex = state.pageOrder.indexOf(fromPage); var toIndex = state.pageOrder.indexOf(toPage);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
        state.pageOrder.splice(fromIndex, 1); state.pageOrder.splice(toIndex, 0, fromPage);
        renderThumbnails(); toast('頁面順序已更新');
      });
      container.appendChild(thumb);
    }
  }

  function updateSelectionStatus() {
    var node = $('pdf-selection-status');
    if (node) node.textContent = state.selectedPages.size ? '已選取 ' + state.selectedPages.size + ' 頁' : '可勾選多頁操作';
  }

  function renderNotesPanel() {
    var list = $('pdf-notes-list');
    if (!list) return;
    list.replaceChildren();
    var entries = [];
    Object.keys(state.annotations).forEach(function (page) {
      (state.annotations[page] || []).forEach(function (item, index) { entries.push({ page: Number(page), item: item, index: index }); });
    });
    if (!entries.length) {
      list.innerHTML = '<div class="pdf-sidebar-empty"><i class="fa-regular fa-note-sticky"></i><span>標註會依頁碼出現在這裡。</span></div>';
      return;
    }
    entries.forEach(function (entry) {
      var node = document.createElement('div'); node.className = 'pdf-note-item'; node.dataset.page = entry.page;
      var title = entry.item.type === 'highlight' ? '螢光筆' : entry.item.type === 'underline' ? '底線' : entry.item.type === 'strike' ? '刪除線' : '畫筆';
      node.innerHTML = '<strong>' + escapeHtml(title) + ' · 第 ' + entry.page + ' 頁</strong><span>點擊返回標註位置 · ' + escapeHtml(entry.item.color || '') + '</span>';
      node.addEventListener('click', function () { state.currentPage = entry.page; setSidebarTab('thumbs'); renderMainPage(); renderThumbnails(); });
      list.appendChild(node);
    });
  }

  async function renderOutline() {
    var list = $('pdf-outline-list');
    if (!list || !state.pdf) return;
    list.replaceChildren();
    var outline = [];
    try { outline = await state.pdf.getOutline() || []; } catch (_) { outline = []; }
    state.outline = outline;
    if (!outline.length) {
      list.innerHTML = '<div class="pdf-sidebar-empty"><i class="fa-regular fa-bookmark"></i><span>此 PDF 沒有內嵌目錄大綱。</span></div>';
      return;
    }
    async function addItems(items, depth) {
      for (var i = 0; i < items.length; i += 1) {
        var item = items[i];
        var button = document.createElement('button'); button.type = 'button'; button.className = 'pdf-outline-item depth-' + Math.min(depth, 2); button.textContent = item.title || '未命名章節';
        button.addEventListener('click', async function (target) {
          var page = await resolveOutlinePage(target);
          if (page) { state.currentPage = page; renderMainPage(); renderThumbnails(); }
        }.bind(null, item));
        list.appendChild(button);
        if (item.items && item.items.length) await addItems(item.items, depth + 1);
      }
    }
    await addItems(outline, 0);
  }

  async function resolveOutlinePage(item) {
    try {
      var dest = item.dest;
      if (typeof dest === 'string') dest = await state.pdf.getDestination(dest);
      if (!dest || !dest[0]) return null;
      var index = await state.pdf.getPageIndex(dest[0]);
      return index + 1;
    } catch (_) { return null; }
  }

  function setSidebarTab(name) {
    qsa('.pdf-sidebar-tab').forEach(function (tab) { tab.classList.toggle('is-active', tab.dataset.sidebar === name); });
    qsa('.pdf-sidebar-view').forEach(function (view) { view.hidden = view.dataset.sidebarView !== name; });
  }

  async function extractAllText(force) {
    if (!state.pdf) return '';
    if (state.textReady && !force) return Object.keys(state.pageTexts).map(function (page) { return '[第 ' + page + ' 頁]\n' + state.pageTexts[page]; }).join('\n\n');
    var all = [];
    setProgress(4);
    for (var index = 0; index < state.pageOrder.length; index += 1) {
      var pageNumber = state.pageOrder[index];
      var page = await state.pdf.getPage(pageNumber);
      var content = await page.getTextContent();
      var items = (content.items || []).map(function (item) { return { text: item.str || '', x: (item.transform || [1, 0, 0, 1, 0, 0])[4] || 0, y: (item.transform || [1, 0, 0, 1, 0, 0])[5] || 0 }; }).filter(function (item) { return item.text; }).sort(function (a, b) { return Math.abs(a.y - b.y) > 3 ? b.y - a.y : a.x - b.x; });
      var lines = [];
      items.forEach(function (item) { var current = lines[lines.length - 1]; if (!current || Math.abs(current.y - item.y) > 3) lines.push({ y: item.y, text: item.text }); else current.text += ' ' + item.text; });
      state.pageTexts[pageNumber] = lines.map(function (line) { return line.text.trim(); }).join('\n');
      all.push('[第 ' + pageNumber + ' 頁]\n' + state.pageTexts[pageNumber]);
      setProgress(4 + ((index + 1) / state.pageOrder.length) * 86);
    }
    state.textReady = true;
    setProgress(100);
    var total = all.join('\n\n');
    if (!total.replace(/\[第[^\]]+\頁\]/g, '').trim()) {
      setStatus(messages.noText, 'error');
    }
    return total;
  }

  async function loadPdf(file) {
    if (!isPdf(file)) { setStatus(messages.choosePdf, 'error'); return; }
    setStatus(messages.loading, 'loading'); setProgress(3); setEmptyState(false);
    state.file = file; state.pdf = null; state.pageTexts = {}; state.textReady = false; state.pageRotations = {}; state.selectedPages.clear(); state.annotations = {}; state.annotationImages = {}; state.signatures = {}; state.currentPage = 1;
    try {
      var pdfjs = await ensurePdfJs();
      var buffer = await readBuffer(file);
      state.pdf = await pdfjs.getDocument({ data: buffer }).promise;
      setEmptyState(false);
      state.pageOrder = Array.from({ length: state.pdf.numPages }, function (_, index) { return index + 1; });
      var thumbEmpty = $('pdf-thumb-empty');
      if (thumbEmpty) thumbEmpty.hidden = true;
      $('pdf-file-name').textContent = file.name;
      $('pdf-file-meta').textContent = state.pdf.numPages + ' 頁 · ' + formatBytes(file.size) + ' · 本機處理';
      $('pdf-reader-status').innerHTML = '<i class="fa-solid fa-circle-check"></i> 本機就緒';
      setStatus(messages.ready, 'success');
      updateSelectionStatus();
      await renderThumbnails();
      await renderOutline();
      await renderMainPage();
      renderNotesPanel();
      $('pdf-page-count-badge').textContent = state.pdf.numPages + ' 頁';
    } catch (error) {
      state.pdf = null; setEmptyState(true); setProgress(0); setStatus('PDF 讀取失敗：' + (error.message || '格式不受支援。'), 'error');
    }
  }

  function getSelectedOrCurrentPages() {
    return state.selectedPages.size ? Array.from(state.selectedPages) : [state.currentPage];
  }

  function rotatePages(angle) {
    if (!state.pdf) return toast(messages.choosePdf);
    var pages = getSelectedOrCurrentPages();
    pages.forEach(function (page) { state.pageRotations[page] = (getRotation(page) + angle + 360) % 360; });
    renderThumbnails(); renderMainPage(); toast('已旋轉 ' + pages.length + ' 頁 ' + angle + '°');
  }

  async function copyPagesToDocument(pageNumbers) {
    var PDFLib = requirePdfLib();
    var source = await PDFLib.PDFDocument.load(await readBuffer(state.file));
    var output = await PDFLib.PDFDocument.create();
    var indexes = pageNumbers.map(function (page) { return page - 1; });
    var pages = await output.copyPages(source, indexes);
    pages.forEach(function (page, index) {
      var pageNumber = pageNumbers[index];
      var existing = page.getRotation().angle || 0;
      var rotation = (existing + getRotation(pageNumber)) % 360;
      if (rotation) page.setRotation(PDFLib.degrees(rotation));
      output.addPage(page);
    });
    return { document: output, pageNumbers: pageNumbers };
  }

  function safePdfText(value) { return String(value || '').replace(/[^\x20-\x7E]/g, '?'); }
  function hexColor(value) {
    var raw = String(value || '#ff9e6b').replace('#', ''); if (raw.length === 3) raw = raw.split('').map(function (part) { return part + part; }).join('');
    var number = parseInt(raw, 16); if (!Number.isFinite(number)) number = 0xff9e6b;
    return requirePdfLib().rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255);
  }

  async function applyOverlays(outputInfo) {
    var PDFLib = requirePdfLib(); var document = outputInfo.document; var pages = document.getPages();
    var watermarkText = String(($('watermark-text') || {}).value || '').trim();
    if (watermarkText) {
      var font = await document.embedFont(PDFLib.StandardFonts.Helvetica);
      var size = Number(($('watermark-size') || {}).value) || 34;
      var opacity = Math.max(.04, Math.min(1, Number(($('watermark-opacity') || {}).value || 16) / 100));
      var angle = Number(($('watermark-angle') || {}).value) || 35;
      var repeat = Boolean(($('watermark-repeat') || {}).checked);
      var color = hexColor(($('watermark-color') || {}).value || '#ff9e6b');
      pages.forEach(function (page) {
        var width = page.getWidth(); var height = page.getHeight();
        var text = safePdfText(watermarkText); var textWidth = font.widthOfTextAtSize(text, size);
        if (repeat) {
          for (var y = -height; y < height * 1.5; y += size * 4.2) {
            for (var x = -width; x < width * 1.5; x += Math.max(120, textWidth * 1.8)) page.drawText(text, { x: x, y: y, size: size, font: font, color: color, opacity: opacity, rotate: PDFLib.degrees(angle) });
          }
        } else page.drawText(text, { x: Math.max(16, (width - textWidth) / 2), y: height / 2, size: size, font: font, color: color, opacity: opacity, rotate: PDFLib.degrees(angle) });
      });
    }
    for (var index = 0; index < outputInfo.pageNumbers.length; index += 1) {
      var pageNumber = outputInfo.pageNumbers[index]; var page = pages[index];
      var imageData = state.annotationImages[pageNumber];
      if (imageData && (state.annotations[pageNumber] || []).length) {
        try { var annotationImage = await document.embedPng(imageData); page.drawImage(annotationImage, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), opacity: 1 }); } catch (_) { /* keep PDF export usable */ }
      }
      var signatures = state.signatures[pageNumber] || [];
      for (var s = 0; s < signatures.length; s += 1) {
        var signature = signatures[s]; if (!signature.dataUrl) continue;
        try {
          var image = await document.embedPng(signature.dataUrl); var widthPx = page.getWidth() * signature.w; var heightPx = page.getHeight() * signature.h;
          page.drawImage(image, { x: page.getWidth() * signature.x, y: page.getHeight() * (1 - signature.y - signature.h), width: widthPx, height: heightPx, rotate: PDFLib.degrees(Number(signature.rotation || 0)) });
        } catch (_) { /* ignore one broken stamp */ }
      }
    }
    return document;
  }

  async function exportPdf(pageNumbers, name) {
    if (!state.pdf || !state.file) return toast(messages.choosePdf);
    if (state.busy) return; state.busy = true; setStatus('正在建立本機 PDF 輸出…', 'loading'); setProgress(12);
    try {
      var info = await copyPagesToDocument(pageNumbers);
      setProgress(56); await applyOverlays(info); setProgress(84);
      var bytes = await info.document.save(); setProgress(100); downloadBlob(new Blob([bytes], { type: 'application/pdf' }), name || (safeName(state.file.name) + '-edited.pdf')); setStatus(messages.localNote + ' 已產生 ' + pageNumbers.length + ' 頁。', 'success'); toast('PDF 已下載');
    } catch (error) { setStatus('PDF 輸出失敗：' + (error.message || '格式不受支援。'), 'error'); setProgress(0); }
    state.busy = false;
  }

  async function mergePdfs() {
    if (!state.mergeFiles.length) return setStatus('請先在「合併」區選擇至少一個 PDF。', 'error');
    if (state.busy) return; state.busy = true; setStatus('正在本機合併 PDF…', 'loading');
    try {
      var PDFLib = requirePdfLib(); var output = await PDFLib.PDFDocument.create();
      for (var i = 0; i < state.mergeFiles.length; i += 1) {
        var source = await PDFLib.PDFDocument.load(await readBuffer(state.mergeFiles[i]));
        var pages = await output.copyPages(source, source.getPageIndices()); pages.forEach(function (page) { output.addPage(page); }); setProgress(((i + 1) / state.mergeFiles.length) * 85);
      }
      var bytes = await output.save(); downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'gugopro-merged.pdf'); setProgress(100); setStatus('已合併 ' + state.mergeFiles.length + ' 個 PDF，可繼續下載或開啟新檔。', 'success');
    } catch (error) { setStatus('合併失敗：' + (error.message || '檔案格式不受支援。'), 'error'); setProgress(0); }
    state.busy = false;
  }

  function renderFileList(container, files, icon) {
    if (!container) return; container.replaceChildren();
    files.forEach(function (file, index) {
      var row = document.createElement('div'); row.className = 'pdf-note-item'; row.innerHTML = '<strong><i class="' + (icon || 'fa-solid fa-file') + '"></i> ' + escapeHtml(file.name) + '</strong><span>' + formatBytes(file.size) + ' · <button type="button" data-remove-index="' + index + '" class="pdf-mini-button">移除</button></span>';
      container.appendChild(row);
    });
    qsa('[data-remove-index]', container).forEach(function (button) { button.addEventListener('click', function () { var index = Number(button.dataset.removeIndex); files.splice(index, 1); renderFileList(container, files, icon); }); });
  }

  async function renderAllImages(format) {
    if (!state.pdf) return toast(messages.choosePdf);
    if (state.busy) return; state.busy = true; setStatus('正在將所有頁面轉成 ' + format.toUpperCase() + '…', 'loading'); setProgress(2);
    try {
      var JSZip = window.JSZip; if (!JSZip) throw new Error('JSZip 尚未載入。');
      var zip = new JSZip();
      for (var index = 0; index < state.pageOrder.length; index += 1) {
        var pageNumber = state.pageOrder[index]; var page = await state.pdf.getPage(pageNumber); var viewport = page.getViewport({ scale: 1.6, rotation: getPageDisplayRotation(pageNumber) }); var canvas = makeCanvas(viewport.width, viewport.height); await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
        var data = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', format === 'jpg' ? .9 : undefined); zip.file('page-' + String(pageNumber).padStart(3, '0') + '.' + format, data.split(',')[1], { base64: true }); setProgress(((index + 1) / state.pageOrder.length) * 82);
      }
      var blob = await zip.generateAsync({ type: 'blob' }); downloadBlob(blob, safeName(state.file.name) + '-images.zip'); setProgress(100); setStatus('已產生 ' + state.pageOrder.length + ' 張 ' + format.toUpperCase() + ' 圖片並打包 ZIP。', 'success');
    } catch (error) { setStatus('轉圖片失敗：' + (error.message || 'Canvas 匯出失敗。'), 'error'); setProgress(0); }
    state.busy = false;
  }

  async function imagesToPdf() {
    if (!state.imageFiles.length) return setStatus('請先加入圖片檔案。', 'error');
    if (state.busy) return; state.busy = true; setStatus('正在本機合成圖片 PDF…', 'loading'); setProgress(3);
    try {
      var PDFLib = requirePdfLib(); var output = await PDFLib.PDFDocument.create();
      for (var i = 0; i < state.imageFiles.length; i += 1) {
        var file = state.imageFiles[i]; var bytes = await readBuffer(file); var image = /jpe?g$/i.test(file.name) ? await output.embedJpg(bytes) : await output.embedPng(bytes); var maxW = 595; var maxH = 842; var scale = Math.min(maxW / image.width, maxH / image.height, 1); var page = output.addPage([maxW, maxH]); var width = image.width * scale; var height = image.height * scale; page.drawImage(image, { x: (maxW - width) / 2, y: (maxH - height) / 2, width: width, height: height }); setProgress(((i + 1) / state.imageFiles.length) * 85);
      }
      var result = await output.save(); downloadBlob(new Blob([result], { type: 'application/pdf' }), 'images-to-pdf.pdf'); setProgress(100); setStatus('已將 ' + state.imageFiles.length + ' 張圖片合成 PDF。', 'success');
    } catch (error) { setStatus('圖片轉 PDF 失敗：' + (error.message || '圖片格式不受支援。'), 'error'); setProgress(0); }
    state.busy = false;
  }

  function base64FromBytes(bytes) { var binary = ''; var chunk = 0x8000; for (var i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length))); return btoa(binary); }
  function bytesFromBase64(value) { var binary = atob(value); var bytes = new Uint8Array(binary.length); for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i); return bytes; }

  async function encryptCurrentPdf() {
    if (!state.pdf || !state.file) return toast(messages.choosePdf);
    var passphrase = String(($('lock-password') || {}).value || '');
    if (passphrase.length < 6) return setStatus('請輸入至少 6 個字元的加密密碼。', 'error');
    if (!window.crypto || !window.crypto.subtle) return setStatus('此瀏覽器不支援 Web Crypto。', 'error');
    setStatus('正在建立本機 AES-GCM 鎖定包…', 'loading');
    try {
      var selected = state.pageOrder; var info = await copyPagesToDocument(selected); await applyOverlays(info); var bytes = new Uint8Array(await info.document.save()); var salt = crypto.getRandomValues(new Uint8Array(16)); var iv = crypto.getRandomValues(new Uint8Array(12)); var material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']); var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']); var encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes); var packageData = { format: 'GugoPro PDF Lock v1', fileName: safeName(state.file.name) + '-locked.pdf', mime: 'application/pdf', salt: base64FromBytes(salt), iv: base64FromBytes(iv), ciphertext: base64FromBytes(new Uint8Array(encrypted)) }; downloadBlob(new Blob([JSON.stringify(packageData)], { type: 'application/json' }), safeName(state.file.name) + '.pdf.locked.json'); setStatus('已產生 AES-GCM 本機鎖定包；請妥善保存密碼與檔案。', 'success');
    } catch (error) { setStatus('加密失敗：' + (error.message || '未知錯誤。'), 'error'); }
  }

  function markdownToHtml(value) {
    var text = escapeHtml(value || '');
    text = text.replace(/^### (.*)$/gm, '<h4>$1</h4>').replace(/^## (.*)$/gm, '<h3>$1</h3>').replace(/^# (.*)$/gm, '<h3>$1</h3>');
    text = text.replace(/^[-*] (.*)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    return text.split(/\n\n+/).map(function (paragraph) { return /^<(h[34]|ul)/.test(paragraph.trim()) ? paragraph : '<p>' + paragraph.replace(/\n/g, '<br>') + '</p>'; }).join('');
  }

  function getAiText(data) {
    return String(data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text || '').trim();
  }

  var aiEngine = null;
  function initAi() {
    if (!window.GugoProUnifiedAI || !window.GugoProGlobalAIQuota) return;
    aiEngine = window.GugoProUnifiedAI.create({ storagePrefix: 'gugopro_ai_pdf_suite', disabledKey: 'gugopro_ai_pdf_suite_disabled_models_v1', preferenceKey: 'gugopro_ai_pdf_suite_model_preference_v1', elements: { modelOptions: 'model-options', modelSettingsStatus: 'model-settings-status', modelCurrentStatus: 'model-current-status', quotaStatus: 'global-ai-quota-status', quotaReset: 'global-ai-quota-reset', quotaLimit: 'global-ai-quota-limit', quotaUsed: 'global-ai-quota-used' }, quotaSource: 'quota.gugopro.com enabled PDF chat models' });
    aiEngine.init();
  }

  function openKeyModal() { $('pdf-key-modal').classList.add('is-open'); $('pdf-key-input').focus(); }
  function closeKeyModal() { $('pdf-key-modal').classList.remove('is-open'); }

  async function getAiContext() {
    if (!state.pdf) throw new Error('請先載入 PDF。');
    var text = await extractAllText(false);
    if (!text.replace(/\[第[^\]]+\頁\]/g, '').trim()) throw new Error('目前 PDF 沒有文字層，無法進行文字 AI 分析。');
    return text.slice(0, 90000);
  }

  async function requestAi(prompt, options) {
    options = options || {};
    var context = await getAiContext();
    if (!aiEngine || !aiEngine.getApiKey()) { openKeyModal(); throw new Error('NO_KEY'); }
    if (!aiEngine.getModels().length) await aiEngine.refresh({ silent: false });
    if (!aiEngine.getEnabledModels().length) throw new Error('目前沒有可用的免費文字模型，請打開模型設定檢查。');
    var payload = { contents: [{ role: 'user', parts: [{ text: prompt + '\n\n文件文字（每段含頁碼標記）：\n' + context }] }], systemInstruction: { parts: [{ text: '你是 GugoPro AI PDF 助手。只根據提供的文件文字回答；若證據不足，明確說明。回答使用繁體中文，引用來源時使用 [第 N 頁]。不要把法律審閱結果當作律師意見。' }] }, generationConfig: { temperature: options.temperature == null ? .35 : options.temperature, maxOutputTokens: options.maxOutputTokens || 4096 } };
    var response = await aiEngine.request(payload, function (data) { return getAiText(data); }, { onAttempt: function (model) { setStatus('AI 正在使用 ' + model + ' 分析…', 'loading'); }, onSwitch: function (busy, next, status) { setStatus('模型忙碌（' + status + '），切換到 ' + next + '…', 'loading'); } });
    return response.result;
  }

  function switchAiTab(name) {
    qsa('.pdf-ai-tab').forEach(function (tab) { tab.classList.toggle('is-active', tab.dataset.aiTab === name); });
    qsa('.pdf-ai-view').forEach(function (view) { view.hidden = view.dataset.aiView !== name; });
  }

  function appendChat(role, text) {
    var log = $('pdf-chat-log'); if (!log) return;
    var node = document.createElement('div'); node.className = 'pdf-chat-msg ' + role; node.innerHTML = '<strong>' + (role === 'user' ? 'You' : 'GugoPro AI') + '</strong>' + markdownToHtml(text); log.appendChild(node); log.scrollTop = log.scrollHeight;
  }

  async function handleChat() {
    var input = $('pdf-chat-input'); var question = String(input.value || '').trim(); if (!question) return;
    appendChat('user', question); input.value = ''; var button = $('pdf-chat-send'); button.disabled = true;
    try { var answer = await requestAi('使用文件內容回答這個問題：' + question + '\n請用 3–7 點條列，並在每一點後標出頁碼。'); appendChat('assistant', answer || 'AI 沒有回傳內容。'); } catch (error) { if (error.message !== 'NO_KEY') appendChat('assistant', '目前無法完成分析：' + error.message); } finally { button.disabled = false; }
  }

  async function handleSummary() {
    var output = $('pdf-summary-output'); output.innerHTML = '<div class="pdf-summary-card"><p>正在讀取文字層並整理摘要…</p></div>'; switchAiTab('summary');
    try {
      var answer = await requestAi('請生成 Executive Summary，固定輸出以下三段：## 核心結論、## 關鍵數據、## 重要待辦事項。每一段使用簡潔條列，所有可驗證敘述標出頁碼。', { maxOutputTokens: 3000 }); output.innerHTML = '<div class="pdf-summary-card">' + markdownToHtml(answer) + '</div>'; setStatus('摘要已完成。', 'success');
    } catch (error) { output.innerHTML = '<div class="pdf-summary-card"><p>' + escapeHtml(error.message === 'NO_KEY' ? '請先輸入 Gemini API key，再重新生成摘要。' : error.message) + '</p></div>'; }
  }

  async function handleRisk() {
    var output = $('pdf-risk-output'); output.innerHTML = '<div class="pdf-risk-card medium"><p>正在掃描租賃、勞動與商業合約條款…</p></div>'; switchAiTab('risk');
    try {
      var answer = await requestAi('請進行合約風險預警。逐項列出條款、風險等級（只使用 HIGH、MEDIUM、LOW）、原因與頁碼。特別檢查高額違約金、自動續約、單方變更、免責、競業、付款與終止條款。最後附上「非法律意見」提醒。', { maxOutputTokens: 3600 }); var html = markdownToHtml(answer).replace(/\bHIGH\b/g, '<span class="pdf-risk-label">🔴 HIGH</span>').replace(/\bMEDIUM\b/g, '<span class="pdf-risk-label">🟡 MEDIUM</span>').replace(/\bLOW\b/g, '<span class="pdf-risk-label">🟢 LOW</span>'); output.innerHTML = '<div class="pdf-risk-card medium">' + html + '</div>'; setStatus('合約掃描已完成。', 'success');
    } catch (error) { output.innerHTML = '<div class="pdf-risk-card high"><p>' + escapeHtml(error.message === 'NO_KEY' ? '請先輸入 Gemini API key，再開始合約審閱。' : error.message) + '</p></div>'; }
  }

  async function handleTranslate() {
    var input = $('pdf-translate-input'); var value = String(input.value || '').trim(); var language = $('pdf-translate-language').value; if (!value) return setStatus('請貼上段落，或先使用「擷取目前頁文字」。', 'error');
    var output = $('pdf-translate-output'); output.textContent = '正在翻譯…';
    try { var answer = await requestAi('請把下列段落翻譯為' + language + '。保留專有名詞、數字、條款編號與段落格式，只輸出翻譯結果。\n待翻譯段落：\n' + value, { maxOutputTokens: 2500 }); output.textContent = answer; setStatus('翻譯已完成。', 'success'); } catch (error) { output.textContent = error.message === 'NO_KEY' ? '請先輸入 Gemini API key。' : error.message; }
  }

  function populateCurrentPageText() {
    if (!state.pdf) return setStatus(messages.choosePdf, 'error');
    extractAllText(false).then(function () { $('pdf-translate-input').value = state.pageTexts[state.currentPage] || ''; switchAiTab('translate'); });
  }

  async function handleAiKeySave() {
    var key = String($('pdf-key-input').value || '').trim(); if (!key) return;
    localStorage.setItem('gugopro_gemini_api_key', key); localStorage.setItem('gemini_api_key', key); closeKeyModal(); toast('Gemini API key 已儲存在本機'); if (aiEngine) await aiEngine.refresh({ silent: true });
  }

  function openModelDrawer() { $('pdf-model-drawer').classList.add('is-open'); if (aiEngine) aiEngine.refresh({ silent: true }); }
  function closeModelDrawer() { $('pdf-model-drawer').classList.remove('is-open'); }

  function initSignaturePad() {
    var canvas = $('signature-pad'); if (!canvas) return;
    var context = canvas.getContext('2d'); var drawing = false; var last = null;
    function position(event) { var rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height }; }
    canvas.addEventListener('pointerdown', function (event) { drawing = true; last = position(event); canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener('pointermove', function (event) { if (!drawing) return; var point = position(event); context.strokeStyle = '#122033'; context.lineWidth = 3; context.lineCap = 'round'; context.beginPath(); context.moveTo(last.x, last.y); context.lineTo(point.x, point.y); context.stroke(); last = point; });
    canvas.addEventListener('pointerup', function () { drawing = false; last = null; });
    $('signature-clear').addEventListener('click', function () { context.clearRect(0, 0, canvas.width, canvas.height); });
    $('signature-save').addEventListener('click', function () { state.signatureImage = canvas.toDataURL('image/png'); $('signature-modal').classList.remove('is-open'); var id = 'sig_' + Date.now(); if (!state.signatures[state.currentPage]) state.signatures[state.currentPage] = []; state.signatures[state.currentPage].push({ id: id, dataUrl: state.signatureImage, x: .32, y: .72, w: .3, h: .12, rotation: 0 }); state.activeSignatureId = id; renderMainPage(); toast('簽名已放置，可拖曳、縮放或雙擊旋轉'); });
    $('signature-upload').addEventListener('change', function () { var file = this.files && this.files[0]; if (!file) return; var reader = new FileReader(); reader.onload = function () { state.signatureImage = reader.result; $('signature-modal').classList.remove('is-open'); var id = 'sig_' + Date.now(); if (!state.signatures[state.currentPage]) state.signatures[state.currentPage] = []; state.signatures[state.currentPage].push({ id: id, dataUrl: state.signatureImage, x: .32, y: .72, w: .3, h: .12, rotation: 0 }); state.activeSignatureId = id; renderMainPage(); }; reader.readAsDataURL(file); });
  }

  function selectedSignature() { return (state.signatures[state.currentPage] || []).find(function (item) { return item.id === state.activeSignatureId; }); }

  function addFileInputListeners() {
    var pdfInput = $('pdf-file-input'); pdfInput.addEventListener('change', function () { if (this.files && this.files[0]) loadPdf(this.files[0]); });
    var zone = $('pdf-upload-zone') || $('pdf-empty-state'); if (zone) { ['dragenter', 'dragover'].forEach(function (eventName) { zone.addEventListener(eventName, function (event) { event.preventDefault(); zone.classList.add('is-dragover'); }); }); ['dragleave', 'drop'].forEach(function (eventName) { zone.addEventListener(eventName, function (event) { event.preventDefault(); zone.classList.remove('is-dragover'); }); }); zone.addEventListener('drop', function (event) { var file = event.dataTransfer.files && event.dataTransfer.files[0]; if (file) loadPdf(file); }); zone.addEventListener('click', function (event) { if (event.target.closest('button')) return; pdfInput.click(); }); }
    var imageInput = $('images-input'); imageInput.addEventListener('change', function () { state.imageFiles = Array.prototype.slice.call(this.files || []); renderFileList($('images-list'), state.imageFiles, 'fa-regular fa-image'); });
    var mergeInput = $('merge-input'); mergeInput.addEventListener('change', function () { state.mergeFiles = Array.prototype.slice.call(this.files || []).filter(isPdf); renderFileList($('merge-list'), state.mergeFiles, 'fa-solid fa-file-pdf'); });
  }

  function bindToolbar() {
    qsa('[data-pdf-tool]').forEach(function (button) { button.addEventListener('click', function () { state.tool = button.dataset.pdfTool; qsa('[data-pdf-tool]').forEach(function (node) { node.classList.toggle('is-active', node === button); }); if (state.pdf) renderMainPage(); }); });
    $('pdf-open-button').addEventListener('click', function () { $('pdf-file-input').click(); });
    $('pdf-fullscreen').addEventListener('click', function () { var shell = $('pdf-app-shell'); if (document.fullscreenElement) document.exitFullscreen(); else if (shell.requestFullscreen) shell.requestFullscreen(); });
    $('pdf-page-prev').addEventListener('click', function () { if (state.pdf) { state.currentPage = state.pageOrder[Math.max(0, state.pageOrder.indexOf(state.currentPage) - 1)]; renderMainPage(); renderThumbnails(); } });
    $('pdf-page-next').addEventListener('click', function () { if (state.pdf) { state.currentPage = state.pageOrder[Math.min(state.pageOrder.length - 1, state.pageOrder.indexOf(state.currentPage) + 1)]; renderMainPage(); renderThumbnails(); } });
    $('pdf-page-input').addEventListener('change', function () { var page = Number(this.value); if (state.pageOrder.includes(page)) { state.currentPage = page; renderMainPage(); renderThumbnails(); } });
    $('pdf-zoom-out').addEventListener('click', function () { state.fitMode = 'manual'; state.zoom = Math.max(.25, state.zoom - .1); renderMainPage(); });
    $('pdf-zoom-in').addEventListener('click', function () { state.fitMode = 'manual'; state.zoom = Math.min(2.5, state.zoom + .1); renderMainPage(); });
    $('pdf-fit-select').addEventListener('change', function () { state.fitMode = this.value; renderMainPage(); });
    $('pdf-rotate-left').addEventListener('click', function () { rotatePages(-90); }); $('pdf-rotate-right').addEventListener('click', function () { rotatePages(90); }); $('pdf-rotate-180').addEventListener('click', function () { rotatePages(180); });
    $('pdf-night-mode').addEventListener('click', function () { document.body.classList.toggle('pdf-night-reading'); this.classList.toggle('is-active'); toast(document.body.classList.contains('pdf-night-reading') ? '已開啟夜間閱讀' : '已關閉夜間閱讀'); });
    $('pdf-delete-pages').addEventListener('click', function () { if (!state.pdf) return toast(messages.choosePdf); var pages = getSelectedOrCurrentPages(); if (pages.length >= state.pageOrder.length) return setStatus('至少保留一頁，無法全部刪除。', 'error'); state.pageOrder = state.pageOrder.filter(function (page) { return !pages.includes(page); }); state.selectedPages.clear(); state.currentPage = state.pageOrder[0]; renderThumbnails(); renderMainPage(); updateSelectionStatus(); toast('已刪除 ' + pages.length + ' 頁（輸出時套用）'); });
    $('pdf-export-pages').addEventListener('click', function () { var pages = state.selectedPages.size ? state.pageOrder.filter(function (page) { return state.selectedPages.has(page); }) : state.pageOrder; exportPdf(pages, safeName(state.file && state.file.name) + '-extracted.pdf'); });
    $('pdf-save').addEventListener('click', function () { exportPdf(state.pageOrder, safeName(state.file && state.file.name) + '-edited.pdf'); });
    $('pdf-clear').addEventListener('click', function () {       state.file = null; state.pdf = null; state.pageOrder = []; state.selectedPages.clear(); var thumbEmpty = $('pdf-thumb-empty'); if (thumbEmpty) thumbEmpty.hidden = false; $('pdf-file-name').textContent = '尚未開啟 PDF'; $('pdf-file-meta').textContent = '拖放檔案即可開始'; $('pdf-reader-status').innerHTML = '<i class="fa-solid fa-lock"></i> 等待檔案'; $('pdf-thumbnails').replaceChildren(); $('pdf-outline-list').innerHTML = '<div class="pdf-sidebar-empty"><i class="fa-regular fa-compass"></i><span>載入 PDF 後顯示目錄。</span></div>'; clearReaderFrame(); setEmptyState(true); setStatus(messages.empty); setProgress(0); });
    $('pdf-add-signature').addEventListener('click', function () { $('signature-modal').classList.add('is-open'); });
    $('pdf-delete-signature').addEventListener('click', function () { var signature = selectedSignature(); if (!signature) return toast('請先點選簽名'); state.signatures[state.currentPage] = (state.signatures[state.currentPage] || []).filter(function (item) { return item.id !== signature.id; }); state.activeSignatureId = null; renderMainPage(); });
    $('pdf-signature-rotate-left').addEventListener('click', function () { var signature = selectedSignature(); if (!signature) return toast('請先點選簽名'); signature.rotation = (signature.rotation - 15 + 360) % 360; renderMainPage(); });
    $('pdf-signature-rotate-right').addEventListener('click', function () { var signature = selectedSignature(); if (!signature) return toast('請先點選簽名'); signature.rotation = (signature.rotation + 15) % 360; renderMainPage(); });
    $('pdf-download-current').addEventListener('click', function () { renderAllImages('png'); }); $('pdf-download-jpg').addEventListener('click', function () { renderAllImages('jpg'); });
    $('pdf-images-to-pdf').addEventListener('click', imagesToPdf); $('pdf-merge-run').addEventListener('click', mergePdfs); $('pdf-lock-run').addEventListener('click', encryptCurrentPdf);
    $('pdf-split-run').addEventListener('click', function () { if (!state.pdf) return toast(messages.choosePdf); var raw = String($('split-range').value || '').trim(); var result = parseRange(raw, state.pageOrder.length); if (!result.length) return setStatus('請輸入有效頁碼範圍，例如 1-3,5。', 'error'); exportPdf(result, safeName(state.file.name) + '-split.pdf'); });
  }

  function parseRange(value, max) {
    var output = []; String(value || '').split(',').forEach(function (token) { var clean = token.trim(); if (!clean) return; if (/^\d+\s*-\s*\d+$/.test(clean)) { var parts = clean.split('-').map(Number); var start = Math.min(parts[0], parts[1]); var end = Math.max(parts[0], parts[1]); for (var i = start; i <= end; i += 1) if (i >= 1 && i <= max && !output.includes(i)) output.push(i); } else if (/^\d+$/.test(clean)) { var page = Number(clean); if (page >= 1 && page <= max && !output.includes(page)) output.push(page); } }); return output;
  }

  function bindAi() {
    qsa('[data-ai-tab]').forEach(function (button) { button.addEventListener('click', function () { switchAiTab(button.dataset.aiTab); }); });
    qsa('[data-ai-prompt]').forEach(function (button) { button.addEventListener('click', function () { $('pdf-chat-input').value = button.dataset.aiPrompt; $('pdf-chat-input').focus(); }); });
    $('pdf-chat-send').addEventListener('click', handleChat); $('pdf-chat-input').addEventListener('keydown', function (event) { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleChat(); });
    $('pdf-summary-run').addEventListener('click', handleSummary); $('pdf-risk-run').addEventListener('click', handleRisk); $('pdf-translate-run').addEventListener('click', handleTranslate); $('pdf-translate-current').addEventListener('click', populateCurrentPageText);
    $('pdf-open-models').addEventListener('click', openModelDrawer); $('pdf-open-key').addEventListener('click', openKeyModal); $('pdf-key-save').addEventListener('click', handleAiKeySave); $('pdf-model-refresh').addEventListener('click', function () { if (aiEngine) aiEngine.refresh({ silent: false }); });
    $('pdf-model-close').addEventListener('click', closeModelDrawer); $('pdf-key-close').addEventListener('click', closeKeyModal);
    qsa('.pdf-model-drawer, .pdf-modal').forEach(function (overlay) { overlay.addEventListener('click', function (event) { if (event.target === overlay) overlay.classList.remove('is-open'); }); });
  }

  function bindSidebar() {
    qsa('[data-sidebar]').forEach(function (button) { button.addEventListener('click', function () { setSidebarTab(button.dataset.sidebar); }); });
    qsa('[data-dock-action]').forEach(function (button) { button.addEventListener('click', function () { var action = button.dataset.dockAction; if (action === 'ai') { $('pdf-ai-pane').classList.toggle('is-mobile-open'); button.classList.toggle('is-active'); } else if (action === 'tools') { $('pdf-utility-panel').scrollIntoView({ behavior: 'smooth' }); } else if (action === 'thumbs') { $('pdf-sidebar').style.display = 'flex'; $('pdf-sidebar').scrollIntoView({ behavior: 'smooth' }); } else if (action === 'signature') { $('signature-modal').classList.add('is-open'); } }); });
  }

  function init() {
    addFileInputListeners(); bindToolbar(); bindAi(); bindSidebar(); initSignaturePad(); initAi(); setEmptyState(true); renderNotesPanel();
    $('pdf-page-input').value = '1'; $('pdf-total-pages').textContent = '0';
    window.addEventListener('resize', function () { if (state.pdf && state.fitMode !== 'manual') renderMainPage(); });
    window.addEventListener('error', function (event) { if (event && event.message && /pdf/i.test(event.message)) setStatus('前端 PDF 模組錯誤：' + event.message, 'error'); });
  }

  window.GugoProPdfSuite = { loadPdf: loadPdf, extractAllText: extractAllText, getState: function () { return state; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
