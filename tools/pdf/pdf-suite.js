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
    insertFiles: [],
    crop: { top: 0, right: 0, bottom: 0, left: 0 },
    busy: false,
    outline: []
  };

  var editHistory = { undo: [], redo: [], applying: false, limit: 60 };
  var mobileOverlayBackTimer = 0;
  function cloneValue(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function captureEditState() {
    return {
      pageOrder: state.pageOrder.slice(),
      currentPage: state.currentPage,
      pageRotations: cloneValue(state.pageRotations || {}),
      selectedPages: Array.from(state.selectedPages || []),
      annotations: cloneValue(state.annotations || {}),
      signatures: cloneValue(state.signatures || {}),
      activeSignatureId: state.activeSignatureId,
      crop: cloneValue(state.crop || { top: 0, right: 0, bottom: 0, left: 0 })
    };
  }
  function editStateKey(snapshot) {
    return JSON.stringify(snapshot || {});
  }
  function syncHistoryButtons() {
    var undo = $('pdf-undo');
    var redo = $('pdf-redo');
    if (undo) undo.disabled = !state.pdf || !editHistory.undo.length;
    if (redo) redo.disabled = !state.pdf || !editHistory.redo.length;
  }
  function resetEditHistory() {
    editHistory.undo = [];
    editHistory.redo = [];
    editHistory.applying = false;
    syncHistoryButtons();
  }
  function recordEditHistory() {
    if (!state.pdf || editHistory.applying) return;
    var snapshot = captureEditState();
    var previous = editHistory.undo[editHistory.undo.length - 1];
    if (previous && editStateKey(previous) === editStateKey(snapshot)) return;
    editHistory.undo.push(snapshot);
    if (editHistory.undo.length > editHistory.limit) editHistory.undo.shift();
    editHistory.redo = [];
    syncHistoryButtons();
  }
  function restoreEditState(snapshot) {
    if (!snapshot || !state.pdf) return;
    editHistory.applying = true;
    state.pageOrder = Array.isArray(snapshot.pageOrder) ? snapshot.pageOrder.slice() : state.pageOrder.slice();
    state.currentPage = state.pageOrder.includes(Number(snapshot.currentPage)) ? Number(snapshot.currentPage) : (state.pageOrder[0] || 1);
    state.pageRotations = cloneValue(snapshot.pageRotations || {});
    state.selectedPages.clear();
    (snapshot.selectedPages || []).forEach(function (page) { state.selectedPages.add(Number(page)); });
    state.annotations = cloneValue(snapshot.annotations || {});
    state.annotationImages = {};
    state.signatures = cloneValue(snapshot.signatures || {});
    state.activeSignatureId = snapshot.activeSignatureId || null;
    state.crop = cloneValue(snapshot.crop || { top: 0, right: 0, bottom: 0, left: 0 });
    editHistory.applying = false;
    renderThumbnails();
    renderMainPage();
    renderNotesPanel();
    updateSelectionStatus();
    syncHistoryButtons();
  }
  function undoEdit() {
    if (!state.pdf) { toast(messages.choosePdf); return false; }
    if (!editHistory.undo.length) { toast(IS_EN ? 'There is no edit to undo.' : '目前沒有可復原的編輯。'); return false; }
    var current = captureEditState();
    var previous = editHistory.undo.pop();
    editHistory.redo.push(current);
    restoreEditState(previous);
    toast(IS_EN ? 'Undid the last edit' : '已復原上一步編輯');
    return true;
  }
  function redoEdit() {
    if (!state.pdf) { toast(messages.choosePdf); return false; }
    if (!editHistory.redo.length) { toast(IS_EN ? 'There is no edit to redo.' : '目前沒有可重做的編輯。'); return false; }
    var current = captureEditState();
    var next = editHistory.redo.pop();
    editHistory.undo.push(current);
    restoreEditState(next);
    toast(IS_EN ? 'Redid the last edit' : '已重做上一步編輯');
    return true;
  }

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
    node.className = 'pdf-status-inline ' + (kind || '');
  }

  function setProgress(value) {
    var bar = $('pdf-progress-bar');
    if (bar) bar.style.width = Math.max(0, Math.min(100, Number(value) || 0)) + '%';
  }

  function toast(value, options) {
    var node = $('pdf-toast');
    if (!node) return;
    node.textContent = value;
    node.classList.toggle('is-action-guide', Boolean(options && options.guide));
    node.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { node.classList.remove('is-visible'); node.classList.remove('is-action-guide'); }, options && options.guide ? 4400 : 2600);
  }

  var ACTION_GUIDES = {
    open: { zh: '💡 請選擇要開啟的 PDF；檔案只會留在這個瀏覽器本機處理。', en: '💡 Choose a PDF to open; the file stays local in this browser.' },
    undo: { zh: '💡 已復原上一步編輯；可繼續修改，或按重做恢復。', en: '💡 The last edit was undone; keep editing or use Redo to restore it.' },
    redo: { zh: '💡 已重做上一步編輯；可繼續檢查文件。', en: '💡 The edit was restored; continue checking the document.' },
    fullscreen: { zh: '💡 已切換全螢幕閱讀；按瀏覽器返回或全螢幕鍵即可離開。', en: '💡 Full-screen reading is active; use the browser back or full-screen control to leave.' },
    export: { zh: '💡 正在準備匯出編輯版 PDF；完成後可在下載項目查看。', en: '💡 Preparing the edited PDF; check your downloads when it finishes.' },
    close: { zh: '💡 PDF 已關閉；可重新選擇檔案開始新的工作。', en: '💡 The PDF is closed; choose another file to start a new task.' },
    pagePrev: { zh: '💡 已回到上一頁；可繼續使用頁碼或左右箭頭瀏覽。', en: '💡 Moved to the previous page; use the page field or arrows to continue.' },
    pageNext: { zh: '💡 已前往下一頁；可繼續使用頁碼或左右箭頭瀏覽。', en: '💡 Moved to the next page; use the page field or arrows to continue.' },
    pageInput: { zh: '💡 已跳到指定頁；可直接在目前頁面閱讀或標註。', en: '💡 Jumped to the requested page; you can read or annotate it now.' },
    zoomOut: { zh: '💡 PDF 已縮小；可用手指雙指縮放，或按放大恢復細節。', en: '💡 The PDF is zoomed out; pinch or use Zoom in to inspect detail.' },
    zoomIn: { zh: '💡 PDF 已放大；可用單指拖曳閱讀目前區域。', en: '💡 The PDF is zoomed in; drag with one finger to read the current area.' },
    fit: { zh: '💡 已套用新的檢視比例；需要細節時可切換手動或雙指放大。', en: '💡 The viewing scale was updated; use Manual or pinch to inspect detail.' },
    pageFlow: { zh: '💡 已切換頁面排列方向；可在閱讀區滑動檢查頁面順序。', en: '💡 Page flow changed; scroll the reader to check the page order.' },
    night: { zh: '💡 夜間閱讀已切換；PDF 內容會以較低刺激的色彩顯示。', en: '💡 Night reading was toggled; the PDF now uses a lower-glare presentation.' },
    annotationPanel: { zh: '💡 標註工具已開啟：先選工具，再在 PDF 頁面拖曳或點擊。', en: '💡 Annotation tools are open: choose a tool, then drag or tap on the PDF.' },
    select: { zh: '💡 已切回選取工具：可點擊頁面、選取或移動簽名。', en: '💡 Select mode is active: tap pages or select and move a signature.' },
    highlight: { zh: '💡 已啟用螢光筆：請在 PDF 文字或區域上方拖曳劃記。', en: '💡 Highlighter is active: drag across PDF text or an area to mark it.' },
    underline: { zh: '💡 已選取底線標註：請在 PDF 頁面上拖曳劃出重點線條。', en: '💡 Underline is active: drag across the PDF to mark a key line.' },
    strike: { zh: '💡 已選取刪除線標註：請在 PDF 頁面上拖曳劃掉重點文字。', en: '💡 Strike-through is active: drag across text to mark it for removal.' },
    draw: { zh: '💡 已啟用自由畫筆：請直接在 PDF 頁面上用手指或滑鼠繪製標註。', en: '💡 Freehand pen is active: draw directly on the PDF with a finger or mouse.' },
    text: { zh: '💡 已啟用文字輸入：請在 PDF 任意位置點擊一下，即可輸入自訂文字。', en: '💡 Text mode is active: tap any PDF position to enter custom text.' },
    annotationAdded: { zh: '💡 標註已加入本頁；可繼續劃記，或切回選取工具移動簽名。', en: '💡 The annotation was added; keep marking or switch to Select to move a signature.' },
    textAdded: { zh: '💡 文字註記已加入本頁；可切回選取工具繼續整理。', en: '💡 The text note was added; switch to Select to keep organizing.' },
    signature: { zh: '💡 請在簽名板用手指或滑鼠繪製；儲存後簽名會放在可視 PDF 中央。', en: '💡 Draw on the signature pad with a finger or mouse; the saved signature is placed at the visible PDF center.' },
    signatureSaved: { zh: '💡 簽名已儲存到本機常用簽名庫；下次開啟會自動帶入。', en: '💡 The signature was saved locally; it will be available the next time you open the pad.' },
    signatureCleared: { zh: '💡 簽名板已清除；請重新用手指或滑鼠繪製。', en: '💡 The signature pad was cleared; draw again with a finger or mouse.' },
    signaturePlaced: { zh: '💡 簽名已放在目前可視 PDF 中央；可拖曳、縮放或雙擊旋轉。', en: '💡 The signature was placed at the visible PDF center; drag, resize, or double-click to rotate.' },
    signatureClose: { zh: '💡 已關閉簽名板；要再次建立簽名，請從標註／簽名工具開啟。', en: '💡 The signature pad is closed; open Annotation / Sign to create one again.' },
    signatureRotate: { zh: '💡 可繼續拖曳簽名移動；需要改變角度時再按左轉或右轉。', en: '💡 Drag the signature to move it; use Rotate left or right to change its angle.' },
    signatureDelete: { zh: '💡 簽名已移除；若要重新加入，請按簽名並重新放置。', en: '💡 The signature was removed; choose Sign to place a new one.' },
    pagesPanel: { zh: '💡 頁面組織模式：請在縮圖側欄勾選頁面後，再執行旋轉、刪除或提取。', en: '💡 Page organizer is open: select pages in Thumbnails, then rotate, delete, or extract.' },
    deletePages: { zh: '💡 已刪除選取頁面（匯出時套用）；至少要保留一頁。', en: '💡 Selected pages were removed for export; at least one page must remain.' },
    exportPages: { zh: '💡 正在提取選取頁面；完成後請查看下載項目。', en: '💡 Extracting the selected pages; check your downloads when it finishes.' },
    split: { zh: '💡 請先輸入頁碼範圍，例如 1-3,5，再執行分割。', en: '💡 Enter a page range such as 1-3,5, then run Split.' },
    insert: { zh: '💡 請選擇要插入的 PDF；頁面會加入目前文件。', en: '💡 Choose a PDF to insert; its pages will be added to the current document.' },
    crop: { zh: '💡 請設定裁切邊界（pt）後套用；裁切會在匯出時生效。', en: '💡 Set the crop margin in points and apply it; cropping takes effect on export.' },
    compress: { zh: '💡 正在準備壓縮 PDF；完成後請查看下載項目。', en: '💡 Preparing the compressed PDF; check your downloads when it finishes.' },
    rotateLeft: { zh: '💡 頁面已左轉 90°；可繼續調整或匯出檢查結果。', en: '💡 The page was rotated left 90°; continue adjusting or export to check it.' },
    rotateRight: { zh: '💡 頁面已右轉 90°；可繼續調整或匯出檢查結果。', en: '💡 The page was rotated right 90°; continue adjusting or export to check it.' },
    rotate180: { zh: '💡 頁面已旋轉 180°；可繼續調整或匯出檢查結果。', en: '💡 The page was rotated 180°; continue adjusting or export to check it.' },
    convertPanel: { zh: '💡 檔案保護與轉檔工具已開啟：先填欄位，再按需要的輸出或安全動作。', en: '💡 Conversion and security tools are open: fill the fields, then choose an output or security action.' },
    png: { zh: '💡 正在輸出 PNG ZIP；完成後請查看下載項目。', en: '💡 Exporting a PNG ZIP; check your downloads when it finishes.' },
    jpg: { zh: '💡 正在輸出 JPG ZIP；完成後請查看下載項目。', en: '💡 Exporting a JPG ZIP; check your downloads when it finishes.' },
    imagesToPdf: { zh: '💡 正在將已加入的圖片合成 PDF；完成後請查看下載項目。', en: '💡 Combining the selected images into a PDF; check your downloads when it finishes.' },
    merge: { zh: '💡 請先按「加入 PDF」選取多個檔案，再執行合併。', en: '💡 Use Add PDFs to choose files, then run Merge PDFs.' },
    lock: { zh: '💡 請輸入至少 6 個字元的密碼，再套用並下載本機鎖定包。', en: '💡 Enter at least 6 characters, then apply and download the local lock package.' },
    unlock: { zh: '💡 請選擇本機鎖定包檔案，系統會在瀏覽器內解密。', en: '💡 Choose a local lock package; it will be decrypted in this browser.' },
    addPdfs: { zh: '💡 請選擇要加入的 PDF 檔案，可一次選取多個。', en: '💡 Choose the PDFs to add; you can select multiple files at once.' },
    addImages: { zh: '💡 請選擇要轉成 PDF 的 PNG 或 JPG 圖片，可一次選取多個。', en: '💡 Choose PNG or JPG images to convert; you can select multiple files at once.' },
    thumbnails: { zh: '💡 縮圖面板已開啟：點擊縮圖跳頁，勾選後可做頁面管理。', en: '💡 Thumbnails are open: tap a thumbnail to jump, or check pages for organization.' },
    ai: { zh: '💡 AI 助手已開啟：可直接提問，或先切換到預設工具。', en: '💡 AI Assistant is open: ask a question or switch to Preset tools.' },
    aiBack: { zh: '💡 已返回 PDF 閱讀畫面；可繼續閱讀或使用上方工具列。', en: '💡 Returned to the PDF; continue reading or use the toolbar.' },
    sidebarTab: { zh: '💡 已切換側欄檢視；點擊縮圖可直接跳到該頁。', en: '💡 Sidebar view changed; tap a thumbnail to jump to that page.' }
  };
  function actionGuide(key) {
    var copy = ACTION_GUIDES[key] || ACTION_GUIDES.annotationPanel;
    var text = IS_EN ? copy.en : copy.zh;
    toast(text, { guide: true });
    setStatus(text.replace(/^💡\s*/, ''), 'success');
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
    var stack = $('pdf-continuous-stack');
    var shell = $('pdf-app-shell');
    if (empty) { empty.hidden = !isEmpty; empty.style.display = isEmpty ? 'grid' : 'none'; }
    if (frame) { frame.hidden = isEmpty; frame.style.display = isEmpty ? 'none' : 'inline-block'; }
    if (stack) { stack.hidden = isEmpty || !isMobileReader(); stack.style.display = isEmpty ? 'none' : (isMobileReader() ? 'flex' : 'none'); }
    if (shell) shell.classList.toggle('is-document-loaded', !isEmpty);
    if (document.body) document.body.classList.toggle('pdf-document-loaded', !isEmpty);
  }

  function makeCanvas(width, height, className) {
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width));
    canvas.height = Math.max(1, Math.ceil(height));
    if (className) canvas.className = className;
    return canvas;
  }

  function getRenderPixelRatio(width, height) {
    var ratio = Math.min(3, Math.max(1, Number(window.devicePixelRatio) || 1));
    var maxPixels = 12000000;
    var pixels = Math.max(1, Number(width) || 1) * Math.max(1, Number(height) || 1) * ratio * ratio;
    if (pixels > maxPixels) ratio = Math.max(1, Math.sqrt(maxPixels / (Math.max(1, Number(width) || 1) * Math.max(1, Number(height) || 1))));
    return ratio;
  }

  function makeDpiCanvas(width, height, className, pixelRatio) {
    var ratio = Math.max(1, Number(pixelRatio) || 1);
    var canvas = makeCanvas(width * ratio, height * ratio, className);
    canvas.style.width = Math.ceil(width) + 'px';
    canvas.style.height = Math.ceil(height) + 'px';
    canvas.dataset.pixelRatio = String(ratio);
    return canvas;
  }

  function getRotation(pageNumber) { return Number(state.pageRotations[pageNumber] || 0); }

  function getPageDisplayRotation(pageNumber) {
    return ((getRotation(pageNumber) % 360) + 360) % 360;
  }

  function getPageScale(page, pageNumber) {
    var stage = $('pdf-reader-stage');
    var rotationPage = Number(pageNumber) || state.currentPage;
    var base = page.getViewport({ scale: 1, rotation: getPageDisplayRotation(rotationPage) });
    if (!stage) return state.zoom;
    if (state.fitMode === 'fit-width') {
      return Math.max(.25, Math.min(2.25, (stage.clientWidth - 24) / base.width));
    }
    if (state.fitMode === 'fit-height') {
      return Math.max(.25, Math.min(2.25, (stage.clientHeight - 54) / base.height));
    }
    if (state.fitMode === 'fit-page') {
      return Math.max(.25, Math.min(2.25, Math.min((stage.clientWidth - 48) / base.width, (stage.clientHeight - 48) / base.height)));
    }
    return state.zoom;
  }

  function clearReaderFrame() {
    var frame = $('pdf-page-frame');
    if (frame) {
      frame.replaceChildren();
      var signatureLayer = document.createElement('div');
      signatureLayer.id = 'pdf-signature-layer';
      frame.appendChild(signatureLayer);
    }
    var stack = $('pdf-continuous-stack');
    if (stack) { stack.replaceChildren(); delete stack.dataset.renderKey; delete stack.dataset.renderZoom; }
  }

  function drawPath(context, item, width, height, pixelRatio) {
    if (item.type === 'text') {
      var textValue = String(item.text || '').trim(); if (!textValue) return;
      context.save(); context.fillStyle = item.color || '#ff9e6b'; context.globalAlpha = .95;
      context.font = '700 ' + Math.max(14, (Number(item.size) || 18) * Math.max(width, height) / 1000) + 'px Inter, sans-serif';
      var lines = textValue.split(/\n/); var lineHeight = Math.max(18, (Number(item.size) || 18) * Math.max(width, height) / 1000 * 1.3);
      lines.forEach(function (line, index) { context.fillText(line, (Number(item.x) || 0) * width, ((Number(item.y) || 0) * height) + index * lineHeight); });
      context.restore(); return;
    }
    var points = item.points || [];
    if (points.length < 2) return;
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = item.color || '#ff9e6b';
    context.lineWidth = Math.max(.55, Number(item.width) || 4) * (Number(pixelRatio) || 1);
    if (item.type === 'highlight') {
      context.globalAlpha = .28;
      context.lineWidth *= 3.5;
      context.strokeStyle = item.color || '#ffd166';
    } else if (item.type === 'underline') {
      context.lineWidth = Math.max(.55, context.lineWidth * .65);
      context.globalAlpha = .9;
    } else if (item.type === 'strike') {
      context.lineWidth = Math.max(.55, context.lineWidth * .6);
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
    items.forEach(function (item) { drawPath(context, item, canvas.width, canvas.height, canvas.width / Math.max(1, canvas.clientWidth || canvas.width)); });
    state.annotationImages[pageNumber] = canvas.toDataURL('image/png');
  }

  function addSignatureOverlay(signature, pageNumber, targetLayer, targetFrame) {
    var layer = targetLayer || $('pdf-signature-layer');
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
      var frame = targetFrame || $('pdf-page-frame');
      var rect = frame.getBoundingClientRect();
      var startX = event.clientX; var startY = event.clientY;
      var initialX = signature.x; var initialY = signature.y; var changed = false;
      function move(moveEvent) {
        if (!changed) { recordEditHistory(); changed = true; }
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
      var frame = targetFrame || $('pdf-page-frame'); var rect = frame.getBoundingClientRect();
      var startX = event.clientX; var startY = event.clientY;
      var initialW = signature.w; var initialH = signature.h; var changed = false;
      function move(moveEvent) {
        if (!changed) { recordEditHistory(); changed = true; }
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
      recordEditHistory();
      signature.rotation = (Number(signature.rotation || 0) + 15) % 360;
      renderMainPage();
      toast('簽名已旋轉 15°');
    });
  }

  function isMobileReader() {
    return Boolean(window.matchMedia && window.matchMedia('(max-width: 767px)').matches);
  }

  function syncVisualViewportHeight() {
    if (!isMobileReader()) return;
    var viewport = window.visualViewport;
    var height = viewport && Number(viewport.height) > 0 ? Number(viewport.height) : Number(window.innerHeight) || 0;
    if (!height) return;
    document.documentElement.style.setProperty('--pdf-viewport-height', height + 'px');
  }

  function syncZoomLabel(value) {
    var zoomLabel = $('pdf-zoom-label');
    if (zoomLabel) zoomLabel.textContent = Math.round((Number(value) || 0) * 100) + '%';
  }

  function getSignatureRenderKey() {
    return Object.keys(state.signatures || {}).sort().map(function (page) {
      return page + ':' + (state.signatures[page] || []).map(function (signature) { return [signature.id, signature.x, signature.y, signature.w, signature.h, signature.rotation || 0].join(','); }).join(';');
    }).join('|');
  }
  function getContinuousRenderKey() {
    var stage = $('pdf-reader-stage');
    return [state.pageOrder.join(','), JSON.stringify(state.pageRotations), getSignatureRenderKey(), state.zoom.toFixed(4), state.fitMode, state.tool, stage ? stage.clientWidth : 0, stage ? stage.clientHeight : 0].join('|');
  }

  function syncContinuousActivePage(pageNumber) {
    var stack = $('pdf-continuous-stack');
    var number = Number(pageNumber);
    if (!stack || !number) return null;
    state.currentPage = number;
    var active = null;
    qsa('.pdf-continuous-page', stack).forEach(function (node) {
      var isActive = Number(node.dataset.page) === number;
      node.classList.toggle('is-current', isActive);
      var canvas = node.querySelector('.pdf-annotation-canvas');
      if (canvas) {
        canvas.style.pointerEvents = isActive && state.tool !== 'select' ? 'auto' : 'none';
        if (isActive) bindAnnotationCanvas(canvas, number);
      }
      if (isActive) active = node;
    });
    syncMobilePageControls();
    var pageCurrent = $('pdf-page-input'); if (pageCurrent) pageCurrent.value = String(number);
    qsa('.pdf-thumb').forEach(function (thumb) { thumb.classList.toggle('is-current', Number(thumb.dataset.page) === number); });
    return active;
  }

  function appendRenderedPage(page, pageNumber, fragment, renderToken) {
    var rotation = getPageDisplayRotation(pageNumber);
    var scale = getPageScale(page, pageNumber);
    var viewport = page.getViewport({ scale: scale, rotation: rotation });
    var pageFrame = document.createElement('div');
    var isCurrent = Number(pageNumber) === Number(state.currentPage);
    pageFrame.className = 'pdf-continuous-page' + (isCurrent ? ' is-current' : '') + (state.tool === 'select' ? ' tool-select' : '');
    pageFrame.dataset.page = String(pageNumber);
    pageFrame.style.width = Math.ceil(viewport.width) + 'px';
    pageFrame.style.height = Math.ceil(viewport.height) + 'px';
    pageFrame.setAttribute('aria-label', 'PDF page ' + pageNumber);
    var outputScale = getRenderPixelRatio(viewport.width, viewport.height);
    var canvas = makeDpiCanvas(viewport.width, viewport.height, 'pdf-page-canvas', outputScale);
    pageFrame.appendChild(canvas);
    var renderContext = { canvasContext: canvas.getContext('2d'), viewport: viewport };
    if (outputScale !== 1) renderContext.transform = [outputScale, 0, 0, outputScale, 0, 0];
    return page.render(renderContext).promise.then(function () {
      if (renderToken !== mainRenderToken) return null;
      var overlay = makeDpiCanvas(viewport.width, viewport.height, 'pdf-annotation-canvas', outputScale);
      overlay.setAttribute('aria-label', 'PDF annotation canvas, page ' + pageNumber);
      if (!isCurrent) overlay.style.pointerEvents = 'none';
      pageFrame.appendChild(overlay);
      var signatureLayer = document.createElement('div');
      signatureLayer.className = 'pdf-signature-layer';
      signatureLayer.setAttribute('aria-label', 'Signature overlays, page ' + pageNumber);
      pageFrame.appendChild(signatureLayer);
      renderAnnotationLayer(overlay, pageNumber);
      if (isCurrent) bindAnnotationCanvas(overlay, pageNumber);
      (state.signatures[pageNumber] || []).forEach(function (signature) { addSignatureOverlay(signature, pageNumber, signatureLayer, pageFrame); });
      pageFrame.addEventListener('click', function (event) {
        if (event.target && event.target.closest && event.target.closest('.pdf-annotation-canvas, .pdf-signature-stamp')) return;
        if (state.currentPage !== Number(pageNumber)) { state.currentPage = Number(pageNumber); renderMainPage(); }
      });
      fragment.appendChild(pageFrame);
      return { viewport: viewport, pageFrame: pageFrame, scale: scale, pageNumber: pageNumber };
    });
  }

  var continuousObserver = null;
  async function renderContinuousPages(renderToken) {
    var stack = $('pdf-continuous-stack');
    if (!stack || !state.pdf) return;
    var cachedKey = getContinuousRenderKey();
    if (stack.dataset.renderKey === cachedKey && stack.children.length === state.pageOrder.length) {
      var cachedActive = syncContinuousActivePage(state.currentPage);
      if (cachedActive) cachedActive.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      syncZoomLabel(state.zoom);
      return;
    }
    var fragment = document.createDocumentFragment();
    var currentViewport = null;
    var currentScale = state.zoom;
    for (var index = 0; index < state.pageOrder.length; index += 1) {
      var pageNumber = state.pageOrder[index];
      var page = await state.pdf.getPage(pageNumber);
      if (renderToken !== mainRenderToken) return;
      var result = await appendRenderedPage(page, pageNumber, fragment, renderToken);
      if (renderToken !== mainRenderToken) return;
      if (result && Number(pageNumber) === Number(state.currentPage)) { currentViewport = result.viewport; currentScale = result.scale; }
    }
    if (state.fitMode !== 'manual') state.zoom = currentScale;
    var preservePinchVisual = stack.dataset.keepPinchVisual === 'true';
    stack.replaceChildren(fragment);
    stack.dataset.keepPinchVisual = 'false';
    stack.style.transform = 'none';
    stack.style.transformOrigin = '';
    stack.style.marginBottom = '';
    stack.style.marginRight = '';
    if (preservePinchVisual) stack.offsetWidth;
    stack.dataset.renderZoom = String(state.zoom);
    stack.dataset.renderKey = getContinuousRenderKey();
    var stage = $('pdf-reader-stage');
    function activatePage(pageNumber) {
      syncContinuousActivePage(pageNumber);
    }
    if (continuousObserver) continuousObserver.disconnect();
    continuousObserver = null;
    if (stage && window.IntersectionObserver) {
      continuousObserver = new IntersectionObserver(function (entries) {
        var visible = entries.filter(function (entry) { return entry.isIntersecting; }).sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];
        if (visible) activatePage(visible.target.dataset.page);
      }, { root: stage, threshold: [0.35, 0.6, 0.85] });
      qsa('.pdf-continuous-page', stack).forEach(function (node) { continuousObserver.observe(node); });
    }
    var active = stack.querySelector('.pdf-continuous-page.is-current');
    if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (currentViewport) { state.renderedWidth = currentViewport.width; state.renderedHeight = currentViewport.height; }
    syncMobilePageControls();
    syncZoomLabel(state.zoom);
  }

  var mainRenderToken = 0;
  async function renderMainPage() {
    if (!state.pdf) return;
    var renderToken = ++mainRenderToken;
    if (isMobileReader()) {
      var mobileFrame = $('pdf-page-frame');
      var mobileStack = $('pdf-continuous-stack');
      if (mobileFrame) { mobileFrame.hidden = true; mobileFrame.style.display = 'none'; }
      if (mobileStack) { mobileStack.hidden = false; mobileStack.style.display = 'flex'; }
      await renderContinuousPages(renderToken);
      if (renderToken !== mainRenderToken) return;
      var mobilePageCurrent = $('pdf-page-input');
      if (mobilePageCurrent) mobilePageCurrent.value = String(state.currentPage);
      var mobilePageTotal = $('pdf-total-pages');
      if (mobilePageTotal) mobilePageTotal.textContent = String(state.pageOrder.length || state.pdf.numPages);
      syncMobilePageControls();
      qsa('.pdf-thumb').forEach(function (thumb) { thumb.classList.toggle('is-current', Number(thumb.dataset.page) === state.currentPage); });
      return;
    }
    var page = await state.pdf.getPage(state.currentPage);
    if (renderToken !== mainRenderToken) return;
    var desktopFrame = $('pdf-page-frame');
    var desktopStack = $('pdf-continuous-stack');
    if (desktopFrame) { desktopFrame.hidden = false; desktopFrame.style.display = 'inline-block'; }
    if (desktopStack) { desktopStack.hidden = true; desktopStack.style.display = 'none'; desktopStack.replaceChildren(); }
    var rotation = getPageDisplayRotation(state.currentPage);
    var scale = getPageScale(page, state.currentPage);
    if (state.fitMode !== 'manual') state.zoom = scale;
    var viewport = page.getViewport({ scale: scale, rotation: rotation });
    var frame = $('pdf-page-frame');
    if (!frame) return;
    frame.hidden = false;
    frame.classList.toggle('tool-select', state.tool === 'select');
    frame.style.width = Math.ceil(viewport.width) + 'px';
    frame.style.height = Math.ceil(viewport.height) + 'px';
    frame.style.transform = 'none';
    frame.replaceChildren();
    var outputScale = getRenderPixelRatio(viewport.width, viewport.height);
    var canvas = makeDpiCanvas(viewport.width, viewport.height, 'pdf-page-canvas', outputScale);
    frame.appendChild(canvas);
    var renderContext = { canvasContext: canvas.getContext('2d'), viewport: viewport };
    if (outputScale !== 1) renderContext.transform = [outputScale, 0, 0, outputScale, 0, 0];
    await page.render(renderContext).promise;
    if (renderToken !== mainRenderToken) return;
    var overlay = makeDpiCanvas(viewport.width, viewport.height, 'pdf-annotation-canvas', outputScale);
    overlay.setAttribute('aria-label', 'PDF annotation canvas');
    frame.appendChild(overlay);
    var signatureLayer = document.createElement('div');
    signatureLayer.id = 'pdf-signature-layer';
    signatureLayer.className = 'pdf-signature-layer';
    signatureLayer.setAttribute('aria-label', 'Signature overlays');
    frame.appendChild(signatureLayer);
    state.renderedWidth = viewport.width;
    state.renderedHeight = viewport.height;
    renderAnnotationLayer(overlay, state.currentPage);
    var rotations = qsa('[data-page-rotation]');
    rotations.forEach(function (node) { node.textContent = getPageDisplayRotation(state.currentPage) + '°'; });
    var pageCurrent = $('pdf-page-input') || $('pdf-current-page');
    if (pageCurrent) pageCurrent.value = String(state.currentPage);
    var pageTotal = $('pdf-total-pages');
    if (pageTotal) pageTotal.textContent = String(state.pageOrder.length || state.pdf.numPages);
    syncMobilePageControls();
    syncZoomLabel(scale);
    bindAnnotationCanvas(overlay, state.currentPage);
    (state.signatures[state.currentPage] || []).forEach(function (signature) { addSignatureOverlay(signature, state.currentPage, signatureLayer, frame); });
    qsa('.pdf-thumb').forEach(function (thumb) { thumb.classList.toggle('is-current', Number(thumb.dataset.page) === state.currentPage); });
  }

  function bindAnnotationCanvas(canvas, pageNumber) {
    if (!canvas) return;
    var start = null;
    var activePointerId = null;
    var context = canvas.getContext('2d');
    canvas.style.pointerEvents = state.tool === 'select' ? 'none' : 'auto';
    canvas.style.touchAction = 'none';
    canvas.style.webkitUserSelect = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.cursor = state.tool === 'select' ? 'default' : 'crosshair';

    function pointFrom(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      return { x: Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width))), y: Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height))) };
    }
    function preventCanvasGesture(event) {
      if (event && event.cancelable) event.preventDefault();
      if (event && event.stopPropagation) event.stopPropagation();
    }
    function finishStroke() {
      if (!start) return;
      if (start.points.length > 1) {
        recordEditHistory();
        if (!state.annotations[pageNumber]) state.annotations[pageNumber] = [];
        state.annotations[pageNumber].push(start);
        renderAnnotationLayer(canvas, pageNumber);
        renderNotesPanel();
        actionGuide('annotationAdded');
      }
      start = null;
      activePointerId = null;
    }
    function beginStroke(event) {
      if (state.tool === 'select') return;
      preventCanvasGesture(event);
      var startPoint = pointFrom(event.clientX, event.clientY);
      if (state.tool === 'text') {
        var textValue = window.prompt(IS_EN ? 'Enter text to place on the PDF:' : '輸入要放在 PDF 上的文字：', IS_EN ? 'Text note' : '文字註記');
        if (textValue && textValue.trim()) {
          recordEditHistory();
          if (!state.annotations[pageNumber]) state.annotations[pageNumber] = [];
          state.annotations[pageNumber].push({ type: 'text', x: startPoint.x, y: startPoint.y, text: textValue.trim().slice(0, 500), color: $('annotation-color') ? $('annotation-color').value : '#ff9e6b', size: Number(($('annotation-width') || {}).value) * 3 + 12 });
          renderAnnotationLayer(canvas, pageNumber); renderNotesPanel(); actionGuide('textAdded');
        }
        return;
      }
      if (start) return;
      start = { points: [startPoint], color: $('annotation-color') ? $('annotation-color').value : '#ff9e6b', type: state.tool, width: Number(($('annotation-width') || {}).value) || 5 };
      activePointerId = event.pointerId == null ? null : event.pointerId;
      if (activePointerId != null && canvas.setPointerCapture) { try { canvas.setPointerCapture(activePointerId); } catch (_) {} }
    }
    function moveStroke(event) {
      if (!start || (activePointerId != null && event.pointerId !== activePointerId)) return;
      preventCanvasGesture(event);
      var point = pointFrom(event.clientX, event.clientY);
      start.points.push(point);
      var rect = canvas.getBoundingClientRect();
      context.clearRect(0, 0, canvas.width, canvas.height);
      var pixelRatio = canvas.width / Math.max(1, rect.width);
      (state.annotations[pageNumber] || []).forEach(function (item) { drawPath(context, item, canvas.width, canvas.height, pixelRatio); });
      drawPath(context, start, canvas.width, canvas.height, pixelRatio);
    }
    function endStroke(event) {
      if (!start || (activePointerId != null && event.pointerId !== activePointerId)) return;
      preventCanvasGesture(event);
      if (activePointerId != null && canvas.releasePointerCapture) { try { canvas.releasePointerCapture(activePointerId); } catch (_) {} }
      finishStroke();
    }
    function cancelStroke(event) {
      if (start && (!event || activePointerId == null || event.pointerId === activePointerId)) {
        preventCanvasGesture(event);
        start = null; activePointerId = null; renderAnnotationLayer(canvas, pageNumber);
      }
    }
    canvas.onpointerdown = beginStroke;
    canvas.onpointermove = moveStroke;
    canvas.onpointerup = endStroke;
    canvas.onpointercancel = cancelStroke;
    canvas.ontouchstart = function (event) {
      if (window.PointerEvent) return;
      var touch = event.touches && event.touches[0];
      if (!touch) return;
      beginStroke({ clientX: touch.clientX, clientY: touch.clientY, pointerId: 'touch', cancelable: event.cancelable, preventDefault: function () { event.preventDefault(); }, stopPropagation: function () { event.stopPropagation(); } });
    };
    canvas.ontouchmove = function (event) {
      if (window.PointerEvent) return;
      var touch = event.touches && event.touches[0];
      if (!touch) return;
      moveStroke({ clientX: touch.clientX, clientY: touch.clientY, pointerId: 'touch', cancelable: event.cancelable, preventDefault: function () { event.preventDefault(); }, stopPropagation: function () { event.stopPropagation(); } });
    };
    canvas.ontouchend = function (event) {
      if (window.PointerEvent) return;
      endStroke({ pointerId: 'touch', cancelable: event.cancelable, preventDefault: function () { event.preventDefault(); }, stopPropagation: function () { event.stopPropagation(); } });
    };
    canvas.ontouchcancel = function (event) {
      if (window.PointerEvent) return;
      cancelStroke({ pointerId: 'touch', cancelable: event.cancelable, preventDefault: function () { event.preventDefault(); }, stopPropagation: function () { event.stopPropagation(); } });
    };
  }

  var thumbnailRenderToken = 0;
  async function renderThumbnails() {
    var container = $('pdf-thumbnails');
    if (!container || !state.pdf) return;
    var renderToken = ++thumbnailRenderToken;
    container.replaceChildren();
    var emptyState = $('pdf-thumb-empty');
    if (emptyState) emptyState.hidden = true;
    var status = $('pdf-thumb-status');
    if (status) status.textContent = state.pageOrder.length + ' 頁';
    for (var index = 0; index < state.pageOrder.length; index += 1) {
      var pageNumber = state.pageOrder[index];
      var page = await state.pdf.getPage(pageNumber);
      if (renderToken !== thumbnailRenderToken) return;
      var baseViewport = page.getViewport({ scale: 1, rotation: getPageDisplayRotation(pageNumber) });
      var scale = Math.min(0.22, 116 / baseViewport.width);
      var viewport = page.getViewport({ scale: scale, rotation: getPageDisplayRotation(pageNumber) });
      var thumb = document.createElement('div');
      thumb.className = 'pdf-thumb' + (pageNumber === state.currentPage ? ' is-current' : '') + (state.selectedPages.has(pageNumber) ? ' is-selected' : '');
      thumb.dataset.page = String(pageNumber);
      thumb.draggable = true;
      var thumbScale = getRenderPixelRatio(viewport.width, viewport.height);
      var canvas = makeDpiCanvas(viewport.width, viewport.height, 'pdf-thumb-canvas', thumbScale);
      thumb.appendChild(canvas);
      var footer = document.createElement('div'); footer.className = 'pdf-thumb-footer';
      var label = document.createElement('span'); label.className = 'pdf-thumb-page'; label.textContent = 'P.' + pageNumber;
      var check = document.createElement('input'); check.type = 'checkbox'; check.className = 'pdf-thumb-check'; check.checked = state.selectedPages.has(pageNumber); check.setAttribute('aria-label', '選取第 ' + pageNumber + ' 頁');
      footer.appendChild(label); footer.appendChild(check); thumb.appendChild(footer);
      if (getPageDisplayRotation(pageNumber)) {
        var rotated = document.createElement('span'); rotated.className = 'pdf-thumb-overlay'; rotated.textContent = getPageDisplayRotation(pageNumber) + '°'; thumb.appendChild(rotated);
      }
      var thumbRenderContext = { canvasContext: canvas.getContext('2d'), viewport: viewport };
      if (thumbScale !== 1) thumbRenderContext.transform = [thumbScale, 0, 0, thumbScale, 0, 0];
      page.render(thumbRenderContext);
      if (renderToken !== thumbnailRenderToken) return;
      thumb.addEventListener('click', function (event) {
        if (event.target && event.target.classList && event.target.classList.contains('pdf-thumb-check')) return;
        state.currentPage = Number(this.dataset.page);
        renderMainPage();
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
        recordEditHistory();
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
      node.addEventListener('click', function () { state.currentPage = entry.page; setSidebarTab('thumbs'); renderMainPage(); });
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
          if (page) { state.currentPage = page; renderMainPage(); }
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
    try { window.dispatchEvent(new CustomEvent('gugopro:pdf-text-extracted', { detail: getSnapshot ? getSnapshot() : { file: state.file, pageTexts: state.pageTexts, pageOrder: state.pageOrder, currentPage: state.currentPage } })); } catch (_) {}
    setProgress(100);
    var total = all.join('\n\n');
    if (!total.replace(/\[第[^\]]+\頁\]/g, '').trim()) {
      setStatus(messages.noText, 'error');
    }
    return total;
  }

  var pendingTaskAction = null;
  var pendingTaskSupplement = '';
  var IS_EN = document.documentElement.lang === 'en';
  var TASK_PROMPTS = IS_EN ? {
    summary: 'Organize the core conclusions, key data, important dates, and action items in this PDF. Use clear Markdown sections and cite a page for every finding.',
    risk: 'Review contract risks: penalties, auto-renewal, disclaimers, unilateral changes, non-compete, payment, and termination clauses. Mark severity, evidence pages, and human-review suggestions.',
    translate: 'Translate the PDF accurately into the selected target language. Preserve proper nouns, numbers, clause numbers, formatting, and page citations.',
    diff: 'Compare the current PDF with the selected comparison version. List added, deleted, and modified clauses or data, explain material impact, and cite pages.',
    data: 'Extract all important financial data, tables, units, periods, and fields from the PDF into structured Markdown tables. Preserve source pages and flag suspected contradictions.',
    quiz: 'Generate a learning quiz from this document: 5 multiple-choice questions and 3 short-answer questions, with correct answers, brief explanations, and page citations.',
    compliance: 'Run a compliance and security scan for personal data, confidential information, unauthorized terms, data exposure, and legal or security risks. List evidence pages and remediation suggestions by severity.'
  } : {
    summary: '請整理這份 PDF 的核心結論、關鍵數據、重要日期與待辦事項；以清楚的 Markdown 小節輸出，所有發現附上頁碼。',
    risk: '請進行合約風險審閱，逐項檢查違約金、自動續約、免責、單方變更、競業、付款與終止條款，標示風險等級、證據頁碼與人工覆核建議。',
    translate: '請將整份 PDF 精準翻譯為指定目標語言，保留專有名詞、數字、條款編號、格式與頁碼引用。',
    diff: '請比較目前 PDF 與使用者選取的比較版本，列出新增、刪除、修改的條款或數據，並指出可能造成的實質影響與頁碼。',
    data: '請擷取 PDF 中所有重要財務數據、表格、單位、期間與欄位，轉成結構化 Markdown 表格；保留來源頁碼並指出疑似矛盾。',
    quiz: '請根據文件生成一組適合學習的問答測驗，包含 5 題單選題與 3 題問答題，附正確答案、簡短解析與頁碼。',
    compliance: '請執行合規與資安審查，掃描個人資料、機密資訊、未授權條款、資料外洩與潛在法律風險，依嚴重程度列出證據頁碼與處理建議。'
  };
  var PRESET_STORAGE_KEY = 'gugopro_pdf_preset_workspaces_v1';
  var PRESET_ORDER = ['summary', 'risk', 'translate', 'diff', 'data', 'quiz', 'compliance'];
  var PRESET_META = IS_EN ? {
    summary: { title: 'Summary workspace', hint: 'Confirm execution before generating key points and actions.', label: 'Summary', button: 'Run Summary analysis' },
    risk: { title: 'Contract workspace', hint: 'Confirm execution before reviewing clauses and severity.', label: 'Contract risk', button: 'Run Contract analysis' },
    translate: { title: 'Translation workspace', hint: 'Choose a target language, then confirm the full-document translation.', label: 'Translation', button: 'Run Translation' },
    diff: { title: 'Diff check workspace', hint: 'Confirm execution, then choose the comparison PDF.', label: 'Diff check', button: 'Run Diff check' },
    data: { title: 'Data extraction workspace', hint: 'Confirm execution before extracting tables and structured data.', label: 'Data extraction', button: 'Run Data extraction' },
    quiz: { title: 'Quiz workspace', hint: 'Confirm execution before generating study questions.', label: 'Quiz', button: 'Run Quiz' },
    compliance: { title: 'Compliance workspace', hint: 'Confirm execution before scanning privacy and security risks.', label: 'Compliance', button: 'Run Compliance scan' }
  } : {
    summary: { title: '摘要工作區', hint: '先確認執行，再開始整理重點與待辦。', label: '摘要', button: '執行摘要分析' },
    risk: { title: '合約工作區', hint: '先確認執行，再開始檢查條款與風險等級。', label: '合約風控', button: '執行合約分析' },
    translate: { title: '翻譯工作區', hint: '選擇目標語言後，確認執行整份文件翻譯。', label: '翻譯', button: '執行翻譯' },
    diff: { title: '差異比對工作區', hint: '先確認執行，接著選擇要比較的第二份 PDF。', label: '差異比對', button: '執行差異比對' },
    data: { title: '數據提煉工作區', hint: '先確認執行，再擷取表格與結構化數據。', label: '數據提煉', button: '執行數據提煉' },
    quiz: { title: '問答測驗工作區', hint: '先確認執行，再生成學習題目。', label: '問答測驗', button: '執行問答測驗' },
    compliance: { title: '合規資安工作區', hint: '先確認執行，再掃描個資與資安風險。', label: '合規資安', button: '執行合規資安分析' }
  };
  var presetActiveAction = 'summary';
  var presetWorkspaces = {};
  function createPresetWorkspace() { return { messages: [] }; }
  function loadPresetWorkspaces() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || 'null'); } catch (_) { saved = null; }
    presetWorkspaces = {};
    PRESET_ORDER.forEach(function (action) {
      var source = saved && saved.workspaces && saved.workspaces[action];
      var messages = source && Array.isArray(source.messages) ? source.messages : [];
      presetWorkspaces[action] = { messages: messages.map(function (message, index) { return { id: String(message.id || 'preset_msg_' + action + '_' + index), role: message.role === 'user' ? 'user' : 'assistant', text: String(message.text || '').slice(0, 30000), createdAt: message.createdAt || new Date().toISOString() }; }).filter(function (message) { return message.text; }).slice(-60) };
    });
    if (saved && PRESET_ORDER.includes(saved.activeAction)) presetActiveAction = saved.activeAction;
  }
  function savePresetWorkspaces() { try { localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify({ version: 1, activeAction: presetActiveAction, workspaces: presetWorkspaces })); } catch (_) { toast(IS_EN ? 'Preset chat history is too large to save locally.' : '預設工具對話太大，無法完整保存到本機。'); } }
  function getPresetWorkspace(action) { if (!presetWorkspaces[action]) presetWorkspaces[action] = createPresetWorkspace(); return presetWorkspaces[action]; }
  function presetText(role, text) { return (role === 'user' ? (IS_EN ? 'You' : '使用者') : 'GugoPro AI') + ': ' + String(text || ''); }
  function presetHistoryText(action) { return getPresetWorkspace(action).messages.map(function (message) { return presetText(message.role, message.text); }).join('\n\n'); }
  function renderPresetWorkspace(action) {
    action = PRESET_ORDER.includes(action) ? action : 'summary'; presetActiveAction = action;
    var meta = PRESET_META[action];
    qsa('[data-task-action]').forEach(function (button) { button.classList.toggle('is-active', button.dataset.taskAction === action); });
    if ($('pdf-preset-active-title')) $('pdf-preset-active-title').textContent = meta.title;
    if ($('pdf-preset-active-hint')) $('pdf-preset-active-hint').textContent = meta.hint;
    if ($('pdf-preset-language-wrap')) $('pdf-preset-language-wrap').hidden = action !== 'translate';
    var run = $('pdf-preset-run'); if (run) { var label = run.querySelector('span'); if (label) label.textContent = meta.button; run.title = meta.button; }
    var log = $('pdf-preset-log'); if (!log) return;
    var workspace = getPresetWorkspace(action); log.replaceChildren();
    var fragment = document.createDocumentFragment();
    workspace.messages.forEach(function (message) { fragment.appendChild(buildChatMessageNode(message.role, message.text, message.id, 'pdf-preset-log')); });
    log.appendChild(fragment); log.scrollTop = log.scrollHeight;
    var empty = $('pdf-preset-output-empty'); if (empty) empty.hidden = workspace.messages.length > 0;
    savePresetWorkspaces();
  }
  function addPresetMessage(action, role, text, id) {
    var message = { id: id || 'preset_msg_' + action + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), role: role === 'user' ? 'user' : 'assistant', text: String(text || '').slice(0, 30000), createdAt: new Date().toISOString() };
    var workspace = getPresetWorkspace(action); workspace.messages.push(message); if (workspace.messages.length > 60) workspace.messages = workspace.messages.slice(-60); savePresetWorkspaces();
    if (action === presetActiveAction) {
      var log = $('pdf-preset-log'); if (log) { log.appendChild(buildChatMessageNode(message.role, message.text, message.id, 'pdf-preset-log')); log.scrollTop = log.scrollHeight; }
      var empty = $('pdf-preset-output-empty'); if (empty) empty.hidden = true;
    }
    return message;
  }
  function updatePresetMessage(action, id, text) { var message = getPresetWorkspace(action).messages.find(function (item) { return item.id === id; }); if (message) { message.text = String(text || '').slice(0, 30000); savePresetWorkspaces(); } if (action === presetActiveAction) { var node = document.querySelector('#pdf-preset-log [data-message-id="' + id + '"]'); if (node) updateChatMessage(node, text, 'pdf-preset-log'); } }
  function deletePresetMessage(action, id) { var workspace = getPresetWorkspace(action); workspace.messages = workspace.messages.filter(function (message) { return message.id !== id; }); savePresetWorkspaces(); if (action === presetActiveAction) renderPresetWorkspace(action); }
  function clearPresetWorkspace(action) { var workspace = getPresetWorkspace(action); if (!workspace.messages.length) return; if (!window.confirm(IS_EN ? 'Clear this preset tool chat only?' : '只清空目前預設工具的對話嗎？')) return; workspace.messages = []; savePresetWorkspaces(); renderPresetWorkspace(action); toast(IS_EN ? 'Current preset tool chat cleared.' : '目前預設工具對話已清空。'); }
  function selectPresetAction(action) { if (!TASK_PROMPTS[action]) return; renderPresetWorkspace(action); switchAiTab('preset'); }
  function getCustomRoomMessages() { var room = window.GugoProPdfRooms && window.GugoProPdfRooms.getActiveRoom ? window.GugoProPdfRooms.getActiveRoom() : null; return room && Array.isArray(room.messages) ? room.messages : []; }
  function getConversationText(mode) { var messages = mode === 'preset' ? getPresetWorkspace(presetActiveAction).messages : getCustomRoomMessages(); return messages.map(function (message) { return presetText(message.role, message.text); }).join('\n\n'); }
  function downloadConversation(mode, extension) { var content = getConversationText(mode); if (!content) return toast(IS_EN ? 'There are no messages to export yet.' : '目前聊天室還沒有可匯出的對話。'); var mime = extension === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8'; var blob = new Blob([content], { type: mime }); var url = URL.createObjectURL(blob); var link = document.createElement('a'); link.href = url; link.download = 'gugopro-pdf-' + (mode === 'preset' ? presetActiveAction : 'custom-room') + '-chat-' + Date.now() + '.' + extension; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 500); toast(IS_EN ? 'Chat exported.' : '聊天室已匯出。'); }
  function closeMoreMenus() { qsa('.pdf-chat-more-menu').forEach(function (menu) { menu.hidden = true; var trigger = menu.parentElement && menu.parentElement.querySelector('.pdf-chat-more'); if (trigger) trigger.setAttribute('aria-expanded', 'false'); }); }
  function toggleMoreMenu(id) { var menu = $(id); if (!menu) return; var open = menu.hidden; closeMoreMenus(); menu.hidden = !open; var trigger = menu.parentElement && menu.parentElement.querySelector('.pdf-chat-more'); if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  function handleMoreAction(mode, action) { closeMoreMenus(); if (action === 'copy-all') return copyTextToClipboard(getConversationText(mode)); if (action === 'export-md') return downloadConversation(mode, 'md'); if (action === 'export-txt') return downloadConversation(mode, 'txt'); if (action === 'clear') { if (mode === 'preset') clearPresetWorkspace(presetActiveAction); else if (window.GugoProPdfRooms && window.GugoProPdfRooms.clearActiveMessages) window.GugoProPdfRooms.clearActiveMessages(); } }
  function toggleAiExpanded() {
    var pane = $('pdf-ai-pane'); var button = $('pdf-ai-expand'); if (!pane || !button) return;
    var expanded = pane.classList.toggle('is-expanded'); button.setAttribute('aria-expanded', expanded ? 'true' : 'false'); button.title = expanded ? (IS_EN ? 'Restore AI workspace' : '還原 AI 工作區') : (IS_EN ? 'Expand AI workspace' : '放大 AI 工作區'); var icon = button.querySelector('i'); if (icon) icon.className = expanded ? 'fa-solid fa-compress' : 'fa-solid fa-expand'; var label = button.querySelector('span'); if (label) label.textContent = expanded ? (IS_EN ? 'Restore' : '還原') : (IS_EN ? 'Expand' : '放大');
    if (expanded) toast(IS_EN ? 'AI workspace expanded for easier reading.' : 'AI 工作區已放大，方便閱讀長篇結果。');
  }

  async function extractTextFromPdfFile(file) {
    if (!file) return '';
    var pdfjs = await ensurePdfJs();
    var document = await pdfjs.getDocument({ data: await readBuffer(file) }).promise;
    var pages = [];
    for (var pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      var page = await document.getPage(pageNumber);
      var content = await page.getTextContent();
      var lines = (content.items || []).map(function (item) { return String(item.str || '').trim(); }).filter(Boolean);
      pages.push('[比較文件第 ' + pageNumber + ' 頁]\n' + lines.join(' '));
    }
    return pages.join('\\n\\n').slice(0, 90000);
  }

  async function runTaskMatrixAction(action, comparisonFile, supplement) {
    action = String(action || '').toLowerCase();
    if (!TASK_PROMPTS[action]) return;
    presetActiveAction = action; renderPresetWorkspace(action); switchAiTab('preset');
    if (action === 'diff' && !comparisonFile) {
      pendingTaskAction = action; pendingTaskSupplement = String(supplement || '');
      var diffInput = $('pdf-diff-input');
      if (diffInput) { diffInput.value = ''; diffInput.click(); }
      else toast(IS_EN ? 'Choose the second PDF for comparison.' : '請選擇比較用的第二份 PDF。');
      return;
    }
    var taskId = 'pdf_preset_action_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var meta = PRESET_META[action];
    var pendingText = IS_EN ? 'Running “' + meta.label + '”…' : '正在執行「' + meta.label + '」任務…';
    addPresetMessage(action, 'assistant', pendingText, taskId);
    var node = document.querySelector('#pdf-preset-log [data-message-id="' + taskId + '"]'); if (node) node.classList.add('is-pending');
    try {
      var comparisonText = comparisonFile ? await extractTextFromPdfFile(comparisonFile) : '';
      var language = action === 'translate' ? String($('pdf-preset-translate-language') && $('pdf-preset-translate-language').value || (IS_EN ? 'Traditional Chinese' : '繁體中文')) : '';
      var languagePrompt = language ? (IS_EN ? '\n\nTarget language: ' + language + '. Translate the document into this language.' : '\n\n目標語言：【' + language + '】。請將 PDF 內容精準翻譯為此語言。') : '';
      var prompt = TASK_PROMPTS[action] + languagePrompt + (comparisonText ? (IS_EN ? '\n\nComparison version text:\n' : '\n\n比較版本文字如下：\n') + comparisonText : '') + (supplement ? (IS_EN ? '\n\nUser follow-up requirement:\n' : '\n\n使用者補充要求：\n') + String(supplement).slice(0, 8000) : '') + (IS_EN ? '\n\nReply in English in this preset workspace, cite pages, and do not change any custom task room.' : '\n\n請直接回覆在目前預設工具工作區，使用繁體中文並附頁碼；不要修改或保存任何自訂任務房間。');
      var answer = await requestAi(prompt, { maxOutputTokens: action === 'quiz' ? 4200 : 5000, ignoreRoomContext: true });
      var emptyAnswer = IS_EN ? 'The task returned no content.' : '任務沒有回傳內容。';
      updatePresetMessage(action, taskId, answer || emptyAnswer); if (node) node.classList.remove('is-pending');
      setStatus(IS_EN ? meta.label + ' completed.' : '「' + meta.label + '」任務已完成。', 'success');
    } catch (error) {
      deletePresetMessage(action, taskId);
      if (error.message === 'NO_KEY') showAiError(IS_EN ? 'Open ⚙️ Settings in the AI rail and add a Gemini API key.' : '請先在 AI 側欄右上角的「⚙️ 設定」輸入 Gemini API key。', false);
      else if ([503, 429, 500, 'TIMEOUT'].includes(error.status)) showAiError(IS_EN ? 'The AI model is busy or timed out; automatic fallback is active.' : 'AI 模型目前忙碌或逾時，系統會自動輪替；', true);
      else showAiError((IS_EN ? meta.label + ' failed: ' : '「' + meta.label + '」任務未完成：') + (error.message || (IS_EN ? 'Connection failed.' : '連線失敗。')), false);
    }
  }

  async function handlePresetFollowup() {
    var input = $('pdf-preset-input'); var question = String(input && input.value || '').trim(); if (!question) return;
    var action = presetActiveAction; var history = getPresetWorkspace(action).messages.slice(-8).map(function (item) { return presetText(item.role, item.text); }).join('\n\n'); var userId = 'preset_user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); var assistantId = userId + '_assistant';
    addPresetMessage(action, 'user', question, userId); if (input) { input.value = ''; input.style.height = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
    addPresetMessage(action, 'assistant', IS_EN ? 'Analyzing the follow-up request…' : '正在依照補充要求分析…', assistantId);
    var node = document.querySelector('#pdf-preset-log [data-message-id="' + assistantId + '"]'); if (node) node.classList.add('is-pending');
    var button = $('pdf-preset-send'); if (button) button.disabled = true;
    try {
      var meta = PRESET_META[action]; var language = action === 'translate' ? String($('pdf-preset-translate-language') && $('pdf-preset-translate-language').value || (IS_EN ? 'Traditional Chinese' : '繁體中文')) : '';
      var prompt = (IS_EN ? 'Continue the ' + meta.label + ' analysis in the current preset workspace. ' : '請繼續目前「' + meta.label + '」預設工具分析。') + (language ? (IS_EN ? 'Use target language ' + language + '. ' : '目標語言為【' + language + '】。') : '') + (IS_EN ? 'Answer this follow-up requirement with page citations:\n' : '請回答以下補充要求並附頁碼：\n') + question + (history ? (IS_EN ? '\n\nRecent workspace chat:\n' : '\n\n目前工具最近對話：\n') + history : '');
      var answer = await requestAi(prompt, { maxOutputTokens: 4200, ignoreRoomContext: true });
      updatePresetMessage(action, assistantId, answer || (IS_EN ? 'No answer returned.' : 'AI 沒有回傳內容。')); if (node) node.classList.remove('is-pending');
    } catch (error) { deletePresetMessage(action, assistantId); if (error.message === 'NO_KEY') showAiError(IS_EN ? 'Open ⚙️ Settings and add a Gemini API key.' : '請先在「⚙️ 設定」輸入 Gemini API key。', false); else showAiError(IS_EN ? 'Follow-up failed: ' + (error.message || 'Connection failed.') : '補充要求未完成：' + (error.message || '連線失敗。'), false); }
    finally { if (button) button.disabled = false; }
  }

  async function loadPdf(file) {
    if (!isPdf(file)) { setStatus(messages.choosePdf, 'error'); return; }
    setStatus(messages.loading, 'loading'); setProgress(3); setEmptyState(false);
    mainRenderToken += 1; state.file = file; state.pdf = null; state.pageTexts = {}; state.textReady = false; state.pageRotations = {}; state.selectedPages.clear(); state.annotations = {}; state.annotationImages = {}; state.signatures = {}; state.currentPage = 1; resetEditHistory();
    try {
      var pdfjs = await ensurePdfJs();
      var buffer = await readBuffer(file);
      state.pdf = await pdfjs.getDocument({ data: buffer }).promise;
      setEmptyState(false);
      state.pageOrder = Array.from({ length: state.pdf.numPages }, function (_, index) { return index + 1; });
      syncHistoryButtons();
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
      try { window.dispatchEvent(new CustomEvent('gugopro:pdf-loaded', { detail: { file: state.file.name, pages: state.pageOrder.length } })); } catch (_) {}
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
    recordEditHistory();
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
    var cropMargin = Math.max(0, Math.min(240, Number(($('crop-margin') || {}).value) || 0));
    if (cropMargin) pages.forEach(function (page) {
      var width = page.getWidth(); var height = page.getHeight();
      var horizontal = Math.min(cropMargin, Math.max(0, (width - 12) / 2));
      var vertical = Math.min(cropMargin, Math.max(0, (height - 12) / 2));
      page.setCropBox(horizontal, vertical, Math.max(12, width - horizontal * 2), Math.max(12, height - vertical * 2));
    });
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
      var blob = await zip.generateAsync({ type: 'blob' }); downloadBlob(blob, safeName(state.file.name) + '-' + format + '-images.zip'); setProgress(100); setStatus('已產生 ' + state.pageOrder.length + ' 張 ' + format.toUpperCase() + ' 圖片並打包 ZIP。', 'success');
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

  async function insertPdfPages(files) {
    if (!state.pdf || !state.file) return toast(messages.choosePdf);
    var list = Array.prototype.slice.call(files || []).filter(isPdf);
    if (!list.length) return setStatus('請選擇要插入的 PDF。', 'error');
    if (state.busy) return;
    state.busy = true; setStatus('正在插入 PDF 頁面…', 'loading'); setProgress(8);
    try {
      var PDFLib = requirePdfLib(); var output = await PDFLib.PDFDocument.create();
      var base = await PDFLib.PDFDocument.load(await readBuffer(state.file));
      var original = await output.copyPages(base, state.pageOrder.map(function (page) { return page - 1; }));
      original.forEach(function (page, index) { var pageNumber = state.pageOrder[index]; var rotation = (page.getRotation().angle || 0) + getRotation(pageNumber); if (rotation) page.setRotation(PDFLib.degrees(rotation % 360)); output.addPage(page); });
      for (var i = 0; i < list.length; i += 1) { var source = await PDFLib.PDFDocument.load(await readBuffer(list[i])); var pages = await output.copyPages(source, source.getPageIndices()); pages.forEach(function (page) { output.addPage(page); }); setProgress(25 + ((i + 1) / list.length) * 45); }
      var bytes = await output.save(); var inserted = new File([bytes], safeName(state.file.name) + '-inserted.pdf', { type: 'application/pdf' });
      await loadPdf(inserted); setStatus('已插入 ' + list.length + ' 個 PDF 的頁面，視覺閱讀已切換至新檔案。', 'success'); toast('插入頁面完成');
    } catch (error) { setStatus('插入失敗：' + (error.message || 'PDF 格式不受支援。'), 'error'); setProgress(0); }
    state.busy = false;
  }

  async function compressCurrentPdf() {
    if (!state.pdf || !state.file) return toast(messages.choosePdf);
    if (state.busy) return; state.busy = true; setStatus('正在本機重整 PDF 結構並壓縮…', 'loading'); setProgress(10);
    try {
      var PDFLib = requirePdfLib(); var document = await PDFLib.PDFDocument.load(await readBuffer(state.file)); setProgress(55);
      var bytes = await document.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 20 });
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), safeName(state.file.name) + '-compressed.pdf'); setProgress(100); setStatus('已完成本機結構壓縮並下載 PDF；圖片不會重新取樣。', 'success'); toast('壓縮 PDF 已下載');
    } catch (error) { setStatus('壓縮失敗：' + (error.message || '格式不受支援。'), 'error'); setProgress(0); }
    state.busy = false;
  }

  async function decryptLockPackage(file) {
    if (!file) return;
    var passphrase = String(($('lock-password') || {}).value || '');
    if (passphrase.length < 6) return setStatus('請先輸入建立鎖定包時使用的至少 6 個字元密碼。', 'error');
    if (!window.crypto || !window.crypto.subtle) return setStatus('此瀏覽器不支援 Web Crypto。', 'error');
    setStatus('正在以本機密碼解密鎖定包…', 'loading');
    try {
      var packageData = JSON.parse(await file.text());
      if (packageData.format !== 'GugoPro PDF Lock v1') throw new Error('這不是 GugoPro PDF Lock v1 鎖定包。');
      var salt = bytesFromBase64(packageData.salt); var iv = bytesFromBase64(packageData.iv); var material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
      var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      var decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, bytesFromBase64(packageData.ciphertext));
      downloadBlob(new Blob([decrypted], { type: 'application/pdf' }), packageData.fileName || 'gugopro-unlocked.pdf'); setStatus('鎖定包已在本機解密並下載 PDF。', 'success'); toast('解密完成');
    } catch (error) { setStatus('解密失敗：密碼錯誤或鎖定包損壞。', 'error'); }
  }

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
    window.GugoProPdfSuiteAI = aiEngine;
    aiEngine.init();
  }

  function openKeyModal() { if ($('pdf-drawer-api-key')) { if (aiEngine) $('pdf-drawer-api-key').value = aiEngine.getApiKey(); if (window.GugoProPdfRooms) window.GugoProPdfRooms.openDrawer(false); } }
  function closeKeyModal() { var modal = $('pdf-key-modal'); if (modal) modal.classList.remove('is-open'); }

  async function getAiContext() {
    var text = '';
    if (state.pdf) text = await extractAllText(false);
    if (!text && typeof window.GugoProPdfRoomContext === 'function') text = window.GugoProPdfRoomContext();
    if (!text) throw new Error('請先載入 PDF，或切換到已保存文字層的分析房間。');
    if (!text.replace(/\[第[^\]]+頁\]/g, '').trim()) throw new Error('目前 PDF 沒有文字層，無法進行文字 AI 分析。');
    return text.slice(0, 90000);
  }

  async function requestAi(prompt, options) {
    options = options || {};
    if (!aiEngine || !aiEngine.getApiKey()) { if (typeof window.GugoProPdfRooms?.openDrawer === 'function') window.GugoProPdfRooms.openDrawer(false); throw new Error('NO_KEY'); }
    var context = await getAiContext();
    var activeRoom = !options.ignoreRoomContext && window.GugoProPdfRooms && window.GugoProPdfRooms.getActiveRoom ? window.GugoProPdfRooms.getActiveRoom() : null;
    var historyContext = activeRoom && Array.isArray(activeRoom.messages) ? activeRoom.messages.slice(-10).map(function (item) { return (item.role === 'user' ? 'User' : 'Assistant') + ': ' + item.text; }).join('\n') : '';
    var taskRule = activeRoom && activeRoom.taskRule ? String(activeRoom.taskRule).trim() : '';
    if (!aiEngine.getModels().length) await aiEngine.refresh({ silent: false });
    if (!aiEngine.getEnabledModels().length) throw new Error('目前沒有可用的免費文字模型，請打開模型設定檢查。');
    var systemText = '你是 GugoPro AI PDF 助手。只根據提供的文件文字回答；若證據不足，明確說明。回答使用繁體中文，引用來源時使用 [第 N 頁]。不要把法律審閱結果當作律師意見。' + (taskRule ? '\n\n目前自訂 AI 專案的核心任務條件（優先遵守）：\n' + taskRule : '');
    var taskPrompt = taskRule ? '\n\n請同時遵守目前專案核心任務條件：\n' + taskRule : '';
    var payload = { contents: [{ role: 'user', parts: [{ text: prompt + taskPrompt + (historyContext ? '\n\n本分析房間最近對話：\n' + historyContext : '') + '\n\n文件文字（每段含頁碼標記）：\n' + context }] }], systemInstruction: { parts: [{ text: systemText }] }, generationConfig: { temperature: options.temperature == null ? .35 : options.temperature, maxOutputTokens: options.maxOutputTokens || 4096 } };
    var response = await aiEngine.request(payload, function (data) { return getAiText(data); }, { onAttempt: function (model) { setStatus('AI 正在使用 ' + model + ' 分析…', 'loading'); }, onSwitch: function (busy, next, status) { var code = status === 'TIMEOUT' ? 'Timeout' : status; var nextName = next || '下一個可用模型'; var notice = '⚠️ 當前模型繁忙 (' + code + ')，已自動為您無縫切換至 ' + nextName + ' 繼續處理'; setStatus(notice, 'loading'); toast(notice); } });
    return response.result;
  }

  function switchAiTab(name) {
    qsa('.pdf-ai-tab').forEach(function (tab) { tab.classList.toggle('is-active', tab.dataset.aiTab === name); });
    qsa('.pdf-ai-view').forEach(function (view) { view.hidden = view.dataset.aiView !== name; });
  }

  function scrollChatToLatest(node, targetLog) {
    var log = targetLog || $('pdf-chat-log'); if (!log) return;
    try { if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch (_) {}
    try { log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' }); } catch (_) { log.scrollTop = log.scrollHeight; }
  }

  function copyTextToClipboard(value) {
    var text = String(value == null ? '' : value);
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { toast(IS_EN ? 'Copied to clipboard.' : '已複製到剪貼簿。'); }).catch(function () { return fallbackCopyText(text); });
    return fallbackCopyText(text);
  }
  function fallbackCopyText(value) {
    var area = document.createElement('textarea'); area.value = value; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select();
    try { document.execCommand('copy'); toast(IS_EN ? 'Copied to clipboard.' : '已複製到剪貼簿。'); } catch (_) { toast(IS_EN ? 'Copy was blocked by the browser.' : '瀏覽器阻擋了複製操作。'); } area.remove(); return Promise.resolve();
  }
  function getMessageTextFromNode(node) { var body = node && node.querySelector('.pdf-chat-msg-body'); return body ? body.innerText : ''; }
  function buildChatMessageNode(role, value, messageId, targetLogId) {
    var node = document.createElement('div'); node.className = 'pdf-chat-msg ' + role;
    if (messageId) node.dataset.messageId = messageId;
    var head = document.createElement('div'); head.className = 'pdf-chat-msg-head';
    var label = document.createElement('strong'); label.textContent = role === 'user' ? (IS_EN ? 'You' : '使用者') : 'GugoPro AI';
    var actions = document.createElement('span'); actions.className = 'pdf-chat-msg-actions';
    var copy = document.createElement('button'); copy.type = 'button'; copy.className = 'pdf-chat-copy'; copy.title = IS_EN ? 'Copy this message' : '複製本則內容'; copy.setAttribute('aria-label', copy.title); copy.innerHTML = '<i class="fa-regular fa-copy"></i>'; copy.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); copyTextToClipboard(getMessageTextFromNode(node)); });
    var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'pdf-chat-delete'; remove.title = IS_EN ? 'Delete message' : '刪除訊息'; remove.setAttribute('aria-label', remove.title); remove.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    remove.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); var id = node.dataset.messageId; if (targetLogId === 'pdf-preset-log' && id) deletePresetMessage(presetActiveAction, id); else if (!targetLogId && id && window.GugoProPdfRooms && window.GugoProPdfRooms.deleteMessage) window.GugoProPdfRooms.deleteMessage(null, id); else node.remove(); });
    actions.appendChild(copy); actions.appendChild(remove); head.appendChild(label); head.appendChild(actions); node.appendChild(head);
    var body = document.createElement('div'); body.className = 'pdf-chat-msg-body'; body.innerHTML = markdownToHtml(String(value == null ? '' : value)); node.appendChild(body);
    return node;
  }
  function appendChat(role, value, messageId, targetLogId) {
    var log = $(targetLogId || 'pdf-chat-log'); if (!log) return null;
    var node = buildChatMessageNode(role, value, messageId, targetLogId); log.appendChild(node); scrollChatToLatest(node, log); return node;
  }

  function updateChatMessage(node, value, targetLogId) {
    if (!node) return;
    var body = node.querySelector('.pdf-chat-msg-body');
    if (body) body.innerHTML = markdownToHtml(String(value == null ? '' : value));
    else node.innerHTML = '<strong>GugoPro AI</strong><div class="pdf-chat-msg-body">' + markdownToHtml(String(value == null ? '' : value)) + '</div>';
    scrollChatToLatest(node, $(targetLogId || 'pdf-chat-log'));
  }

  var pendingChatRetry = null;
  var retryTimer = null;
  function showAiError(message, busy, retryQuestion) {
    var panel = $('pdf-ai-error-panel'); var messageEl = $('pdf-ai-error-msg'); var retry = $('pdf-ai-retry');
    if (!panel || !messageEl) return;
    if (retryQuestion) pendingChatRetry = retryQuestion;
    messageEl.textContent = message;
    panel.className = 'pdf-ai-error-panel is-visible' + (busy ? ' busy' : '');
    if (retry) { retry.style.display = retryQuestion ? '' : 'none'; retry.disabled = Boolean(retryQuestion); }
    clearInterval(retryTimer);
    if (retryQuestion) {
      var remaining = 5;
      messageEl.textContent = message + ' ' + remaining + ' 秒後可重試。';
      retryTimer = setInterval(function () { remaining -= 1; if (remaining <= 0) { clearInterval(retryTimer); retry.disabled = false; messageEl.textContent = message + ' 您可以手動重試。'; } else messageEl.textContent = message + ' ' + remaining + ' 秒後可重試。'; }, 1000);
    }
  }
  function hideAiError() { var panel = $('pdf-ai-error-panel'); if (panel) panel.classList.remove('is-visible'); clearInterval(retryTimer); pendingChatRetry = null; }

  async function handleChat(retryQuestion) {
    var input = $('pdf-chat-input');
    var retryText = typeof retryQuestion === 'string' ? retryQuestion.trim() : '';
    var question = retryText || String(input && input.value ? input.value : '').trim();
    if (!question) return;
    var isRetry = Boolean(retryText);
    var userMessageId = 'pdf_msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var assistantMessageId = userMessageId + '_assistant';
    if (!isRetry) {
      appendChat('user', question, userMessageId);
      if (input) { input.value = ''; input.style.height = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    var button = $('pdf-chat-send'); if (button) button.disabled = true;
    var pendingNode = appendChat('assistant', '正在分析文件，整理頁碼引用…', assistantMessageId);
    if (pendingNode) pendingNode.classList.add('is-pending');
    try {
      var answer = await requestAi('使用文件內容回答這個問題：' + question + '\n請用 3–7 點條列，並在每一點後標出頁碼。');
      hideAiError(); updateChatMessage(pendingNode, answer || 'AI 沒有回傳內容。'); if (pendingNode) pendingNode.classList.remove('is-pending');
      try { window.dispatchEvent(new CustomEvent('gugopro:pdf-room-message', { detail: { role: 'user', text: question, messageId: userMessageId } })); window.dispatchEvent(new CustomEvent('gugopro:pdf-room-message', { detail: { role: 'assistant', text: answer || 'AI 沒有回傳內容。', messageId: assistantMessageId } })); } catch (_) {}
    } catch (error) {
      if (pendingNode) pendingNode.remove();
      if (error.message === 'NO_KEY') showAiError('請先在 AI 側欄右上角的「⚙️ 設定」輸入 Gemini API key。', false);
      else if ([503, 429, 500, 'TIMEOUT'].includes(error.status)) showAiError('AI 模型目前忙碌或逾時，系統已依導師架構自動輪替；', true, question);
      else { showAiError('目前無法完成分析：' + (error.message || '連線失敗。'), false); appendChat('assistant', '目前無法完成分析：' + (error.message || '連線失敗。')); }
    } finally { if (button) button.disabled = false; }
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

  async function executeTask() {
    var room = window.GugoProPdfRooms && window.GugoProPdfRooms.getActiveRoom ? window.GugoProPdfRooms.getActiveRoom() : null;
    if (!room || !String(room.taskRule || '').trim()) {
      if (window.GugoProPdfRooms && window.GugoProPdfRooms.openTaskRuleEditor) window.GugoProPdfRooms.openTaskRuleEditor();
      return toast('請先保存這個專案的核心任務規則。');
    }
    switchAiTab('task');
    var executionId = 'pdf_task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var progressText = IS_EN ? '🚀 Running the saved rules for “' + room.name + '” on the current PDF…' : '🚀 正在依據【' + room.name + '】自訂規則分析當前 PDF 文件…';
    var node = appendChat('assistant', progressText, executionId);
    if (node) node.classList.add('is-pending');
    try {
            var executionPrompt = IS_EN ? 'Run this custom AI project now. Analyze the whole document according to the saved core task rule, then output findings, evidence pages, priorities, and next actions as a concise Markdown report.' : '請立即執行這個自訂 AI 專案任務。先按照核心任務條件逐項分析整份文件，再以條列方式輸出發現、證據頁碼、優先級與可採取的下一步。';
      var answer = await requestAi(executionPrompt, { maxOutputTokens: 5000 }); var emptyAnswer = IS_EN ? 'The project returned no content.' : '專案任務沒有回傳內容。'; updateChatMessage(node, answer || emptyAnswer); if (node) node.classList.remove('is-pending');
      window.dispatchEvent(new CustomEvent('gugopro:pdf-room-message', { detail: { role: 'assistant', text: answer || emptyAnswer, messageId: executionId } }));
      setStatus(IS_EN ? 'Project task completed.' : '「' + room.name + '」專案任務已完成。', 'success');
    } catch (error) {
      if (node) node.remove();
      if (error.message === 'NO_KEY') showAiError(IS_EN ? 'Open ⚙️ Settings in the AI rail and add a Gemini API key.' : '請先在 AI 側欄右上角的「⚙️ 設定」輸入 Gemini API key。', false);
      else if ([503, 429, 500, 'TIMEOUT'].includes(error.status)) showAiError(IS_EN ? 'The AI model is busy or timed out; automatic fallback is active.' : 'AI 模型目前忙碌或逾時，系統會自動輪替；', true);
      else showAiError((IS_EN ? 'Project task failed: ' : '專案任務未完成：') + (error.message || (IS_EN ? 'Connection failed.' : '連線失敗。')), false);
    }
  }

  async function handleAiKeySave() {
    var key = String($('pdf-key-input').value || '').trim(); if (!key) return;
    localStorage.setItem('gugopro_gemini_api_key', key); localStorage.setItem('gemini_api_key', key); closeKeyModal(); toast('Gemini API key 已儲存在本機'); if (aiEngine) await aiEngine.refresh({ silent: true });
  }

  function openModelDrawer() { $('pdf-model-drawer').classList.add('is-open'); if (aiEngine) aiEngine.refresh({ silent: true }); }
  function closeModelDrawer() { $('pdf-model-drawer').classList.remove('is-open'); }

  var SIGNATURE_LIBRARY_KEY = 'gugopro_pdf_signature_library_v1';
  function getSignatureLibrary() {
    try { var saved = JSON.parse(localStorage.getItem(SIGNATURE_LIBRARY_KEY) || '[]'); return Array.isArray(saved) ? saved.filter(function (item) { return typeof item === 'string' && item.indexOf('data:image/') === 0; }).slice(0, 5) : []; } catch (_) { return []; }
  }
  function saveSignatureToLibrary(dataUrl) {
    if (!dataUrl || dataUrl.indexOf('data:image/') !== 0) return;
    var library = [dataUrl].concat(getSignatureLibrary().filter(function (item) { return item !== dataUrl; })).slice(0, 5);
    try { localStorage.setItem(SIGNATURE_LIBRARY_KEY, JSON.stringify(library)); toast('簽名已儲存至本機常用簽名庫'); } catch (_) { toast('簽名太大，無法寫入本機儲存空間。'); }
  }
  function loadSignatureIntoPad(dataUrl) {
    var canvas = $('signature-pad'); if (!canvas || !dataUrl) return;
    var context = canvas.getContext('2d'); var image = new Image();
    image.onload = function () { context.clearRect(0, 0, canvas.width, canvas.height); var scale = Math.min(canvas.width / image.width, canvas.height / image.height) * .82; var width = image.width * scale; var height = image.height * scale; context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height); };
    image.src = dataUrl;
  }
  function signatureCenterPlacement(width, height) {
    var frame = isMobileReader() ? document.querySelector('.pdf-continuous-page.is-current') : $('pdf-page-frame');
    var stage = $('pdf-reader-stage');
    if (!frame || !stage) return { x: (1 - width) / 2, y: (1 - height) / 2 };
    var frameRect = frame.getBoundingClientRect(); var stageRect = stage.getBoundingClientRect();
    if (frameRect.width < 2 || frameRect.height < 2) return { x: (1 - width) / 2, y: (1 - height) / 2 };
    var visibleLeft = Math.max(frameRect.left, stageRect.left); var visibleRight = Math.min(frameRect.right, stageRect.right);
    var visibleTop = Math.max(frameRect.top, stageRect.top); var visibleBottom = Math.min(frameRect.bottom, stageRect.bottom);
    var centerX = visibleRight > visibleLeft ? (visibleLeft + visibleRight) / 2 : frameRect.left + frameRect.width / 2;
    var centerY = visibleBottom > visibleTop ? (visibleTop + visibleBottom) / 2 : frameRect.top + frameRect.height / 2;
    var x = (centerX - frameRect.left) / frameRect.width - width / 2;
    var y = (centerY - frameRect.top) / frameRect.height - height / 2;
    return { x: Math.max(0, Math.min(1 - width, x)), y: Math.max(0, Math.min(1 - height, y)) };
  }
  function addSignatureData(dataUrl) {
    if (!dataUrl || dataUrl.indexOf('data:image/') !== 0) return setStatus(IS_EN ? 'Draw or upload a signature first.' : '請先繪製或上傳簽名。', 'error');
    state.signatureImage = dataUrl;
    var modal = $('signature-modal'); if (modal) modal.classList.remove('is-open');
    var width = .3; var height = .12; var placement = signatureCenterPlacement(width, height); var id = 'sig_' + Date.now();
    if (!state.signatures[state.currentPage]) state.signatures[state.currentPage] = [];
    recordEditHistory();
    state.signatures[state.currentPage].push({ id: id, dataUrl: dataUrl, x: placement.x, y: placement.y, w: width, h: height, rotation: 0 });
    state.activeSignatureId = id;
    Promise.resolve(renderMainPage()).then(function () {
      var page = document.querySelector('.pdf-continuous-page.is-current') || $('pdf-page-frame');
      var stamp = page && page.querySelector('.pdf-signature-stamp[data-signature-id="' + id + '"]');
      if (stamp && isMobileReader()) { try { stamp.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch (_) {} }
      actionGuide('signaturePlaced');
    });
  }
  function syncAnnotationWidthControl() {
    var input = $('annotation-width'); var output = $('annotation-width-value'); var preview = $('annotation-width-preview');
    if (!input) return;
    var value = Math.max(1, Math.min(20, Number(input.value) || 5));
    input.value = String(value);
    var multiplier = state.tool === 'highlight' ? 3.5 : state.tool === 'underline' ? .65 : state.tool === 'strike' ? .6 : 1;
    var actual = Math.max(1, value * multiplier);
    if (output) output.textContent = value + ' px';
    if (preview) { preview.style.setProperty('--preview-size', actual + 'px'); preview.style.setProperty('--preview-base-size', value + 'px'); preview.title = (IS_EN ? 'Actual visible width: ' : '實際顯示寬度：') + Math.round(actual * 10) / 10 + ' px'; }
  }

  function initSignaturePad() {
    var canvas = $('signature-pad'); if (!canvas) return;
    var context = canvas.getContext('2d'); var drawing = false; var last = null; var activePointerId = null;
    canvas.style.touchAction = 'none'; canvas.style.userSelect = 'none'; canvas.style.webkitUserSelect = 'none';
    function position(event) { var rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / Math.max(1, rect.width), y: (event.clientY - rect.top) * canvas.height / Math.max(1, rect.height) }; }
    function brushSize() { return Math.max(1, Math.min(20, Number(($('signature-width') || {}).value) || 1)); }
    function stopBrowserGesture(event) { if (event && event.cancelable) event.preventDefault(); if (event && event.stopPropagation) event.stopPropagation(); }
    function begin(event) { stopBrowserGesture(event); drawing = true; activePointerId = event.pointerId == null ? null : event.pointerId; last = position(event); if (activePointerId != null && canvas.setPointerCapture) { try { canvas.setPointerCapture(activePointerId); } catch (_) {} } }
    function move(event) { if (!drawing || !last || (activePointerId != null && event.pointerId !== activePointerId)) return; stopBrowserGesture(event); var point = position(event); var rect = canvas.getBoundingClientRect(); context.strokeStyle = '#122033'; context.lineWidth = brushSize() * (canvas.width / Math.max(1, rect.width)); context.lineCap = 'round'; context.lineJoin = 'round'; context.beginPath(); context.moveTo(last.x, last.y); context.lineTo(point.x, point.y); context.stroke(); last = point; }
    function end(event) { if (!drawing || (activePointerId != null && event && event.pointerId !== activePointerId)) return; stopBrowserGesture(event); if (activePointerId != null && canvas.releasePointerCapture) { try { canvas.releasePointerCapture(activePointerId); } catch (_) {} } drawing = false; last = null; activePointerId = null; }
    function cancel(event) { if (!drawing) return; stopBrowserGesture(event); drawing = false; last = null; activePointerId = null; context.clearRect(0, 0, canvas.width, canvas.height); }
    canvas.addEventListener('pointerdown', begin); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', cancel);
    canvas.ontouchstart = function (event) { if (window.PointerEvent) return; var touch = event.touches && event.touches[0]; if (touch) begin({ clientX: touch.clientX, clientY: touch.clientY, pointerId: 'touch', cancelable: event.cancelable, preventDefault: function () { event.preventDefault(); }, stopPropagation: function () { event.stopPropagation(); } }); };
    canvas.ontouchmove = function (event) { if (window.PointerEvent) return; var touch = event.touches && event.touches[0]; if (touch) move({ clientX: touch.clientX, clientY: touch.clientY, pointerId: 'touch', cancelable: event.cancelable, preventDefault: function () { event.preventDefault(); }, stopPropagation: function () { event.stopPropagation(); } }); };
    canvas.ontouchend = function (event) { if (window.PointerEvent) return; end({ pointerId: 'touch', cancelable: event.cancelable, preventDefault: function () { event.preventDefault(); }, stopPropagation: function () { event.stopPropagation(); } }); };
    canvas.ontouchcancel = function (event) { if (window.PointerEvent) return; cancel({ pointerId: 'touch', cancelable: event.cancelable, preventDefault: function () { event.preventDefault(); }, stopPropagation: function () { event.stopPropagation(); } }); };
    $('pdf-add-signature')?.addEventListener('click', function () { var modal = $('signature-modal'); if (modal) modal.classList.add('is-open'); var saved = getSignatureLibrary()[0]; if (saved) loadSignatureIntoPad(saved); closeMobileToolPanel(); actionGuide('signature'); });
    $('signature-clear').addEventListener('click', function () { context.clearRect(0, 0, canvas.width, canvas.height); actionGuide('signatureCleared'); });
    $('signature-save-library').addEventListener('click', function () { saveSignatureToLibrary(canvas.toDataURL('image/png')); actionGuide('signatureSaved'); });
    $('signature-save').addEventListener('click', function () { addSignatureData(canvas.toDataURL('image/png')); });
    $('signature-upload').addEventListener('change', function () { var file = this.files && this.files[0]; if (!file) return; var reader = new FileReader(); reader.onload = function () { addSignatureData(String(reader.result || '')); }; reader.readAsDataURL(file); this.value = ''; });
    qsa('[data-close-modal="signature-modal"]').forEach(function (button) { button.addEventListener('click', function () { var modal = $('signature-modal'); if (modal) modal.classList.remove('is-open'); actionGuide('signatureClose'); }); });
    $('signature-modal')?.addEventListener('click', function (event) { if (event.target === this) { this.classList.remove('is-open'); actionGuide('signatureClose'); } });
  }

  function selectedSignature() { return (state.signatures[state.currentPage] || []).find(function (item) { return item.id === state.activeSignatureId; }); }

  function addFileInputListeners() {
    var pdfInput = $('pdf-file-input'); pdfInput.addEventListener('change', function () { if (this.files && this.files[0]) loadPdf(this.files[0]); });
    var zone = $('pdf-upload-zone') || $('pdf-empty-state'); if (zone) { ['dragenter', 'dragover'].forEach(function (eventName) { zone.addEventListener(eventName, function (event) { event.preventDefault(); zone.classList.add('is-dragover'); }); }); ['dragleave', 'drop'].forEach(function (eventName) { zone.addEventListener(eventName, function (event) { event.preventDefault(); zone.classList.remove('is-dragover'); }); }); zone.addEventListener('drop', function (event) { var file = event.dataTransfer.files && event.dataTransfer.files[0]; if (file) loadPdf(file); }); zone.addEventListener('click', function (event) { if (event.target.closest('button')) return; pdfInput.click(); }); }
    var imageInput = $('images-input'); imageInput.addEventListener('change', function () { state.imageFiles = Array.prototype.slice.call(this.files || []); renderFileList($('images-list'), state.imageFiles, 'fa-regular fa-image'); });
    var mergeInput = $('merge-input'); mergeInput.addEventListener('change', function () { state.mergeFiles = Array.prototype.slice.call(this.files || []).filter(isPdf); renderFileList($('merge-list'), state.mergeFiles, 'fa-solid fa-file-pdf'); });
    var diffInput = $('pdf-diff-input'); if (diffInput) diffInput.addEventListener('change', function () { var file = this.files && this.files[0]; var action = pendingTaskAction || 'diff'; var supplement = pendingTaskSupplement || ''; pendingTaskAction = null; pendingTaskSupplement = ''; this.value = ''; if (file) runTaskMatrixAction(action, file, supplement); });
  }

  function bindToolbarTouchLabels() {
    var toolbar = qs('.pdf-app-toolbar');
    if (!toolbar || toolbar.dataset.touchLabelsBound) return;
    toolbar.dataset.touchLabelsBound = 'true';
    var label = document.createElement('div');
    label.className = 'pdf-toolbar-touch-label';
    label.setAttribute('role', 'status');
    label.setAttribute('aria-live', 'polite');
    label.hidden = true;
    document.body.appendChild(label);
    var hideTimer = 0;
    function toolAt(event) {
      var target = event && Number.isFinite(event.clientX) ? document.elementFromPoint(event.clientX, event.clientY) : event && event.target;
      return target && target.closest ? target.closest('.pdf-app-toolbar .pdf-tool, .pdf-app-toolbar .pdf-tool-select') : null;
    }
    function nameFor(tool) {
      if (!tool) return '';
      return tool.getAttribute('aria-label') || tool.title || (tool.querySelector('.pdf-tool-label') && tool.querySelector('.pdf-tool-label').textContent.trim()) || tool.textContent.trim();
    }
    function show(tool) {
      var name = nameFor(tool); if (!name) return;
      var rect = tool.getBoundingClientRect();
      label.textContent = name;
      label.style.left = Math.max(10, Math.min(window.innerWidth - 10, rect.left + rect.width / 2)) + 'px';
      label.style.top = Math.min(window.innerHeight - 36, rect.bottom + 6) + 'px';
      label.hidden = false;
      window.requestAnimationFrame(function () { label.classList.add('is-visible'); });
      clearTimeout(hideTimer);
    }
    function hideSoon() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () { label.classList.remove('is-visible'); label.hidden = true; }, 180);
    }
    toolbar.addEventListener('pointerdown', function (event) { if (event.pointerType === 'touch') show(toolAt(event)); }, { passive: true });
    toolbar.addEventListener('pointermove', function (event) { if (event.pointerType === 'touch') show(toolAt(event)); }, { passive: true });
    toolbar.addEventListener('pointerup', hideSoon, { passive: true });
    toolbar.addEventListener('pointercancel', hideSoon, { passive: true });
    toolbar.addEventListener('touchstart', function (event) { show(toolAt(event.touches && event.touches[0])); }, { passive: true });
    toolbar.addEventListener('touchmove', function (event) { show(toolAt(event.touches && event.touches[0])); }, { passive: true });
    toolbar.addEventListener('touchend', hideSoon, { passive: true });
    toolbar.addEventListener('touchcancel', hideSoon, { passive: true });
  }

  function closePdf() {
    thumbnailRenderToken += 1;
    mainRenderToken += 1;
    state.file = null;
    state.pdf = null;
    state.pageOrder = [];
    state.currentPage = 1;
    state.pageRotations = {};
    state.selectedPages.clear();
    state.pageTexts = {};
    state.textReady = false;
    state.annotations = {};
    state.annotationImages = {};
    state.signatures = {};
    state.activeSignatureId = null;
    state.signatureImage = '';
    state.outline = [];
    state.imageFiles = [];
    state.mergeFiles = [];
    state.insertFiles = [];
    state.crop = { top: 0, right: 0, bottom: 0, left: 0 };
    state.zoom = 0.92;
    state.fitMode = 'fit-width';
    state.tool = 'select';
    var pdfInput = $('pdf-file-input');
    if (pdfInput) pdfInput.value = '';
    var thumbEmpty = $('pdf-thumb-empty');
    if (thumbEmpty) thumbEmpty.hidden = false;
    var fileName = $('pdf-file-name');
    if (fileName) fileName.textContent = IS_EN ? 'No PDF open' : '尚未開啟 PDF';
    var fileMeta = $('pdf-file-meta');
    if (fileMeta) fileMeta.textContent = IS_EN ? 'Drop a file to begin' : '拖放檔案即可開始';
    var readerStatus = $('pdf-reader-status');
    if (readerStatus) readerStatus.innerHTML = '<i class="fa-solid fa-lock"></i> ' + (IS_EN ? 'Waiting for file' : '等待檔案');
    var thumbnails = $('pdf-thumbnails');
    if (thumbnails) thumbnails.replaceChildren();
    var outline = $('pdf-outline-list');
    if (outline) outline.innerHTML = '<div class="pdf-sidebar-empty"><i class="fa-regular fa-compass"></i><span>' + (IS_EN ? 'Open a PDF to show its outline.' : '載入 PDF 後顯示目錄。') + '</span></div>';
    clearReaderFrame();
    setEmptyState(true);
    setStatus(IS_EN ? 'Choose or drop a PDF to begin' : messages.empty);
    setProgress(0);
    syncMobilePageControls();
    if ($('pdf-page-input')) $('pdf-page-input').value = '1';
    if ($('pdf-total-pages')) $('pdf-total-pages').textContent = '0';
    if ($('pdf-page-count-badge')) $('pdf-page-count-badge').textContent = IS_EN ? '0 pages' : '0 頁';
    resetEditHistory();
  }

  function closeMobileToolPanel() {
    if (!isMobileReader()) return;
    var panel = $('pdf-annotate-popover');
    if (!panel || panel.hidden) return;
    var closeButton = panel.querySelector('[data-popover-close]');
    if (closeButton) closeButton.click();
  }

  function bindToolbar() {
    qsa('[data-pdf-tool]').forEach(function (button) { button.addEventListener('click', function () { state.tool = button.dataset.pdfTool; qsa('[data-pdf-tool]').forEach(function (node) { node.classList.toggle('is-active', node === button); }); syncAnnotationWidthControl(); actionGuide(state.tool); closeMobileToolPanel(); if (state.pdf) renderMainPage(); }); });
    bindToolbarTouchLabels();
    var annotationWidth = $('annotation-width');
    if (annotationWidth) { annotationWidth.addEventListener('input', syncAnnotationWidthControl); annotationWidth.addEventListener('change', syncAnnotationWidthControl); }
    syncAnnotationWidthControl();
    $('pdf-undo')?.addEventListener('click', function () { if (undoEdit()) actionGuide('undo'); });
    $('pdf-redo')?.addEventListener('click', function () { if (redoEdit()) actionGuide('redo'); });
    $('pdf-open-button').addEventListener('click', function () { actionGuide('open'); $('pdf-file-input').click(); });
    $('pdf-fullscreen').addEventListener('click', function () { var shell = $('pdf-app-shell'); if (document.fullscreenElement) { document.exitFullscreen(); actionGuide('fullscreen'); } else if (shell.requestFullscreen) { shell.requestFullscreen(); actionGuide('fullscreen'); } });
    $('pdf-page-prev').addEventListener('click', function () { if (navigatePage(-1)) actionGuide('pagePrev'); });
    $('pdf-page-next').addEventListener('click', function () { if (navigatePage(1)) actionGuide('pageNext'); });
    $('pdf-page-input').addEventListener('change', function () { var page = Number(this.value); if (state.pageOrder.includes(page)) { state.currentPage = page; renderMainPage(); actionGuide('pageInput'); } else { this.value = String(state.currentPage); toast(IS_EN ? 'Enter a valid page number.' : '請輸入有效頁碼', { guide: true }); } });
    $('pdf-zoom-out').addEventListener('click', function () { state.fitMode = 'manual'; state.zoom = Math.max(.25, state.zoom - .1); renderMainPage(); actionGuide('zoomOut'); });
    $('pdf-zoom-in').addEventListener('click', function () { state.fitMode = 'manual'; state.zoom = Math.min(2.5, state.zoom + .1); renderMainPage(); actionGuide('zoomIn'); });
    $('pdf-fit-select').addEventListener('change', function () { state.fitMode = this.value; renderMainPage(); actionGuide('fit'); });
    $('pdf-rotate-left')?.addEventListener('click', function () { rotatePages(-90); actionGuide('rotateLeft'); }); $('pdf-rotate-right')?.addEventListener('click', function () { rotatePages(90); actionGuide('rotateRight'); }); $('pdf-rotate-180')?.addEventListener('click', function () { rotatePages(180); actionGuide('rotate180'); });
    var nightModeButton = $('pdf-night-mode');
    if (nightModeButton) {
      nightModeButton.setAttribute('aria-pressed', document.body.classList.contains('pdf-night-reading') ? 'true' : 'false');
      nightModeButton.addEventListener('click', function () {
        var enabled = document.body.classList.toggle('pdf-night-reading');
        this.classList.toggle('is-active', enabled);
        this.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        actionGuide('night');
      });
    }
    $('pdf-delete-pages').addEventListener('click', function () {     if (!state.pdf) return toast(messages.choosePdf);
    var pages = getSelectedOrCurrentPages(); if (pages.length >= state.pageOrder.length) return setStatus('至少保留一頁，無法全部刪除。', 'error');
    recordEditHistory();
    state.pageOrder = state.pageOrder.filter(function (page) { return !pages.includes(page); }); state.selectedPages.clear(); state.currentPage = state.pageOrder[0]; renderThumbnails(); renderMainPage(); updateSelectionStatus(); actionGuide('deletePages'); });
    $('pdf-export-pages').addEventListener('click', function () { actionGuide('exportPages'); var pages = state.selectedPages.size ? state.pageOrder.filter(function (page) { return state.selectedPages.has(page); }) : state.pageOrder; exportPdf(pages, safeName(state.file && state.file.name) + '-extracted.pdf'); });
    $('pdf-save').addEventListener('click', function () { actionGuide('export'); exportPdf(state.pageOrder, safeName(state.file && state.file.name) + '-edited.pdf'); });
    $('pdf-clear').addEventListener('click', function () { closePdf(); actionGuide('close'); });
    $('pdf-delete-signature').addEventListener('click', function () { var signature = selectedSignature(); if (!signature) return toast(IS_EN ? 'Select a signature first.' : '請先點選簽名'); recordEditHistory(); state.signatures[state.currentPage] = (state.signatures[state.currentPage] || []).filter(function (item) { return item.id !== signature.id; }); state.activeSignatureId = null; renderMainPage(); actionGuide('signatureDelete'); });
    $('pdf-signature-rotate-left').addEventListener('click', function () { var signature = selectedSignature(); if (!signature) return toast(IS_EN ? 'Select a signature first.' : '請先點選簽名'); recordEditHistory(); signature.rotation = (signature.rotation - 15 + 360) % 360; renderMainPage(); actionGuide('signatureRotate'); });
    $('pdf-signature-rotate-right').addEventListener('click', function () { var signature = selectedSignature(); if (!signature) return toast(IS_EN ? 'Select a signature first.' : '請先點選簽名'); recordEditHistory(); signature.rotation = (signature.rotation + 15) % 360; renderMainPage(); actionGuide('signatureRotate'); });
    $('pdf-download-current')?.addEventListener('click', function () { actionGuide('png'); renderAllImages('png'); }); $('pdf-download-jpg')?.addEventListener('click', function () { actionGuide('jpg'); renderAllImages('jpg'); });
    $('pdf-images-to-pdf')?.addEventListener('click', function () { actionGuide('imagesToPdf'); imagesToPdf(); }); $('pdf-merge-run')?.addEventListener('click', function () { actionGuide('merge'); mergePdfs(); }); $('pdf-merge-pick')?.addEventListener('click', function () { actionGuide('addPdfs'); $('merge-input')?.click(); }); $('pdf-images-pick')?.addEventListener('click', function () { actionGuide('addImages'); $('images-input')?.click(); }); $('pdf-lock-run')?.addEventListener('click', function () { actionGuide('lock'); encryptCurrentPdf(); });
    $('pdf-unlock-run')?.addEventListener('click', function () { actionGuide('unlock'); $('unlock-input')?.click(); }); $('unlock-input')?.addEventListener('change', function () { decryptLockPackage(this.files && this.files[0]); this.value = ''; });
    $('pdf-insert-page')?.addEventListener('click', function () { actionGuide('insert'); $('insert-input')?.click(); }); $('insert-input')?.addEventListener('change', function () { insertPdfPages(this.files); this.value = ''; });
    $('pdf-crop-run')?.addEventListener('click', function () { var margin = Math.max(0, Math.min(240, Number(($('crop-margin') || {}).value) || 0));     if (!state.pdf) return toast(messages.choosePdf); recordEditHistory(); state.crop = { top: margin, right: margin, bottom: margin, left: margin }; actionGuide('crop'); });
    $('pdf-compress-run')?.addEventListener('click', function () { actionGuide('compress'); compressCurrentPdf(); });
    $('pdf-page-flow')?.addEventListener('change', function () { var stage = $('pdf-reader-stage'); if (stage) stage.classList.toggle('is-horizontal-flow', this.value === 'horizontal'); actionGuide('pageFlow'); });
    $('pdf-split-run').addEventListener('click', function () { if (!state.pdf) return toast(messages.choosePdf); actionGuide('split'); var raw = String($('split-range').value || '').trim(); var result = parseRange(raw, state.pageOrder.length); if (!result.length) return setStatus(IS_EN ? 'Enter a valid range such as 1-3,5.' : '請輸入有效頁碼範圍，例如 1-3,5。', 'error'); exportPdf(result, safeName(state.file.name) + '-split.pdf'); });
  }

  function parseRange(value, max) {
    var output = []; String(value || '').split(',').forEach(function (token) { var clean = token.trim(); if (!clean) return; if (/^\d+\s*-\s*\d+$/.test(clean)) { var parts = clean.split('-').map(Number); var start = Math.min(parts[0], parts[1]); var end = Math.max(parts[0], parts[1]); for (var i = start; i <= end; i += 1) if (i >= 1 && i <= max && !output.includes(i)) output.push(i); } else if (/^\d+$/.test(clean)) { var page = Number(clean); if (page >= 1 && page <= max && !output.includes(page)) output.push(page); } }); return output;
  }

  function bindPopovers() {
    var openPopover = null;
    var mobileHistoryPushed = false;
    var mobileScrim = document.createElement('div');
    mobileScrim.className = 'pdf-popover-scrim';
    mobileScrim.hidden = true;
    mobileScrim.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mobileScrim);

    function isMobilePopover() { return Boolean(window.matchMedia && window.matchMedia('(max-width: 767px)').matches); }
    function toggleFor(panel) { return panel ? document.querySelector('[data-popover-target="' + panel.id + '"]') : null; }
    function restorePanel(panel) {
      if (!panel || !panel.__pdfPopoverOrigin || panel.__pdfPopoverOrigin.parent && !panel.__pdfPopoverOrigin.parent.isConnected) return;
      var origin = panel.__pdfPopoverOrigin;
      panel.classList.remove('is-mobile-sheet');
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
      panel.removeAttribute('aria-label');
      panel.removeAttribute('tabindex');
      panel.dataset.pdfPortalled = 'false';
      if (origin.next && origin.next.parentNode === origin.parent) origin.parent.insertBefore(panel, origin.next);
      else origin.parent.appendChild(panel);
      panel.__pdfPopoverOrigin = null;
    }
    function portalPanel(panel) {
      if (!panel || panel.dataset.pdfPortalled === 'true') return;
      panel.__pdfPopoverOrigin = { parent: panel.parentNode, next: panel.nextSibling };
      panel.dataset.pdfPortalled = 'true';
      panel.classList.add('is-mobile-sheet');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      var heading = panel.querySelector('.pdf-popover-head strong');
      if (heading) panel.setAttribute('aria-label', heading.textContent.trim());
      panel.setAttribute('tabindex', '-1');
      document.body.appendChild(panel);
    }
    function closePopover(panel, fromHistory) {
      if (!panel) return;
      panel.hidden = true;
      var toggle = toggleFor(panel);
      if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.classList.remove('is-active'); }
      var wasOpen = openPopover === panel;
      if (wasOpen) openPopover = null;
      if (panel.dataset.pdfPortalled === 'true') restorePanel(panel);
      if (!openPopover) {
        mobileScrim.hidden = true;
        document.body.classList.remove('pdf-popover-open');
        if (mobileHistoryPushed && !fromHistory) {
          mobileHistoryPushed = false;
          try { window.history.back(); } catch (_) {}
        }
      }
      if (wasOpen && toggle && !fromHistory) {
        try { toggle.focus({ preventScroll: true }); } catch (_) { toggle.focus(); }
      }
    }
    function closeAll(fromHistory) { qsa('.pdf-toolbar-popover').forEach(function (panel) { closePopover(panel, fromHistory); }); }
    function openPopoverPanel(panel, toggle) {
      if (isMobilePopover()) {
        portalPanel(panel);
        mobileScrim.hidden = false;
        document.body.classList.add('pdf-popover-open');
        if (!mobileHistoryPushed) {
          try { window.history.pushState({ gugoproPdfPopover: panel.id }, '', window.location.href); mobileHistoryPushed = true; } catch (_) {}
        }
      }
      panel.hidden = false;
      panel.scrollTop = 0;
      toggle.setAttribute('aria-expanded', 'true');
      toggle.classList.add('is-active');
      openPopover = panel;
      var closeButton = panel.querySelector('[data-popover-close]');
      if (closeButton) {
        window.setTimeout(function () { try { closeButton.focus({ preventScroll: true }); } catch (_) {} }, 0);
      }
      var guideKey = panel.id === 'pdf-annotate-popover' ? 'annotationPanel' : panel.id === 'pdf-pages-popover' ? 'pagesPanel' : 'convertPanel';
      actionGuide(guideKey);
    }
    qsa('[data-popover-target]').forEach(function (toggle) {
      toggle.setAttribute('aria-controls', toggle.dataset.popoverTarget);
      toggle.setAttribute('aria-haspopup', 'dialog');
      toggle.addEventListener('click', function (event) {
        event.stopPropagation();
        var panel = $(toggle.dataset.popoverTarget); if (!panel) return;
        var opening = panel.hidden;
        var switching = Boolean(openPopover && openPopover !== panel && mobileHistoryPushed);
        closeAll(switching);
        if (opening) openPopoverPanel(panel, toggle);
      });
    });
    qsa('[data-popover-close]').forEach(function (button) { button.addEventListener('click', function (event) { event.stopPropagation(); closePopover($(button.dataset.popoverClose)); }); });
    mobileScrim.addEventListener('click', function () { closeAll(); });
    document.addEventListener('click', function (event) { if (openPopover && !event.target.closest('.pdf-popover-wrap, .pdf-toolbar-popover')) closeAll(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && openPopover) { event.preventDefault(); closeAll(); } });
    window.addEventListener('popstate', function () { if (openPopover && mobileHistoryPushed) { mobileHistoryPushed = false; closeAll(true); } });
  }

  function bindAi() {
    loadPresetWorkspaces(); renderPresetWorkspace(presetActiveAction);
    qsa('[data-ai-tab]').forEach(function (button) { button.addEventListener('click', function () { if (button.dataset.aiTab === 'preset') renderPresetWorkspace(presetActiveAction); switchAiTab(button.dataset.aiTab); }); });
    $('pdf-chat-send')?.addEventListener('click', function () { handleChat(); });
    $('pdf-chat-input')?.addEventListener('keydown', function (event) { if (event.isComposing) return; if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleChat(); } });
    $('pdf-chat-input')?.addEventListener('input', function () { this.style.height = 'auto'; this.style.height = Math.min(132, Math.max(28, this.scrollHeight)) + 'px'; });
    if ($('pdf-chat-input')) $('pdf-chat-input').dispatchEvent(new Event('input', { bubbles: true }));
    $('pdf-chat-more')?.addEventListener('click', function (event) { event.stopPropagation(); toggleMoreMenu('pdf-chat-more-menu'); });
    qsa('[data-chat-more]').forEach(function (button) { button.addEventListener('click', function () { handleMoreAction('custom', button.dataset.chatMore); }); });
    $('pdf-ai-retry')?.addEventListener('click', function () { if (pendingChatRetry) handleChat(pendingChatRetry); });
    $('pdf-summary-run')?.addEventListener('click', handleSummary); $('pdf-risk-run')?.addEventListener('click', handleRisk); $('pdf-translate-run')?.addEventListener('click', handleTranslate); $('pdf-translate-current')?.addEventListener('click', populateCurrentPageText);
    qsa('[data-task-action]').forEach(function (button) { button.addEventListener('click', function () { selectPresetAction(button.dataset.taskAction); }); });
    $('pdf-preset-run')?.addEventListener('click', function () { runTaskMatrixAction(presetActiveAction); });
    $('pdf-preset-send')?.addEventListener('click', handlePresetFollowup);
    $('pdf-preset-input')?.addEventListener('keydown', function (event) { if (event.isComposing) return; if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handlePresetFollowup(); } });
    $('pdf-preset-input')?.addEventListener('input', function () { this.style.height = 'auto'; this.style.height = Math.min(132, Math.max(28, this.scrollHeight)) + 'px'; });
    $('pdf-preset-more')?.addEventListener('click', function (event) { event.stopPropagation(); toggleMoreMenu('pdf-preset-more-menu'); });
    qsa('[data-preset-more]').forEach(function (button) { button.addEventListener('click', function () { handleMoreAction('preset', button.dataset.presetMore); }); });
    $('pdf-ai-expand')?.addEventListener('click', toggleAiExpanded);
    document.addEventListener('click', function (event) { if (!event.target.closest('.pdf-composer-shell')) closeMoreMenus(); });
    $('pdf-open-models')?.addEventListener('click', function () { if (window.GugoProPdfRooms) window.GugoProPdfRooms.openDrawer(true); });
    $('pdf-model-close')?.addEventListener('click', closeModelDrawer); $('pdf-key-close')?.addEventListener('click', closeKeyModal);
    qsa('.pdf-model-drawer, .pdf-modal').forEach(function (overlay) { overlay.addEventListener('click', function (event) { if (event.target === overlay) overlay.classList.remove('is-open'); }); });
  }

  function syncMobilePageControls() {
    var current = $('pdf-mobile-current-page'); var total = $('pdf-mobile-total-pages'); var input = $('pdf-mobile-page-input');
    if (current) current.textContent = String(state.currentPage || 1);
    if (total) total.textContent = String(state.pageOrder.length || (state.pdf && state.pdf.numPages) || 0);
    if (input) { input.value = String(state.currentPage || 1); input.max = String(state.pageOrder.length || (state.pdf && state.pdf.numPages) || 1); }
  }

  function navigatePage(delta) {
    if (!state.pdf) { toast(messages.choosePdf); return false; }
    var index = state.pageOrder.indexOf(state.currentPage); if (index < 0) index = 0;
    var nextIndex = Math.max(0, Math.min(state.pageOrder.length - 1, index + delta));
    if (nextIndex === index) { toast(delta < 0 ? (IS_EN ? 'Already on the first page.' : '已經是第一頁') : (IS_EN ? 'Already on the last page.' : '已經是最後一頁')); return false; }
    state.currentPage = state.pageOrder[nextIndex]; renderMainPage(); syncMobilePageControls();
    return true;
  }

  function syncMobileOverlayHistory(open, options) {
    if (!window.history || !window.history.replaceState) return;
    var fromPopState = options && options.fromPopState;
    var skipHistory = options && options.skipHistory;
    var hasOverlayEntry = Boolean(window.history.state && window.history.state.pdfSuiteOverlay);
    if (open) {
      if (mobileOverlayBackTimer) { window.clearTimeout(mobileOverlayBackTimer); mobileOverlayBackTimer = 0; }
      if (!hasOverlayEntry) window.history.pushState(Object.assign({}, window.history.state || {}, { pdfSuiteOverlay: true }), '', window.location.href);
    } else if (!fromPopState && !skipHistory && hasOverlayEntry && !mobileOverlayBackTimer) {
      mobileOverlayBackTimer = window.setTimeout(function () {
        mobileOverlayBackTimer = 0;
        if (window.history.state && window.history.state.pdfSuiteOverlay) window.history.back();
      }, 0);
    }
  }

  function setMobileSidebar(open, options) {
    var sidebar = $('pdf-sidebar'); var button = $('pdf-mobile-thumbnails');
    if (!sidebar) return;
    if (open) setMobileAi(false, { skipHistory: true });
    sidebar.classList.toggle('is-mobile-open', Boolean(open));
    if (open) actionGuide('thumbnails');
    sidebar.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (button) button.classList.toggle('is-active', Boolean(open));
    syncMobileOverlayHistory(Boolean(open), options);
  }

  function setMobileAi(open, options) {
    var pane = $('pdf-ai-pane');
    if (!pane) return;
    if (open) setMobileSidebar(false, { skipHistory: true });
    pane.classList.toggle('is-mobile-open', Boolean(open));
    if (open) actionGuide('ai');
    pane.setAttribute('aria-hidden', open ? 'false' : 'true');
    var button = $('pdf-mobile-ai');
    if (button) button.classList.toggle('is-active', Boolean(open));
    syncMobileOverlayHistory(Boolean(open), options);
  }

  function distanceBetween(first, second) {
    var dx = first.clientX - second.clientX; var dy = first.clientY - second.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function bindMobileReaderControls() {
    if (window.history && window.history.replaceState) {
      var initialHistoryState = Object.assign({}, window.history.state || {});
      delete initialHistoryState.pdfSuiteOverlay;
      window.history.replaceState(initialHistoryState, '', window.location.href);
      window.addEventListener('popstate', function () {
        setMobileSidebar(false, { skipHistory: true, fromPopState: true });
        setMobileAi(false, { skipHistory: true, fromPopState: true });
      });
    }
    $('pdf-mobile-page-prev')?.addEventListener('click', function () { if (navigatePage(-1)) actionGuide('pagePrev'); });
    $('pdf-mobile-page-next')?.addEventListener('click', function () { if (navigatePage(1)) actionGuide('pageNext'); });
    $('pdf-mobile-page-input')?.addEventListener('change', function () { if (!state.pdf) return toast(messages.choosePdf); var page = Number(this.value); if (state.pageOrder.includes(page)) { state.currentPage = page; renderMainPage(); syncMobilePageControls(); actionGuide('pageInput'); } else { this.value = String(state.currentPage); toast(IS_EN ? 'Enter a valid page number.' : '請輸入有效頁碼', { guide: true }); } });
    $('pdf-empty-open')?.addEventListener('click', function () { actionGuide('open'); $('pdf-file-input')?.click(); });
    $('pdf-mobile-thumbnails')?.addEventListener('click', function () { setMobileSidebar(true); });
    $('pdf-mobile-ai')?.addEventListener('click', function () { var pane = $('pdf-ai-pane'); setMobileAi(!pane || !pane.classList.contains('is-mobile-open')); });
    $('pdf-mobile-ai-close')?.addEventListener('click', function () { setMobileAi(false); actionGuide('aiBack'); });
    $('pdf-sidebar-close-mobile')?.addEventListener('click', function () { setMobileSidebar(false); actionGuide('aiBack'); });
    var stage = $('pdf-reader-stage'); var startX = 0; var startY = 0; var pinch = null; var pinchFrame = 0; var gestureWasPinch = false;
    function pinchSurface() { return isMobileReader() ? $('pdf-continuous-stack') : $('pdf-page-frame'); }
    function resetPinchVisual(surface) {
      if (!surface) return;
      surface.style.transform = 'none';
      surface.style.transformOrigin = '';
      surface.style.marginBottom = '';
      surface.style.marginRight = '';
    }
    function renderPinchFrame() {
      pinchFrame = 0;
      if (!pinch) return;
      var surface = pinchSurface();
      var baseZoom = Math.max(.25, Number(pinch.baseZoom) || Number(surface && surface.dataset.renderZoom) || .92);
      var visualScale = Math.max(.25, Math.min(4, state.zoom / baseZoom));
      if (surface) {
        surface.style.transformOrigin = Math.max(0, pinch.originX) + 'px ' + Math.max(0, pinch.originY) + 'px';
        surface.style.transform = 'scale(' + visualScale + ')';
        var surfaceHeight = surface.offsetHeight || 0;
        var surfaceWidth = surface.offsetWidth || 0;
        surface.style.marginBottom = Math.max(0, (visualScale - 1) * surfaceHeight) + 'px';
        surface.style.marginRight = Math.max(0, (visualScale - 1) * surfaceWidth / 2) + 'px';
      }
      syncZoomLabel(state.zoom);
    }
    function schedulePinchRender() { if (!pinchFrame) pinchFrame = window.requestAnimationFrame ? window.requestAnimationFrame(renderPinchFrame) : setTimeout(renderPinchFrame, 16); }
    function updatePinch(first, second, event) {
      if (!pinch) return;
      if (event && event.cancelable) event.preventDefault();
      var ratio = distanceBetween(first, second) / Math.max(1, pinch.distance);
      state.fitMode = 'manual'; state.zoom = Math.max(.25, Math.min(4, pinch.zoom * ratio));
      schedulePinchRender();
    }
    function restorePinchAnchor(anchor) {
      if (!anchor) return;
      var reader = $('pdf-reader-stage');
      var surface = pinchSurface();
      if (!reader || !surface) return;
      var ratio = Math.max(.25, Math.min(4, anchor.finalZoom / Math.max(.25, anchor.baseZoom)));
      var rect = surface.getBoundingClientRect();
      var anchoredX = rect.left + anchor.originX * ratio;
      var anchoredY = rect.top + anchor.originY * ratio;
      reader.scrollLeft += anchoredX - anchor.centerX;
      reader.scrollTop += anchoredY - anchor.centerY;
    }
    function commitPinch() {
      if (!pinch) return;
      var surface = pinchSurface();
      var anchor = {
        centerX: pinch.centerX,
        centerY: pinch.centerY,
        originX: pinch.originX,
        originY: pinch.originY,
        baseZoom: pinch.baseZoom,
        finalZoom: state.zoom
      };
      if (surface) surface.dataset.keepPinchVisual = 'true';
      pinch = null;
      if (state.pdf) {
        renderMainPage().then(function () { window.requestAnimationFrame(function () { restorePinchAnchor(anchor); }); });
      } else resetPinchVisual(surface);
    }
    function finishTouchSwipe(point) {
      if (!point || gestureWasPinch || state.tool !== 'select') return;
      var dx = point.clientX - startX; var dy = point.clientY - startY;
      if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.25) navigatePage(dx < 0 ? 1 : -1);
    }
    if (stage && window.PointerEvent) {
      var pointers = new Map();
      function endPointer(event) {
        var point = { clientX: event.clientX, clientY: event.clientY };
        if (pinch && pointers.size >= 2) {
          var finalPoints = Array.from(pointers.entries()).map(function (entry) { return entry[0] === event.pointerId ? point : entry[1]; });
          updatePinch(finalPoints[0], finalPoints[1], null);
        }
        pointers.delete(event.pointerId);
        if (pointers.size < 2 && pinch) commitPinch();
        if (!pointers.size) { finishTouchSwipe(point); gestureWasPinch = false; }
      }
      stage.addEventListener('pointerdown', function (event) {
        if (event.pointerType !== 'touch') return;
        if (stage.setPointerCapture) {
          try { stage.setPointerCapture(event.pointerId); } catch (_) {}
        }
        pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
        if (pointers.size === 1) { startX = event.clientX; startY = event.clientY; }
        if (pointers.size >= 2) {
          var points = Array.from(pointers.values());
          var surface = pinchSurface();
          var surfaceRect = surface ? surface.getBoundingClientRect() : { left: 0, top: 0 };
          var centerX = (points[0].clientX + points[1].clientX) / 2;
          var centerY = (points[0].clientY + points[1].clientY) / 2;
          state.fitMode = 'manual';
          pinch = { distance: distanceBetween(points[0], points[1]), zoom: Math.max(.25, state.zoom || .92), baseZoom: Math.max(.25, Number(surface && surface.dataset.renderZoom) || state.zoom || .92), centerX: centerX, centerY: centerY, originX: centerX - surfaceRect.left, originY: centerY - surfaceRect.top };
          gestureWasPinch = true;
          schedulePinchRender();
        }
      }, { passive: false });
      stage.addEventListener('pointermove', function (event) {
        if (event.pointerType !== 'touch' || !pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
        if (pinch && pointers.size >= 2) { var points = Array.from(pointers.values()); updatePinch(points[0], points[1], event); }
      }, { passive: false });
      stage.addEventListener('pointerup', endPointer, { passive: true });
      stage.addEventListener('pointercancel', endPointer, { passive: true });
      stage.addEventListener('pointerleave', function (event) { if (event.pointerType === 'touch' && pointers.has(event.pointerId) && pinch) endPointer(event); }, { passive: true });
    } else if (stage) {
      stage.addEventListener('touchstart', function (event) {
        var touches = event.touches || [];
        if (touches.length >= 2) {
          var surface = pinchSurface();
          var surfaceRect = surface ? surface.getBoundingClientRect() : { left: 0, top: 0 };
          var centerX = (touches[0].clientX + touches[1].clientX) / 2;
          var centerY = (touches[0].clientY + touches[1].clientY) / 2;
          state.fitMode = 'manual';
          pinch = { distance: distanceBetween(touches[0], touches[1]), zoom: Math.max(.25, state.zoom || .92), baseZoom: Math.max(.25, Number(surface && surface.dataset.renderZoom) || state.zoom || .92), centerX: centerX, centerY: centerY, originX: centerX - surfaceRect.left, originY: centerY - surfaceRect.top };
          gestureWasPinch = true;
          schedulePinchRender();
        }
        else { var touch = event.changedTouches && event.changedTouches[0]; if (touch) { startX = touch.clientX; startY = touch.clientY; } }
      }, { passive: true });
      stage.addEventListener('touchmove', function (event) {
        var touches = event.touches || [];
        if (pinch && touches.length >= 2) updatePinch(touches[0], touches[1], event);
      }, { passive: false });
      stage.addEventListener('touchend', function (event) {
        var touch = event.changedTouches && event.changedTouches[0];
        var touches = event.touches || [];
        if (pinch && touches.length >= 1 && touch) updatePinch(touches[0], touch, null);
        if ((!touches || touches.length < 2) && pinch) commitPinch();
        if (!event.touches || !event.touches.length) { finishTouchSwipe(touch); gestureWasPinch = false; }
      }, { passive: true });
      stage.addEventListener('touchcancel', function () { if (pinch) { var surface = pinchSurface(); pinch = null; resetPinchVisual(surface); if (state.pdf) renderMainPage(); } gestureWasPinch = false; }, { passive: true });
    }
  }

  function bindSidebar() {
    qsa('[data-sidebar]').forEach(function (button) { button.addEventListener('click', function () { setSidebarTab(button.dataset.sidebar); actionGuide('sidebarTab'); }); });
    bindMobileReaderControls();
  }

  function bindHistoryShortcuts() {
    document.addEventListener('keydown', function (event) {
      if (event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return;
      var target = event.target;
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      var key = String(event.key || '').toLowerCase();
      if (key === 'z' && event.shiftKey) { event.preventDefault(); redoEdit(); }
      else if (key === 'z') { event.preventDefault(); undoEdit(); }
      else if (key === 'y') { event.preventDefault(); redoEdit(); }
    });
  }

  function init() {
    addFileInputListeners(); bindPopovers(); bindToolbar(); bindAi(); bindSidebar(); bindHistoryShortcuts(); initSignaturePad(); initAi(); setEmptyState(true); syncMobilePageControls(); syncHistoryButtons(); renderNotesPanel();
    $('pdf-page-input').value = '1'; $('pdf-total-pages').textContent = '0';
    syncVisualViewportHeight();
    window.addEventListener('resize', function () { syncVisualViewportHeight(); if (state.pdf && state.fitMode !== 'manual') renderMainPage(); });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncVisualViewportHeight, { passive: true });
      window.visualViewport.addEventListener('scroll', syncVisualViewportHeight, { passive: true });
    }
    window.addEventListener('error', function (event) { if (event && event.message && /pdf/i.test(event.message)) setStatus('前端 PDF 模組錯誤：' + event.message, 'error'); });
  }

  function getSnapshot() {
    return { file: state.file, pdf: state.pdf, pageOrder: state.pageOrder.slice(), currentPage: state.currentPage, pageRotations: Object.assign({}, state.pageRotations), pageTexts: Object.assign({}, state.pageTexts), textReady: state.textReady, zoom: state.zoom, fitMode: state.fitMode, tool: state.tool, annotations: JSON.parse(JSON.stringify(state.annotations || {})), annotationImages: Object.assign({}, state.annotationImages), signatures: JSON.parse(JSON.stringify(state.signatures || {})), activeSignatureId: state.activeSignatureId, outline: JSON.parse(JSON.stringify(state.outline || {})) };
  }
  async function restoreSnapshot(snapshot) {
    if (!snapshot || !snapshot.pdf) { clearReaderFrame(); setEmptyState(true); return; }
    state.file = snapshot.file || null; state.pdf = snapshot.pdf; state.pageOrder = Array.isArray(snapshot.pageOrder) ? snapshot.pageOrder.slice() : []; state.currentPage = Number(snapshot.currentPage) || state.pageOrder[0] || 1; state.pageRotations = Object.assign({}, snapshot.pageRotations || {}); state.pageTexts = Object.assign({}, snapshot.pageTexts || {}); state.textReady = Boolean(snapshot.textReady); state.zoom = Number(snapshot.zoom) || .92; state.fitMode = snapshot.fitMode || 'fit-width'; state.tool = snapshot.tool || 'select'; state.annotations = JSON.parse(JSON.stringify(snapshot.annotations || {})); state.annotationImages = Object.assign({}, snapshot.annotationImages || {}); state.signatures = JSON.parse(JSON.stringify(snapshot.signatures || {})); state.activeSignatureId = snapshot.activeSignatureId || null; state.outline = JSON.parse(JSON.stringify(snapshot.outline || []));
    setEmptyState(false); $('pdf-file-name').textContent = state.file ? state.file.name : 'PDF 文字層備份'; $('pdf-file-meta').textContent = state.pageOrder.length + ' 頁 · 本機房間內容'; $('pdf-total-pages').textContent = state.pageOrder.length; $('pdf-page-count-badge').textContent = state.pageOrder.length + ' 頁'; if ($('pdf-thumb-empty')) $('pdf-thumb-empty').hidden = true; await renderThumbnails(); await renderOutline(); await renderMainPage(); renderNotesPanel();
  }
  window.GugoProPdfSuite = { loadPdf: loadPdf, extractAllText: extractAllText, getSnapshot: getSnapshot, restoreSnapshot: restoreSnapshot, clearViewer: function () { if ($('pdf-clear')) $('pdf-clear').click(); }, switchAiTab: switchAiTab, executeTask: executeTask, runTaskMatrixAction: runTaskMatrixAction, getSignatureLibrary: getSignatureLibrary, getState: function () { return state; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
