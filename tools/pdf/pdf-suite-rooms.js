(function (root) {
  'use strict';

  var ROOM_STORAGE_KEY = 'gugopro_ai_pdf_rooms_v1';
  var rooms = [];
  var activeRoomId = null;
  var runtimeByRoom = new Map();
  var restoringRoom = false;
  var currentRoomOperation = '';
  var REQUEST_TIMEOUT_MS = 10000;
  var IS_EN = root.document && root.document.documentElement && root.document.documentElement.lang === 'en';
  var DEFAULT_TASK_ROOMS = IS_EN ? [
    { id: 'pdf_task_default_1', name: 'Task 1 · Document Summary', rule: 'Organize the document’s core conclusions, key data, dates, and action items, citing a page for every finding.', summary: 'Summarize key points, data, and actions with pages.' },
    { id: 'pdf_task_default_2', name: 'Task 2 · Contract Risk', rule: 'Scan penalties, auto-renewal, disclaimers, unilateral changes, non-compete, payment, and termination clauses. Mark severity, evidence pages, and human-review suggestions.', summary: 'Find high-risk and disputed clauses with pages.' },
    { id: 'pdf_task_default_3', name: 'Task 3 · Data Extraction', rule: 'Extract financial data, tables, units, and periods from the PDF into structured Markdown, citing source pages and flagging suspected contradictions.', summary: 'Turn tables and financial data into Markdown.' },
    { id: 'pdf_task_default_4', name: 'Task 4 · Compliance & Security', rule: 'Check for personal data, confidential information, unauthorized terms, data exposure, and legal or security risks. List evidence pages and remediation suggestions by severity.', summary: 'Scan personal data, secrets, and compliance risks.' }
  ] : [
    { id: 'pdf_task_default_1', name: '任務一 · 文件摘要', rule: '整理文件核心結論、關鍵數據、重要日期與待辦事項，所有發現附上頁碼。', summary: '快速整理重點、數據與待辦，附頁碼。' },
    { id: 'pdf_task_default_2', name: '任務二 · 合約風控', rule: '掃描違約金、自動續約、免責、單方變更、競業、付款與終止條款，標示風險等級、證據頁碼與人工覆核建議。', summary: '找出高風險與爭議條款，附頁碼。' },
    { id: 'pdf_task_default_3', name: '任務三 · 數據提煉', rule: '擷取 PDF 中的財務數據、表格、單位與期間，整理成結構化 Markdown，標出來源頁碼並指出疑似矛盾。', summary: '將表格與財務數據轉成 Markdown。' },
    { id: 'pdf_task_default_4', name: '任務四 · 合規資安', rule: '檢查文件中的個人資料、機密資訊、未授權條款與潛在法律或資安風險，依嚴重程度列出證據與處理建議。', summary: '掃描個資、機密與合規風險。' }
  ];

  function $(id) { return document.getElementById(id); }
  function text(value) { return String(value == null ? '' : value); }
  function safeName(value) { return text(value || 'pdf-room').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'pdf-room'; }

  function makeDefaultTaskRoom(definition) {
    return { id: definition.id, name: definition.name, createdAt: new Date().toISOString(), messages: [], pdf: null, taskRule: definition.rule, taskSummary: definition.summary };
  }

  function getDefaultRoom() {
    return makeDefaultTaskRoom(DEFAULT_TASK_ROOMS[0]);
  }

  function ensureDefaultTaskRooms() {
    DEFAULT_TASK_ROOMS.forEach(function (definition) {
      var existing = rooms.find(function (room) { return room.id === definition.id; });
      if (!existing) rooms.push(makeDefaultTaskRoom(definition));
      else if (!existing.messages.length && !existing.pdf && (/^(任務[一二三四]|Task [1-4])/.test(existing.name) || /^(快速整理|找出高風險|將表格|掃描個資|Summarize|Find high-risk|Turn tables|Scan personal)/.test(existing.taskSummary))) { existing.name = definition.name; existing.taskRule = definition.rule; existing.taskSummary = definition.summary; }
    });
  }

  function normalizePdfRecord(pdf) {
    if (!pdf || typeof pdf !== 'object') return null;
    var pageTexts = {};
    Object.keys(pdf.pageTexts || {}).forEach(function (page) { pageTexts[page] = text(pdf.pageTexts[page]).slice(0, 90000); });
    if (!Object.keys(pageTexts).length) return null;
    return {
      fileName: text(pdf.fileName || 'PDF 文字層備份').slice(0, 180),
      fileSize: Number(pdf.fileSize) || 0,
      pageTexts: pageTexts,
      pageOrder: Array.isArray(pdf.pageOrder) ? pdf.pageOrder.map(Number).filter(Boolean) : Object.keys(pageTexts).map(Number).sort(function (a, b) { return a - b; }),
      currentPage: Number(pdf.currentPage) || 1,
      savedAt: pdf.savedAt || new Date().toISOString()
    };
  }

  function normalizeRoom(room) {
    var item = room && typeof room === 'object' ? room : {};
    return {
      id: text(item.id || 'pdf_room_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      name: text(item.name || 'PDF 分析房間').slice(0, 80),
      createdAt: item.createdAt || new Date().toISOString(),
      messages: Array.isArray(item.messages) ? item.messages.map(function (message, index) { return { id: text(message.id || 'pdf_msg_legacy_' + index + '_' + Math.random().toString(36).slice(2, 7)), role: message.role === 'assistant' ? 'assistant' : 'user', text: text(message.text || message.content || '').slice(0, 30000), createdAt: message.createdAt || new Date().toISOString() }; }).filter(function (message) { return message.text; }) : [],
      pdf: normalizePdfRecord(item.pdf),
      taskRule: text(item.taskRule || '').slice(0, 12000),
      taskSummary: text(item.taskSummary || (item.taskRule ? '已保存自訂任務規則' : '尚未設定核心任務條件')).slice(0, 240)
    };
  }

  function saveRooms() {
    try {
      root.localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify({ version: 2, activeRoomId: activeRoomId, rooms: rooms }));
    } catch (error) {
      console.warn('[GugoPro PDF Rooms] localStorage 寫入失敗:', error);
      showRoomNotice('房間文字層或對話較大，瀏覽器 localStorage 暫時無法完整保存。', 'error');
    }
  }

  function loadRooms() {
    var saved = null;
    try { saved = JSON.parse(root.localStorage.getItem(ROOM_STORAGE_KEY) || 'null'); } catch (_) { saved = null; }
    rooms = Array.isArray(saved) ? saved.map(normalizeRoom) : (Array.isArray(saved && saved.rooms) ? saved.rooms.map(normalizeRoom) : []);
    var legacyEmpty = rooms.find(function (room) { return room.name === '一般 PDF 分析' && !room.taskRule && !room.pdf && !room.messages.length; });
    if (legacyEmpty) { rooms = rooms.filter(function (room) { return room.id !== legacyEmpty.id; }); if (saved && saved.activeRoomId === legacyEmpty.id) saved.activeRoomId = DEFAULT_TASK_ROOMS[0].id; }
    if (!rooms.length) rooms = [getDefaultRoom()];
    ensureDefaultTaskRooms();
    activeRoomId = (saved && saved.activeRoomId && rooms.some(function (room) { return room.id === saved.activeRoomId; })) ? saved.activeRoomId : rooms[0].id;
    saveRooms();
  }

  function getActiveRoom() { return rooms.find(function (room) { return room.id === activeRoomId; }) || null; }

  function showRoomNotice(message, kind) {
    var status = $('pdf-ai-error-panel');
    var messageEl = $('pdf-ai-error-msg');
    if (!status || !messageEl) return;
    messageEl.textContent = message;
    status.className = 'pdf-ai-error-panel is-visible ' + (kind || '');
    if (kind !== 'busy') window.setTimeout(function () { status.classList.remove('is-visible'); }, 3600);
  }

  function renderRoomName() {
    var room = getActiveRoom();
    var nameEl = $('pdf-room-name');
    if (nameEl) nameEl.textContent = room ? room.name : '自訂 AI 任務專家';
    var ruleSummary = $('pdf-project-rule-summary');
    if (ruleSummary) ruleSummary.textContent = room && room.taskSummary ? room.taskSummary : '尚未設定核心任務條件';
  }

  function renderTaskRoomList() {
    var list = $('pdf-task-room-list');
    if (!list) return;
    list.replaceChildren();
    rooms.forEach(function (room) {
      var item = document.createElement('div');
      item.className = 'pdf-task-room-card' + (room.id === activeRoomId ? ' is-active' : '');
      item.dataset.roomId = room.id;
      item.setAttribute('role', 'listitem');
      var main = document.createElement('button');
      main.className = 'pdf-task-room-main'; main.type = 'button'; main.title = '切換至 ' + room.name;
      main.addEventListener('click', function () { switchRoom(room.id); });
      var icon = document.createElement('i'); icon.className = 'fa-solid fa-bolt';
      var copy = document.createElement('span'); copy.className = 'pdf-task-room-copy';
      var name = document.createElement('strong'); name.textContent = room.name;
      var summary = document.createElement('small'); summary.textContent = room.taskSummary || (room.taskRule ? '已設定任務規則' : '尚未設定任務規則');
      copy.appendChild(name); copy.appendChild(summary); main.appendChild(icon); main.appendChild(copy);
      var actions = document.createElement('div'); actions.className = 'pdf-task-room-actions';
      var rename = document.createElement('button'); rename.className = 'pdf-task-room-action'; rename.type = 'button'; rename.title = '重新命名'; rename.setAttribute('aria-label', '重新命名'); rename.innerHTML = '<i class="fa-solid fa-pen"></i>'; rename.addEventListener('click', function (event) { event.stopPropagation(); renameRoom(room.id); });
      var remove = document.createElement('button'); remove.className = 'pdf-task-room-action'; remove.type = 'button'; remove.title = '刪除房間'; remove.setAttribute('aria-label', '刪除房間'); remove.innerHTML = '<i class="fa-solid fa-trash"></i>'; remove.addEventListener('click', function (event) { event.stopPropagation(); deleteRooms([room.id]); });
      actions.appendChild(rename); actions.appendChild(remove); item.appendChild(main); item.appendChild(actions); list.appendChild(item);
    });
  }

  function renderRoomList() {
    var list = $('pdf-room-list');
    if (!list) return;
    list.replaceChildren();
    rooms.forEach(function (room) {
      var item = document.createElement('div');
      item.className = 'pdf-room-item' + (room.id === activeRoomId ? ' is-active' : '');
      item.dataset.roomId = room.id;
      item.setAttribute('role', 'listitem');
      var main = document.createElement('button');
      main.className = 'pdf-room-main';
      main.type = 'button';
      main.title = '切換至 ' + room.name;
      main.addEventListener('click', function () { switchRoom(room.id); });
      var icon = document.createElement('i');
      icon.className = 'fa-regular fa-comments';
      var copy = document.createElement('span');
      copy.className = 'pdf-room-copy';
      var strong = document.createElement('strong');
      strong.textContent = room.name;
      var meta = document.createElement('small');
      meta.textContent = (room.pdf ? 'PDF 文字層 · ' : '') + room.messages.length + ' 則對話' + (room.taskRule ? ' · 已設定任務' : '');
      copy.appendChild(strong); copy.appendChild(meta); main.appendChild(icon); main.appendChild(copy);
      var actions = document.createElement('div');
      actions.className = 'pdf-room-actions';
      var rename = document.createElement('button');
      rename.className = 'pdf-room-action'; rename.type = 'button'; rename.title = '重新命名'; rename.innerHTML = '<i class="fa-solid fa-pen"></i>';
      rename.addEventListener('click', function (event) { event.stopPropagation(); renameRoom(room.id); });
      var remove = document.createElement('button');
      remove.className = 'pdf-room-action'; remove.type = 'button'; remove.title = '刪除房間'; remove.innerHTML = '<i class="fa-solid fa-trash"></i>';
      remove.addEventListener('click', function (event) { event.stopPropagation(); deleteRooms([room.id]); });
      actions.appendChild(rename); actions.appendChild(remove); item.appendChild(main); item.appendChild(actions); list.appendChild(item);
    });
    renderTaskRoomList();
  }

  function saveRuntimeForActiveRoom() {
    if (!activeRoomId || !root.GugoProPdfSuite || !root.GugoProPdfSuite.getSnapshot) return;
    var snapshot = root.GugoProPdfSuite.getSnapshot();
    if (snapshot && snapshot.pdf && snapshot.file) runtimeByRoom.set(activeRoomId, snapshot);
    var room = getActiveRoom();
    if (room && snapshot && snapshot.file && snapshot.pageTexts && Object.keys(snapshot.pageTexts).length) {
      room.pdf = { fileName: snapshot.file.name, fileSize: snapshot.file.size, pageTexts: snapshot.pageTexts, pageOrder: snapshot.pageOrder, currentPage: snapshot.currentPage, savedAt: new Date().toISOString() };
      saveRooms();
    }
  }

  function setRoomContext(room) {
    root.GugoProPdfRoomContext = function () {
      if (!room || !room.pdf || !room.pdf.pageTexts) return '';
      return Object.keys(room.pdf.pageTexts).sort(function (a, b) { return Number(a) - Number(b); }).map(function (page) { return '[第 ' + page + ' 頁]\n' + room.pdf.pageTexts[page]; }).join('\n\n');
    };
  }

  function renderRoomHistory(room) {
    var log = $('pdf-chat-log');
    if (!log) return;
    log.replaceChildren();
    (room.messages || []).forEach(function (message) {
      var node = document.createElement('div');
      node.className = 'pdf-chat-msg ' + message.role;
      node.dataset.messageId = message.id;
      var head = document.createElement('div'); head.className = 'pdf-chat-msg-head';
      var label = document.createElement('strong');
      label.textContent = message.role === 'user' ? 'You' : 'GugoPro AI';
      var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'pdf-chat-delete'; remove.title = '刪除訊息'; remove.setAttribute('aria-label', '刪除訊息'); remove.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      remove.addEventListener('click', function () { deleteMessage(room.id, message.id); });
      head.appendChild(label); head.appendChild(remove);
      var body = document.createElement('p'); body.textContent = message.text;
      node.appendChild(head); node.appendChild(body); log.appendChild(node);
    });
    log.scrollTop = log.scrollHeight;
  }

  function clearPdfForRoom() {
    if (root.GugoProPdfSuite && root.GugoProPdfSuite.clearViewer) root.GugoProPdfSuite.clearViewer();
    else if ($('pdf-clear')) $('pdf-clear').click();
    var room = getActiveRoom();
    if (room && room.pdf) {
      $('pdf-file-name').textContent = room.pdf.fileName + '（文字層備份）';
      $('pdf-file-meta').textContent = '本機文字層已保存；重新選擇原 PDF 可恢復視覺閱讀';
      if ($('pdf-reader-status')) $('pdf-reader-status').innerHTML = '<i class="fa-solid fa-file-lines"></i> 文字層就緒';
      if ($('pdf-status')) $('pdf-status').textContent = '房間已載入本機文字層備份，AI 可繼續分析。';
    }
  }

  async function switchRoom(roomId, force) {
    if (roomId === activeRoomId && !restoringRoom && !force) { renderRoomName(); renderRoomList(); if (root.GugoProPdfSuite && root.GugoProPdfSuite.switchAiTab) root.GugoProPdfSuite.switchAiTab('task'); return; }
    saveRuntimeForActiveRoom();
    var room = rooms.find(function (item) { return item.id === roomId; });
    if (!room) return;
    activeRoomId = roomId;
    saveRooms();
    restoringRoom = true;
    try {
      var snapshot = runtimeByRoom.get(room.id);
      if (snapshot && root.GugoProPdfSuite && root.GugoProPdfSuite.restoreSnapshot) await root.GugoProPdfSuite.restoreSnapshot(snapshot);
      else clearPdfForRoom();
      setRoomContext(room);
      renderRoomName(); renderRoomList(); renderRoomHistory(room);
      if (root.GugoProPdfSuite && root.GugoProPdfSuite.switchAiTab) root.GugoProPdfSuite.switchAiTab('task');
      showRoomNotice('已切換至「' + room.name + '」；對話與 PDF 文字層彼此獨立。', 'success');
    } finally { restoringRoom = false; }
    closeDrawer();
  }

  function createRoom() {
    var name = root.prompt('請輸入新的自訂 AI 任務專家名稱：', '新任務專家');
    if (!name || !name.trim()) return;
    saveRuntimeForActiveRoom();
    var room = { id: 'pdf_room_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), name: name.trim().slice(0, 80), createdAt: new Date().toISOString(), messages: [], pdf: null, taskRule: '', taskSummary: '尚未設定核心任務條件' };
    rooms.push(room); saveRooms(); renderRoomList(); switchRoom(room.id, true);
  }

  function renameRoom(roomId) {
    var room = rooms.find(function (item) { return item.id === roomId; });
    if (!room) return;
    var name = root.prompt('重新命名 PDF 分析房間：', room.name);
    if (!name || !name.trim()) return;
    room.name = name.trim().slice(0, 80); saveRooms(); renderRoomList(); renderRoomName();
  }

  function deleteMessage(roomId, messageId) {
    var room = rooms.find(function (item) { return item.id === (roomId || activeRoomId); });
    var id = text(messageId);
    if (!room || !id) return false;
    var before = room.messages.length;
    room.messages = room.messages.filter(function (message) { return message.id !== id; });
    if (room.messages.length === before) return false;
    saveRooms(); renderRoomList(); if (room.id === activeRoomId) renderRoomHistory(room);
    showRoomNotice('已刪除一則對話訊息。', 'success');
    return true;
  }

  function openTaskRuleEditor() {
    var room = getActiveRoom(); var modal = $('pdf-task-rule-modal');
    if (!room || !modal) return;
    if ($('pdf-task-project-name')) $('pdf-task-project-name').value = room.name || '';
    if ($('pdf-task-rule')) $('pdf-task-rule').value = room.taskRule || '';
    if ($('pdf-task-summary')) $('pdf-task-summary').value = room.taskSummary || '';
    modal.classList.add('is-open'); $('pdf-task-rule')?.focus();
  }

  function saveTaskRule() {
    var room = getActiveRoom(); if (!room) return;
    var name = text($('pdf-task-project-name') && $('pdf-task-project-name').value).trim();
    var rule = text($('pdf-task-rule') && $('pdf-task-rule').value).trim();
    var summary = text($('pdf-task-summary') && $('pdf-task-summary').value).trim();
    if (!rule) { showRoomNotice('請先寫下這個專案要固定執行的核心任務條件。', 'error'); return; }
    room.name = (name || room.name || '自訂 AI 任務專家').slice(0, 80);
    room.taskRule = rule.slice(0, 12000);
    room.taskSummary = (summary || rule.replace(/\s+/g, ' ').slice(0, 120)).slice(0, 240);
    saveRooms(); renderRoomName(); renderRoomList();
    var modal = $('pdf-task-rule-modal'); if (modal) modal.classList.remove('is-open');
    showRoomNotice('已保存「' + room.name + '」的核心任務規則。', 'success');
  }

  function deleteRooms(ids) {
    var selected = ids.filter(function (id) { return rooms.some(function (room) { return room.id === id; }); });
    if (!selected.length) return;
    if (rooms.length <= selected.length) { showRoomNotice('至少需保留一個 PDF 分析房間。', 'error'); return; }
    if (!root.confirm('確定刪除選取房間嗎？對話與已保存的 PDF 文字層會一併移除。')) return;
    rooms = rooms.filter(function (room) { return !selected.includes(room.id); });
    selected.forEach(function (id) { runtimeByRoom.delete(id); });
    if (selected.includes(activeRoomId)) activeRoomId = rooms[0].id;
    saveRooms(); renderRoomList(); switchRoom(activeRoomId, true);
  }

  function downloadJson(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob); var link = document.createElement('a');
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function showRoomOps(operation) {
    currentRoomOperation = operation;
    var modal = $('pdf-room-ops-modal'); var list = $('pdf-room-ops-list');
    if (!modal || !list) return;
    $('pdf-room-ops-title').textContent = operation === 'export' ? '匯出 PDF 分析房間' : '清除或刪除房間';
    $('pdf-room-ops-desc').textContent = operation === 'export' ? '勾選要匯出的房間；每個房間包含對話與可用的 PDF 文字層。' : '勾選房間後，確認時可選擇清空對話或直接刪除房間。';
    list.replaceChildren();
    rooms.forEach(function (room) {
      var label = document.createElement('label'); label.className = 'pdf-room-op-item';
      var input = document.createElement('input'); input.type = operation === 'export' ? 'checkbox' : 'checkbox'; input.name = 'pdf-room-op-select'; input.value = room.id;
      var span = document.createElement('span'); span.textContent = room.name + '（' + room.messages.length + ' 則對話' + (room.pdf ? ' · 含文字層' : '') + '）';
      label.appendChild(input); label.appendChild(span); list.appendChild(label);
    });
    modal.classList.add('is-open'); closeDrawer();
  }

  function confirmRoomOperation() {
    var selected = Array.prototype.slice.call(document.querySelectorAll('input[name="pdf-room-op-select"]:checked')).map(function (input) { return input.value; });
    if (!selected.length) { showRoomNotice('請至少選擇一個房間。', 'error'); return; }
    if (currentRoomOperation === 'export') {
      downloadJson({ version: 1, exportedAt: new Date().toISOString(), rooms: rooms.filter(function (room) { return selected.includes(room.id); }) }, 'gugopro-pdf-rooms-' + Date.now() + '.json');
      closeRoomOps(); return;
    }
    var clearOnly = root.confirm('按「確定」清除選取房間的對話；按「取消」則繼續選擇是否直接刪除房間。');
    if (clearOnly) {
      rooms.forEach(function (room) { if (selected.includes(room.id)) room.messages = []; }); saveRooms(); renderRoomList(); renderRoomHistory(getActiveRoom()); closeRoomOps(); return;
    }
    deleteRooms(selected); closeRoomOps();
  }

  function closeRoomOps() { var modal = $('pdf-room-ops-modal'); if (modal) modal.classList.remove('is-open'); }

  function importRooms(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var imported = Array.isArray(data) ? data : data.rooms;
        if (!Array.isArray(imported) || !imported.length) throw new Error('empty');
        var normalized = imported.map(normalizeRoom);
        var current = getActiveRoom();
        if (current && current.messages.length === 0 && !current.pdf) {
          rooms = rooms.filter(function (room) { return room.id !== current.id; });
        }
        normalized.forEach(function (room) { room.id = 'pdf_room_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); rooms.push(room); });
        activeRoomId = normalized[0].id; saveRooms(); renderRoomList(); switchRoom(activeRoomId, true); showRoomNotice('已匯入 ' + normalized.length + ' 個 PDF 分析房間。', 'success');
      } catch (_) { showRoomNotice('JSON 房間備份格式無效。', 'error'); }
    };
    reader.readAsText(file); $('pdf-room-import-input').value = '';
  }

  function openDrawer(shouldFetch) {
    var drawer = $('pdf-side-menu'); var overlay = $('pdf-drawer-overlay'); var button = $('pdf-open-models');
    if (!drawer || !overlay) return;
    drawer.classList.add('is-open'); overlay.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); if (button) button.setAttribute('aria-expanded', 'true');
    if (shouldFetch !== false && root.GugoProPdfSuiteAI && root.GugoProPdfSuiteAI.refresh) root.GugoProPdfSuiteAI.refresh({ silent: true });
  }

  function closeDrawer() {
    var drawer = $('pdf-side-menu'); var overlay = $('pdf-drawer-overlay'); var button = $('pdf-open-models');
    if (!drawer || !overlay) return;
    drawer.classList.remove('is-open'); overlay.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); if (button) button.setAttribute('aria-expanded', 'false');
  }

  function handlePdfLoaded() {
    if (restoringRoom) return;
    var api = root.GugoProPdfSuite; var room = getActiveRoom();
    if (!api || !room) return;
    setTimeout(async function () {
      try {
        await api.extractAllText(false);
        var snapshot = api.getSnapshot ? api.getSnapshot() : null;
        if (!snapshot || !snapshot.file) return;
        runtimeByRoom.set(room.id, snapshot);
        room.pdf = { fileName: snapshot.file.name, fileSize: snapshot.file.size, pageTexts: snapshot.pageTexts, pageOrder: snapshot.pageOrder, currentPage: snapshot.currentPage, savedAt: new Date().toISOString() };
        setRoomContext(room); saveRooms(); renderRoomName(); renderRoomList();
      } catch (error) { console.warn('[GugoPro PDF Rooms] PDF 文字層保存失敗:', error); }
    }, 0);
  }

  function handleTextExtracted(snapshot) {
    if (restoringRoom || !snapshot || !snapshot.file) return;
    var room = getActiveRoom(); if (!room) return;
    room.pdf = { fileName: snapshot.file.name, fileSize: snapshot.file.size, pageTexts: snapshot.pageTexts || {}, pageOrder: snapshot.pageOrder || [], currentPage: snapshot.currentPage || 1, savedAt: new Date().toISOString() };
    runtimeByRoom.set(room.id, snapshot); setRoomContext(room); saveRooms(); renderRoomList();
  }

  function handleRoomMessage(payload) {
    if (restoringRoom || !payload || !payload.text) return;
    var room = getActiveRoom(); if (!room) return;
    var messageId = text(payload.messageId || 'pdf_msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
    room.messages = room.messages.filter(function (message) { return message.id !== messageId; });
    room.messages.push({ id: messageId, role: payload.role === 'assistant' ? 'assistant' : 'user', text: text(payload.text).slice(0, 30000), createdAt: new Date().toISOString() });
    if (room.messages.length > 60) room.messages = room.messages.slice(-60);
    saveRooms(); renderRoomList(); if (room.id === activeRoomId) renderRoomHistory(room);
  }

  function bind() {
    loadRooms(); renderRoomName(); renderRoomList(); setRoomContext(getActiveRoom());
    if ($('pdf-drawer-close')) $('pdf-drawer-close').addEventListener('click', closeDrawer);
    if ($('pdf-drawer-overlay')) $('pdf-drawer-overlay').addEventListener('click', closeDrawer);
    if ($('pdf-room-new')) $('pdf-room-new').addEventListener('click', createRoom);
    if ($('pdf-room-new-inline')) $('pdf-room-new-inline').addEventListener('click', createRoom);
    if ($('pdf-room-export')) $('pdf-room-export').addEventListener('click', function () { showRoomOps('export'); });
    if ($('pdf-room-export-all')) $('pdf-room-export-all').addEventListener('click', function () { downloadJson({ version: 1, exportedAt: new Date().toISOString(), rooms: rooms }, 'gugopro-pdf-all-rooms-' + Date.now() + '.json'); closeDrawer(); });
    if ($('pdf-room-delete')) $('pdf-room-delete').addEventListener('click', function () { showRoomOps('delete'); });
    if ($('pdf-room-ops-confirm')) $('pdf-room-ops-confirm').addEventListener('click', confirmRoomOperation);
    if ($('pdf-room-import')) $('pdf-room-import').addEventListener('click', function () { $('pdf-room-import-input').click(); });
    if ($('pdf-room-import-input')) $('pdf-room-import-input').addEventListener('change', function () { importRooms(this.files && this.files[0]); });
    $('pdf-project-run')?.addEventListener('click', function () { if (root.GugoProPdfSuite && root.GugoProPdfSuite.executeTask) root.GugoProPdfSuite.executeTask(); });
    $('pdf-project-rule')?.addEventListener('click', openTaskRuleEditor);
    $('pdf-task-rule-save')?.addEventListener('click', saveTaskRule);
    document.querySelectorAll('[data-close-modal="pdf-room-ops-modal"], [data-close-modal="pdf-task-rule-modal"]').forEach(function (button) { button.addEventListener('click', function () { var modal = $(button.dataset.closeModal); if (modal) modal.classList.remove('is-open'); }); });
    if ($('pdf-drawer-save-key')) $('pdf-drawer-save-key').addEventListener('click', async function () { var key = text($('pdf-drawer-api-key').value).trim(); if (!key) return showRoomNotice('請先貼上 Gemini API key。', 'error'); localStorage.setItem('gugopro_gemini_api_key', key); localStorage.setItem('gemini_api_key', key); $('pdf-drawer-api-status').textContent = 'Key 已保存在本機。'; if (root.GugoProPdfSuiteAI && root.GugoProPdfSuiteAI.refresh) await root.GugoProPdfSuiteAI.refresh({ silent: false }); });
    if ($('pdf-model-refresh')) $('pdf-model-refresh').addEventListener('click', function () { if (root.GugoProPdfSuiteAI && root.GugoProPdfSuiteAI.refresh) root.GugoProPdfSuiteAI.refresh({ silent: false }); });
    root.addEventListener('gugopro:pdf-loaded', handlePdfLoaded);
    root.addEventListener('gugopro:pdf-text-extracted', function (event) { handleTextExtracted(event.detail || {}); });
    root.addEventListener('gugopro:pdf-room-message', function (event) { handleRoomMessage(event.detail || {}); });
    root.addEventListener('keydown', function (event) { if (event.key === 'Escape') { closeDrawer(); closeRoomOps(); } });
    var apiKey = root.GugoProPdfSuiteAI && root.GugoProPdfSuiteAI.getApiKey ? root.GugoProPdfSuiteAI.getApiKey() : '';
    if ($('pdf-drawer-api-key') && apiKey) $('pdf-drawer-api-key').value = apiKey;
    var room = getActiveRoom();
    if (room && room.pdf && !(root.GugoProPdfSuite && root.GugoProPdfSuite.getState().pdf)) clearPdfForRoom();
    renderRoomHistory(room);
  }

  function init() { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind(); }
  root.GugoProPdfRooms = { getRooms: function () { return rooms.slice(); }, getActiveRoom: getActiveRoom, switchRoom: switchRoom, createRoom: createRoom, openDrawer: openDrawer, closeDrawer: closeDrawer, saveRooms: saveRooms, deleteMessage: deleteMessage, openTaskRuleEditor: openTaskRuleEditor, saveTaskRule: saveTaskRule };
  init();
})(window);
