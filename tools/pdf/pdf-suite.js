(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var qs = function (selector, root) { return (root || document).querySelector(selector); };
  var qsa = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  var state = {
    file: null,
    pdf: null,
    documentKind: 'pdf',
    documentText: '',
    documentImageDataUrl: '',
    documentImageWidth: 0,
    documentImageHeight: 0,
    documentImageMime: '',
    pageOrder: [],
    currentPage: 1,
    bookmarks: [],
    pageRotations: {},
    selectedPages: new Set(),
    pageTexts: {},
    pdfTextItems: {},
    textReady: false,
    zoom: 0.92,
    fitMode: 'fit-width',
    tool: 'select',
    annotations: {},
    textEdits: {},
    activeTextSelection: null,
    inlineTextEditor: null,
    activeEditorAction: 'edit',
    editorMode: false,
    mobileSubdock: '',
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
      textEdits: cloneValue(state.textEdits || {}),
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
    var mobileUndo = $('pdf-mobile-undo'); var mobileRedo = $('pdf-mobile-redo');
    [[undo, 'undo'], [redo, 'redo'], [mobileUndo, 'undo'], [mobileRedo, 'redo']].forEach(function (entry) {
      var control = entry[0]; var key = entry[1]; if (!control) return;
      var enabled = Boolean(state.pdf && editHistory[key].length);
      control.disabled = false; control.setAttribute('aria-disabled', enabled ? 'false' : 'true'); control.classList.toggle('is-format-disabled', !enabled);
      var title = control.dataset.baseCapabilityTitle || control.getAttribute('aria-label') || '';
      if (!enabled) { control.dataset.disabledReason = getToolUnavailableReason(key); control.setAttribute('title', (title ? title + ' — ' : '') + control.dataset.disabledReason); }
      else if (title) control.setAttribute('title', title);
    });
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
    state.textEdits = cloneValue(snapshot.textEdits || {});
    closeInlineTextEditor(false);
    state.activeTextSelection = null;
    state.activeEditorAction = 'edit';
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
    if (state.inlineTextEditor) closeInlineTextEditor(false);
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
    if (state.inlineTextEditor) closeInlineTextEditor(false);
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
  var IS_EN = document.documentElement.lang === 'en';
  var messages = IS_EN ? {
    empty: 'Choose or drop a document first.',
    loading: 'Reading the document locally…',
    ready: 'Document loaded; all files stay in this browser.',
    noText: 'This document has no readable text layer; image files can still be sent to AI for visual analysis.',
    choosePdf: 'Open a document first.',
    localNote: 'Completed locally.'
  } : {
    empty: '請先拖入或選擇文件。',
    loading: '正在本機讀取文件…',
    ready: '文件已載入，所有檔案均留在此瀏覽器。',
    noText: '目前文件沒有可讀取的文字層；圖片仍可直接交給 AI 進行視覺分析。',
    choosePdf: '請先選擇文件。',
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
    open: { zh: '💡 請選擇要開啟的文件；檔案只會留在這個瀏覽器本機處理。', en: '💡 Choose a document to open; the file stays local in this browser.' },
    undo: { zh: '💡 已復原上一步編輯；可繼續修改，或按重做恢復。', en: '💡 The last edit was undone; keep editing or use Redo to restore it.' },
    redo: { zh: '💡 已重做上一步編輯；可繼續檢查文件。', en: '💡 The edit was restored; continue checking the document.' },
    fullscreen: { zh: '💡 已切換全螢幕閱讀；按瀏覽器返回或全螢幕鍵即可離開。', en: '💡 Full-screen reading is active; use the browser back or full-screen control to leave.' },
    export: { zh: '💡 正在準備另存新檔；完成後可在下載項目查看。', en: '💡 Preparing the Save As file; check your downloads when it finishes.' },
    close: { zh: '💡 文件已關閉；可重新選擇檔案開始新的工作。', en: '💡 The document is closed; choose another file to start a new task.' },
    pagePrev: { zh: '💡 已回到上一頁；可繼續使用頁碼或左右箭頭瀏覽。', en: '💡 Moved to the previous page; use the page field or arrows to continue.' },
    pageNext: { zh: '💡 已前往下一頁；可繼續使用頁碼或左右箭頭瀏覽。', en: '💡 Moved to the next page; use the page field or arrows to continue.' },
    pageInput: { zh: '💡 已跳到指定頁；可直接在目前頁面閱讀或標註。', en: '💡 Jumped to the requested page; you can read or annotate it now.' },
    zoomOut: { zh: '💡 文件已縮小；可用手指雙指縮放，或按放大恢復細節。', en: '💡 The document is zoomed out; pinch or use Zoom in to inspect detail.' },
    zoomIn: { zh: '💡 文件已放大；可用單指拖曳閱讀目前區域。', en: '💡 The document is zoomed in; drag with one finger to read the current area.' },
    fit: { zh: '💡 已套用新的檢視比例；需要細節時可切換手動或雙指放大。', en: '💡 The viewing scale was updated; use Manual or pinch to inspect detail.' },
    pageFlow: { zh: '💡 已切換頁面排列方向；可在閱讀區滑動檢查頁面順序。', en: '💡 Page flow changed; scroll the reader to check the page order.' },
    night: { zh: '💡 夜間閱讀已切換；文件內容會以較低刺激的色彩顯示。', en: '💡 Night reading was toggled; the document now uses a lower-glare presentation.' },
    annotationPanel: { zh: '💡 標註工具已開啟：先選工具，再在可編輯頁面拖曳或點擊。', en: '💡 Annotation tools are open: choose a tool, then drag or tap on an editable page.' },
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
    insert: { zh: '💡 請選擇要插入的 PDF；頁面會加入目前 PDF 文件。', en: '💡 Choose a PDF to insert; its pages will be added to the current PDF.' },
    crop: { zh: '💡 請設定裁切邊界（pt）後套用；裁切會在匯出時生效。', en: '💡 Set the crop margin in points and apply it; cropping takes effect on export.' },
    compress: { zh: '💡 正在準備壓縮 PDF；完成後請查看下載項目。', en: '💡 Preparing the compressed PDF; check your downloads when it finishes.' },
    rotateLeft: { zh: '💡 頁面已左轉 90°；可繼續調整或匯出檢查結果。', en: '💡 The page was rotated left 90°; continue adjusting or export to check it.' },
    rotateRight: { zh: '💡 頁面已右轉 90°；可繼續調整或匯出檢查結果。', en: '💡 The page was rotated right 90°; continue adjusting or export to check it.' },
    rotate180: { zh: '💡 頁面已旋轉 180°；可繼續調整或匯出檢查結果。', en: '💡 The page was rotated 180°; continue adjusting or export to check it.' },
    convertPanel: { zh: '💡 PDF 保護與轉檔工具已開啟：先填欄位，再按需要的輸出或安全動作。', en: '💡 PDF security and conversion tools are open: fill the fields, then choose an output or security action.' },
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
    search: { zh: '💡 請輸入關鍵字搜尋文件；點擊結果即可跳到對應頁面。', en: '💡 Enter a keyword to search the document; tap a result to jump to its page.' },
    aiBack: { zh: '💡 已返回文件閱讀畫面；可繼續閱讀或使用上方工具列。', en: '💡 Returned to the document reader; continue reading or use the toolbar.' },
    sidebarTab: { zh: '💡 已切換側欄檢視；點擊縮圖可直接跳到該頁。', en: '💡 Sidebar view changed; tap a thumbnail to jump to that page.' },
    universal: { zh: '💡 另存新檔已完成；檔案只在本機建立並下載。', en: '💡 Save As finished; the file was created and downloaded locally.' },
    universalPanel: { zh: '💡 另存新檔面板已開啟；請選擇輸出格式，再按「另存並下載」。', en: '💡 Save As is open; choose an output format, then select Save and Download.' },
    editorOpen: { zh: '💡 已進入 PDF 編輯模式；請從下方工具列選擇操作。', en: '💡 PDF editing mode is open; choose an action from the tool strip below.' },
    editorClose: { zh: '💡 已離開 PDF 編輯模式；文件內容仍保留在閱讀畫面。', en: '💡 PDF editing mode is closed; the document remains in the reader.' },
    textEdit: { zh: '💡 文字編輯已啟用；直接點擊 PDF 文字，該文字會原地變成可打字狀態。', en: '💡 Text editing is active; click text in the PDF and type directly on the page.' },
    textEditReady: { zh: '💡 已進入即地編輯：直接在原文字上打字；點擊其他位置會自動保存。', en: '💡 Direct editing is active: type on the original text; clicking elsewhere saves automatically.' },
    textEditCanceled: { zh: '💡 已取消這次文字編輯，原內容保持不變。', en: '💡 This text edit was canceled; the original content is unchanged.' },
    copyText: { zh: '💡 複製文字已啟用；請點選 PDF 中的文字區塊。', en: '💡 Copy text is active; click a text block in the PDF.' },
    deleteText: { zh: '💡 刪除文字已啟用；請點選要移除的 PDF 文字區塊。', en: '💡 Delete text is active; click the PDF text block to remove it.' },
    textEdited: { zh: '💡 修改已自動保存到文件；完成後按「儲存 PDF」下載。', en: '💡 Your change is saved in the document; choose Save PDF when finished.' },
    textDeleted: { zh: '💡 文字已移除；可按復原恢復，或按「儲存 PDF」下載。', en: '💡 Text removed; use Undo to restore it or Save PDF to download.' },
    areaHighlight: { zh: '💡 區域高亮已啟用；請在 PDF 上拖曳框選要突出的區域。', en: '💡 Area highlight is active; drag a box over the area to emphasize.' },
    color: { zh: '💡 請選擇下一個標註的顏色；選完即可繼續編輯。', en: '💡 Choose the color for the next annotation, then continue editing.' },
    fill: { zh: '💡 填寫模式已啟用；點擊 PDF 位置後直接輸入，點擊其他位置會自動保存。', en: '💡 Fill mode is active; click a PDF position and type directly; clicking elsewhere saves automatically.' },
    mobileSubdockClose: { zh: '💡 已返回主工具列；可繼續閱讀或選擇其他文件操作。', en: '💡 Returned to the primary toolbar; continue reading or choose another document action.' }
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
        if (!window.pdfjsLib) return reject(new Error(IS_EN ? 'pdf.js was unavailable after loading.' : 'pdf.js 載入後不可用。'));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
        resolve(window.pdfjsLib);
      };
      script.onerror = function () { reject(new Error(IS_EN ? 'PDF.js failed to load; check the network connection.' : 'PDF.js 載入失敗，請確認網路連線。')); };
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

  var MOBILE_LAUNCH_ACCEPTS = {
    all: 'application/pdf,.pdf,.docx,.doc,.txt,.md,.html,.htm,.csv,.xlsx,.pptx,.jpg,.jpeg,.png,.webp,text/plain,text/markdown,text/html,text/csv,image/jpeg,image/png,image/webp',
    pdf: 'application/pdf,.pdf',
    word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,.doc,text/plain,.txt,.md,.html,.htm',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,text/csv,.csv',
    ppt: 'application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx',
    image: 'image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp'
  };
  var activeMobileLaunchCategory = 'all';
  var MOBILE_LAUNCH_CATEGORY_LABELS = IS_EN ? { all: 'All documents', pdf: 'PDF', word: 'Word and text', excel: 'Excel and CSV', ppt: 'PowerPoint', image: 'Images' } : { all: '全部文件', pdf: 'PDF', word: 'Word 與文字', excel: 'Excel 與 CSV', ppt: 'PPT', image: '圖片' };
  function getFileExtension(file) { return String(file && file.name || '').toLowerCase().split('.').pop(); }
  function fileMatchesMobileCategory(file, category) {
    if (!file || category === 'all') return true;
    var extension = getFileExtension(file);
    if (category === 'pdf') return isPdf(file);
    if (category === 'word') return ['docx', 'doc', 'txt', 'md', 'html', 'htm'].includes(extension) || /text\/(plain|markdown|html)/i.test(file.type || '');
    if (category === 'excel') return ['xlsx', 'csv'].includes(extension) || /spreadsheet|csv/i.test(file.type || '');
    if (category === 'ppt') return extension === 'pptx' || /presentation/i.test(file.type || '');
    if (category === 'image') return ['jpg', 'jpeg', 'png', 'webp'].includes(extension) || /^image\/(jpeg|png|webp)$/i.test(file.type || '');
    return true;
  }
  function syncMobileLauncherCategory(category) {
    category = MOBILE_LAUNCH_ACCEPTS[category] ? category : 'all';
    activeMobileLaunchCategory = category;
    var input = $('pdf-file-input');
    if (input && isMobileReader()) input.setAttribute('accept', MOBILE_LAUNCH_ACCEPTS[category]);
    qsa('[data-launch-category]').forEach(function (button) {
      var selected = button.dataset.launchCategory === category;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    var current = $('pdf-mobile-launch-current');
    if (current) current.textContent = MOBILE_LAUNCH_CATEGORY_LABELS[category];
    var helper = $('pdf-mobile-launch-helper');
    if (helper) helper.textContent = IS_EN ? 'Only ' + MOBILE_LAUNCH_CATEGORY_LABELS[category] + ' are shown in the file picker. You can change this category at any time.' : '檔案選擇器會優先顯示「' + MOBILE_LAUNCH_CATEGORY_LABELS[category] + '」；隨時可以切換分類。';
  }
  function openMobileLaunchPicker() {
    if (!isMobileReader()) return;
    var input = $('pdf-file-input');
    if (input) { input.setAttribute('accept', MOBILE_LAUNCH_ACCEPTS[activeMobileLaunchCategory] || MOBILE_LAUNCH_ACCEPTS.all); input.click(); }
  }
  function selectMobileDocument(file) {
    if (!file) return;
    if (isMobileReader() && !fileMatchesMobileCategory(file, activeMobileLaunchCategory)) {
      toast(IS_EN ? 'This file does not match the selected ' + MOBILE_LAUNCH_CATEGORY_LABELS[activeMobileLaunchCategory] + ' category. Choose another category or file.' : '這個檔案不符合目前的「' + MOBILE_LAUNCH_CATEGORY_LABELS[activeMobileLaunchCategory] + '」分類；請切換分類或選擇其他檔案。', { guide: true });
      return;
    }
    loadDocument(file);
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
    if (item.type === 'area-highlight') {
      var areaStart = points[0]; var areaEnd = points[points.length - 1];
      var areaX = Math.min(areaStart.x, areaEnd.x) * width; var areaY = Math.min(areaStart.y, areaEnd.y) * height;
      var areaWidth = Math.abs(areaEnd.x - areaStart.x) * width; var areaHeight = Math.abs(areaEnd.y - areaStart.y) * height;
      context.globalAlpha = .3; context.fillStyle = item.color || '#ffd166'; context.fillRect(areaX, areaY, Math.max(2, areaWidth), Math.max(2, areaHeight));
      context.globalAlpha = .75; context.strokeStyle = item.color || '#ffd166'; context.lineWidth = Math.max(1, Number(pixelRatio) || 1); context.strokeRect(areaX, areaY, Math.max(2, areaWidth), Math.max(2, areaHeight)); context.restore(); return;
    }
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

  function getTextEdit(pageNumber, itemIndex) {
    var edits = state.textEdits[pageNumber] || [];
    return edits.find(function (edit) { return Number(edit.itemIndex) === Number(itemIndex); }) || null;
  }
  function upsertTextEdit(pageNumber, itemIndex, data) {
    if (!state.textEdits[pageNumber]) state.textEdits[pageNumber] = [];
    var existing = getTextEdit(pageNumber, itemIndex);
    if (existing) Object.assign(existing, data);
    else state.textEdits[pageNumber].push(Object.assign({ itemIndex: Number(itemIndex) }, data));
    return getTextEdit(pageNumber, itemIndex);
  }
  function getTextItemValue(pageNumber, itemIndex, original) {
    var edit = getTextEdit(pageNumber, itemIndex);
    return edit && Object.prototype.hasOwnProperty.call(edit, 'replacement') ? String(edit.replacement || '') : String(original || '');
  }
  function copyTextValue(value) {
    var text = String(value || '');
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(IS_EN ? 'Text copied.' : '文字已複製。', { guide: true }); }).catch(function () { fallbackCopyText(text); });
    else fallbackCopyText(text);
  }
  function fallbackCopyText(value) {
    var area = document.createElement('textarea'); area.value = value; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select();
    try { document.execCommand('copy'); toast(IS_EN ? 'Text copied.' : '文字已複製。', { guide: true }); } catch (_) { toast(IS_EN ? 'Select and copy the text manually.' : '請手動選取並複製文字。', { guide: true }); }
    area.remove();
  }
  function textTargetGeometry(element) {
    var frame = element && element.closest ? element.closest('.pdf-page-frame, .pdf-continuous-page') : null;
    if (!frame) return { x: 0, y: 0, w: 1, h: .04 };
    var width = Math.max(1, frame.clientWidth); var height = Math.max(1, frame.clientHeight);
    return { x: Math.max(0, Math.min(1, (parseFloat(element.style.left) || 0) / width)), y: Math.max(0, Math.min(1, (parseFloat(element.style.top) || 0) / height)), w: Math.max(.01, Math.min(1, (parseFloat(element.style.width) || 10) / width)), h: Math.max(.01, Math.min(1, (parseFloat(element.style.height) || 12) / height)) };
  }
  function hidePdfTextContextMenu() {
    var menu = $('pdf-text-context-menu'); if (menu) { menu.hidden = true; menu.classList.remove('is-visible'); }
  }
  function showPdfTextContextMenu(element) {
    var menu = $('pdf-text-context-menu'); if (!menu || !element) return;
    menu.hidden = false; menu.classList.add('is-visible'); menu.style.visibility = 'hidden';
    var rect = element.getBoundingClientRect();
    /* Do not scroll the reader while opening a text action. On touch devices that
       scroll can blur the selected span before the action button receives its tap. */
    var width = menu.offsetWidth || 212; var height = menu.offsetHeight || 48; var gap = 8;
    var left = Math.max(8, Math.min(Math.max(8, window.innerWidth - width - 8), rect.left + (rect.width - width) / 2));
    var top = rect.bottom + gap; if (top + height > window.innerHeight - 8) top = rect.top - height - gap;
    top = Math.max(8, Math.min(Math.max(8, window.innerHeight - height - 8), top));
    menu.style.left = left + 'px'; menu.style.top = top + 'px'; menu.style.visibility = 'visible';
  }
  function selectedPdfTextTarget(pageNumber, itemIndex, original, element) {
    state.activeTextSelection = { pageNumber: Number(pageNumber), itemIndex: Number(itemIndex), textOrdinal: Number(element && element.dataset && element.dataset.textOrdinal != null ? element.dataset.textOrdinal : itemIndex), original: String(original || ''), element: element, geometry: textTargetGeometry(element) };
    qsa('.pdf-text-item.is-selected').forEach(function (node) { node.classList.remove('is-selected'); });
    if (element) element.classList.add('is-selected');
    showPdfTextContextMenu(element);
  }
  function resolvePdfTextTarget(selection) {
    if (!selection) return null;
    var root = isMobileReader() ? $('pdf-continuous-stack') : $('pdf-page-frame');
    if (!root) return null;
    var candidates = Array.prototype.slice.call(root.querySelectorAll('.pdf-text-block'));
    var target = candidates.find(function (node) {
      return Number(node.dataset.page) === Number(selection.pageNumber) && Number(node.dataset.blockIndex) === Number(selection.blockIndex);
    });
    if (!target && Array.isArray(selection.itemIndexes) && selection.itemIndexes.length) {
      var expected = selection.itemIndexes.map(Number).join(',');
      target = candidates.find(function (node) {
        return Number(node.dataset.page) === Number(selection.pageNumber) && String(node.dataset.textIndexes || '') === expected;
      });
    }
    if (target) {
      selection.element = target;
      selection.geometry = textTargetGeometry(target);
    }
    return target || null;
  }
  function runSelectedPdfTextAction(action) {
    var selected = state.activeTextSelection; if (!selected) return;
    var element = resolvePdfTextTarget(selected);
    if (!element) { hidePdfTextContextMenu(); toast(IS_EN ? 'This text region is no longer visible. Tap the region again.' : '這個文字區塊已重新繪製，請再點一次該區塊。', { guide: true }); return; }
    hidePdfTextContextMenu();
    if (action === 'edit') { openInlineTextEditor(selected.pageNumber, selected.itemIndex, getPdfBlockValue(selected.pageNumber, selected.block || { itemIndexes: selected.itemIndexes, original: selected.original }), element, { kind: 'pdf', blockIndex: selected.blockIndex, itemIndexes: selected.itemIndexes, lineItemIndexes: selected.lineItemIndexes, itemOriginals: selected.block && selected.block.itemOriginals, textOrdinals: selected.textOrdinals, textOrdinal: selected.textOrdinal, geometry: selected.geometry }); return; }
    if (action === 'copy') { copyTextValue(getPdfBlockValue(selected.pageNumber, selected.block || { itemIndexes: selected.itemIndexes, original: selected.original })); return; }
    if (action === 'delete') {
      var current = getPdfBlockValue(selected.pageNumber, selected.block || { itemIndexes: selected.itemIndexes, original: selected.original }); recordEditHistory(); upsertTextEdit(selected.pageNumber, selected.itemIndex, Object.assign({ blockIndex: selected.blockIndex, itemIndexes: selected.itemIndexes.slice(), lineItemIndexes: selected.lineItemIndexes.map(function (line) { return line.slice(); }), itemOriginals: selected.block && selected.block.itemOriginals, textOrdinals: selected.textOrdinals.slice(), original: String(selected.original || ''), replacement: '', deleted: true, textOrdinal: selected.textOrdinal }, selected.geometry));
      element.classList.add('is-deleted'); element.textContent = ''; state.activeTextSelection = null; renderNotesPanel(); actionGuide('textDeleted');
    }
  }
  function getInlineEditorValue(editor) {
    if (!editor || !editor.field) return '';
    var value = editor.field.isContentEditable ? editor.field.textContent : editor.field.value;
    return String(value || '').replace(/\r\n/g, '\n').slice(0, 500);
  }
  function selectEditableContents(element) {
    if (!element || !element.isContentEditable || !window.getSelection || !document.createRange) return;
    try {
      var selection = window.getSelection(); var range = document.createRange(); range.selectNodeContents(element); selection.removeAllRanges(); selection.addRange(range);
    } catch (_) {}
  }
  function resizeDirectTextEditor(editor) {
    if (!editor || !editor.field) return;
    var field = editor.field;
    if (!field.isContentEditable) return;
    field.style.height = 'auto';
    var height = Math.max(editor.baseHeight || 18, Math.min(220, field.scrollHeight || editor.baseHeight || 18));
    field.style.height = height + 'px';
    if (editor.target === field) { var width = Math.max(parseFloat(field.style.width) || 0, Math.min(480, Math.max(field.offsetWidth || 0, field.scrollWidth + 8))); if (width > 0) field.style.width = width + 'px'; }
    if (editor.host && editor.host !== field) editor.host.style.height = height + 'px';
  }
  function removeInlineTextEditor(editor) {
    editor = editor || state.inlineTextEditor;
    if (!editor) return;
    if (editor.target) {
      hidePdfTextContextMenu();
      if (editor.target === editor.field && editor.cancelled) editor.target.textContent = editor.original;
      editor.target.classList.remove('is-inline-editing');
      editor.target.removeAttribute('contenteditable');
      editor.target.removeAttribute('aria-multiline');
      if (editor.target === editor.field && editor.originalStyle) {
        editor.target.style.whiteSpace = editor.originalStyle.whiteSpace;
        editor.target.style.overflow = editor.originalStyle.overflow;
        editor.target.style.height = editor.originalStyle.height;
      }
      if (editor.target === editor.field) editor.target.setAttribute('role', 'button');
    }
    if (editor.host && editor.host !== editor.target && editor.host.parentNode) editor.host.parentNode.removeChild(editor.host);
    if (state.inlineTextEditor === editor) state.inlineTextEditor = null;
    state.activeTextSelection = null;
  }
  function cancelInlineTextEditor(editor) {
    editor = editor || state.inlineTextEditor;
    if (!editor) return false;
    editor.cancelled = true;
    removeInlineTextEditor(editor);
    actionGuide('textEditCanceled');
    return true;
  }
  function closeInlineTextEditor(commit) {
    if (!state.inlineTextEditor) { state.activeTextSelection = null; return false; }
    if (commit) return commitInlineTextEditor();
    return cancelInlineTextEditor(state.inlineTextEditor);
  }
  function commitInlineTextEditor(options) {
    var shouldRender = !(options && options.skipRender);
    var editor = state.inlineTextEditor;
    if (!editor || !editor.field) return false;
    var value = getInlineEditorValue(editor);
    var original = String(editor.original || '');
    var changed = value !== original;
    if (changed) {
      recordEditHistory();
      if (editor.kind === 'annotation') {
        if (value.trim()) {
          if (!state.annotations[editor.pageNumber]) state.annotations[editor.pageNumber] = [];
          state.annotations[editor.pageNumber].push({ type: 'text', x: editor.geometry.x, y: editor.geometry.y, text: value.trim(), color: editor.color || '#ff9e6b', size: editor.size || 18 });
        }
      } else {
        upsertTextEdit(editor.pageNumber, editor.itemIndex, Object.assign({ blockIndex: editor.blockIndex, itemIndexes: editor.itemIndexes.slice(), lineItemIndexes: editor.lineItemIndexes.map(function (line) { return line.slice(); }), itemOriginals: Object.assign({}, editor.itemOriginals), textOrdinals: editor.textOrdinals.slice(), original: original, replacement: value, deleted: !value.trim(), textOrdinal: editor.textOrdinal }, editor.geometry));
        if (editor.target && editor.target.isConnected) {
          editor.target.textContent = value;
          editor.target.classList.toggle('is-edited', Boolean(value.trim()));
          editor.target.classList.toggle('is-deleted', !value.trim());
        }
      }
    }
    removeInlineTextEditor(editor);
    if (changed) {
      if (shouldRender) renderMainPage();
      renderNotesPanel(); actionGuide(editor.kind === 'annotation' ? 'textAdded' : 'textEdited');
    } else actionGuide('textEditCanceled');
    return changed;
  }
  function openInlineTextEditor(pageNumber, itemIndex, original, target, options) {
    options = options || {};
    if (state.inlineTextEditor && state.inlineTextEditor.target === target && target) {
      state.inlineTextEditor.field.focus({ preventScroll: true }); return true;
    }
    if (state.inlineTextEditor) {
      var previousEditor = state.inlineTextEditor;
      commitInlineTextEditor({ skipRender: previousEditor.kind === 'pdf' });
    }
    var frame = options.frame || (target && target.closest ? target.closest('.pdf-page-frame, .pdf-continuous-page') : null);
    if (!frame) return false;
    var geometry = options.geometry || textTargetGeometry(target);
    var left = options.left == null ? (parseFloat(target && target.style.left) || geometry.x * frame.clientWidth) : Number(options.left);
    var top = options.top == null ? (parseFloat(target && target.style.top) || geometry.y * frame.clientHeight) : Number(options.top);
    var sourceWidth = options.width == null ? (parseFloat(target && target.style.width) || geometry.w * frame.clientWidth) : Number(options.width);
    var baseHeight = Math.max(18, options.height || parseFloat(target && target.style.height) || geometry.h * frame.clientHeight || 20);
    var field; var host = target; var originalStyle = target ? { whiteSpace: target.style.whiteSpace, overflow: target.style.overflow, height: target.style.height } : null;
    if (target) {
      field = target;
      field.classList.add('is-inline-editing');
      field.contentEditable = 'true';
      field.setAttribute('role', 'textbox'); field.setAttribute('aria-multiline', 'true'); field.setAttribute('aria-label', IS_EN ? 'Edit PDF text directly' : '直接編輯 PDF 文字');
      field.setAttribute('spellcheck', 'false'); field.setAttribute('autocapitalize', 'sentences'); field.style.whiteSpace = 'pre-wrap'; field.style.overflow = 'visible'; field.style.height = Math.max(baseHeight, field.offsetHeight) + 'px';
    } else {
      var editorWidth = Math.max(150, Math.min(360, sourceWidth || 260, Math.max(150, frame.clientWidth - 12)));
      left = Math.max(4, Math.min(Math.max(4, frame.clientWidth - editorWidth - 4), left));
      top = Math.max(4, Math.min(Math.max(4, frame.clientHeight - baseHeight - 4), top));
      host = document.createElement('span'); host.className = 'pdf-direct-text-editor'; host.style.left = left + 'px'; host.style.top = top + 'px'; host.style.width = editorWidth + 'px'; host.style.minHeight = baseHeight + 'px'; host.contentEditable = 'true'; host.setAttribute('role', 'textbox'); host.setAttribute('aria-multiline', 'true'); host.setAttribute('aria-label', IS_EN ? 'Insert text directly on the PDF' : '直接在 PDF 上插入文字'); host.setAttribute('spellcheck', 'false'); host.setAttribute('autocapitalize', 'sentences'); host.textContent = String(original || ''); frame.appendChild(host); field = host;
    }
    var editorTextOrdinal = Number(options.textOrdinal != null ? options.textOrdinal : target && target.dataset && target.dataset.textOrdinal != null ? target.dataset.textOrdinal : itemIndex); var editor = { kind: options.kind || 'pdf', pageNumber: Number(pageNumber), itemIndex: Number(itemIndex), blockIndex: Number(options.blockIndex != null ? options.blockIndex : -1), itemIndexes: Array.isArray(options.itemIndexes) && options.itemIndexes.length ? options.itemIndexes.slice() : [Number(itemIndex)], lineItemIndexes: Array.isArray(options.lineItemIndexes) && options.lineItemIndexes.length ? options.lineItemIndexes.map(function (line) { return line.slice(); }) : [[Number(itemIndex)]], itemOriginals: options.itemOriginals && typeof options.itemOriginals === 'object' ? Object.assign({}, options.itemOriginals) : {}, textOrdinals: Array.isArray(options.textOrdinals) && options.textOrdinals.length ? options.textOrdinals.slice() : [editorTextOrdinal], textOrdinal: editorTextOrdinal, original: String(original || ''), target: target, frame: frame, host: host, field: field, geometry: geometry, color: options.color, size: options.size, baseHeight: baseHeight, originalStyle: originalStyle, cancelled: false };
    state.inlineTextEditor = editor;
    if (target) target.classList.add('is-inline-editing');
    field.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { event.preventDefault(); cancelInlineTextEditor(editor); }
      else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); commitInlineTextEditor(); }
    });
    field.addEventListener('input', function () { resizeDirectTextEditor(editor); });
    field.addEventListener('paste', function (event) {
      if (!event.clipboardData) return; event.preventDefault(); var text = event.clipboardData.getData('text/plain');
      try { document.execCommand('insertText', false, text); } catch (_) { field.textContent += text; }
      resizeDirectTextEditor(editor);
    });
    field.addEventListener('pointerdown', function (event) { event.stopPropagation(); });
    field.addEventListener('blur', function () { window.setTimeout(function () { if (state.inlineTextEditor === editor && (!editor.host.contains(document.activeElement))) commitInlineTextEditor({ skipRender: editor.kind === 'pdf' }); }, 0); });
    window.setTimeout(function () { try { field.focus({ preventScroll: true }); selectEditableContents(field); } catch (_) { field.focus(); } }, 0);
    actionGuide('textEditReady');
    return true;
  }
  function getPdfBlockEdit(pageNumber, block) {
    if (!block) return null;
    var edits = state.textEdits[pageNumber] || [];
    var firstIndex = Array.isArray(block.itemIndexes) && block.itemIndexes.length ? block.itemIndexes[0] : block.itemIndex;
    return edits.find(function (edit) { return Number(edit.blockIndex) === Number(block.blockIndex) && Number(edit.blockIndex) >= 0; }) || edits.find(function (edit) { return Number(edit.itemIndex) === Number(firstIndex); }) || null;
  }
  function getPdfBlockValue(pageNumber, block) {
    var edit = getPdfBlockEdit(pageNumber, block);
    return edit && Object.prototype.hasOwnProperty.call(edit, 'replacement') ? String(edit.replacement || '') : String(block && block.original || '');
  }
  function selectedPdfTextBlock(pageNumber, block, element) {
    var firstIndex = Array.isArray(block.itemIndexes) && block.itemIndexes.length ? block.itemIndexes[0] : block.itemIndex;
    state.activeTextSelection = { pageNumber: Number(pageNumber), itemIndex: Number(firstIndex), itemIndexes: (block.itemIndexes || [firstIndex]).slice(), blockIndex: Number(block.blockIndex), lineItemIndexes: (block.lineItemIndexes || []).map(function (line) { return line.slice(); }), textOrdinals: (block.textOrdinals || []).slice(), textOrdinal: Number((block.textOrdinals || [firstIndex])[0]), original: String(block.original || ''), element: element, block: block, geometry: textTargetGeometry(element) };
    qsa('.pdf-text-block.is-selected').forEach(function (node) { node.classList.remove('is-selected'); });
    if (element) element.classList.add('is-selected');
  }
  function handlePdfTextBlockClick(event, pageNumber, block, element) {
    if (state.inlineTextEditor && state.inlineTextEditor.target === element) { event.stopPropagation(); return; }
    if (state.inlineTextEditor && state.inlineTextEditor.target !== element) commitInlineTextEditor({ skipRender: true });
    event.preventDefault(); event.stopPropagation();
    var value = getPdfBlockValue(pageNumber, block);
    selectedPdfTextBlock(pageNumber, block, element);
    var action = state.activeEditorAction || 'edit';
    if (action === 'copy-text') { copyTextValue(value); return; }
    if (action === 'delete-text') {
      recordEditHistory(); upsertTextEdit(pageNumber, block.itemIndexes[0], Object.assign({ blockIndex: block.blockIndex, itemIndexes: block.itemIndexes.slice(), lineItemIndexes: block.lineItemIndexes.map(function (line) { return line.slice(); }), itemOriginals: Object.assign({}, block.itemOriginals), textOrdinals: block.textOrdinals.slice(), original: String(block.original || ''), replacement: '', deleted: true }, textTargetGeometry(element)));
      renderMainPage(); renderNotesPanel(); actionGuide('textDeleted'); return;
    }
    if (action === 'text-edit' || action === 'edit') {
      openInlineTextEditor(pageNumber, block.itemIndexes[0], value, element, { kind: 'pdf', blockIndex: block.blockIndex, itemIndexes: block.itemIndexes, lineItemIndexes: block.lineItemIndexes, itemOriginals: block.itemOriginals, textOrdinals: block.textOrdinals, textOrdinal: block.textOrdinals[0], geometry: textTargetGeometry(element) });
    }
  }
  function buildPdfTextBlocks(content, viewport) {
    var items = []; var textOrdinal = 0;
    (content.items || []).forEach(function (item, itemIndex) {
      var original = String(item.str || ''); if (!original.trim()) return;
      var transform = item.transform || [1, 0, 0, 1, 0, 0];
      var tx = (window.pdfjsLib && window.pdfjsLib.Util && window.pdfjsLib.Util.transform) ? window.pdfjsLib.Util.transform(viewport.transform, transform) : viewport.transform;
      var fontHeight = Math.max(8, Math.hypot(tx[2] || 0, tx[3] || 0));
      var width = Math.max(fontHeight * .55, Number(item.width || 0) * viewport.scale);
      items.push({ itemIndex: itemIndex, original: original, x: Math.max(0, tx[4] || 0), top: Math.max(0, (tx[5] || 0) - fontHeight), right: Math.max(0, tx[4] || 0) + width, bottom: Math.max(0, (tx[5] || 0) - fontHeight) + Math.max(12, fontHeight * 1.22), fontHeight: fontHeight, textOrdinal: textOrdinal });
      textOrdinal += 1;
    });
    var lines = [];
    items.forEach(function (item) {
      var line = lines.length ? lines[lines.length - 1] : null;
      var tolerance = Math.max(5, item.fontHeight * .62);
      if (!line || Math.abs(item.top - line.top) > tolerance) { line = { top: item.top, bottom: item.bottom, height: item.fontHeight, items: [] }; lines.push(line); }
      line.items.push(item); line.top = Math.min(line.top, item.top); line.bottom = Math.max(line.bottom, item.bottom); line.height = Math.max(line.height, item.fontHeight);
    });
    lines.forEach(function (line) {
      line.items.sort(function (a, b) { return a.x - b.x || a.itemIndex - b.itemIndex; });
      var text = ''; line.items.forEach(function (item, index) { if (index && item.x - line.items[index - 1].right > Math.max(2, line.height * .14)) text += ' '; text += item.original; });
      line.text = text;
    });
    var blocks = [];
    lines.forEach(function (line) {
      var previous = blocks.length ? blocks[blocks.length - 1] : null;
      var gap = previous ? line.top - previous.bottom : Infinity;
      var left = line.items[0] ? line.items[0].x : 0;
      var previousLine = previous && previous.lines.length ? previous.lines[previous.lines.length - 1] : null;
      var sizeRatio = previousLine ? Math.max(line.height, previousLine.height) / Math.max(1, Math.min(line.height, previousLine.height)) : 1;
      var compatibleTextStyle = !previousLine || sizeRatio <= 1.3;
      var sameRegion = previous && compatibleTextStyle && gap <= Math.max(14, line.height * 1.45) && Math.abs(left - previous.left) <= Math.max(34, line.height * 2.6);
      if (!sameRegion) { previous = { blockIndex: blocks.length, lines: [], left: left, top: line.top, right: 0, bottom: line.bottom, height: line.height }; blocks.push(previous); }
      previous.lines.push(line); previous.left = Math.min(previous.left, left); previous.top = Math.min(previous.top, line.top); previous.right = Math.max(previous.right, line.items.reduce(function (max, item) { return Math.max(max, item.right); }, 0)); previous.bottom = Math.max(previous.bottom, line.bottom); previous.height = Math.max(previous.height, line.height);
    });
    return blocks.map(function (block) {
      var itemIndexes = []; var lineItemIndexes = []; var textOrdinals = []; var itemOriginals = {}; var text = [];
      block.lines.forEach(function (line) { var indexes = []; line.items.forEach(function (item) { indexes.push(item.itemIndex); itemIndexes.push(item.itemIndex); textOrdinals.push(item.textOrdinal); itemOriginals[item.itemIndex] = item.original; }); lineItemIndexes.push(indexes); text.push(line.text); });
      return { blockIndex: block.blockIndex, itemIndexes: itemIndexes, lineItemIndexes: lineItemIndexes, textOrdinals: textOrdinals, itemOriginals: itemOriginals, original: text.join('\n'), x: block.left, y: block.top, w: Math.max(10, block.right - block.left), h: Math.max(14, block.bottom - block.top), fontHeight: block.height };
    });
  }
  async function renderPdfTextLayer(page, viewport, pageFrame, pageNumber, renderToken) {
    if (!page || !pageFrame || !state.editorMode) return;
    var content;
    try { content = await page.getTextContent({ includeMarkedContent: true }); } catch (_) { return; }
    if (renderToken != null && renderToken !== mainRenderToken) return;
    var blocks = buildPdfTextBlocks(content, viewport); state.pdfTextItems[pageNumber] = blocks;
    var layer = document.createElement('div'); layer.className = 'pdf-text-layer'; layer.setAttribute('aria-label', IS_EN ? 'Selectable PDF text regions' : '可選取的 PDF 文字區塊');
    blocks.forEach(function (block) {
      var span = document.createElement('span'); span.className = 'pdf-text-item pdf-text-block'; span.setAttribute('role', 'button'); span.tabIndex = 0; span.dataset.page = String(pageNumber); span.dataset.blockIndex = String(block.blockIndex); span.dataset.textIndexes = block.itemIndexes.join(','); span.setAttribute('aria-label', (IS_EN ? 'PDF text region: ' : 'PDF 文字區塊：') + block.original); span.textContent = getPdfBlockValue(pageNumber, block);
      var edit = getPdfBlockEdit(pageNumber, block); if (edit && edit.deleted) span.classList.add('is-deleted'); else if (edit && edit.replacement !== block.original) span.classList.add('is-edited');
      span.style.left = block.x + 'px'; span.style.top = block.y + 'px'; span.style.width = block.w + 'px'; span.style.height = block.h + 'px'; span.style.fontSize = Math.max(8, block.fontHeight * .82) + 'px'; span.style.lineHeight = Math.max(10, block.fontHeight) + 'px';
      span.addEventListener('click', function (event) { handlePdfTextBlockClick(event, pageNumber, block, span); });
      span.addEventListener('contextmenu', function (event) { event.preventDefault(); event.stopPropagation(); selectedPdfTextBlock(pageNumber, block, span); showPdfTextContextMenu(span); });
      span.addEventListener('keydown', function (event) { if ((event.key === 'Enter' || event.key === ' ') && !state.inlineTextEditor) { event.preventDefault(); handlePdfTextBlockClick(event, pageNumber, block, span); } });
      layer.appendChild(span);
    });
    pageFrame.appendChild(layer);
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
    return [state.pageOrder.join(','), JSON.stringify(state.pageRotations), JSON.stringify(state.textEdits || {}), getSignatureRenderKey(), state.zoom.toFixed(4), state.fitMode, state.tool, state.editorMode ? 'editor' : 'reader', stage ? stage.clientWidth : 0, stage ? stage.clientHeight : 0].join('|');
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
    return page.render(renderContext).promise.then(async function () {
      if (renderToken !== mainRenderToken) return null;
      await renderPdfTextLayer(page, viewport, pageFrame, pageNumber, renderToken);
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
    if (state.inlineTextEditor) commitInlineTextEditor({ skipRender: true });
    if (!state.pdf) { if (state.file && (state.documentText || (state.documentKind === 'image' && state.documentImageDataUrl))) renderDocumentPreview(); return; }
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
    await renderPdfTextLayer(page, viewport, frame, state.currentPage, renderToken);
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
    window.requestAnimationFrame ? window.requestAnimationFrame(syncDesktopReaderPan) : setTimeout(syncDesktopReaderPan, 0);
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
        var frame = canvas.closest ? canvas.closest('.pdf-page-frame, .pdf-continuous-page') : null;
        var geometry = { x: startPoint.x, y: startPoint.y, w: .38, h: .08 };
        openInlineTextEditor(pageNumber, -1, '', null, { kind: 'annotation', frame: frame, geometry: geometry, left: startPoint.x * (frame ? frame.clientWidth : canvas.clientWidth), top: startPoint.y * (frame ? frame.clientHeight : canvas.clientHeight), width: .38 * (frame ? frame.clientWidth : canvas.clientWidth), color: $('annotation-color') ? $('annotation-color').value : '#ff9e6b', size: Number(($('annotation-width') || {}).value) * 3 + 12 });
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
    if (!container) return;
    if (!state.pdf) { renderDocumentThumbnail(); return; }
    var renderToken = ++thumbnailRenderToken;
    container.replaceChildren();
    var emptyState = $('pdf-thumb-empty');
    if (emptyState) emptyState.hidden = true;
    var status = $('pdf-thumb-status');
    if (status) status.textContent = state.pageOrder.length + (IS_EN ? ' page(s)' : ' 頁');
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
      var check = document.createElement('input'); check.type = 'checkbox'; check.className = 'pdf-thumb-check'; check.checked = state.selectedPages.has(pageNumber); check.setAttribute('aria-label', IS_EN ? 'Select page ' + pageNumber : '選取第 ' + pageNumber + ' 頁');
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
        renderThumbnails(); toast(IS_EN ? 'Page order updated.' : '頁面順序已更新');
      });
      container.appendChild(thumb);
    }
  }

  function updateSelectionStatus() {
    var node = $('pdf-selection-status');
    if (node) node.textContent = state.selectedPages.size ? (IS_EN ? state.selectedPages.size + ' page(s) selected' : '已選取 ' + state.selectedPages.size + ' 頁') : (IS_EN ? 'Select pages for multi-page actions' : '可勾選多頁操作');
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
    if (!list) return;
    if (!state.pdf) { list.innerHTML = '<div class="pdf-sidebar-empty"><i class="fa-regular fa-file-lines"></i><span>' + (IS_EN ? 'This document has no embedded outline.' : '這份文件沒有內嵌目錄。') + '</span></div>'; return; }
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
    if (!state.pdf) { if (state.documentText) return (IS_EN ? '[Page 1]\n' : '[第 1 頁]\n') + state.documentText; return ''; }
    if (state.textReady && !force) return Object.keys(state.pageTexts).map(function (page) { return (IS_EN ? '[Page ' + page + ']\n' : '[第 ' + page + ' 頁]\n') + state.pageTexts[page]; }).join('\n\n');
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
      all.push((IS_EN ? '[Page ' + pageNumber + ']\n' : '[第 ' + pageNumber + ' 頁]\n') + state.pageTexts[pageNumber]);
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
  IS_EN = document.documentElement.lang === 'en';
  var TASK_PROMPTS = IS_EN ? {
    summary: 'Organize the core conclusions, key data, important dates, and action items in this document. Use clear Markdown sections and cite a page for every finding.',
    risk: 'Review contract risks: penalties, auto-renewal, disclaimers, unilateral changes, non-compete, payment, and termination clauses. Mark severity, evidence pages, and human-review suggestions.',
    translate: 'Translate the document accurately into the selected target language. Preserve proper nouns, numbers, clause numbers, formatting, and page citations.',
    diff: 'Compare the current PDF with the selected comparison version. List added, deleted, and modified clauses or data, explain material impact, and cite pages.',
    data: 'Extract all important financial data, tables, units, periods, and fields from the document into structured Markdown tables. Preserve source pages and flag suspected contradictions.',
    quiz: 'Generate a learning quiz from this document: 5 multiple-choice questions and 3 short-answer questions, with correct answers, brief explanations, and page citations.',
    compliance: 'Run a compliance and security scan for personal data, confidential information, unauthorized terms, data exposure, and legal or security risks. List evidence pages and remediation suggestions by severity.'
  } : {
    summary: '請整理這份文件的核心結論、關鍵數據、重要日期與待辦事項；以清楚的 Markdown 小節輸出，所有發現附上頁碼。',
    risk: '請進行合約風險審閱，逐項檢查違約金、自動續約、免責、單方變更、競業、付款與終止條款，標示風險等級、證據頁碼與人工覆核建議。',
    translate: '請將整份文件精準翻譯為指定目標語言，保留專有名詞、數字、條款編號、格式與頁碼引用。',
    diff: '請比較目前 PDF 與使用者選取的比較版本，列出新增、刪除、修改的條款或數據，並指出可能造成的實質影響與頁碼。',
    data: '請擷取文件中所有重要財務數據、表格、單位、期間與欄位，轉成結構化 Markdown 表格；保留來源頁碼並指出疑似矛盾。',
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
    if (workspace.messages.length) autoCollapseWorkspaceTools('preset');
  }
  function addPresetMessage(action, role, text, id) {
    var message = { id: id || 'preset_msg_' + action + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), role: role === 'user' ? 'user' : 'assistant', text: String(text || '').slice(0, 30000), createdAt: new Date().toISOString() };
    var workspace = getPresetWorkspace(action); workspace.messages.push(message); if (workspace.messages.length > 60) workspace.messages = workspace.messages.slice(-60); savePresetWorkspaces();
    if (action === presetActiveAction) {
      var log = $('pdf-preset-log'); if (log) { log.appendChild(buildChatMessageNode(message.role, message.text, message.id, 'pdf-preset-log')); log.scrollTop = log.scrollHeight; }
      var empty = $('pdf-preset-output-empty'); if (empty) empty.hidden = true;
      autoCollapseWorkspaceTools('preset');
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
    var expanded = pane.classList.toggle('is-expanded'); button.setAttribute('aria-expanded', expanded ? 'true' : 'false'); button.title = expanded ? (IS_EN ? 'Restore AI Assistant' : '還原 AI 助手') : (IS_EN ? 'Expand AI Assistant' : '放大 AI 助手'); var icon = button.querySelector('i'); if (icon) icon.className = expanded ? 'fa-solid fa-compress' : 'fa-solid fa-expand'; var label = button.querySelector('span'); if (label) label.textContent = expanded ? (IS_EN ? 'Restore AI Assistant' : '還原 AI 助手') : (IS_EN ? 'Expand AI Assistant' : '放大 AI 助手');
    if (expanded) toast(IS_EN ? 'AI Assistant expanded for easier reading.' : 'AI 助手已放大，方便閱讀長篇結果。');
  }

  function getPresetTranslationLanguage() {
    var select = $('pdf-preset-translate-language'); if (!select) return IS_EN ? 'Traditional Chinese' : '繁體中文';
    if (select.value !== '__custom__') return String(select.value || '').trim();
    var input = $('pdf-preset-custom-language'); var custom = String(input && input.value || '').trim();
    if (!custom) { setStatus(IS_EN ? 'Enter a custom target language first.' : '請先輸入自訂目標語言。', 'error'); if (input) input.focus(); return null; }
    return custom.slice(0, 80);
  }
  function syncPresetCustomLanguageInput() {
    var select = $('pdf-preset-translate-language'); var input = $('pdf-preset-custom-language'); if (!select || !input) return;
    var custom = select.value === '__custom__'; input.hidden = !custom; input.setAttribute('aria-hidden', custom ? 'false' : 'true'); if (custom) window.setTimeout(function () { input.focus(); }, 0);
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
      pages.push((IS_EN ? '[Comparison document page ' + pageNumber + ']\n' : '[比較文件第 ' + pageNumber + ' 頁]\n') + lines.join(' '));
    }
    return pages.join('\\n\\n').slice(0, 90000);
  }

  async function runTaskMatrixAction(action, comparisonFile, supplement) {
    action = String(action || '').toLowerCase();
    if (!TASK_PROMPTS[action]) return;
    presetActiveAction = action; renderPresetWorkspace(action); switchAiTab('preset');
    autoCollapseWorkspaceTools('preset');
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
      var language = action === 'translate' ? getPresetTranslationLanguage() : '';
      if (action === 'translate' && language === null) throw new Error('CUSTOM_TRANSLATION_REQUIRED');
      var languagePrompt = language ? (IS_EN ? '\n\nTarget language: ' + language + '. Translate the document into this language.' : '\n\n目標語言：【' + language + '】。請將目前文件內容精準翻譯為此語言。') : '';
      var prompt = TASK_PROMPTS[action] + languagePrompt + (comparisonText ? (IS_EN ? '\n\nComparison version text:\n' : '\n\n比較版本文字如下：\n') + comparisonText : '') + (supplement ? (IS_EN ? '\n\nUser follow-up requirement:\n' : '\n\n使用者補充要求：\n') + String(supplement).slice(0, 8000) : '') + (IS_EN ? '\n\nReply in English in this preset workspace, cite pages, and do not change any custom task room.' : '\n\n請直接回覆在目前預設工具工作區，使用繁體中文並附頁碼；不要修改或保存任何自訂任務房間。');
      var answer = await requestAi(prompt, { maxOutputTokens: action === 'quiz' ? 4200 : 5000, ignoreRoomContext: true });
      var emptyAnswer = IS_EN ? 'The task returned no content.' : '任務沒有回傳內容。';
      updatePresetMessage(action, taskId, answer || emptyAnswer); if (node) node.classList.remove('is-pending');
      setStatus(IS_EN ? meta.label + ' completed.' : '「' + meta.label + '」任務已完成。', 'success');
    } catch (error) {
      deletePresetMessage(action, taskId);
      if (error.message === 'NO_KEY') showAiError(IS_EN ? 'Open ⚙️ Settings in the AI rail and add a Gemini API key.' : '請先在 AI 側欄右上角的「⚙️ 設定」輸入 Gemini API key。', false);
      else if (error.message === 'CUSTOM_TRANSLATION_REQUIRED') showAiError(IS_EN ? 'Enter a custom target language first.' : '請先輸入自訂目標語言。', false);
      else if ([503, 429, 500, 'TIMEOUT'].includes(error.status)) showAiError(IS_EN ? 'The AI model is busy or timed out; automatic fallback is active.' : 'AI 模型目前忙碌或逾時，系統會自動輪替；', true);
      else showAiError((IS_EN ? meta.label + ' failed: ' : '「' + meta.label + '」任務未完成：') + (error.message || (IS_EN ? 'Connection failed.' : '連線失敗。')), false);
    }
  }

  async function handlePresetFollowup() {
    var input = $('pdf-preset-input'); var question = String(input && input.value || '').trim(); if (!question) return;
    var action = presetActiveAction; autoCollapseWorkspaceTools('preset'); var history = getPresetWorkspace(action).messages.slice(-8).map(function (item) { return presetText(item.role, item.text); }).join('\n\n'); var userId = 'preset_user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); var assistantId = userId + '_assistant';
    addPresetMessage(action, 'user', question, userId); if (input) { input.value = ''; input.style.height = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
    addPresetMessage(action, 'assistant', IS_EN ? 'Analyzing the follow-up request…' : '正在依照補充要求分析…', assistantId);
    var node = document.querySelector('#pdf-preset-log [data-message-id="' + assistantId + '"]'); if (node) node.classList.add('is-pending');
    var button = $('pdf-preset-send'); if (button) button.disabled = true;
    try {
      var meta = PRESET_META[action]; var language = action === 'translate' ? getPresetTranslationLanguage() : '';
      if (action === 'translate' && language === null) return;
      var prompt = (IS_EN ? 'Continue the ' + meta.label + ' analysis in the current preset workspace. ' : '請繼續目前「' + meta.label + '」預設工具分析。') + (language ? (IS_EN ? 'Use target language ' + language + '. ' : '目標語言為【' + language + '】。') : '') + (IS_EN ? 'Answer this follow-up requirement with page citations:\n' : '請回答以下補充要求並附頁碼：\n') + question + (history ? (IS_EN ? '\n\nRecent workspace chat:\n' : '\n\n目前工具最近對話：\n') + history : '');
      var answer = await requestAi(prompt, { maxOutputTokens: 4200, ignoreRoomContext: true });
      updatePresetMessage(action, assistantId, answer || (IS_EN ? 'No answer returned.' : 'AI 沒有回傳內容。')); if (node) node.classList.remove('is-pending');
    } catch (error) { deletePresetMessage(action, assistantId); if (error.message === 'NO_KEY') showAiError(IS_EN ? 'Open ⚙️ Settings and add a Gemini API key.' : '請先在「⚙️ 設定」輸入 Gemini API key。', false); else if (error.message === 'CUSTOM_TRANSLATION_REQUIRED') showAiError(IS_EN ? 'Enter a custom target language first.' : '請先輸入自訂目標語言。', false); else showAiError(IS_EN ? 'Follow-up failed: ' + (error.message || 'Connection failed.') : '補充要求未完成：' + (error.message || '連線失敗。'), false); }
    finally { if (button) button.disabled = false; }
  }

  function fileExtension(file) {
    return String(file && file.name || '').toLowerCase().split('.').pop() || '';
  }
  function getDocumentKind(file) {
    var extension = fileExtension(file);
    if (isPdf(file) || extension === 'pdf') return 'pdf';
    if (['docx', 'doc'].includes(extension)) return extension;
    if (['xlsx', 'csv'].includes(extension)) return extension;
    if (extension === 'pptx') return 'pptx';
    if (['txt', 'md', 'html', 'htm'].includes(extension) || /^text\//i.test(file && file.type || '')) return extension === 'html' || extension === 'htm' ? 'html' : extension === 'md' ? 'md' : extension === 'csv' ? 'csv' : 'txt';
    if (/^image\/(png|jpe?g|webp)$/i.test(file && file.type || '') || ['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'image';
    return '';
  }
  function isSupportedDocument(file) { return Boolean(file && getDocumentKind(file)); }
  function parseXmlDocument(xml) {
    var parser = new DOMParser();
    var document = parser.parseFromString(String(xml || ''), 'application/xml');
    if (document.querySelector('parsererror')) throw new Error(IS_EN ? 'The document package contains invalid XML.' : '文件封裝內的 XML 格式無效。');
    return document;
  }
  function xmlNodeText(xml, selectors) {
    var document = parseXmlDocument(xml);
    var nodes = [];
    for (var index = 0; index < selectors.length; index += 1) {
      var tagName = String(selectors[index]).replace(/\\:/g, ':');
      nodes = Array.prototype.slice.call(document.getElementsByTagName(tagName));
      if (!nodes.length) {
        try { nodes = Array.prototype.slice.call(document.querySelectorAll(selectors[index])); } catch (_) { nodes = []; }
      }
      if (nodes.length) break;
    }
    return nodes.map(function (node) { return String(node.textContent || '').replace(/\s+/g, ' ').trim(); }).filter(Boolean).join('\n');
  }
  async function parseZipDocument(file, kind) {
    var JSZip = window.JSZip;
    if (!JSZip) throw new Error(IS_EN ? 'The local package reader is still loading.' : '本機文件封裝讀取器仍在載入。');
    var zip = await JSZip.loadAsync(await readBuffer(file));
    if (kind === 'docx') {
      var entry = zip.file('word/document.xml');
      if (!entry) throw new Error(IS_EN ? 'This DOCX has no readable document body.' : 'DOCX 沒有可讀取的文字內容。');
      var xml = await entry.async('text');
      return xmlNodeText(xml, ['w\\:p', 'w\\:t', 'p', 't']).replace(/\n{3,}/g, '\n\n').trim();
    }
    if (kind === 'pptx') {
      var names = Object.keys(zip.files).filter(function (name) { return /^ppt\/slides\/slide\d+\.xml$/i.test(name); }).sort(function (a, b) { return Number(a.match(/slide(\d+)/i)[1]) - Number(b.match(/slide(\d+)/i)[1]); });
      var slides = [];
      for (var slideIndex = 0; slideIndex < names.length; slideIndex += 1) {
        var slideXml = await zip.file(names[slideIndex]).async('text');
        var slideText = xmlNodeText(slideXml, ['a\\:p', 'a\\:t', 'p', 't']);
        if (slideText) slides.push((IS_EN ? '[Slide ' : '[投影片 ') + (slideIndex + 1) + (IS_EN ? ']\n' : ']\n') + slideText);
      }
      return slides.join('\n\n').trim();
    }
    if (kind === 'xlsx') {
      var shared = [];
      var sharedEntry = zip.file('xl/sharedStrings.xml');
      if (sharedEntry) {
        var sharedXml = await sharedEntry.async('text');
        var sharedDocument = parseXmlDocument(sharedXml);
        shared = Array.prototype.slice.call(sharedDocument.querySelectorAll('si')).map(function (node) { return String(node.textContent || '').replace(/\s+/g, ' ').trim(); });
      }
      var sheetNames = Object.keys(zip.files).filter(function (name) { return /^xl\/worksheets\/sheet\d+\.xml$/i.test(name); }).sort();
      var sheets = [];
      for (var sheetIndex = 0; sheetIndex < sheetNames.length; sheetIndex += 1) {
        var sheetXml = await zip.file(sheetNames[sheetIndex]).async('text');
        var sheetDocument = parseXmlDocument(sheetXml);
        var rows = Array.prototype.slice.call(sheetDocument.querySelectorAll('row')).map(function (row) {
          var cells = Array.prototype.slice.call(row.querySelectorAll(':scope > c'));
          return cells.map(function (cell) {
            var type = cell.getAttribute('t');
            var valueNode = cell.querySelector('v, t');
            var value = valueNode ? String(valueNode.textContent || '') : '';
            return type === 's' ? (shared[Number(value)] || '') : value;
          }).join('\t');
        }).filter(Boolean);
        if (rows.length) sheets.push((IS_EN ? '[Sheet ' : '[工作表 ') + (sheetIndex + 1) + (IS_EN ? ']\n' : ']\n') + rows.join('\n'));
      }
      return sheets.join('\n\n').trim();
    }
    return '';
  }
  async function parseDocumentFile(file, kind) {
    if (kind === 'image') {
      return await new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
          var dataUrl = String(reader.result || '');
          var image = new Image();
          image.onload = function () { resolve({ text: '', imageDataUrl: dataUrl, imageWidth: image.naturalWidth || image.width || 0, imageHeight: image.naturalHeight || image.height || 0, imageMime: file.type || (dataUrl.match(/^data:([^;]+)/i) || [])[1] || 'image/png' }); };
          image.onerror = function () { reject(new Error(IS_EN ? 'The image could not be decoded.' : '無法解碼圖片文件。')); };
          image.src = dataUrl;
        };
        reader.onerror = function () { reject(new Error(IS_EN ? 'The image could not be read.' : '無法讀取圖片文件。')); };
        reader.readAsDataURL(file);
      });
    }
    if (['docx', 'xlsx', 'pptx'].includes(kind)) {
      return { text: await parseZipDocument(file, kind), imageDataUrl: '' };
    }
    var raw = await file.text();
    if (kind === 'html') {
      var htmlDocument = new DOMParser().parseFromString(raw, 'text/html');
      Array.prototype.slice.call(htmlDocument.querySelectorAll('script,style,noscript')).forEach(function (node) { node.remove(); });
      raw = String(htmlDocument.body ? htmlDocument.body.textContent : htmlDocument.textContent || '').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
    }
    if (kind === 'doc' && /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(raw)) throw new Error(IS_EN ? 'Legacy binary .doc is detected, but this local-only viewer cannot parse that format. Save it as .docx, .txt, or .html and reopen it.' : '偵測到舊式二進位 .doc；本機純前端檢視器無法安全解析此格式。請先另存為 .docx、.txt 或 .html 後重新開啟。');
    return { text: raw.replace(/\r\n?/g, '\n').trim(), imageDataUrl: '' };
  }
  function resetDocumentState(file) {
    mainRenderToken += 1;
    state.file = file || null; state.pdf = null; state.documentKind = file ? getDocumentKind(file) : 'pdf'; state.bookmarks = []; state.documentText = ''; state.documentImageDataUrl = ''; state.documentImageWidth = 0; state.documentImageHeight = 0; state.documentImageMime = ''; state.pageOrder = []; state.pageTexts = {}; state.pdfTextItems = {}; state.textReady = false; state.pageRotations = {}; state.selectedPages.clear(); state.annotations = {}; state.textEdits = {}; state.activeTextSelection = null; state.activeEditorAction = 'edit'; state.editorMode = false; state.mobileSubdock = ''; state.annotationImages = {}; state.signatures = {}; state.currentPage = 1; resetEditHistory();
  }
  function renderDocumentPreview() {
    var frame = $('pdf-page-frame'); var stack = $('pdf-continuous-stack');
    if (!frame || !state.file || state.documentKind === 'pdf') return;
    if (stack) { stack.hidden = true; stack.style.display = 'none'; stack.replaceChildren(); }
    if (state.fitMode !== 'manual') state.zoom = 1;
    var displayScale = Math.max(.25, Math.min(4, Number(state.zoom) || 1));
    frame.hidden = false; frame.style.display = 'block'; frame.className = 'pdf-page-frame pdf-document-preview pdf-document-kind-' + state.documentKind; frame.style.width = 'min(100%, 900px)'; frame.style.height = 'auto'; frame.style.transformOrigin = 'top center'; frame.style.transform = 'scale(' + displayScale + ')'; frame.style.marginBottom = '0px'; frame.style.marginRight = '0px'; frame.replaceChildren();
    if (state.documentKind === 'image' && state.documentImageDataUrl) {
      var image = document.createElement('img'); image.className = 'pdf-document-image'; image.alt = state.file.name; image.src = state.documentImageDataUrl; frame.appendChild(image);
    } else {
      var article = document.createElement('article'); article.className = 'pdf-document-text';
      if (state.documentKind === 'md') article.innerHTML = markdownToHtml(state.documentText || (IS_EN ? 'No text found.' : '沒有讀到文字。'));
      else { var pre = document.createElement('pre'); pre.textContent = state.documentText || (IS_EN ? 'No readable text found in this document.' : '這份文件沒有可讀取的文字。'); article.appendChild(pre); }
      frame.appendChild(article);
    }
    state.renderedWidth = frame.clientWidth; state.renderedHeight = frame.clientHeight;
    frame.dataset.renderZoom = String(displayScale);
    frame.dataset.renderScale = String(displayScale);
    if (displayScale > 1) {
      frame.style.marginBottom = Math.max(0, (displayScale - 1) * frame.offsetHeight) + 'px';
      frame.style.marginRight = Math.max(0, (displayScale - 1) * frame.offsetWidth / 2) + 'px';
    }
    syncZoomLabel(state.zoom);
    window.requestAnimationFrame ? window.requestAnimationFrame(syncDesktopReaderPan) : setTimeout(syncDesktopReaderPan, 0);
  }
  function renderDocumentThumbnail() {
    var container = $('pdf-thumbnails'); if (!container || !state.file || state.documentKind === 'pdf') return;
    container.replaceChildren(); var emptyState = $('pdf-thumb-empty'); if (emptyState) emptyState.hidden = true; var status = $('pdf-thumb-status'); if (status) status.textContent = '1 ' + (IS_EN ? 'document' : '份文件');
    var thumb = document.createElement('div'); thumb.className = 'pdf-thumb is-current'; thumb.dataset.page = '1';
    if (state.documentKind === 'image' && state.documentImageDataUrl) { var image = document.createElement('img'); image.className = 'pdf-thumb-image'; image.alt = state.file.name; image.src = state.documentImageDataUrl; thumb.appendChild(image); } else { var icon = document.createElement('div'); icon.className = 'pdf-thumb-document-icon'; icon.innerHTML = '<i class="fa-solid fa-file-lines"></i>'; thumb.appendChild(icon); }
    var footer = document.createElement('div'); footer.className = 'pdf-thumb-footer'; var label = document.createElement('span'); label.className = 'pdf-thumb-page'; label.textContent = IS_EN ? 'Document' : '文件'; footer.appendChild(label); thumb.appendChild(footer); thumb.addEventListener('click', function () { state.currentPage = 1; renderDocumentPreview(); }); container.appendChild(thumb);
  }
  async function loadDocument(file) {
    if (!isSupportedDocument(file)) { setStatus(IS_EN ? 'Choose a supported document format.' : '請選擇支援的文件格式。', 'error'); return; }
    if (getDocumentKind(file) === 'pdf') return loadPdf(file);
    closeInlineTextEditor(false);
    setStatus(IS_EN ? 'Reading the document locally…' : '正在本機讀取文件…', 'loading'); setProgress(4); setEmptyState(false); resetDocumentState(file);
    try {
      var parsed = await parseDocumentFile(file, state.documentKind); state.documentText = String(parsed.text || '').slice(0, 120000); state.documentImageDataUrl = parsed.imageDataUrl || ''; state.documentImageWidth = Number(parsed.imageWidth) || 0; state.documentImageHeight = Number(parsed.imageHeight) || 0; state.documentImageMime = parsed.imageMime || file.type || ''; state.pageOrder = [1]; state.pageTexts = { 1: state.documentText }; state.textReady = Boolean(state.documentText); state.currentPage = 1; setEmptyState(false); syncToolCapabilities(); syncMobilePageControls(); var fileName = $('pdf-file-name'); if (fileName) fileName.textContent = file.name; var fileMeta = $('pdf-file-meta'); if (fileMeta) fileMeta.textContent = (IS_EN ? 'Local ' + state.documentKind.toUpperCase() + ' document · ' : '本機 ' + state.documentKind.toUpperCase() + ' 文件 · ') + formatBytes(file.size); var readerStatus = $('pdf-reader-status'); if (readerStatus) readerStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + (IS_EN ? 'Document ready' : '文件就緒'); setStatus(messages.ready, 'success'); if (!state.documentText && state.documentKind !== 'image') setStatus(messages.noText, 'error'); renderDocumentThumbnail(); renderDocumentPreview(); renderNotesPanel(); $('pdf-page-count-badge').textContent = IS_EN ? '1 document' : '1 份文件'; setProgress(100); try { var detail = { file: state.file.name, pages: 1, kind: state.documentKind }; window.dispatchEvent(new CustomEvent('gugopro:document-loaded', { detail: detail })); window.dispatchEvent(new CustomEvent('gugopro:document-text-extracted', { detail: getSnapshot() })); window.dispatchEvent(new CustomEvent('gugopro:pdf-loaded', { detail: detail })); } catch (_) {}
    } catch (error) {
      state.file = null; state.pdf = null; state.documentKind = 'pdf'; state.documentText = ''; state.documentImageDataUrl = ''; state.documentImageWidth = 0; state.documentImageHeight = 0; state.documentImageMime = ''; state.pageOrder = []; state.pageTexts = {}; state.pdfTextItems = {}; state.textReady = false; state.textEdits = {}; state.activeTextSelection = null; state.activeEditorAction = 'edit'; state.editorMode = false; state.mobileSubdock = ''; clearReaderFrame(); setEmptyState(true); setProgress(0); syncEditorDock(); syncMobileActionDock(); syncToolCapabilities();
      var failedName = $('pdf-file-name'); if (failedName) failedName.textContent = IS_EN ? 'No document open' : '尚未開啟文件';
      var failedMeta = $('pdf-file-meta'); if (failedMeta) failedMeta.textContent = IS_EN ? 'Drop a document to begin' : '拖放文件即可開始';
      var failedReader = $('pdf-reader-status'); if (failedReader) failedReader.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + (IS_EN ? 'Waiting for a supported file' : '等待支援的文件');
      var failedThumbs = $('pdf-thumbnails'); if (failedThumbs) failedThumbs.replaceChildren(); var failedEmpty = $('pdf-thumb-empty'); if (failedEmpty) failedEmpty.hidden = false; if ($('pdf-thumb-status')) $('pdf-thumb-status').textContent = IS_EN ? '0 documents' : '0 份文件'; if ($('pdf-total-pages')) $('pdf-total-pages').textContent = '0'; if ($('pdf-page-count-badge')) $('pdf-page-count-badge').textContent = IS_EN ? '0 documents' : '0 份文件'; syncMobilePageControls();
      setStatus((IS_EN ? 'Document could not be opened: ' : '文件讀取失敗：') + (error.message || (IS_EN ? 'unsupported format.' : '格式不受支援。')), 'error');
    }
  }

  async function loadPdf(file) {
    if (!isPdf(file)) { setStatus(messages.choosePdf, 'error'); return; }
    closeInlineTextEditor(false);
    setStatus(messages.loading, 'loading'); setProgress(3); setEmptyState(false);
    mainRenderToken += 1; state.file = file; state.pdf = null; state.documentKind = 'pdf'; state.bookmarks = []; state.documentText = ''; state.documentImageDataUrl = ''; state.documentImageWidth = 0; state.documentImageHeight = 0; state.documentImageMime = ''; state.pageTexts = {}; state.pdfTextItems = {}; state.textReady = false; state.pageRotations = {}; state.selectedPages.clear(); state.annotations = {}; state.textEdits = {}; state.activeTextSelection = null; state.activeEditorAction = 'edit'; state.editorMode = false; state.mobileSubdock = ''; state.annotationImages = {}; state.signatures = {}; state.currentPage = 1; resetEditHistory();
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
      $('pdf-file-meta').textContent = state.pdf.numPages + (IS_EN ? ' page(s) · ' : ' 頁 · ') + formatBytes(file.size) + (IS_EN ? ' · local processing' : ' · 本機處理');
      $('pdf-reader-status').innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + (IS_EN ? 'Ready locally' : '本機就緒');
      setStatus(messages.ready, 'success');
      updateSelectionStatus();
      await renderThumbnails();
      await renderOutline();
      await renderMainPage();
      renderNotesPanel();
      syncToolCapabilities();
      $('pdf-page-count-badge').textContent = state.pdf.numPages + (IS_EN ? ' page(s)' : ' 頁');
      try { window.dispatchEvent(new CustomEvent('gugopro:pdf-loaded', { detail: { file: state.file.name, pages: state.pageOrder.length } })); } catch (_) {}
    } catch (error) {
      state.pdf = null; setEmptyState(true); setProgress(0); syncToolCapabilities(); setStatus((IS_EN ? 'Could not open the PDF: ' : 'PDF 讀取失敗：') + (error.message || (IS_EN ? 'Unsupported format.' : '格式不受支援。')), 'error');
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
    renderThumbnails(); renderMainPage(); toast(IS_EN ? 'Rotated ' + pages.length + ' page(s) by ' + angle + '°.' : '已旋轉 ' + pages.length + ' 頁 ' + angle + '°');
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
  function fitPdfText(font, value, maxWidth, preferredSize) {
    var text = safePdfText(value).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    var width = Math.max(1, Number(maxWidth) || 1);
    var size = Math.max(4, Math.min(32, Number(preferredSize) || 10));
    if (!font || !text) return { lines: text ? [text] : [], size: size, width: width };
    var words = text.split(' '); var longestWordWidth = words.reduce(function (max, word) { return Math.max(max, font.widthOfTextAtSize(word, size)); }, 0); var fittedSize = longestWordWidth > width ? Math.max(4, size * width / longestWordWidth) : size;
    var lines = []; var current = '';
    words.forEach(function (word) {
      var candidate = current ? current + ' ' + word : word;
      if (current && font.widthOfTextAtSize(candidate, fittedSize) > width) { lines.push(current); current = word; }
      else current = candidate;
    });
    if (current) lines.push(current);
    return { lines: lines, size: fittedSize, width: width };
  }
  function pdfStreamBytes(stream, PDFLib) {
    if (!stream) return null;
    try {
      if (PDFLib.decodePDFRawStream && typeof stream.getContents === 'function') return PDFLib.decodePDFRawStream(stream).decode();
      if (typeof stream.getUnencodedContents === 'function') return stream.getUnencodedContents();
      if (typeof stream.getContents === 'function') return stream.getContents();
    } catch (_) {}
    return null;
  }
  function hexToBytes(hex) {
    var clean = String(hex || '').replace(/[^0-9a-f]/gi, ''); if (clean.length % 2) clean = '0' + clean;
    var bytes = new Uint8Array(Math.floor(clean.length / 2)); for (var i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0; return bytes;
  }
  function bytesToUtf16(bytes) {
    var offset = bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff ? 2 : 0; var value = '';
    for (var i = offset; i + 1 < bytes.length; i += 2) value += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return value;
  }
  function hexCode(value) { return String(value || '').replace(/[^0-9a-f]/gi, '').toUpperCase(); }
  function parseToUnicodeCMap(bytes) {
    if (!bytes) return null;
    var source = new TextDecoder('latin1').decode(bytes); var forward = Object.create(null); var reverse = Object.create(null); var codeBytes = 2;
    var codeSpace = /<([0-9a-f]+)>\s+<([0-9a-f]+)>\s+begincodespacerange([\s\S]*?)endcodespacerange/ig.exec(source);
    if (codeSpace) { var codeLength = /<([0-9a-f]+)>/i.exec(codeSpace[3]); if (codeLength) codeBytes = Math.max(1, Math.floor(codeLength[1].length / 2)); }
    function addPair(from, to) { var key = hexCode(from); var text = bytesToUtf16(hexToBytes(to)); if (!text) return; forward[key] = text; if (!Object.prototype.hasOwnProperty.call(reverse, text)) reverse[text] = key.padStart(codeBytes * 2, '0'); }
    var block; var charPattern = /(\d+)\s+beginbfchar([\s\S]*?)endbfchar/ig;
    while ((block = charPattern.exec(source))) { var pair; var pairPattern = /<([0-9a-f]+)>\s+<([0-9a-f]+)>/ig; while ((pair = pairPattern.exec(block[2]))) addPair(pair[1], pair[2]); }
    var rangePattern = /(\d+)\s+beginbfrange([\s\S]*?)endbfrange/ig;
    while ((block = rangePattern.exec(source))) {
      var linePattern = /<([0-9a-f]+)>\s+<([0-9a-f]+)>\s+(<([0-9a-f]+)>|\[([^\]]*)\])/ig; var line;
      while ((line = linePattern.exec(block[2]))) {
        var start = parseInt(line[1], 16); var end = parseInt(line[2], 16); var width = line[1].length; var destination = line[4] || '';
        if (line[5] != null) { var list = line[5].match(/<([0-9a-f]+)>/ig) || []; for (var j = 0; j < list.length && start + j <= end; j += 1) addPair((start + j).toString(16).padStart(width, '0'), list[j].slice(1, -1)); }
        else if (destination) { var base = parseInt(destination, 16); for (var k = 0; start + k <= end; k += 1) addPair((start + k).toString(16).padStart(width, '0'), (base + k).toString(16).padStart(destination.length, '0')); }
      }
    }
    return { forward: forward, reverse: reverse, codeBytes: codeBytes };
  }
  function getPageFontMaps(page, PDFLib) {
    var maps = Object.create(null); if (!page || !page.node || !PDFLib.PDFName || !PDFLib.PDFDict) return maps;
    try {
      var resources = page.node.Resources(); var fonts = resources && resources.lookupMaybe(PDFLib.PDFName.of('Font'), PDFLib.PDFDict); if (!fonts) return maps;
      fonts.keys().forEach(function (fontName) {
        var dict = fonts.lookupMaybe(fontName, PDFLib.PDFDict); if (!dict) return;
        var unicode = dict.get(PDFLib.PDFName.of('ToUnicode')); if (unicode && page.node.context && typeof page.node.context.lookup === 'function') unicode = page.node.context.lookup(unicode); var bytes = pdfStreamBytes(unicode, PDFLib); var map = parseToUnicodeCMap(bytes);
        if (map) { var mapKey = String(fontName.toString ? fontName.toString() : fontName); maps[mapKey] = map; maps[mapKey.charAt(0) === '/' ? mapKey.slice(1) : '/' + mapKey] = map; }
      });
    } catch (_) {}
    return maps;
  }
  function skipPdfWhitespace(source, index) {
    while (index < source.length) { var code = source.charCodeAt(index); if (code === 37) { while (index < source.length && source.charCodeAt(index) !== 10 && source.charCodeAt(index) !== 13) index += 1; } else if (code === 0 || code === 9 || code === 10 || code === 12 || code === 13 || code === 32) index += 1; else break; }
    return index;
  }
  function readPdfToken(source, start) {
    var index = skipPdfWhitespace(source, start); if (index >= source.length) return null; var first = source[index];
    if (first === '[') {
      var children = []; var cursor = index + 1; while (true) { cursor = skipPdfWhitespace(source, cursor); if (cursor >= source.length) break; if (source[cursor] === ']') { cursor += 1; break; } var child = readPdfToken(source, cursor); if (!child) break; children.push(child); cursor = child.end; }
      return { kind: 'array', start: index, end: cursor, children: children, raw: source.slice(index, cursor) };
    }
    if (first === '(') {
      var depth = 1; var cursorLiteral = index + 1;
      while (cursorLiteral < source.length && depth) { var code = source.charCodeAt(cursorLiteral); if (code === 92) cursorLiteral += 2; else { if (source[cursorLiteral] === '(') depth += 1; if (source[cursorLiteral] === ')') depth -= 1; cursorLiteral += 1; } }
      var rawLiteral = source.slice(index, cursorLiteral); return { kind: 'literal', start: index, end: cursorLiteral, raw: rawLiteral };
    }
    if (first === '<' && source[index + 1] !== '<') { var hexEnd = source.indexOf('>', index + 1); hexEnd = hexEnd < 0 ? source.length : hexEnd + 1; return { kind: 'hex', start: index, end: hexEnd, raw: source.slice(index, hexEnd) }; }
    var cursorWord = index; while (cursorWord < source.length && !/[\s\[\]()<>{}]/.test(source[cursorWord])) cursorWord += 1;
    return { kind: 'word', start: index, end: cursorWord, raw: source.slice(index, cursorWord), value: source.slice(index, cursorWord) };
  }
  function tokenizePdfContent(source) { var tokens = []; var cursor = 0; while (cursor < source.length) { var token = readPdfToken(source, cursor); if (!token) break; tokens.push(token); cursor = Math.max(token.end, cursor + 1); } return tokens; }
  function unescapePdfLiteral(raw) {
    var value = String(raw || '').slice(1, -1).replace(/\\\\n/g, '\\n').replace(/\\\\r/g, '\\r').replace(/\\\\t/g, '\\t').replace(/\\\\b/g, '\\b').replace(/\\\\f/g, '\\f').replace(/\\\\([()\\\\])/g, '$1');
    return value.replace(/\\\\([0-7]{1,3})/g, function (_, octal) { return String.fromCharCode(parseInt(octal, 8)); });
  }
  function decodePdfTextToken(token, map) {
    if (!token) return ''; if (token.kind === 'literal') return unescapePdfLiteral(token.raw); if (token.kind !== 'hex') return '';
    var bytes = hexToBytes(token.raw.slice(1, -1)); if (map) { var text = ''; for (var i = 0; i + map.codeBytes <= bytes.length; i += map.codeBytes) { var key = ''; for (var j = 0; j < map.codeBytes; j += 1) key += bytes[i + j].toString(16).padStart(2, '0'); text += map.forward[key.toUpperCase()] || ''; } if (text) return text; }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return bytesToUtf16(bytes); var plain = ''; for (var p = 0; p < bytes.length; p += 1) plain += String.fromCharCode(bytes[p]); return plain;
  }
  function derivePdfTextMap(original, token) {
    if (!token || token.kind !== 'hex') return null;
    var characters = Array.from(String(original || '')); var bytes = hexToBytes(token.raw.slice(1, -1)); if (!characters.length || !bytes.length || bytes.length % characters.length) return null;
    var codeBytes = bytes.length / characters.length; if (![1, 2, 4].includes(codeBytes)) return null; var forward = Object.create(null); var reverse = Object.create(null);
    characters.forEach(function (character, index) { var key = ''; for (var j = 0; j < codeBytes; j += 1) key += bytes[index * codeBytes + j].toString(16).padStart(2, '0'); key = key.toUpperCase(); forward[key] = character; if (!Object.prototype.hasOwnProperty.call(reverse, character)) reverse[character] = key; });
    return { forward: forward, reverse: reverse, codeBytes: codeBytes };
  }
  function encodePdfTextToken(text, token, map) {
    text = String(text == null ? '' : text); if (map) { var encoded = ''; var characters = Array.from(text); var complete = true; for (var i = 0; i < characters.length; i += 1) { var key = map.reverse[characters[i]]; if (!key) { complete = false; break; } encoded += key; } if (complete) return '<' + encoded.toUpperCase() + '>'; }
    if (!/^[\u0000-\u007F]*$/.test(text)) return null;
    if (token && token.kind === 'hex') { var hex = ''; for (var j = 0; j < text.length; j += 1) hex += text.charCodeAt(j).toString(16).padStart(2, '0'); return '<' + hex.toUpperCase() + '>'; }
    return '(' + text.replace(/[\\\\()]/g, '\\\\$&').replace(/\n/g, '\\\\n').replace(/\r/g, '\\\\r') + ')';
  }
  function rewritePdfContentStream(source, fontMaps, targets) {
    var tokens = tokenizePdfContent(source); var replacements = []; var operands = []; var activeFont = null; var ordinal = Number(arguments[3]) || 0; var applied = Object.create(null); var unresolved = [];
    function maybeReplace(token) {
      var map = activeFont ? (fontMaps[activeFont] || fontMaps[activeFont.charAt(0) === '/' ? activeFont.slice(1) : '/' + activeFont]) : null; var value = decodePdfTextToken(token, map);
      var target = targets.find(function (candidate) { return !candidate.used && !applied[candidate.key] && candidate.ordinal === ordinal && String(candidate.original || '') === value; });
      if (!target) target = targets.find(function (candidate) { return !candidate.used && !applied[candidate.key] && String(candidate.original || '') === value; });
      if (!target) target = targets.find(function (candidate) { return !candidate.used && !applied[candidate.key] && candidate.ordinal === ordinal; });
      if (target) { var replacement = target.tokenReplacement != null ? String(target.tokenReplacement) : (target.edit.deleted ? '' : String(target.edit.replacement || '')); var derivedMap = derivePdfTextMap(target.original, token); var encodeMaps = []; if (map) encodeMaps.push(map); Object.keys(fontMaps || {}).forEach(function (fontKey) { if (fontMaps[fontKey] && encodeMaps.indexOf(fontMaps[fontKey]) < 0) encodeMaps.push(fontMaps[fontKey]); }); if (derivedMap) encodeMaps.push(derivedMap); var encoded = null; for (var mapIndex = 0; mapIndex < encodeMaps.length && encoded == null; mapIndex += 1) encoded = encodePdfTextToken(replacement, token, encodeMaps[mapIndex]); if (encoded != null) { replacements.push({ start: token.start, end: token.end, value: encoded }); applied[target.key] = true; target.applied = true; target.used = true; } else unresolved.push(target); }
      ordinal += 1;
    }
    tokens.forEach(function (token) {
      if (token.kind === 'word') {
        var op = token.value;
        if (op === 'Tf') { var fontOperand = operands.length >= 2 ? operands[operands.length - 2] : null; activeFont = fontOperand && fontOperand.raw ? fontOperand.raw : null; }
        else if (op === 'Tj' || op === "'" || op === '"') { var stringOperand = operands[operands.length - 1]; if (stringOperand && (stringOperand.kind === 'literal' || stringOperand.kind === 'hex')) maybeReplace(stringOperand); }
        else if (op === 'TJ') { var arrayOperand = operands[operands.length - 1]; if (arrayOperand && arrayOperand.kind === 'array') arrayOperand.children.forEach(function (child) { if (child.kind === 'literal' || child.kind === 'hex') maybeReplace(child); }); }
        operands = [];
      } else operands.push(token);
    });
    var output = source; replacements.sort(function (a, b) { return b.start - a.start; }).forEach(function (item) { output = output.slice(0, item.start) + item.value + output.slice(item.end); });
    targets.forEach(function (target) { if (!target.used && !unresolved.some(function (item) { return item.key === target.key; })) unresolved.push(target); });
    return { changed: replacements.length > 0, bytes: new TextEncoder().encode(output), unresolved: unresolved, applied: applied, nextOrdinal: ordinal };
  }
  async function applyTextEdits(outputInfo) {
    var editsByPage = state.textEdits || {};
    if (!outputInfo || !outputInfo.document || !Object.keys(editsByPage).length) return;
    var PDFLib = requirePdfLib(); var document = outputInfo.document; var pages = document.getPages(); var unresolved = [];
    outputInfo.pageNumbers.forEach(function (pageNumber, pageIndex) {
      var edits = (editsByPage[pageNumber] || []).filter(function (edit) { return edit && (edit.deleted || String(edit.replacement || '') !== String(edit.original || '')); });
      var page = pages[pageIndex]; if (!page || !edits.length) return;
      var groups = [];
      edits.forEach(function (edit, editIndex) {
        var itemIndexes = Array.isArray(edit.itemIndexes) && edit.itemIndexes.length ? edit.itemIndexes.map(Number) : [Number(edit.itemIndex)];
        var lineItemIndexes = Array.isArray(edit.lineItemIndexes) && edit.lineItemIndexes.length ? edit.lineItemIndexes.map(function (line) { return Array.isArray(line) ? line.map(Number) : []; }).filter(function (line) { return line.length; }) : [itemIndexes.slice()];
        var textOrdinals = Array.isArray(edit.textOrdinals) && edit.textOrdinals.length ? edit.textOrdinals.map(Number) : [Number(edit.textOrdinal != null ? edit.textOrdinal : itemIndexes[0])];
        var itemOriginals = edit.itemOriginals && typeof edit.itemOriginals === 'object' ? edit.itemOriginals : {};
        var replacementLines = edit.deleted ? [''] : String(edit.replacement || '').replace(/\r\n/g, '\n').split('\n');
        var group = { key: String(pageNumber) + ':block:' + String(edit.blockIndex != null ? edit.blockIndex : editIndex), pageNumber: Number(pageNumber), edit: edit, targets: [], forceFallback: replacementLines.length > lineItemIndexes.length };
        if (!group.forceFallback) {
          var cursor = 0;
          lineItemIndexes.forEach(function (line, lineIndex) {
            var lineText = replacementLines[lineIndex] == null ? '' : replacementLines[lineIndex];
            line.forEach(function (itemIndex, itemPosition) {
              var original = Object.prototype.hasOwnProperty.call(itemOriginals, itemIndex) ? String(itemOriginals[itemIndex] || '') : (itemPosition === 0 && lineIndex === 0 ? String(edit.original || '') : '');
              group.targets.push({ key: group.key + ':' + String(cursor), original: original, ordinal: Number(textOrdinals[cursor] != null ? textOrdinals[cursor] : itemIndex), edit: edit, tokenReplacement: itemPosition === 0 ? lineText : '' });
              cursor += 1;
            });
          });
        }
        if (!group.targets.length && !group.forceFallback) group.targets.push({ key: group.key + ':0', original: String(edit.original || ''), ordinal: Number(edit.textOrdinal != null ? edit.textOrdinal : edit.itemIndex), edit: edit, tokenReplacement: replacementLines[0] || '' });
        groups.push(group);
      });
      var contents = page.node && page.node.Contents ? page.node.Contents() : null; var streams = [];
      if (contents && typeof contents.size === 'function') { for (var i = 0; i < contents.size(); i += 1) streams.push(contents.lookup(i)); }
      else if (contents) streams = [contents];
      if (!streams.length) { groups.forEach(function (group) { unresolved.push({ key: group.key, pageNumber: group.pageNumber, edit: group.edit }); }); return; }
      var targets = []; groups.forEach(function (group) { if (!group.forceFallback) targets = targets.concat(group.targets); });
      var refs = []; var pageChanged = false; var fontMaps = getPageFontMaps(page, PDFLib); var ordinalBase = 0;
      streams.forEach(function (stream) {
        var bytes = pdfStreamBytes(stream, PDFLib); if (!bytes) { refs.push(stream); return; }
        var source = new TextDecoder('latin1').decode(bytes); var rewritten = rewritePdfContentStream(source, fontMaps, targets, ordinalBase); ordinalBase = rewritten.nextOrdinal || ordinalBase;
        if (rewritten.changed) pageChanged = true;
        refs.push(document.context.register(document.context.flateStream(rewritten.bytes)));
      });
      if (pageChanged) page.node.set(PDFLib.PDFName.of('Contents'), document.context.obj(refs));
      groups.forEach(function (group) {
        var applied = !group.forceFallback && group.targets.length > 0 && group.targets.every(function (target) { return target.used; });
        group.edit.nativeApplied = applied;
        if (!applied) unresolved.push({ key: group.key, pageNumber: group.pageNumber, edit: group.edit });
      });
    });
    outputInfo.nativeTextEditCount = Object.keys(editsByPage).reduce(function (total, pageNumber) { return total + (editsByPage[pageNumber] || []).filter(function (edit) { return edit && edit.nativeApplied; }).length; }, 0);
    outputInfo.unresolvedTextEdits = unresolved;
    if (!unresolved.length) return;
    var font;
    try { font = await document.embedFont(PDFLib.StandardFonts.Helvetica); } catch (_) { font = null; }
    unresolved.forEach(function (target) {
      var edit = target.edit; var pageIndex = outputInfo.pageNumbers.indexOf(Number(target.pageNumber || String(target.key).split(':')[0])); var page = pageIndex >= 0 ? pages[pageIndex] : null; if (!page) return;
      var width = page.getWidth(); var height = page.getHeight(); var x = Math.max(0, Math.min(width, Number(edit.x) * width)); var yTop = Math.max(0, Math.min(height, Number(edit.y) * height)); var editWidth = Math.max(8, Math.min(width - x, Number(edit.w) * width)); var editHeight = Math.max(10, Math.min(height - yTop, Number(edit.h) * height)); var y = Math.max(0, height - yTop - editHeight);
      page.drawRectangle({ x: x, y: y, width: editWidth, height: editHeight, color: PDFLib.rgb(1, 1, 1), opacity: 1 });
      if (!edit.deleted && font && String(edit.replacement || '').trim()) { var size = Math.max(6, Math.min(32, Number(edit.fontSize) || editHeight * .72)); var fitted = fitPdfText(font, edit.replacement, Math.max(4, editWidth - 4), size); if (fitted.lines && fitted.lines.length) fitted.lines.forEach(function (line, lineIndex) { try { page.drawText(line, { x: x + 2, y: Math.max(2, height - yTop - 2 - fitted.size - lineIndex * Math.max(fitted.size * 1.2, editHeight * .92)), size: fitted.size, font: font, color: PDFLib.rgb(.08, .12, .17) }); } catch (_) {} }); }
    });
    setStatus(IS_EN ? 'Some complex PDF text used a compatibility export path.' : '部分複雜 PDF 文字使用相容輸出路徑；一般文字已直接更新原生內容。', 'success');
  }
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
    if (state.busy) return; state.busy = true; setStatus(IS_EN ? 'Preparing a local PDF export…' : '正在建立本機 PDF 輸出…', 'loading'); setProgress(12);
    try {
      var info = await copyPagesToDocument(pageNumbers);
      setProgress(46); await applyTextEdits(info); setProgress(56); await applyOverlays(info); setProgress(84);
      var bytes = await info.document.save(); setProgress(100); downloadBlob(new Blob([bytes], { type: 'application/pdf' }), name || (safeName(state.file.name) + '-edited.pdf')); setStatus(IS_EN ? messages.localNote + ' Exported ' + pageNumbers.length + ' page(s).' : messages.localNote + ' 已產生 ' + pageNumbers.length + ' 頁。', 'success'); toast(IS_EN ? 'PDF downloaded.' : 'PDF 已下載');
    } catch (error) { setStatus((IS_EN ? 'PDF export failed: ' : 'PDF 輸出失敗：') + (error.message || (IS_EN ? 'Unsupported format.' : '格式不受支援。')), 'error'); setProgress(0); }
    state.busy = false;
  }

  async function mergePdfs() {
    if (!state.mergeFiles.length) return setStatus(IS_EN ? 'Choose at least one PDF in the merge area first.' : '請先在「合併」區選擇至少一個 PDF。', 'error');
    if (state.busy) return; state.busy = true; setStatus(IS_EN ? 'Merging PDFs locally…' : '正在本機合併 PDF…', 'loading');
    try {
      var PDFLib = requirePdfLib(); var output = await PDFLib.PDFDocument.create();
      for (var i = 0; i < state.mergeFiles.length; i += 1) {
        var source = await PDFLib.PDFDocument.load(await readBuffer(state.mergeFiles[i]));
        var pages = await output.copyPages(source, source.getPageIndices()); pages.forEach(function (page) { output.addPage(page); }); setProgress(((i + 1) / state.mergeFiles.length) * 85);
      }
      var bytes = await output.save(); downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'gugopro-merged.pdf'); setProgress(100); setStatus(IS_EN ? 'Merged ' + state.mergeFiles.length + ' PDF file(s) locally.' : '已合併 ' + state.mergeFiles.length + ' 個 PDF，可繼續下載或開啟新檔。', 'success');
    } catch (error) { setStatus((IS_EN ? 'Merge failed: ' : '合併失敗：') + (error.message || (IS_EN ? 'Unsupported file format.' : '檔案格式不受支援。')), 'error'); setProgress(0); }
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
    if (state.busy) return; state.busy = true; setStatus((IS_EN ? 'Converting all pages to ' : '正在將所有頁面轉成 ') + format.toUpperCase() + '…', 'loading'); setProgress(2);
    try {
      var JSZip = window.JSZip; if (!JSZip) throw new Error(IS_EN ? 'JSZip is not available.' : 'JSZip 尚未載入。');
      var zip = new JSZip();
      for (var index = 0; index < state.pageOrder.length; index += 1) {
        var pageNumber = state.pageOrder[index]; var page = await state.pdf.getPage(pageNumber); var viewport = page.getViewport({ scale: 1.6, rotation: getPageDisplayRotation(pageNumber) }); var canvas = makeCanvas(viewport.width, viewport.height); await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
        var mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'; var data = canvas.toDataURL(mime, format === 'jpg' ? .9 : undefined); var extension = format === 'jpg' ? 'jpg' : format === 'webp' ? 'webp' : 'png'; zip.file('page-' + String(pageNumber).padStart(3, '0') + '.' + extension, data.split(',')[1], { base64: true }); setProgress(((index + 1) / state.pageOrder.length) * 82);
      }
      var blob = await zip.generateAsync({ type: 'blob' }); downloadBlob(blob, safeName(state.file.name) + '-' + format + '-images.zip'); setProgress(100); setStatus(IS_EN ? 'Created an Images ZIP with ' + state.pageOrder.length + ' ' + format.toUpperCase() + ' image(s).' : '已產生 ' + state.pageOrder.length + ' 張 ' + format.toUpperCase() + ' 圖片並打包 ZIP。', 'success');
    } catch (error) { setStatus((IS_EN ? 'Image conversion failed: ' : '轉圖片失敗：') + (error.message || (IS_EN ? 'Canvas export failed.' : 'Canvas 匯出失敗。')), 'error'); setProgress(0); }
    state.busy = false;
  }

  async function imagesToPdf() {
    if (!state.imageFiles.length) return setStatus(IS_EN ? 'Add image files first.' : '請先加入圖片檔案。', 'error');
    if (state.busy) return; state.busy = true; setStatus(IS_EN ? 'Combining images into a PDF locally…' : '正在本機合成圖片 PDF…', 'loading'); setProgress(3);
    try {
      var PDFLib = requirePdfLib(); var output = await PDFLib.PDFDocument.create();
      for (var i = 0; i < state.imageFiles.length; i += 1) {
        var file = state.imageFiles[i]; var bytes = await readBuffer(file); var image = /jpe?g$/i.test(file.name) ? await output.embedJpg(bytes) : await output.embedPng(bytes); var maxW = 595; var maxH = 842; var scale = Math.min(maxW / image.width, maxH / image.height, 1); var page = output.addPage([maxW, maxH]); var width = image.width * scale; var height = image.height * scale; page.drawImage(image, { x: (maxW - width) / 2, y: (maxH - height) / 2, width: width, height: height }); setProgress(((i + 1) / state.imageFiles.length) * 85);
      }
      var result = await output.save(); downloadBlob(new Blob([result], { type: 'application/pdf' }), 'images-to-pdf.pdf'); setProgress(100); setStatus(IS_EN ? 'Combined ' + state.imageFiles.length + ' image(s) into a PDF.' : '已將 ' + state.imageFiles.length + ' 張圖片合成 PDF。', 'success');
    } catch (error) { setStatus((IS_EN ? 'Image-to-PDF conversion failed: ' : '圖片轉 PDF 失敗：') + (error.message || (IS_EN ? 'Unsupported image format.' : '圖片格式不受支援。')), 'error'); setProgress(0); }
    state.busy = false;
  }

  function base64FromBytes(bytes) { var binary = ''; var chunk = 0x8000; for (var i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length))); return btoa(binary); }
  function bytesFromBase64(value) { var binary = atob(value); var bytes = new Uint8Array(binary.length); for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i); return bytes; }

  async function insertPdfPages(files) {
    if (!state.pdf || !state.file) return toast(messages.choosePdf);
    var list = Array.prototype.slice.call(files || []).filter(isPdf);
    if (!list.length) return setStatus(IS_EN ? 'Choose a PDF to insert.' : '請選擇要插入的 PDF。', 'error');
    if (state.busy) return;
    state.busy = true; setStatus(IS_EN ? 'Inserting PDF pages locally…' : '正在插入 PDF 頁面…', 'loading'); setProgress(8);
    try {
      var PDFLib = requirePdfLib(); var output = await PDFLib.PDFDocument.create();
      var base = await PDFLib.PDFDocument.load(await readBuffer(state.file));
      var original = await output.copyPages(base, state.pageOrder.map(function (page) { return page - 1; }));
      original.forEach(function (page, index) { var pageNumber = state.pageOrder[index]; var rotation = (page.getRotation().angle || 0) + getRotation(pageNumber); if (rotation) page.setRotation(PDFLib.degrees(rotation % 360)); output.addPage(page); });
      for (var i = 0; i < list.length; i += 1) { var source = await PDFLib.PDFDocument.load(await readBuffer(list[i])); var pages = await output.copyPages(source, source.getPageIndices()); pages.forEach(function (page) { output.addPage(page); }); setProgress(25 + ((i + 1) / list.length) * 45); }
      var bytes = await output.save(); var inserted = new File([bytes], safeName(state.file.name) + '-inserted.pdf', { type: 'application/pdf' });
      await loadPdf(inserted); setStatus(IS_EN ? 'Inserted pages from ' + list.length + ' PDF file(s).' : '已插入 ' + list.length + ' 個 PDF 的頁面，視覺閱讀已切換至新檔案。', 'success'); toast(IS_EN ? 'Pages inserted.' : '插入頁面完成');
    } catch (error) { setStatus((IS_EN ? 'Insert failed: ' : '插入失敗：') + (error.message || (IS_EN ? 'Unsupported PDF format.' : 'PDF 格式不受支援。')), 'error'); setProgress(0); }
    state.busy = false;
  }

  async function compressCurrentPdf() {
    if (!state.pdf || !state.file) return toast(messages.choosePdf);
    if (state.busy) return; state.busy = true; setStatus(IS_EN ? 'Rebuilding and compressing the PDF locally…' : '正在本機重整 PDF 結構並壓縮…', 'loading'); setProgress(10);
    try {
      var PDFLib = requirePdfLib(); var document = await PDFLib.PDFDocument.load(await readBuffer(state.file)); setProgress(55);
      var bytes = await document.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 20 });
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), safeName(state.file.name) + '-compressed.pdf'); setProgress(100); setStatus(IS_EN ? 'PDF structure compressed locally; the image data was not resampled.' : '已完成本機結構壓縮並下載 PDF；圖片不會重新取樣。', 'success'); toast(IS_EN ? 'Compressed PDF downloaded.' : '壓縮 PDF 已下載');
    } catch (error) { setStatus((IS_EN ? 'Compression failed: ' : '壓縮失敗：') + (error.message || (IS_EN ? 'Unsupported format.' : '格式不受支援。')), 'error'); setProgress(0); }
    state.busy = false;
  }

  async function decryptLockPackage(file) {
    if (!file) return;
    var passphrase = String(($('lock-password') || {}).value || '');
    if (passphrase.length < 6) return setStatus(IS_EN ? 'Enter the six-character password used to create this lock package.' : '請先輸入建立鎖定包時使用的至少 6 個字元密碼。', 'error');
    if (!window.crypto || !window.crypto.subtle) return setStatus(IS_EN ? 'This browser does not support Web Crypto.' : '此瀏覽器不支援 Web Crypto。', 'error');
    setStatus(IS_EN ? 'Decrypting the lock package locally…' : '正在以本機密碼解密鎖定包…', 'loading');
    try {
      var packageData = JSON.parse(await file.text());
      if (packageData.format !== 'GugoPro PDF Lock v1') throw new Error(IS_EN ? 'This is not a GugoPro PDF Lock v1 package.' : '這不是 GugoPro PDF Lock v1 鎖定包。');
      var salt = bytesFromBase64(packageData.salt); var iv = bytesFromBase64(packageData.iv); var material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
      var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      var decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, bytesFromBase64(packageData.ciphertext));
      downloadBlob(new Blob([decrypted], { type: 'application/pdf' }), packageData.fileName || 'gugopro-unlocked.pdf'); setStatus(IS_EN ? 'Lock package decrypted and PDF downloaded locally.' : '鎖定包已在本機解密並下載 PDF。', 'success'); toast(IS_EN ? 'Decryption completed.' : '解密完成');
    } catch (error) { setStatus(IS_EN ? 'Decryption failed: incorrect password or damaged lock package.' : '解密失敗：密碼錯誤或鎖定包損壞。', 'error'); }
  }

  async function encryptCurrentPdf() {
    if (!state.pdf || !state.file) return toast(messages.choosePdf);
    var passphrase = String(($('lock-password') || {}).value || '');
    if (passphrase.length < 6) return setStatus(IS_EN ? 'Enter a password with at least six characters.' : '請輸入至少 6 個字元的加密密碼。', 'error');
    if (!window.crypto || !window.crypto.subtle) return setStatus(IS_EN ? 'This browser does not support Web Crypto.' : '此瀏覽器不支援 Web Crypto。', 'error');
    setStatus(IS_EN ? 'Creating a local AES-GCM lock package…' : '正在建立本機 AES-GCM 鎖定包…', 'loading');
    try {
      var selected = state.pageOrder; var info = await copyPagesToDocument(selected); await applyTextEdits(info); await applyOverlays(info); var bytes = new Uint8Array(await info.document.save()); var salt = crypto.getRandomValues(new Uint8Array(16)); var iv = crypto.getRandomValues(new Uint8Array(12)); var material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']); var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']); var encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes); var packageData = { format: 'GugoPro PDF Lock v1', fileName: safeName(state.file.name) + '-locked.pdf', mime: 'application/pdf', salt: base64FromBytes(salt), iv: base64FromBytes(iv), ciphertext: base64FromBytes(new Uint8Array(encrypted)) }; downloadBlob(new Blob([JSON.stringify(packageData)], { type: 'application/json' }), safeName(state.file.name) + '.pdf.locked.json'); setStatus(IS_EN ? 'AES-GCM lock package created locally; keep the password and file safe.' : '已產生 AES-GCM 本機鎖定包；請妥善保存密碼與檔案。', 'success');
    } catch (error) { setStatus((IS_EN ? 'Encryption failed: ' : '加密失敗：') + (error.message || (IS_EN ? 'Unknown error.' : '未知錯誤。')), 'error'); }
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
    aiEngine = window.GugoProUnifiedAI.create({ storagePrefix: 'gugopro_ai_pdf_suite', disabledKey: 'gugopro_ai_pdf_suite_disabled_models_v1', preferenceKey: 'gugopro_ai_pdf_suite_model_preference_v1', elements: { modelOptions: 'model-options', modelSettingsStatus: 'model-settings-status', modelCurrentStatus: 'model-current-status', quotaStatus: 'global-ai-quota-status', quotaReset: 'global-ai-quota-reset', quotaLimit: 'global-ai-quota-limit', quotaUsed: 'global-ai-quota-used' }, quotaSource: 'quota.gugopro.com enabled document chat models' });
    window.GugoProPdfSuiteAI = aiEngine;
    aiEngine.init();
  }

  function openKeyModal() { if ($('pdf-drawer-api-key')) { if (aiEngine) $('pdf-drawer-api-key').value = aiEngine.getApiKey(); if (window.GugoProPdfRooms) window.GugoProPdfRooms.openDrawer(false); } }
  function closeKeyModal() { var modal = $('pdf-key-modal'); if (modal) modal.classList.remove('is-open'); }

  async function getAiContext() {
    var text = '';
    if (state.documentKind === 'image' && state.documentImageDataUrl) {
      var imageMatch = state.documentImageDataUrl.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/i);
      if (!imageMatch) throw new Error(IS_EN ? 'The image is not available in a browser-readable format for AI analysis.' : '這張圖片不是瀏覽器可讀的格式，無法送入 AI 分析。');
      return {
        text: (IS_EN ? '[Image document]\nFile: ' : '[圖片文件]\n檔案：') + state.file.name + (IS_EN ? '\nMIME type: ' : '\nMIME 類型：') + (state.documentImageMime || imageMatch[1]) + (IS_EN ? '\nDimensions: ' : '\n尺寸：') + (state.documentImageWidth || '?') + ' × ' + (state.documentImageHeight || '?') + (IS_EN ? '\nThe original image is attached below. Inspect its visible content directly; do not claim text citations unless the image contains visible evidence.' : '\n原始圖片會以視覺附件附在下方；請直接檢視圖片內容，除非圖片有清楚可見證據，否則不要虛構頁碼引用。'),
        inlineData: { mimeType: state.documentImageMime || imageMatch[1], data: imageMatch[2] }
      };
    }
    if (state.file) text = await extractAllText(false);
    if (!text && typeof window.GugoProPdfRoomContext === 'function') text = window.GugoProPdfRoomContext();
    if (!text) throw new Error(IS_EN ? 'Open a document first, or switch to a room with a saved text layer.' : '請先載入文件，或切換到已保存文字層的分析房間。');
    if (!text.replace(/(?:\[第[^\]]+頁\]|\[Page[^\]]+\])/g, '').trim()) throw new Error(IS_EN ? 'This document has no readable text layer for AI analysis.' : '目前文件沒有可讀取的文字層，無法進行文字 AI 分析。');
    return { text: text.slice(0, 90000), inlineData: null };
  }

  async function requestAi(prompt, options) {
    options = options || {};
    if (!aiEngine || !aiEngine.getApiKey()) { if (typeof window.GugoProPdfRooms?.openDrawer === 'function') window.GugoProPdfRooms.openDrawer(false); throw new Error('NO_KEY'); }
    var context = await getAiContext();
    var activeRoom = !options.ignoreRoomContext && window.GugoProPdfRooms && window.GugoProPdfRooms.getActiveRoom ? window.GugoProPdfRooms.getActiveRoom() : null;
    var historyContext = activeRoom && Array.isArray(activeRoom.messages) ? activeRoom.messages.slice(-10).map(function (item) { return (item.role === 'user' ? 'User' : 'Assistant') + ': ' + item.text; }).join('\n') : '';
    var taskRule = activeRoom && activeRoom.taskRule ? String(activeRoom.taskRule).trim() : '';
    if (!aiEngine.getModels().length) await aiEngine.refresh({ silent: false });
    if (!aiEngine.getEnabledModels().length) throw new Error(IS_EN ? 'No enabled free document models are available. Open model settings to check.' : '目前沒有可用的免費文件 AI 模型，請打開模型設定檢查。');
    var systemText = IS_EN ? 'You are the GugoPro AI document assistant. Answer only from the supplied document text or attached image; clearly state when evidence is insufficient. For images, inspect the visible image directly and do not invent page citations. Reply in English and cite text-document sources with [Page N]. Do not present legal review as legal advice.' : '你是 GugoPro AI 文件助手。只根據提供的文件文字或附加圖片回答；若證據不足，明確說明。分析圖片時請直接檢視可見內容，不要虛構頁碼。回答使用繁體中文，文字文件引用來源時使用 [第 N 頁]。不要把法律審閱結果當作律師意見。';
    if (taskRule) systemText += IS_EN ? '\n\nPrioritize this custom AI workspace rule:\n' + taskRule : '\n\n目前自訂 AI 專案的核心任務條件（優先遵守）：\n' + taskRule;
    var taskPrompt = taskRule ? (IS_EN ? '\n\nAlso follow the current workspace rule:\n' : '\n\n請同時遵守目前專案核心任務條件：\n') + taskRule : '';
    var historyLabel = IS_EN ? '\n\nRecent conversation in this workspace:\n' : '\n\n本分析房間最近對話：\n';
    var documentLabel = context.inlineData ? (IS_EN ? '\n\nImage metadata (the original image is attached as a vision input):\n' : '\n\n圖片 metadata（原始圖片會以視覺輸入附件提供）：\n') : (IS_EN ? '\n\nDocument text (each section includes a page marker):\n' : '\n\n文件文字（每段含頁碼標記）：\n');
    var parts = [{ text: prompt + taskPrompt + (historyContext ? historyLabel + historyContext : '') + documentLabel + context.text }];
    if (context.inlineData) parts.push({ inlineData: context.inlineData });
    var payload = { contents: [{ role: 'user', parts: parts }], systemInstruction: { parts: [{ text: systemText }] }, generationConfig: { temperature: options.temperature == null ? .35 : options.temperature, maxOutputTokens: options.maxOutputTokens || 4096 } };
    var response = await aiEngine.request(payload, function (data) { return getAiText(data); }, { onAttempt: function (model) { setStatus(IS_EN ? 'AI is using ' + model + '…' : 'AI 正在使用 ' + model + ' 分析…', 'loading'); }, onSwitch: function (busy, next, status) { var code = status === 'TIMEOUT' ? 'Timeout' : status; var nextName = next || (IS_EN ? 'the next available model' : '下一個可用模型'); var notice = IS_EN ? '⚠️ The current model is busy (' + code + '); switched automatically to ' + nextName + ' to continue.' : '⚠️ 當前模型繁忙 (' + code + ')，已自動為您無縫切換至 ' + nextName + ' 繼續處理'; setStatus(notice, 'loading'); toast(notice); } });
    return response.result;
  }

  function switchAiTab(name) {
    qsa('.pdf-ai-tab').forEach(function (tab) { tab.classList.toggle('is-active', tab.dataset.aiTab === name); });
    qsa('.pdf-ai-view').forEach(function (view) { view.hidden = view.dataset.aiView !== name; });
    syncWorkspaceToolsForTab(name);
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
    autoCollapseWorkspaceTools('task');
    var button = $('pdf-chat-send'); if (button) button.disabled = true;
    var pendingNode = appendChat('assistant', IS_EN ? 'Analyzing the document and preparing page citations…' : '正在分析文件，整理頁碼引用…', assistantMessageId);
    if (pendingNode) pendingNode.classList.add('is-pending');
    try {
      var answer = await requestAi((IS_EN ? 'Answer this question using the document content: ' : '使用文件內容回答這個問題：') + question + (IS_EN ? '\nUse 3–7 bullet points and cite a page after each point.' : '\n請用 3–7 點條列，並在每一點後標出頁碼。'));
      hideAiError(); updateChatMessage(pendingNode, answer || (IS_EN ? 'The AI returned no content.' : 'AI 沒有回傳內容。')); if (pendingNode) pendingNode.classList.remove('is-pending');
      try { window.dispatchEvent(new CustomEvent('gugopro:pdf-room-message', { detail: { role: 'user', text: question, messageId: userMessageId } })); window.dispatchEvent(new CustomEvent('gugopro:pdf-room-message', { detail: { role: 'assistant', text: answer || (IS_EN ? 'The AI returned no content.' : 'AI 沒有回傳內容。'), messageId: assistantMessageId } })); } catch (_) {}
    } catch (error) {
      if (pendingNode) pendingNode.remove();
      if (error.message === 'NO_KEY') showAiError(IS_EN ? 'Enter a Gemini API key in ⚙️ Settings at the top of the AI panel.' : '請先在 AI 側欄右上角的「⚙️ 設定」輸入 Gemini API key。', false);
      else if ([503, 429, 500, 'TIMEOUT'].includes(error.status)) showAiError(IS_EN ? 'The AI model is busy or timed out; the system will rotate to another model automatically.' : 'AI 模型目前忙碌或逾時，系統已依導師架構自動輪替；', true, question);
      else { var failure = IS_EN ? 'Analysis could not be completed: ' : '目前無法完成分析：'; var failureReason = error.message || (IS_EN ? 'Connection failed.' : '連線失敗。'); showAiError(failure + failureReason, false); appendChat('assistant', failure + failureReason); }
    } finally { if (button) button.disabled = false; }
  }

  async function handleSummary() {
    var output = $('pdf-summary-output'); output.innerHTML = '<div class="pdf-summary-card"><p>' + (IS_EN ? 'Reading the text layer and preparing a summary…' : '正在讀取文字層並整理摘要…') + '</p></div>'; switchAiTab('summary');
    try {
      var answer = await requestAi(IS_EN ? 'Generate an Executive Summary with exactly these sections: ## Core conclusions, ## Key data, and ## Important action items. Use concise bullets and cite a page for every verifiable statement.' : '請生成 Executive Summary，固定輸出以下三段：## 核心結論、## 關鍵數據、## 重要待辦事項。每一段使用簡潔條列，所有可驗證敘述標出頁碼。', { maxOutputTokens: 3000 }); output.innerHTML = '<div class="pdf-summary-card">' + markdownToHtml(answer) + '</div>'; setStatus(IS_EN ? 'Summary completed.' : '摘要已完成。', 'success');
    } catch (error) { output.innerHTML = '<div class="pdf-summary-card"><p>' + escapeHtml(error.message === 'NO_KEY' ? (IS_EN ? 'Enter a Gemini API key, then generate the summary again.' : '請先輸入 Gemini API key，再重新生成摘要。') : error.message) + '</p></div>'; }
  }

  async function handleRisk() {
    var output = $('pdf-risk-output'); output.innerHTML = '<div class="pdf-risk-card medium"><p>' + (IS_EN ? 'Scanning lease, employment, and commercial contract clauses…' : '正在掃描租賃、勞動與商業合約條款…') + '</p></div>'; switchAiTab('risk');
    try {
      var answer = await requestAi(IS_EN ? 'Review contract risks. List each clause, severity (use only HIGH, MEDIUM, LOW), reason, and page. Check penalties, auto-renewal, unilateral changes, disclaimers, non-compete, payment, and termination clauses. End with a legal-advice disclaimer.' : '請進行合約風險預警。逐項列出條款、風險等級（只使用 HIGH、MEDIUM、LOW）、原因與頁碼。特別檢查高額違約金、自動續約、單方變更、免責、競業、付款與終止條款。最後附上「非法律意見」提醒。', { maxOutputTokens: 3600 }); var html = markdownToHtml(answer).replace(/\bHIGH\b/g, '<span class="pdf-risk-label">🔴 HIGH</span>').replace(/\bMEDIUM\b/g, '<span class="pdf-risk-label">🟡 MEDIUM</span>').replace(/\bLOW\b/g, '<span class="pdf-risk-label">🟢 LOW</span>'); output.innerHTML = '<div class="pdf-risk-card medium">' + html + '</div>'; setStatus(IS_EN ? 'Contract scan completed.' : '合約掃描已完成。', 'success');
    } catch (error) { output.innerHTML = '<div class="pdf-risk-card high"><p>' + escapeHtml(error.message === 'NO_KEY' ? (IS_EN ? 'Enter a Gemini API key before reviewing the contract.' : '請先輸入 Gemini API key，再開始合約審閱。') : error.message) + '</p></div>'; }
  }

  async function handleTranslate() {
    var input = $('pdf-translate-input'); var value = String(input.value || '').trim(); var language = $('pdf-translate-language').value; if (!value) return setStatus(IS_EN ? 'Paste a passage or use “Extract current page text” first.' : '請貼上段落，或先使用「擷取目前頁文字」。', 'error');
    var output = $('pdf-translate-output'); output.textContent = IS_EN ? 'Translating…' : '正在翻譯…';
    try { var answer = await requestAi((IS_EN ? 'Translate the following passage into ' : '請把下列段落翻譯為') + language + (IS_EN ? '. Preserve proper nouns, numbers, clause numbers, and paragraph formatting; output only the translation.\nPassage:\n' : '。保留專有名詞、數字、條款編號與段落格式，只輸出翻譯結果。\n待翻譯段落：\n') + value, { maxOutputTokens: 2500 }); output.textContent = answer; setStatus(IS_EN ? 'Translation completed.' : '翻譯已完成。', 'success'); } catch (error) { output.textContent = error.message === 'NO_KEY' ? (IS_EN ? 'Enter a Gemini API key first.' : '請先輸入 Gemini API key。') : error.message; }
  }

  function populateCurrentPageText() {
    if (!state.file) return setStatus(messages.choosePdf, 'error');
    extractAllText(false).then(function () { var input = $('pdf-translate-input'); if (!input) return; input.value = state.pdf ? (state.pageTexts[state.currentPage] || '') : state.documentText; switchAiTab('translate'); });
  }

  async function executeTask() {
    var room = window.GugoProPdfRooms && window.GugoProPdfRooms.getActiveRoom ? window.GugoProPdfRooms.getActiveRoom() : null;
    if (!room || !String(room.taskRule || '').trim()) {
      if (window.GugoProPdfRooms && window.GugoProPdfRooms.openTaskRuleEditor) window.GugoProPdfRooms.openTaskRuleEditor();
      return toast(IS_EN ? 'Save this workspace task rule first.' : '請先保存這個專案的核心任務規則。');
    }
    switchAiTab('task');
    var executionId = 'pdf_task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var progressText = IS_EN ? '🚀 Running the saved rules for “' + room.name + '” on the current document…' : '🚀 正在依據【' + room.name + '】自訂規則分析目前文件…';
    var node = appendChat('assistant', progressText, executionId);
    if (node) node.classList.add('is-pending');
    autoCollapseWorkspaceTools('task');
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
    localStorage.setItem('gugopro_gemini_api_key', key); localStorage.setItem('gemini_api_key', key); closeKeyModal(); toast(IS_EN ? 'Gemini API key was saved in this browser.' : 'Gemini API key 已儲存在本機'); if (aiEngine) await aiEngine.refresh({ silent: true });
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
    try { localStorage.setItem(SIGNATURE_LIBRARY_KEY, JSON.stringify(library)); toast(IS_EN ? 'Signature saved to this browser’s library.' : '簽名已儲存至本機常用簽名庫'); } catch (_) { toast(IS_EN ? 'The signature is too large for browser storage.' : '簽名太大，無法寫入本機儲存空間。'); }
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
    var pdfInput = $('pdf-file-input'); pdfInput.addEventListener('change', function () { if (this.files && this.files[0]) selectMobileDocument(this.files[0]); });
    qsa('[data-launch-category]').forEach(function (button) { button.addEventListener('click', function () { syncMobileLauncherCategory(button.dataset.launchCategory); }); });
    $('pdf-mobile-launch-open')?.addEventListener('click', openMobileLaunchPicker);
    var zone = $('pdf-upload-zone') || $('pdf-empty-state'); if (zone) { ['dragenter', 'dragover'].forEach(function (eventName) { zone.addEventListener(eventName, function (event) { event.preventDefault(); zone.classList.add('is-dragover'); }); }); ['dragleave', 'drop'].forEach(function (eventName) { zone.addEventListener(eventName, function (event) { event.preventDefault(); zone.classList.remove('is-dragover'); }); }); zone.addEventListener('drop', function (event) { var file = event.dataTransfer.files && event.dataTransfer.files[0]; if (file) loadDocument(file); }); zone.addEventListener('click', function (event) { if (event.target.closest('button')) return; pdfInput.click(); }); }
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
    closeInlineTextEditor(false);
    thumbnailRenderToken += 1;
    mainRenderToken += 1;
    state.file = null;
    state.pdf = null;
    state.documentKind = 'pdf';
    state.documentText = '';
    state.documentImageDataUrl = '';
    state.documentImageWidth = 0;
    state.documentImageHeight = 0;
    state.documentImageMime = '';
    state.pageOrder = [];
    state.currentPage = 1;
    state.pageRotations = {};
    state.selectedPages.clear();
    state.pageTexts = {};
    state.textReady = false;
    state.annotations = {};
    state.textEdits = {};
    state.activeTextSelection = null;
    state.activeEditorAction = 'edit';
    state.editorMode = false; state.mobileSubdock = '';
    state.annotationImages = {};
    state.signatures = {};
    state.activeSignatureId = null;
    state.signatureImage = '';
    state.outline = [];
    state.imageFiles = [];
    state.mergeFiles = [];
    state.insertFiles = [];
    state.documentText = '';
    state.documentImageDataUrl = '';
    state.crop = { top: 0, right: 0, bottom: 0, left: 0 };
    state.zoom = 0.92;
    state.fitMode = 'fit-width';
    state.tool = 'select';
    var pdfInput = $('pdf-file-input');
    if (pdfInput) pdfInput.value = '';
    var thumbEmpty = $('pdf-thumb-empty');
    if (thumbEmpty) thumbEmpty.hidden = false;
    var fileName = $('pdf-file-name');
    if (fileName) fileName.textContent = IS_EN ? 'No document open' : '尚未開啟文件';
    var fileMeta = $('pdf-file-meta');
    if (fileMeta) fileMeta.textContent = IS_EN ? 'Drop a document to begin' : '拖放文件即可開始';
    var readerStatus = $('pdf-reader-status');
    if (readerStatus) readerStatus.innerHTML = '<i class="fa-solid fa-lock"></i> ' + (IS_EN ? 'Waiting for file' : '等待檔案');
    var thumbnails = $('pdf-thumbnails');
    if (thumbnails) thumbnails.replaceChildren();
    if ($('pdf-thumb-status')) $('pdf-thumb-status').textContent = IS_EN ? '0 documents' : '0 份文件';
    var outline = $('pdf-outline-list');
    if (outline) outline.innerHTML = '<div class="pdf-sidebar-empty"><i class="fa-regular fa-compass"></i><span>' + (IS_EN ? 'Open a document to show its outline.' : '開啟文件後顯示目錄。') + '</span></div>';
    clearReaderFrame();
    setEmptyState(true);
    syncMobileLauncherCategory('all');
    setStatus(IS_EN ? 'Choose or drop a document to begin' : messages.empty);
    setProgress(0);
    syncMobilePageControls();
    if ($('pdf-page-input')) $('pdf-page-input').value = '1';
    if ($('pdf-total-pages')) $('pdf-total-pages').textContent = '0';
    if ($('pdf-page-count-badge')) $('pdf-page-count-badge').textContent = IS_EN ? '0 documents' : '0 份文件';
    resetEditHistory();
    syncToolCapabilities();
  }

  function closeMobileToolPanel() {
    if (!isMobileReader()) return;
    var panel = $('pdf-annotate-popover');
    if (!panel || panel.hidden) return;
    var closeButton = panel.querySelector('[data-popover-close]');
    if (closeButton) closeButton.click();
  }

  var mobileSubdockActions = {
    edit: {
      title: IS_EN ? 'Edit PDF' : '編輯 PDF', icon: 'fa-pen-to-square', capability: 'pdf',
      actions: [
        { key: 'text-edit', icon: 'fa-pen-to-square', label: IS_EN ? 'Edit text directly' : '直接改文字', hint: IS_EN ? 'Type on page' : '點字直接輸入' },
        { key: 'apply', icon: 'fa-check', label: IS_EN ? 'Apply change' : '套用變更', hint: IS_EN ? 'Keep this edit' : '保存這次修改' },
        { key: 'copy-text', icon: 'fa-copy', label: IS_EN ? 'Copy text' : '複製文字', hint: IS_EN ? 'Tap text' : '點選文字' },
        { key: 'delete-text', icon: 'fa-trash-can', label: IS_EN ? 'Delete text' : '刪除文字', hint: IS_EN ? 'Tap text' : '點選文字' },
        { key: 'text', icon: 'fa-font', label: IS_EN ? 'Insert text directly' : '直接插入文字', hint: IS_EN ? 'Tap and type' : '點一下就輸入' },
        { key: 'undo', icon: 'fa-rotate-left', label: IS_EN ? 'Undo' : '復原', hint: IS_EN ? 'Last edit' : '上一步' },
        { key: 'redo', icon: 'fa-rotate-right', label: IS_EN ? 'Redo' : '重做', hint: IS_EN ? 'Next edit' : '下一步' },
        { key: 'save', icon: 'fa-floppy-disk', label: IS_EN ? 'Save PDF' : '儲存 PDF', hint: IS_EN ? 'Download' : '另存下載' }
      ]
    },
    annotate: {
      title: IS_EN ? 'Annotate' : '註解', icon: 'fa-highlighter', capability: 'pdf',
      actions: [
        { key: 'highlight', icon: 'fa-highlighter', label: IS_EN ? 'Highlight' : '螢光筆', hint: IS_EN ? 'Drag to mark' : '拖曳劃記' },
        { key: 'area-highlight', icon: 'fa-square', label: IS_EN ? 'Area highlight' : '區域高亮', hint: IS_EN ? 'Draw a box' : '框選區域' },
        { key: 'underline', icon: 'fa-underline', label: IS_EN ? 'Underline' : '底線', hint: IS_EN ? 'Drag a line' : '拖曳劃線' },
        { key: 'strike', icon: 'fa-strikethrough', label: IS_EN ? 'Strikeout' : '刪除線', hint: IS_EN ? 'Drag a line' : '拖曳劃線' },
        { key: 'draw', icon: 'fa-pen', label: IS_EN ? 'Draw' : '畫筆', hint: IS_EN ? 'Draw freely' : '自由繪製' },
        { key: 'text', icon: 'fa-font', label: IS_EN ? 'Text note' : '文字註記', hint: IS_EN ? 'Tap page' : '點一下頁面' },
        { key: 'color', icon: 'fa-palette', label: IS_EN ? 'Color' : '顏色', hint: IS_EN ? 'Choose color' : '選擇顏色' }
      ]
    },
    signature: {
      title: IS_EN ? 'Signature' : '簽名', icon: 'fa-signature', capability: 'pdf',
      actions: [
        { key: 'signature', icon: 'fa-signature', label: IS_EN ? 'Add signature' : '新增簽名', hint: IS_EN ? 'Create or place' : '建立或放置' },
        { key: 'rotate-left', icon: 'fa-rotate-left', label: IS_EN ? 'Rotate left' : '左轉', hint: IS_EN ? 'Selected sign' : '目前簽名' },
        { key: 'rotate-right', icon: 'fa-rotate-right', label: IS_EN ? 'Rotate right' : '右轉', hint: IS_EN ? 'Selected sign' : '目前簽名' },
        { key: 'delete-signature', icon: 'fa-trash-can', label: IS_EN ? 'Remove sign' : '移除簽名', hint: IS_EN ? 'Selected sign' : '目前簽名' },
        { key: 'save', icon: 'fa-floppy-disk', label: IS_EN ? 'Save PDF' : '儲存 PDF', hint: IS_EN ? 'Download' : '另存下載' }
      ]
    },
    fill: {
      title: IS_EN ? 'Fill document' : '填寫文件', icon: 'fa-pen', capability: 'pdf',
      actions: [
        { key: 'text', icon: 'fa-font', label: IS_EN ? 'Add text' : '加入文字', hint: IS_EN ? 'Tap a field area' : '點一下欄位位置' },
        { key: 'signature', icon: 'fa-signature', label: IS_EN ? 'Add signature' : '加入簽名', hint: IS_EN ? 'Place on page' : '放置到頁面' },
        { key: 'color', icon: 'fa-palette', label: IS_EN ? 'Text color' : '文字顏色', hint: IS_EN ? 'Choose color' : '選擇顏色' },
        { key: 'save', icon: 'fa-floppy-disk', label: IS_EN ? 'Save PDF' : '儲存 PDF', hint: IS_EN ? 'Download' : '另存下載' }
      ]
    },
    more: {
      title: IS_EN ? 'More tools' : '更多工具', icon: 'fa-grip', capability: 'document',
      actions: [
        { key: 'png', icon: 'fa-file-image', label: IS_EN ? 'PNG ZIP' : 'PNG ZIP', hint: IS_EN ? 'PDF or image' : 'PDF 或圖片', target: 'pdf-download-current', capability: 'image-or-pdf' },
        { key: 'jpg', icon: 'fa-images', label: IS_EN ? 'JPG ZIP' : 'JPG ZIP', hint: IS_EN ? 'PDF or image' : 'PDF 或圖片', target: 'pdf-download-jpg', capability: 'image-or-pdf' },
        { key: 'pages', icon: 'fa-layer-group', label: IS_EN ? 'Manage pages' : '管理頁面', hint: IS_EN ? 'Rotate / extract' : '旋轉／提取', target: 'pdf-pages-popover', capability: 'pdf' },
        { key: 'save-as', icon: 'fa-floppy-disk', label: IS_EN ? 'Save as' : '另存新檔', hint: IS_EN ? 'Choose format' : '選擇格式', target: 'pdf-universal-convert-popover', capability: 'save-as' },
        { key: 'watermark', icon: 'fa-shield-halved', label: IS_EN ? 'Watermark & security' : '浮水印與安全', hint: IS_EN ? 'PDF tools' : 'PDF 工具', target: 'pdf-convert-popover', capability: 'pdf' },
        { key: 'night', icon: 'fa-moon', label: IS_EN ? 'Night reading' : '夜間閱讀', hint: IS_EN ? 'Toggle view' : '切換閱讀', target: 'pdf-night-mode', capability: 'always' },
        { key: 'fullscreen', icon: 'fa-expand', label: IS_EN ? 'Full screen' : '全螢幕', hint: IS_EN ? 'Reading view' : '閱讀檢視', target: 'pdf-fullscreen', capability: 'always' },
        { key: 'close', icon: 'fa-xmark', label: IS_EN ? 'Close document' : '關閉文件', hint: IS_EN ? 'Back to picker' : '返回選檔', capability: 'document' }
      ]
    }
  };

  function renderMobileSubdock(name) {
    var dock = $('pdf-mobile-subdock'); var tools = $('pdf-mobile-subdock-tools'); var config = mobileSubdockActions[name];
    if (!dock || !tools || !config) return;
    tools.replaceChildren();
    var back = document.createElement('button'); back.type = 'button'; back.id = 'pdf-mobile-subdock-back'; back.className = 'pdf-mobile-subtool pdf-mobile-subtool-back'; back.setAttribute('aria-label', IS_EN ? 'Back to primary toolbar' : '返回主工具列'); back.title = IS_EN ? 'Back to primary toolbar' : '返回主工具列'; back.innerHTML = '<i class="fa-solid fa-arrow-left"></i><span>' + (IS_EN ? 'Back' : '返回') + '</span><small>' + (IS_EN ? 'Main tools' : '主工具列') + '</small>'; back.addEventListener('click', closeMobileSubdock); tools.appendChild(back);
    config.actions.forEach(function (item) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'pdf-mobile-subtool'; button.dataset.mobileSubtool = item.key; button.setAttribute('aria-label', item.label); if (item.target) button.dataset.mobileSubtoolTarget = item.target; if (item.capability) button.dataset.mobileCapability = item.capability;
      button.innerHTML = '<i class="fa-solid ' + item.icon + '"></i><span>' + item.label + '</span><small>' + item.hint + '</small>';
      var active = item.key === state.tool || item.key === state.activeEditorAction;
      button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (item.capability) applyToolCapability(button, item.capability);
      button.addEventListener('click', function (event) { event.stopPropagation(); runMobileSubtool(item, name); }); tools.appendChild(button);
    });
    if (!tools.querySelector('.pdf-mobile-subtool:not(.is-format-disabled)')) { var empty = document.createElement('span'); empty.className = 'pdf-mobile-subdock-empty'; empty.textContent = IS_EN ? 'No tools are available for this document.' : '目前文件沒有可用的子工具。'; tools.appendChild(empty); }
  }
  function syncMobileSubdock() {
    var dock = $('pdf-mobile-subdock'); var ad = $('pdf-mobile-ad-slot');
    if (ad) ad.hidden = !(isMobileReader() && state.file);
    if (!dock) return;
    var open = Boolean(isMobileReader() && state.file && state.mobileSubdock);
    dock.hidden = !open;
    if (document.body) document.body.classList.toggle('pdf-mobile-subdock-open', open);
    if (state.mobileSubdock) renderMobileSubdock(state.mobileSubdock);
  }
  function closeMobileSubdock() {
    var name = state.mobileSubdock;
    if (state.inlineTextEditor) commitInlineTextEditor({ skipRender: true });
    state.mobileSubdock = '';
    if (state.editorMode) { state.editorMode = false; state.activeTextSelection = null; }
    state.tool = 'select'; qsa('[data-pdf-tool]').forEach(function (node) { node.classList.toggle('is-active', node.dataset.pdfTool === 'select'); });
    syncEditorDock(); syncMobileActionDock(); syncMobileSubdock();
    if (state.pdf) renderMainPage();
    actionGuide(name ? 'mobileSubdockClose' : 'editorClose');
  }
  function openMobileSubdock(name) {
    var config = mobileSubdockActions[name];
    if (!config || !state.file) { explainUnavailable('document'); return; }
    if (config.capability === 'pdf' && !state.pdf) { explainUnavailable('pdf'); return; }
    if (['edit', 'annotate', 'signature', 'fill'].includes(name)) {
      if (!setEditorMode(true)) return;
      state.tool = 'select';
    }
    state.mobileSubdock = name;
    renderMobileSubdock(name); syncMobileActionDock(); syncMobileSubdock();
    toast(IS_EN ? config.title + ' tools are ready. Choose a function below.' : config.title + '工具已開啟，請從下方選擇功能。', { guide: true });
  }
  function runMobileSubtool(item, group) {
    if (item.capability) { var capability = getToolCapability(item.capability); if (!capability.enabled) { explainUnavailable(item.capability); return; } }
    var key = item.key;
    if (item.target === 'pdf-pages-popover' || item.target === 'pdf-universal-convert-popover' || item.target === 'pdf-convert-popover') { openToolbarPopoverById(item.target); return; }
    if (item.target) { var target = $(item.target); if (target) target.click(); return; }
    if (key === 'close') { closePdf(); return; }
    if (key === 'apply') { if (state.inlineTextEditor) commitInlineTextEditor(); else toast(IS_EN ? 'Tap a PDF text region first, then edit it directly.' : '請先點選 PDF 文字區塊，再直接輸入內容。', { guide: true }); return; }
    if (key === 'undo' || key === 'redo') { if (key === 'undo' ? undoEdit() : redoEdit()) actionGuide(key); return; }
    if (key === 'rotate-left' || key === 'rotate-right' || key === 'delete-signature') { var targetId = key === 'rotate-left' ? 'pdf-signature-rotate-left' : key === 'rotate-right' ? 'pdf-signature-rotate-right' : 'pdf-delete-signature'; var control = $(targetId); if (control) control.click(); return; }
    if (key === 'save') { activateEditorAction('save'); return; }
    if (key === 'signature') { activateEditorAction('signature'); renderMobileSubdock(group); syncMobileSubdock(); return; }
    activateEditorAction(key);
    renderMobileSubdock(group); syncMobileSubdock();
    if (group === 'fill' && key === 'text') actionGuide('fill');
  }

  function syncMobileActionDock() {
    var dock = $('pdf-mobile-action-dock');
    if (!dock) return;
    dock.hidden = !(isMobileReader() && state.file && !state.editorMode && !state.mobileSubdock);
    qsa('[data-mobile-capability]').forEach(function (control) { applyToolCapability(control, control.dataset.mobileCapability); });
    syncMobileSubdock();
  }
  function syncEditorDock() {
    var dock = $('pdf-editor-dock');
    if (dock) dock.hidden = isMobileReader() || !(state.editorMode && state.pdf);
    if (document.body) document.body.classList.toggle('pdf-editor-mode', Boolean(state.editorMode && state.pdf));
    qsa('[data-editor-capability]').forEach(function (control) { applyToolCapability(control, control.dataset.editorCapability); });
    syncMobileSubdock();
  }
  function setEditorMode(enabled) {
    if (enabled && !state.pdf) { explainUnavailable('pdf'); return false; }
    if (!enabled && state.inlineTextEditor) closeInlineTextEditor(true);
    state.editorMode = Boolean(enabled && state.pdf);
    state.activeEditorAction = 'text-edit';
    state.activeTextSelection = null;
    syncEditorDock(); syncMobileActionDock();
    if (state.pdf) renderMainPage();
    actionGuide(state.editorMode ? 'editorOpen' : 'editorClose');
    return true;
  }
  function activateEditorAction(action) {
    if (!state.pdf) { explainUnavailable('pdf'); return; }
    if (action === 'apply') { if (state.inlineTextEditor) commitInlineTextEditor(); else toast(IS_EN ? 'Tap a PDF text region first, then edit it directly.' : '請先點選 PDF 文字區塊，再直接輸入內容。', { guide: true }); return; }
    if (state.inlineTextEditor) closeInlineTextEditor(true);
    state.activeEditorAction = action || 'text-edit';
    state.activeTextSelection = null;
    if (action === 'save') { if (state.inlineTextEditor) commitInlineTextEditor(); exportPdf(state.pageOrder, safeName(state.file.name) + '-edited.pdf'); return; }
    if (action === 'color') { var color = $('annotation-color'); if (color) color.click(); if (state.mobileSubdock) { renderMobileSubdock(state.mobileSubdock); syncMobileSubdock(); } actionGuide('color'); return; }
    if (action === 'signature') { var signature = $('pdf-add-signature'); if (signature) signature.click(); return; }
    if (action === 'highlight' || action === 'area-highlight' || action === 'underline' || action === 'strike' || action === 'draw' || action === 'text') state.tool = action;
    else state.tool = 'select';
    qsa('[data-pdf-tool]').forEach(function (node) { node.classList.toggle('is-active', node.dataset.pdfTool === state.tool); });
    syncAnnotationWidthControl(); renderMainPage(); actionGuide(action === 'text-edit' || action === 'copy-text' || action === 'delete-text' ? action : action);
  }
  function openToolbarPopoverById(id) {
    var panel = $(id); var toggle = qs('[data-popover-target="' + id + '"]');
    if (!panel || !toggle) return;
    if (panel.hidden) toggle.click(); else panel.querySelector('[data-popover-close]')?.click();
  }
  function bookmarkStorageKey() { return 'gugopro_pdf_bookmarks_v1:' + String(state.file && state.file.name || 'document') + ':' + String(state.file && state.file.size || 0); }
  function loadBookmarks() { try { var saved = JSON.parse(localStorage.getItem(bookmarkStorageKey()) || '[]'); state.bookmarks = Array.isArray(saved) ? saved.map(Number).filter(function (page) { return state.pageOrder.includes(page); }) : []; } catch (_) { state.bookmarks = []; } }
  function syncBookmarkButton() { var button = $('pdf-mobile-bookmark'); if (!button) return; var active = state.bookmarks.includes(Number(state.currentPage)); button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', active ? 'true' : 'false'); var icon = button.querySelector('i'); if (icon) icon.className = active ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'; }
  function toggleCurrentBookmark() { if (!state.file) { explainUnavailable('document'); return; } loadBookmarks(); var page = Number(state.currentPage) || 1; var index = state.bookmarks.indexOf(page); if (index >= 0) { state.bookmarks.splice(index, 1); toast(IS_EN ? 'Bookmark removed from this page.' : '已取消收藏目前頁。', { guide: true }); } else { state.bookmarks.push(page); state.bookmarks.sort(function (a, b) { return a - b; }); toast(IS_EN ? 'Page ' + page + ' bookmarked.' : '已收藏第 ' + page + ' 頁。', { guide: true }); } try { localStorage.setItem(bookmarkStorageKey(), JSON.stringify(state.bookmarks)); } catch (_) {} syncBookmarkButton(); }
  function renderSearchResults(results, query) { var list = $('pdf-mobile-search-results'); if (!list) return; list.replaceChildren(); if (!results.length) { var empty = document.createElement('p'); empty.className = 'pdf-mobile-search-empty'; empty.textContent = IS_EN ? 'No matching text was found.' : '找不到符合的文字。'; list.appendChild(empty); return; } results.slice(0, 30).forEach(function (result) { var button = document.createElement('button'); button.type = 'button'; button.className = 'pdf-mobile-search-result'; button.innerHTML = '<strong>' + (IS_EN ? 'Page ' + result.page : '第 ' + result.page + ' 頁') + '</strong>'; var excerpt = document.createElement('span'); excerpt.textContent = result.excerpt; button.appendChild(excerpt); button.addEventListener('click', function () { state.currentPage = Number(result.page); if (state.pdf) renderMainPage(); else renderDocumentPreview(); syncMobilePageControls(); syncBookmarkButton(); var panel = $('pdf-mobile-search-panel'); if (panel) panel.hidden = true; actionGuide('pageInput'); }); list.appendChild(button); }); }
  async function runDocumentSearch() { var input = $('pdf-mobile-search-input'); var query = String(input && input.value || '').trim(); if (!query) { renderSearchResults([], ''); return; } if (!state.file) { explainUnavailable('document'); return; } if (state.documentKind === 'image') { explainUnavailable('search'); return; } try { if (state.pdf) await extractAllText(false); var source = state.pdf ? state.pageTexts : { 1: state.documentText || '' }; var results = []; var matcher = query.toLocaleLowerCase(); Object.keys(source).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (page) { var value = String(source[page] || ''); var at = value.toLocaleLowerCase().indexOf(matcher); if (at >= 0) results.push({ page: page, excerpt: value.slice(Math.max(0, at - 40), Math.min(value.length, at + query.length + 80)).replace(/\s+/g, ' ') }); }); renderSearchResults(results, query); } catch (error) { toast((IS_EN ? 'Search failed: ' : '搜尋失敗：') + (error.message || (IS_EN ? 'No text layer.' : '沒有文字層。')), { guide: true }); } }
  function handleMobileBack() {
    var search = $('pdf-mobile-search-panel');
    var sidebar = $('pdf-sidebar');
    var ai = $('pdf-ai-pane');
    var menu = $('pdf-text-context-menu');
    if (state.inlineTextEditor) { closeMobileSubdock(); toast(IS_EN ? 'Edit applied. You are still in the document.' : '文字修改已套用，仍留在目前文件。', { guide: true }); return; }
    if (menu && !menu.hidden) { hidePdfTextContextMenu(); return; }
    if (search && !search.hidden) { search.hidden = true; return; }
    if (sidebar && sidebar.classList.contains('is-mobile-open')) { setMobileSidebar(false); return; }
    if (ai && ai.classList.contains('is-mobile-open')) { setMobileAi(false); return; }
    if (state.mobileSubdock) { closeMobileSubdock(); return; }
    if (state.editorMode) { setEditorMode(false); return; }
    closePdf();
  }
  function bindMobileReaderTopbar() {
    $('pdf-mobile-back')?.addEventListener('click', handleMobileBack);
    $('pdf-mobile-help')?.addEventListener('click', function () { toast(IS_EN ? 'Use the page controls to browse. Open Edit for PDF tools, or More for conversion and security.' : '請使用頁碼控制瀏覽文件；PDF 請按「編輯」開啟編輯工具，轉檔與安全功能請從「更多工具」進入。', { guide: true }); });
    $('pdf-mobile-search')?.addEventListener('click', function () { if (!getToolCapability('search').enabled) return explainUnavailable('search'); var panel = $('pdf-mobile-search-panel'); if (panel) { panel.hidden = false; var input = $('pdf-mobile-search-input'); if (input) input.focus(); } });
    $('pdf-mobile-search-close')?.addEventListener('click', function () { var panel = $('pdf-mobile-search-panel'); if (panel) panel.hidden = true; });
    $('pdf-mobile-search-form')?.addEventListener('submit', function (event) { event.preventDefault(); runDocumentSearch(); });
    $('pdf-mobile-bookmark')?.addEventListener('click', toggleCurrentBookmark);
    $('pdf-mobile-undo')?.addEventListener('click', function () { if (undoEdit()) actionGuide('undo'); });
    $('pdf-mobile-redo')?.addEventListener('click', function () { if (redoEdit()) actionGuide('redo'); });
    $('pdf-mobile-save')?.addEventListener('click', function () { if (!state.file) { explainUnavailable('document'); return; } if (state.inlineTextEditor) closeInlineTextEditor(true); if (state.pdf) exportPdf(state.pageOrder, safeName(state.file.name) + '-edited.pdf'); else openToolbarPopoverById('pdf-universal-convert-popover'); });
  }
  function bindTextContextMenu() {
    qsa('[data-text-context-action]').forEach(function (button) { button.addEventListener('click', function (event) { event.preventDefault(); event.stopPropagation(); runSelectedPdfTextAction(button.dataset.textContextAction); }); });
    document.addEventListener('pointerdown', function (event) { var target = event.target; if (target && target.closest && (target.closest('#pdf-text-context-menu') || target.closest('.pdf-text-item'))) return; hidePdfTextContextMenu(); });
    window.addEventListener('resize', function () { var selected = state.activeTextSelection; var menu = $('pdf-text-context-menu'); var element = resolvePdfTextTarget(selected); if (menu && !menu.hidden && element) showPdfTextContextMenu(element); });
    window.addEventListener('scroll', function () { if (!state.inlineTextEditor) hidePdfTextContextMenu(); }, true);
  }
  function bindEditorControls() {
    bindTextContextMenu();
    bindMobileReaderTopbar();
    $('pdf-text-edit')?.addEventListener('click', function () { setEditorMode(true); });
    $('pdf-editor-close')?.addEventListener('click', function () { setEditorMode(false); });
    $('pdf-mobile-subdock-back')?.addEventListener('click', closeMobileSubdock);
    qsa('[data-editor-action]').forEach(function (button) { button.addEventListener('click', function () { activateEditorAction(button.dataset.editorAction); }); });
    qsa('[data-mobile-action]').forEach(function (button) {
      button.addEventListener('click', function () { openMobileSubdock(button.dataset.mobileAction); });
    });
  }

  function bindToolbar() {
    bindEditorControls();
    qsa('[data-pdf-tool]').forEach(function (button) { button.addEventListener('click', function () { state.tool = button.dataset.pdfTool; qsa('[data-pdf-tool]').forEach(function (node) { node.classList.toggle('is-active', node === button); }); syncAnnotationWidthControl(); actionGuide(state.tool); closeMobileToolPanel(); if (state.pdf) renderMainPage(); }); });
    bindToolbarTouchLabels(); bindToolbarOverflow();
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
    var pages = getSelectedOrCurrentPages();     if (pages.length >= state.pageOrder.length) return setStatus(IS_EN ? 'Keep at least one page; all pages cannot be deleted.' : '至少保留一頁，無法全部刪除。', 'error');
    recordEditHistory();
    state.pageOrder = state.pageOrder.filter(function (page) { return !pages.includes(page); }); state.selectedPages.clear(); state.currentPage = state.pageOrder[0]; renderThumbnails(); renderMainPage(); updateSelectionStatus(); actionGuide('deletePages'); });
    $('pdf-export-pages').addEventListener('click', function () { actionGuide('exportPages'); var pages = state.selectedPages.size ? state.pageOrder.filter(function (page) { return state.selectedPages.has(page); }) : state.pageOrder; exportPdf(pages, safeName(state.file && state.file.name) + '-extracted.pdf'); });
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
      panel.classList.remove('is-mobile-sheet', 'is-toolbar-portal');
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
      panel.removeAttribute('aria-label');
      panel.removeAttribute('tabindex');
      panel.dataset.pdfPortalled = 'false';
      if (origin.next && origin.next.parentNode === origin.parent) origin.parent.insertBefore(panel, origin.next);
      else origin.parent.appendChild(panel);
      panel.__pdfPopoverOrigin = null;
    }
    function portalPanel(panel, mobileSheet) {
      if (!panel || panel.dataset.pdfPortalled === 'true') return;
      panel.__pdfPopoverOrigin = { parent: panel.parentNode, next: panel.nextSibling };
      panel.dataset.pdfPortalled = 'true';
      panel.classList.toggle('is-mobile-sheet', Boolean(mobileSheet));
      panel.classList.toggle('is-toolbar-portal', !mobileSheet);
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
      var mobile = isMobilePopover();
      var toggleVisible = Boolean(toggle && toggle.getClientRects && toggle.getClientRects().length && toggle.offsetParent !== null);
      var shouldPortal = mobile || !toggleVisible;
      if (shouldPortal) {
        portalPanel(panel, mobile);
        if (mobile) mobileScrim.hidden = false;
        if (mobile) document.body.classList.add('pdf-popover-open');
        if (mobile && !mobileHistoryPushed) {
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
      var guideKey = panel.id === 'pdf-annotate-popover' ? 'annotationPanel' : panel.id === 'pdf-pages-popover' ? 'pagesPanel' : panel.id === 'pdf-convert-popover' ? 'convertPanel' : panel.id === 'pdf-universal-convert-popover' ? 'universalPanel' : 'convertPanel';
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

  var workspaceToolsCollapsed = { task: false, preset: false };
  function syncWorkspaceToolsLabels() {
    var customRoom = window.GugoProPdfRooms && window.GugoProPdfRooms.getActiveRoom ? window.GugoProPdfRooms.getActiveRoom() : null;
    var taskLabel = $('pdf-task-tools-current');
    if (taskLabel) taskLabel.textContent = customRoom ? customRoom.name : (IS_EN ? 'General Document Analysis' : '一般文件分析房間');
    var presetLabel = $('pdf-preset-tools-current');
    if (presetLabel) presetLabel.textContent = PRESET_META[presetActiveAction] ? PRESET_META[presetActiveAction].title : presetActiveAction;
  }
  function syncWorkspaceToolsToggleControls(mode) {
    var key = mode === 'preset' ? 'preset' : 'task';
    var collapsed = Boolean(workspaceToolsCollapsed[key]);
    var inline = $(key === 'preset' ? 'pdf-preset-tools-inline-toggle' : 'pdf-task-tools-inline-toggle');
    if (inline) {
      inline.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      inline.title = collapsed ? (IS_EN ? 'Expand tools' : '展開工具') : (IS_EN ? 'Collapse tools' : '收折工具');
      var icon = inline.querySelector('i'); if (icon) icon.className = collapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
      var label = inline.querySelector('span'); if (label) label.textContent = collapsed ? (IS_EN ? 'Expand tools' : '展開工具') : (IS_EN ? 'Collapse tools' : '收折工具');
    }
  }
  function setWorkspaceToolsCollapsed(mode, collapsed) {
    var key = mode === 'preset' ? 'preset' : 'task';
    var panel = $(key === 'preset' ? 'pdf-preset-tools-panel' : 'pdf-task-tools-panel');
    var bar = $(key === 'preset' ? 'pdf-preset-tools-toggle' : 'pdf-task-tools-toggle');
    workspaceToolsCollapsed[key] = Boolean(collapsed);
    if (panel) { panel.classList.toggle('is-collapsed', workspaceToolsCollapsed[key]); panel.setAttribute('aria-hidden', workspaceToolsCollapsed[key] ? 'true' : 'false'); }
    if (bar) { bar.hidden = !workspaceToolsCollapsed[key]; bar.setAttribute('aria-expanded', workspaceToolsCollapsed[key] ? 'false' : 'true'); }
    syncWorkspaceToolsLabels(); syncWorkspaceToolsToggleControls(key);
  }
  function toggleWorkspaceTools(mode) { setWorkspaceToolsCollapsed(mode, !workspaceToolsCollapsed[mode]); }
  function autoCollapseWorkspaceTools(mode) { setWorkspaceToolsCollapsed(mode, true); }
  function documentHasTextContext() { return Boolean(state.pdf || String(state.documentText || '').trim()); }
  function documentHasAiContext() { return Boolean(state.file && ((state.documentKind === 'image' && state.documentImageDataUrl) || documentHasTextContext())); }
  function getToolCapability(key) {
    var loaded = Boolean(state.file);
    var pdf = Boolean(state.pdf);
    var image = state.documentKind === 'image' && Boolean(state.documentImageDataUrl);
    var text = documentHasTextContext();
    if (key === 'always' || key === 'open' || key === 'images-input' || key === 'unlock-input') return { enabled: true, reason: '' };
    if (key === 'document') return { enabled: loaded, reason: IS_EN ? 'Open a document first.' : '請先開啟文件。' };
    if (key === 'undo' || key === 'redo') return { enabled: pdf && editHistory[key].length > 0, reason: pdf ? (IS_EN ? 'There is no ' + key + 'able edit in the current PDF.' : '目前 PDF 沒有可' + (key === 'undo' ? '復原' : '重做') + '的編輯。') : (IS_EN ? 'Undo and Redo apply only to editable PDF pages.' : '復原與重做只適用於可編輯的 PDF 頁面。') };
    if (key === 'pdf') return { enabled: pdf, reason: loaded ? (IS_EN ? 'This action changes PDF pages and is not available for ' + state.documentKind.toUpperCase() + ' documents.' : '這項功能會修改 PDF 頁面，目前的 ' + state.documentKind.toUpperCase() + ' 文件不支援。') : (IS_EN ? 'Open a PDF first; this action changes PDF pages.' : '請先開啟 PDF；這項功能會修改 PDF 頁面。') };
    if (key === 'image-or-pdf') return { enabled: pdf || image, reason: loaded ? (IS_EN ? 'This image export is available for PDF or image documents, not ' + state.documentKind.toUpperCase() + '.' : '圖片輸出只適用於 PDF 或圖片文件，目前是 ' + state.documentKind.toUpperCase() + '。') : (IS_EN ? 'Open a PDF or image first.' : '請先開啟 PDF 或圖片文件。') };
    if (key === 'text') return { enabled: text, reason: loaded ? (IS_EN ? 'This output needs a readable text layer. The current file has no text to export.' : '這項輸出需要可讀取的文字層；目前文件沒有可匯出的文字。') : (IS_EN ? 'Open a text-bearing document first.' : '請先開啟含文字的文件。') };
    if (key === 'ai') return { enabled: documentHasAiContext(), reason: loaded ? (IS_EN ? 'This file has no readable text layer. Open an image or a document with readable text so AI can analyze it.' : '目前文件沒有可讀取的文字層；請開啟圖片或含可讀文字的文件，AI 才能分析。') : (IS_EN ? 'Open a document or image first; AI analysis uses its local text or image data.' : '請先開啟文件或圖片；AI 會使用本機文字層或圖片資料分析。') };
    if (key === 'search') return { enabled: loaded && state.documentKind !== 'image', reason: loaded ? (IS_EN ? 'Search needs a PDF or readable text document; image files do not have a text index.' : '搜尋需要 PDF 或可讀文字文件；圖片檔沒有可搜尋的文字索引。') : (IS_EN ? 'Open a PDF or text document before searching.' : '請先開啟 PDF 或文字文件，再使用搜尋。') };
    if (key === 'save-as') return { enabled: loaded, reason: IS_EN ? 'Open a document before using Save As.' : '請先開啟文件，再使用另存新檔。' };
    if (key === 'page-nav') return { enabled: loaded, reason: IS_EN ? 'Open a document before navigating pages.' : '請先開啟文件，再瀏覽頁面。' };
    if (key === 'page-flow') return { enabled: pdf, reason: IS_EN ? 'Page flow applies only to multi-page PDFs.' : '頁面排列只適用於多頁 PDF。' };
    if (key === 'image-to-pdf') return { enabled: true, reason: '' };
    return { enabled: loaded, reason: loaded ? '' : (IS_EN ? 'Open a document first.' : '請先開啟文件。') };
  }
  function getUniversalCapability(format) {
    var common = getToolCapability('save-as');
    if (!common.enabled) return common;
    if (format === 'pdf') return common;
    if (['txt', 'md', 'html', 'docx', 'csv', 'xlsx'].includes(format)) return getToolCapability('text');
    if (['png', 'jpg', 'zip'].includes(format)) return getToolCapability('image-or-pdf');
    return common;
  }
  function getToolUnavailableReason(key) {
    var capability = key.indexOf('universal:') === 0 ? getUniversalCapability(key.slice(10)) : getToolCapability(key);
    return capability.reason || (IS_EN ? 'This action is not available for the current document.' : '目前文件格式不支援這項功能。');
  }
  function explainUnavailable(key) {
    var reason = getToolUnavailableReason(key);
    var message = IS_EN ? 'Unavailable: ' + reason : '目前無法使用：' + reason;
    toast(message, { guide: true });
    setStatus(message, 'error');
  }
  function applyToolCapability(control, key) {
    if (!control || !key) return;
    var capability = key.indexOf('universal:') === 0 ? getUniversalCapability(key.slice(10)) : getToolCapability(key);
    var baseTitle = control.dataset.baseCapabilityTitle || control.getAttribute('title') || control.getAttribute('aria-label') || (control.textContent || '').trim();
    control.dataset.capabilityKey = key;
    control.dataset.baseCapabilityTitle = baseTitle;
    control.classList.toggle('is-format-disabled', !capability.enabled);
    control.setAttribute('aria-disabled', capability.enabled ? 'false' : 'true');
    if (capability.enabled) {
      control.removeAttribute('data-disabled-reason');
      if (baseTitle) control.setAttribute('title', baseTitle);
    } else {
      control.dataset.disabledReason = capability.reason;
      control.setAttribute('title', (baseTitle ? baseTitle + ' — ' : '') + capability.reason);
    }
    if (control.matches('button') && !control.dataset.capabilityBusy) control.disabled = false;
  }
  function syncToolCapabilities() {
    var mapping = {
      'pdf-open-button': 'open', 'pdf-undo': 'undo', 'pdf-redo': 'redo', 'pdf-text-edit': 'pdf', 'pdf-fullscreen': 'always', 'pdf-save': 'save-as', 'pdf-clear': 'document',
      'pdf-page-prev': 'page-nav', 'pdf-page-input': 'page-nav', 'pdf-page-next': 'page-nav', 'pdf-zoom-out': 'document', 'pdf-zoom-in': 'document', 'pdf-fit-select': 'document',
      'pdf-night-mode': 'always', 'pdf-mobile-help': 'always', 'pdf-mobile-thumbnails': 'document', 'pdf-mobile-page-prev': 'page-nav', 'pdf-mobile-page-input': 'page-nav', 'pdf-mobile-page-next': 'page-nav', 'pdf-mobile-ai': 'ai', 'pdf-mobile-bookmark': 'document', 'pdf-mobile-undo': 'undo', 'pdf-mobile-redo': 'redo', 'pdf-mobile-save': 'save-as', 'pdf-annotate-popover': 'pdf', 'pdf-pages-popover': 'pdf', 'pdf-convert-popover': 'always', 'pdf-universal-convert-popover': 'save-as',
      'pdf-rotate-left': 'pdf', 'pdf-rotate-right': 'pdf', 'pdf-rotate-180': 'pdf', 'pdf-delete-pages': 'pdf', 'pdf-export-pages': 'pdf', 'pdf-split-run': 'pdf', 'pdf-insert-page': 'pdf', 'pdf-crop-run': 'pdf', 'pdf-compress-run': 'pdf',
      'pdf-add-signature': 'pdf', 'pdf-signature-rotate-left': 'pdf', 'pdf-signature-rotate-right': 'pdf', 'pdf-delete-signature': 'pdf', 'pdf-download-current': 'image-or-pdf', 'pdf-download-jpg': 'image-or-pdf', 'pdf-images-to-pdf': 'image-to-pdf', 'pdf-merge-run': 'pdf', 'pdf-lock-run': 'pdf', 'pdf-unlock-run': 'always', 'pdf-merge-pick': 'always', 'pdf-images-pick': 'always', 'pdf-page-flow': 'page-flow',
      'pdf-chat-send': 'ai', 'pdf-preset-run': 'ai', 'pdf-preset-send': 'ai', 'pdf-summary-run': 'ai', 'pdf-risk-run': 'ai', 'pdf-translate-run': 'ai', 'pdf-translate-current': 'ai', 'pdf-project-run': 'ai'
    };
    Object.keys(mapping).forEach(function (id) { applyToolCapability($(id), mapping[id]); });
    qsa('[data-popover-target]').forEach(function (control) {
      var target = control.dataset.popoverTarget;
      var key = target === 'pdf-annotate-popover' || target === 'pdf-pages-popover' ? 'pdf' : target === 'pdf-universal-convert-popover' ? 'save-as' : 'always';
      applyToolCapability(control, key);
    });
    qsa('[data-pdf-tool]').forEach(function (control) { applyToolCapability(control, 'pdf'); });
    qsa('[data-task-action]').forEach(function (control) { applyToolCapability(control, 'ai'); });
    qsa('[data-editor-capability]').forEach(function (control) { applyToolCapability(control, control.dataset.editorCapability); });
    qsa('[data-mobile-capability]').forEach(function (control) { applyToolCapability(control, control.dataset.mobileCapability); });
    var pdfEditEntry = $('pdf-text-edit'); if (pdfEditEntry) pdfEditEntry.hidden = !state.pdf;
    var mobileTopbar = $('pdf-mobile-reader-topbar'); if (mobileTopbar) mobileTopbar.hidden = !(isMobileReader() && state.file);
    var mobileSearch = $('pdf-mobile-search'); if (mobileSearch) { var searchCapability = getToolCapability('search'); mobileSearch.hidden = !(isMobileReader() && searchCapability.enabled); applyToolCapability(mobileSearch, 'search'); }
    if (state.file) { loadBookmarks(); syncBookmarkButton(); }
    var universalSelect = $('pdf-universal-format');
    if (universalSelect) Array.prototype.forEach.call(universalSelect.options, function (option) { var capability = getUniversalCapability(option.value); option.disabled = !capability.enabled; option.title = capability.enabled ? '' : capability.reason; });
    updateUniversalDescription();
    syncEditorDock(); syncMobileActionDock();
  }
  function bindUnavailableControlGuard() {
    if (document.documentElement.dataset.pdfCapabilityGuard) return;
    document.documentElement.dataset.pdfCapabilityGuard = 'true';
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('[data-capability-key]') : null;
      if (!target || target.getAttribute('aria-disabled') !== 'true') return;
      event.preventDefault(); event.stopImmediatePropagation();
      explainUnavailable(target.dataset.capabilityKey);
    }, true);
  }
  function syncWorkspaceToolsForTab(name) {
    syncWorkspaceToolsLabels();
    if (name === 'task' && $('pdf-chat-log') && $('pdf-chat-log').children.length) autoCollapseWorkspaceTools('task');
    if (name === 'preset' && $('pdf-preset-log') && $('pdf-preset-log').children.length) autoCollapseWorkspaceTools('preset');
    if (name === 'preset' && !isMobileReader() && $('pdf-preset-log') && !$('pdf-preset-log').children.length) setWorkspaceToolsCollapsed('preset', false);
  }

  var UNIVERSAL_FORMATS = {
    pdf: { description: IS_EN ? 'Save the current document as a local PDF file.' : '將目前文件另存為本機 PDF 文件。', label: 'PDF' },
    docx: { description: IS_EN ? 'Create a Word document from the current text layer.' : '將目前文字層建立為 Word 文件。', label: 'DOCX' },
    txt: { description: IS_EN ? 'Download the current document text as plain text.' : '將目前文件文字下載為純文字。', label: 'TXT' },
    md: { description: IS_EN ? 'Download the current document text as Markdown.' : '將目前文件文字整理為 Markdown。', label: 'Markdown' },
    html: { description: IS_EN ? 'Create a standalone HTML reading document.' : '建立可離線閱讀的 HTML 文件。', label: 'HTML' },
    png: { description: IS_EN ? 'Render the current document page or image as a high-quality PNG.' : '將目前文件頁面或圖片輸出為高畫質 PNG。', label: 'PNG' },
    jpg: { description: IS_EN ? 'Render the current document page or image as a JPG image.' : '將目前文件頁面或圖片輸出為 JPG。', label: 'JPG' },
    zip: { description: IS_EN ? 'Package PDF pages or the current image as an Images ZIP.' : '將 PDF 頁面或目前圖片打包為 Images ZIP。', label: 'Images ZIP' },
    csv: { description: IS_EN ? 'Export document text as a page-indexed CSV.' : '將文件文字依頁碼匯出為 CSV。', label: 'CSV' },
    xlsx: { description: IS_EN ? 'Create a spreadsheet from the document text.' : '將文件文字整理為 Excel 試算表。', label: 'XLSX' }
  };
  function setUniversalStatus(value, kind) { var node = $('pdf-universal-status'); if (node) node.textContent = value; if (value) setStatus(value, kind || 'success'); }
  function getUniversalText() { return extractAllText(false).then(function (value) { if (!value || !value.trim()) throw new Error(IS_EN ? 'This document has no readable text layer.' : '目前文件沒有可讀取的文字層。'); return value.slice(0, 120000); }); }
  function xmlEscape(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]; }); }
  function buildDocxBlob(value) { var JSZip = window.JSZip; if (!JSZip) return Promise.reject(new Error('JSZip unavailable')); var zip = new JSZip(); zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'); zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'); zip.file('word/_rels/document.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'); var body = String(value).split(/\r?\n/).map(function (line) { return line ? '<w:p><w:r><w:t xml:space="preserve">' + xmlEscape(line) + '</w:t></w:r></w:p>' : '<w:p/>'; }).join(''); zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>'); return zip.generateAsync({ type: 'blob' }); }
  function csvCell(value) { return '"' + String(value == null ? '' : value).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"'; }
  function buildPageRows() { return [['Page', 'Text']].concat(state.pageOrder.map(function (page) { return [page, state.pageTexts[page] || state.documentText || '']; })); }
  function buildXlsxBlob(rows) { var JSZip = window.JSZip; if (!JSZip) return Promise.reject(new Error('JSZip unavailable')); var zip = new JSZip(); var sheetRows = rows.map(function (row, r) { return '<row r="' + (r + 1) + '">' + row.map(function (cell, c) { var ref = String.fromCharCode(65 + Math.min(c, 25)) + (r + 1); return '<c r="' + ref + '" t="inlineStr"><is><t>' + xmlEscape(cell) + '</t></is></c>'; }).join('') + '</row>'; }).join(''); zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'); zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'); zip.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Document text" sheetId="1" r:id="rId1"/></sheets></workbook>'); zip.file('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'); zip.file('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + sheetRows + '</sheetData></worksheet>'); return zip.generateAsync({ type: 'blob' }); }
  function imageDataToBlob(format) {
    if (!state.documentImageDataUrl) return Promise.reject(new Error(IS_EN ? 'No image is loaded.' : '目前沒有已載入的圖片。'));
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        var maxDimension = 2400; var scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
        var canvas = makeCanvas((image.naturalWidth || image.width) * scale, (image.naturalHeight || image.height) * scale);
        var context = canvas.getContext('2d');
        if (format === 'jpg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error(IS_EN ? 'The browser could not encode the image.' : '瀏覽器無法編碼這張圖片。')); }, format === 'jpg' ? 'image/jpeg' : 'image/png', .92);
      };
      image.onerror = function () { reject(new Error(IS_EN ? 'The image could not be decoded.' : '無法解碼圖片。')); };
      image.src = state.documentImageDataUrl;
    });
  }
  function getCurrentImageBlob(format) {
    if (state.documentKind === 'image' && state.documentImageDataUrl) return imageDataToBlob(format);
    if (!state.pdf) return Promise.reject(new Error(IS_EN ? 'PNG and JPG export requires a PDF or image document.' : 'PNG 與 JPG 輸出需要 PDF 或圖片文件。'));
    return state.pdf.getPage(state.currentPage).then(function (page) { var viewport = page.getViewport({ scale: 2, rotation: getPageDisplayRotation(state.currentPage) }); var canvas = makeCanvas(viewport.width, viewport.height); return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function () { return new Promise(function (resolve, reject) { canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error(IS_EN ? 'The browser could not encode the PDF page.' : '瀏覽器無法編碼 PDF 頁面。')); }, format === 'jpg' ? 'image/jpeg' : 'image/png', .92); }); }); });
  }
  function downloadCurrentImage(format) { return getCurrentImageBlob(format).then(function (blob) { downloadBlob(blob, safeName(state.file.name) + (state.pdf ? '-page-' + state.currentPage : '') + '.' + format); }); }
  function wrapCanvasText(context, value, maxWidth) {
    var lines = [];
    String(value || '').split(/\r?\n/).forEach(function (sourceLine) {
      if (!sourceLine) { lines.push(''); return; }
      var current = '';
      Array.from(sourceLine).forEach(function (character) { var candidate = current + character; if (current && context.measureText(candidate).width > maxWidth) { lines.push(current); current = character; } else current = candidate; });
      lines.push(current);
    });
    return lines;
  }
  async function buildGenericPdfBytes() {
    var PDFLib = requirePdfLib(); var document = await PDFLib.PDFDocument.create();
    if (state.documentKind === 'image' && state.documentImageDataUrl) {
      var imageBlob = await getCurrentImageBlob('png'); var embedded = await document.embedPng(await imageBlob.arrayBuffer()); var imageScale = Math.min(1, 595 / embedded.width, 842 / embedded.height); var imagePage = document.addPage([Math.max(1, embedded.width * imageScale), Math.max(1, embedded.height * imageScale)]); imagePage.drawImage(embedded, { x: 0, y: 0, width: embedded.width * imageScale, height: embedded.height * imageScale });
    } else {
      var pageWidth = 1190; var pageHeight = 1684; var padding = 72; var lineHeight = 34; var canvas = makeCanvas(pageWidth, pageHeight); var context = canvas.getContext('2d'); context.fillStyle = '#ffffff'; context.fillRect(0, 0, pageWidth, pageHeight); context.fillStyle = '#182536'; context.font = '24px "Noto Sans TC", "Noto Sans", system-ui, sans-serif'; var lines = wrapCanvasText(context, state.documentText || state.file.name, pageWidth - padding * 2); var pageCount = Math.max(1, Math.ceil(lines.length / Math.floor((pageHeight - padding * 2) / lineHeight))); for (var pageIndex = 0; pageIndex < pageCount; pageIndex += 1) { if (pageIndex) { context.fillStyle = '#ffffff'; context.fillRect(0, 0, pageWidth, pageHeight); context.fillStyle = '#182536'; } var start = pageIndex * Math.floor((pageHeight - padding * 2) / lineHeight); var end = Math.min(lines.length, start + Math.floor((pageHeight - padding * 2) / lineHeight)); for (var lineIndex = start; lineIndex < end; lineIndex += 1) context.fillText(lines[lineIndex], padding, padding + (lineIndex - start + 1) * lineHeight); var pageImage = await document.embedPng(canvas.toDataURL('image/png')); var outputPage = document.addPage([595, 842]); outputPage.drawImage(pageImage, { x: 0, y: 0, width: 595, height: 842 }); }
    }
    return document.save();
  }
  async function runUniversalConversion() {
    var select = $('pdf-universal-format'); var format = select && select.value; if (!UNIVERSAL_FORMATS[format]) return; if (!state.file) { setUniversalStatus(IS_EN ? 'Open a document first.' : '請先開啟文件。', 'error'); return; } var button = $('pdf-universal-run'); if (button) button.disabled = true; setUniversalStatus(IS_EN ? 'Preparing ' + UNIVERSAL_FORMATS[format].label + ' locally…' : '正在本機準備 ' + UNIVERSAL_FORMATS[format].label + '…', 'loading');
    try {
      var prefix = safeName(state.file.name || 'document');
      if (format === 'pdf') { if (state.pdf) await exportPdf(state.pageOrder, prefix + '-saved.pdf'); else { var bytes = await buildGenericPdfBytes(); downloadBlob(new Blob([bytes], { type: 'application/pdf' }), prefix + '.pdf'); } }
      else if (format === 'txt' || format === 'md') { var text = await getUniversalText(); var content = format === 'md' ? '# ' + prefix + '\n\n' + text : text; downloadBlob(new Blob([content], { type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8' }), prefix + '.' + format); }
      else if (format === 'html') { var htmlText = await getUniversalText(); var html = '<!doctype html><html lang="' + (IS_EN ? 'en' : 'zh-Hant') + '"><meta charset="utf-8"><title>' + xmlEscape(prefix) + '</title><style>body{font:16px/1.7 system-ui;max-width:860px;margin:40px auto;padding:0 20px;white-space:pre-wrap}</style><main>' + xmlEscape(htmlText) + '</main></html>'; downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), prefix + '.html'); }
      else if (format === 'docx') downloadBlob(await buildDocxBlob(await getUniversalText()), prefix + '.docx');
      else if (format === 'csv') { var csv = buildPageRows().map(function (row) { return row.map(csvCell).join(','); }).join('\n'); downloadBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), prefix + '.csv'); }
      else if (format === 'xlsx') downloadBlob(await buildXlsxBlob(buildPageRows()), prefix + '.xlsx');
      else if (format === 'png' || format === 'jpg') await downloadCurrentImage(format);
      else if (format === 'zip') { if (state.pdf) await renderAllImages('png'); else if (state.documentKind === 'image') { var imageZip = new window.JSZip(); imageZip.file('page-001.png', new Uint8Array(await getCurrentImageBlob('png').then(function (blob) { return blob.arrayBuffer(); }))); downloadBlob(await imageZip.generateAsync({ type: 'blob' }), prefix + '-images.zip'); } else throw new Error(IS_EN ? 'Images ZIP requires a PDF or image document.' : '圖片 ZIP 需要 PDF 或圖片文件。'); }
      setUniversalStatus(IS_EN ? UNIVERSAL_FORMATS[format].label + ' downloaded locally.' : UNIVERSAL_FORMATS[format].label + ' 已在本機下載。', 'success'); actionGuide('universal');
    } catch (error) { setUniversalStatus((IS_EN ? 'Save as failed: ' : '另存新檔失敗：') + (error.message || (IS_EN ? 'Unsupported format.' : '格式不受支援。')), 'error'); }
    finally { if (button) button.disabled = false; }
  }
  function updateUniversalDescription() { var select = $('pdf-universal-format'); var node = $('pdf-universal-description'); if (!select || !node) return; var item = UNIVERSAL_FORMATS[select.value]; if (!item) { node.textContent = ''; return; } var capability = getUniversalCapability(select.value); node.textContent = item.description + (capability.enabled ? '' : ' ' + (IS_EN ? 'Why unavailable: ' : '目前無法使用原因：') + capability.reason); }
  function bindUniversalConverterControls() { $('pdf-universal-format')?.addEventListener('change', updateUniversalDescription); $('pdf-universal-run')?.addEventListener('click', runUniversalConversion); updateUniversalDescription(); }

  function bindToolbarOverflow() {
    var toolbar = qs('.pdf-app-toolbar'); var wrap = $('pdf-toolbar-overflow-wrap'); var list = $('pdf-toolbar-overflow-list'); if (!toolbar || !wrap || !list || wrap.dataset.bound) return; wrap.dataset.bound = 'true';
    var originalGroups = qsa('.pdf-toolbar-group:not(#pdf-toolbar-overflow-wrap):not(.pdf-universal-panel-holder)', toolbar);
    function getDirectControls(group) { return Array.prototype.filter.call(group.children, function (node) { return node.matches && node.matches('button, input, select'); }); }
    function controlName(source) { return source.getAttribute('aria-label') || source.title || (source.querySelector('.pdf-tool-label') || {}).textContent || (source.textContent || '').trim() || (IS_EN ? 'Tool' : '工具'); }
    function addOverflowControl(source) {
      var name = controlName(source); var item;
      if (source.matches('select')) {
        item = document.createElement('label'); item.className = 'pdf-toolbar-overflow-control'; item.setAttribute('aria-label', name); var caption = document.createElement('span'); caption.textContent = name; var clone = source.cloneNode(true); clone.removeAttribute('id'); clone.disabled = source.disabled; clone.value = source.value; clone.addEventListener('change', function () { source.value = clone.value; source.dispatchEvent(new Event('change', { bubbles: true })); }); item.appendChild(caption); item.appendChild(clone);
      } else if (source.matches('input')) {
        item = document.createElement('label'); item.className = 'pdf-toolbar-overflow-control'; item.setAttribute('aria-label', name); var inputCaption = document.createElement('span'); inputCaption.textContent = name; var inputClone = source.cloneNode(true); inputClone.removeAttribute('id'); inputClone.disabled = source.disabled; inputClone.value = source.value; var syncInput = function () { source.value = inputClone.value; source.dispatchEvent(new Event('input', { bubbles: true })); source.dispatchEvent(new Event('change', { bubbles: true })); }; inputClone.addEventListener('input', syncInput); inputClone.addEventListener('change', syncInput); item.appendChild(inputCaption); item.appendChild(inputClone);
      } else {
        item = document.createElement('button'); item.type = 'button'; item.className = 'pdf-toolbar-overflow-item'; item.setAttribute('role', 'menuitem'); item.disabled = false; item.setAttribute('aria-disabled', source.getAttribute('aria-disabled') || 'false'); if (source.dataset.capabilityKey) { item.dataset.capabilityKey = source.dataset.capabilityKey; item.dataset.disabledReason = source.dataset.disabledReason || ''; } if (source.classList.contains('is-format-disabled')) item.classList.add('is-format-disabled'); item.innerHTML = source.innerHTML || ''; if (!source.querySelector('.pdf-tool-label')) { var proxyLabel = document.createElement('span'); proxyLabel.className = 'pdf-tool-label'; proxyLabel.textContent = name; item.appendChild(proxyLabel); } item.title = source.title || name; item.addEventListener('click', function () { if (item.getAttribute('aria-disabled') === 'true') { explainUnavailable(item.dataset.capabilityKey); return; } source.click(); closeToolbarOverflowPopover(); });
      }
      list.appendChild(item);
    }
    function closeToolbarOverflowPopover() { var panel = $('pdf-toolbar-overflow-popover'); if (panel) { panel.hidden = true; var trigger = wrap.querySelector('[data-popover-target]'); if (trigger) trigger.setAttribute('aria-expanded', 'false'); } }
    function refresh() {
      var available = Math.max(120, toolbar.clientWidth - 8); var used = 0; var overflowGroups = [];
      originalGroups.forEach(function (group) { group.hidden = false; used += group.getBoundingClientRect().width + 7; });
      if (used > available) {
        var overflowReserve = Math.max(82, wrap.getBoundingClientRect().width || 88) + 8;
        originalGroups.slice().reverse().forEach(function (group) { var width = group.getBoundingClientRect().width + 7; if (used + overflowReserve > available || overflowGroups.length) { group.hidden = true; overflowGroups.unshift(group); used -= width; } });
      }
      list.replaceChildren(); overflowGroups.forEach(function (group) { getDirectControls(group).forEach(addOverflowControl); }); wrap.hidden = !overflowGroups.length;
    }
    if (window.ResizeObserver) { var observer = new ResizeObserver(refresh); observer.observe(toolbar); } else window.addEventListener('resize', refresh);
    window.setTimeout(refresh, 0); window.addEventListener('resize', refresh);
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
    $('pdf-task-tools-toggle')?.addEventListener('click', function () { toggleWorkspaceTools('task'); });
    $('pdf-preset-tools-toggle')?.addEventListener('click', function () { toggleWorkspaceTools('preset'); });
    $('pdf-task-tools-inline-toggle')?.addEventListener('click', function () { toggleWorkspaceTools('task'); });
    $('pdf-preset-tools-inline-toggle')?.addEventListener('click', function () { toggleWorkspaceTools('preset'); });
    $('pdf-preset-translate-language')?.addEventListener('change', syncPresetCustomLanguageInput);
    syncPresetCustomLanguageInput();
    document.addEventListener('click', function (event) { if (!event.target.closest('.pdf-composer-shell')) closeMoreMenus(); });
    $('pdf-open-models')?.addEventListener('click', function () { if (window.GugoProPdfRooms) window.GugoProPdfRooms.openDrawer(true); });
    $('pdf-model-close')?.addEventListener('click', closeModelDrawer); $('pdf-key-close')?.addEventListener('click', closeKeyModal);
    qsa('.pdf-model-drawer, .pdf-modal').forEach(function (overlay) { overlay.addEventListener('click', function (event) { if (event.target === overlay) overlay.classList.remove('is-open'); }); });
    bindUniversalConverterControls();
    window.setTimeout(function () { syncWorkspaceToolsForTab('task'); syncWorkspaceToolsLabels(); }, 0);
  }

  function syncMobilePageControls() {
    var current = $('pdf-mobile-current-page'); var total = $('pdf-mobile-total-pages'); var input = $('pdf-mobile-page-input');
    var pages = state.pageOrder.length || (state.pdf && state.pdf.numPages) || (state.file ? 1 : 0);
    var index = state.pageOrder.length ? Math.max(0, state.pageOrder.indexOf(state.currentPage)) : 0;
    if (current) current.textContent = String(state.currentPage || 1);
    if (total) total.textContent = String(pages);
    if (input) { input.value = String(state.currentPage || 1); input.max = String(Math.max(1, pages)); }
    var previous = $('pdf-mobile-page-prev'); var next = $('pdf-mobile-page-next');
    if (previous) previous.hidden = !(state.file && pages > 1 && index > 0);
    if (next) next.hidden = !(state.file && pages > 1 && index < pages - 1);
    syncBookmarkButton();
  }

  function navigatePage(delta) {
    if (!state.file) { toast(messages.choosePdf); return false; }
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
    $('pdf-mobile-page-input')?.addEventListener('change', function () { if (!state.file) return toast(messages.choosePdf); var page = Number(this.value); if (state.pageOrder.includes(page)) { state.currentPage = page; renderMainPage(); syncMobilePageControls(); actionGuide('pageInput'); } else { this.value = String(state.currentPage); toast(IS_EN ? 'Enter a valid page number.' : '請輸入有效頁碼', { guide: true }); } });
    $('pdf-empty-open')?.addEventListener('click', function () { actionGuide('open'); $('pdf-file-input')?.click(); });
    $('pdf-mobile-thumbnails')?.addEventListener('click', function () { setMobileSidebar(true); });
    $('pdf-mobile-ai')?.addEventListener('click', function () { var pane = $('pdf-ai-pane'); setMobileAi(!pane || !pane.classList.contains('is-mobile-open')); });
    $('pdf-mobile-ai-close')?.addEventListener('click', function () { setMobileAi(false); actionGuide('aiBack'); });
    $('pdf-sidebar-close-mobile')?.addEventListener('click', function () { setMobileSidebar(false); actionGuide('aiBack'); });
    var stage = $('pdf-reader-stage'); var startX = 0; var startY = 0; var pinch = null; var pinchFrame = 0; var gestureWasPinch = false;
    function pinchSurface() { return isMobileReader() && state.pdf ? $('pdf-continuous-stack') : $('pdf-page-frame'); }
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
      pinch = null;
      if (state.pdf) {
        renderMainPage().then(function () { window.requestAnimationFrame(function () { restorePinchAnchor(anchor); }); });
      } else {
        renderDocumentPreview();
        window.requestAnimationFrame(function () { restorePinchAnchor(anchor); });
      }
    }
    function cancelPinch() {
      if (!pinch) return;
      var surface = pinchSurface();
      state.zoom = pinch.zoom;
      pinch = null;
      if (state.pdf) renderMainPage(); else { resetPinchVisual(surface); renderDocumentPreview(); }
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
      stage.addEventListener('touchcancel', function () { cancelPinch(); gestureWasPinch = false; }, { passive: true });
    }
  }

  function syncDesktopReaderPan() {
    var stage = $('pdf-reader-stage');
    if (stage && typeof stage._syncDesktopReaderPan === 'function') stage._syncDesktopReaderPan();
  }

  function bindDesktopReaderPan() {
    var stage = $('pdf-reader-stage');
    if (!stage || stage.dataset.desktopPanBound) return;
    stage.dataset.desktopPanBound = 'true';
    var dragging = false; var moved = false; var startX = 0; var startY = 0; var startScrollLeft = 0; var startScrollTop = 0;
    function canPan() {
      if (isMobileReader() || !state.file) return false;
      return stage.scrollWidth > stage.clientWidth + 2 || stage.scrollHeight > stage.clientHeight + 2 || Number(state.zoom) > 1.01;
    }
    function syncPanClass() {
      var enabled = canPan();
      stage.classList.toggle('is-pan-enabled', enabled);
      if (!enabled && dragging) finish();
    }
    function finish() {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('is-panning');
      if (moved) window.setTimeout(function () { moved = false; }, 0);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', finish);
    }
    function move(event) {
      if (!dragging) return;
      var dx = event.clientX - startX; var dy = event.clientY - startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      if (moved) { event.preventDefault(); stage.scrollLeft = startScrollLeft - dx; stage.scrollTop = startScrollTop - dy; }
    }
    stage.addEventListener('mousedown', function (event) {
      if (event.button !== 0 || !canPan()) return;
      if (event.target.closest && (event.target.closest('.pdf-annotation-canvas') || event.target.closest('.pdf-signature-stamp'))) return;
      if (state.tool !== 'select') return;
      dragging = true; moved = false; startX = event.clientX; startY = event.clientY; startScrollLeft = stage.scrollLeft; startScrollTop = stage.scrollTop;
      stage.classList.add('is-panning');
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', finish);
    });
    stage.addEventListener('click', function (event) {
      if (moved) { event.preventDefault(); event.stopPropagation(); moved = false; }
    }, true);
    stage.addEventListener('mouseleave', function (event) { if (dragging && (!event.buttons || event.buttons === 0)) finish(); });
    window.addEventListener('resize', syncPanClass, { passive: true });
    stage._syncDesktopReaderPan = syncPanClass;
    syncPanClass();
  }

  function bindSidebar() {
    qsa('[data-sidebar]').forEach(function (button) { button.addEventListener('click', function () { setSidebarTab(button.dataset.sidebar); actionGuide('sidebarTab'); }); });
    bindMobileReaderControls();
    bindDesktopReaderPan();
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
    addFileInputListeners(); bindPopovers(); bindToolbar(); bindAi(); bindSidebar(); bindHistoryShortcuts(); bindUnavailableControlGuard(); initSignaturePad(); initAi(); setEmptyState(true); syncMobileLauncherCategory('all'); syncMobilePageControls(); syncHistoryButtons(); syncToolCapabilities(); renderNotesPanel();
    $('pdf-page-input').value = '1'; $('pdf-total-pages').textContent = '0';
    syncVisualViewportHeight();
    window.addEventListener('resize', function () { syncVisualViewportHeight(); syncToolCapabilities(); syncMobilePageControls(); syncMobileActionDock(); syncEditorDock(); if (state.pdf && state.fitMode !== 'manual' && !state.inlineTextEditor && !state.activeTextSelection) renderMainPage(); });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () { syncVisualViewportHeight(); syncToolCapabilities(); syncMobilePageControls(); syncMobileActionDock(); syncEditorDock(); }, { passive: true });
      window.visualViewport.addEventListener('scroll', syncVisualViewportHeight, { passive: true });
    }
    window.addEventListener('error', function (event) { if (event && event.message && /pdf/i.test(event.message)) setStatus((IS_EN ? 'PDF module error: ' : '前端 PDF 模組錯誤：') + event.message, 'error'); });
  }

  function getSnapshot() {
    return { file: state.file, pdf: state.pdf, documentKind: state.documentKind, documentText: state.documentText, documentImageDataUrl: state.documentImageDataUrl, documentImageWidth: state.documentImageWidth, documentImageHeight: state.documentImageHeight, documentImageMime: state.documentImageMime, pageOrder: state.pageOrder.slice(), currentPage: state.currentPage, pageRotations: Object.assign({}, state.pageRotations), pageTexts: Object.assign({}, state.pageTexts), textReady: state.textReady, zoom: state.zoom, fitMode: state.fitMode, tool: state.tool, annotations: JSON.parse(JSON.stringify(state.annotations || {})), textEdits: JSON.parse(JSON.stringify(state.textEdits || {})), annotationImages: Object.assign({}, state.annotationImages), signatures: JSON.parse(JSON.stringify(state.signatures || {})), activeSignatureId: state.activeSignatureId, outline: JSON.parse(JSON.stringify(state.outline || {})) };
  }
  async function restoreSnapshot(snapshot) {
    if (!snapshot || (!snapshot.pdf && !snapshot.file)) { clearReaderFrame(); setEmptyState(true); return; }
    state.file = snapshot.file || null; state.pdf = snapshot.pdf || null; state.documentKind = snapshot.documentKind || (state.pdf ? 'pdf' : getDocumentKind(state.file)); state.documentText = snapshot.documentText || ''; state.documentImageDataUrl = snapshot.documentImageDataUrl || ''; state.documentImageWidth = Number(snapshot.documentImageWidth) || 0; state.documentImageHeight = Number(snapshot.documentImageHeight) || 0; state.documentImageMime = snapshot.documentImageMime || (state.file && state.file.type) || ''; state.pageOrder = Array.isArray(snapshot.pageOrder) ? snapshot.pageOrder.slice() : []; state.currentPage = Number(snapshot.currentPage) || state.pageOrder[0] || 1; state.pageRotations = Object.assign({}, snapshot.pageRotations || {}); state.pageTexts = Object.assign({}, snapshot.pageTexts || {}); state.textReady = Boolean(snapshot.textReady); state.zoom = Number(snapshot.zoom) || .92; state.fitMode = snapshot.fitMode || 'fit-width'; state.tool = snapshot.tool || 'select';     state.annotations = JSON.parse(JSON.stringify(snapshot.annotations || {})); state.textEdits = JSON.parse(JSON.stringify(snapshot.textEdits || {})); state.annotationImages = Object.assign({}, snapshot.annotationImages || {}); state.signatures = JSON.parse(JSON.stringify(snapshot.signatures || {})); state.activeSignatureId = snapshot.activeSignatureId || null; state.outline = JSON.parse(JSON.stringify(snapshot.outline || []));
    setEmptyState(false); $('pdf-file-name').textContent = state.file ? state.file.name : (IS_EN ? 'Document text backup' : '文件文字層備份'); $('pdf-file-meta').textContent = state.pdf ? state.pageOrder.length + (IS_EN ? ' page(s) · local room content' : ' 頁 · 本機房間內容') : (IS_EN ? 'Local document text backup' : '本機文件文字層備份'); $('pdf-total-pages').textContent = state.pdf ? state.pageOrder.length : '1'; $('pdf-page-count-badge').textContent = state.pdf ? state.pageOrder.length + (IS_EN ? ' page(s)' : ' 頁') : (IS_EN ? '1 document' : '1 份文件'); if ($('pdf-thumb-empty')) $('pdf-thumb-empty').hidden = true; await renderThumbnails(); await renderOutline(); await renderMainPage(); renderNotesPanel(); syncToolCapabilities();
  }
  window.GugoProPdfSuite = { loadPdf: loadPdf, loadDocument: loadDocument, extractAllText: extractAllText, getSnapshot: getSnapshot, restoreSnapshot: restoreSnapshot, clearViewer: function () { if ($('pdf-clear')) $('pdf-clear').click(); }, switchAiTab: switchAiTab, executeTask: executeTask, runTaskMatrixAction: runTaskMatrixAction, getSignatureLibrary: getSignatureLibrary, getState: function () { return state; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
