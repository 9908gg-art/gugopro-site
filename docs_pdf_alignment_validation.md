# GugoPro AI PDF Suite 對齊驗證記錄

## 初始中文頁

本地 `tools/pdf/pdf-suite.html?alignment=2` 回傳 HTTP 200，頁面標題、中文 toolbar、AI 面板、房間 strip、合規 footer 與英文切換連結均存在。初始 DOM 顯示 `#pdf-drawer-open`、`#pdf-room-list`、`#model-options`、`#pdf-drawer-api-key`、房間操作按鈕與 room operations modal。

## Drawer DOM 測試

以頁面 DOM 點擊 `#pdf-drawer-open` 後，回傳 `aria-expanded=true`、`#pdf-side-menu` class=`pdf-side-menu is-open`、`#pdf-drawer-overlay` class=`pdf-drawer-overlay is-open`、`window.GugoProPdfRooms=true`、`window.GugoProPdfSuiteAI=true`，房間清單目前有 1 個預設房間。Quota 模型初始狀態顯示正在動態清單載入或尚未可用時的 fallback 文案。

## 目前待驗證

下一步需以 390×844 viewport 確認 hero 隱藏與 Bottom Dock，再實測房間建立/切換/重新命名/匯入匯出、fixture PDF 載入與頁碼文字層同步，並確認英文頁與 console 無錯誤。

## 手機 390×844 截圖

最新 headless 截圖 `docs_pdf_alignment_mobile.png` 為 390×844。hero kicker、主標、副標與 privacy pill 均已隱藏；header 下方直接進入核心 PDF toolbar，頁面工作區採單欄，Bottom Dock 顯示頁面、工具、簽名、AI、開啟五個入口。畫面沒有水平滾動，empty-state 說明文字維持兩行，沒有孤立單字行。

Chromium 輸出只有 sandbox 的 UPower D-Bus 環境警告，未見 PDF Suite 的 unhandled exception。

## 多房間實測

在本地中文頁暫時 mock `prompt` 後建立「財報審閱」房間，`gugopro_ai_pdf_rooms_v1` 由 1 個房間增為 2 個，activeRoomId 更新，drawer room list 渲染 2 項；建立流程完成後 drawer 自動關閉。再次開啟 drawer 並以實際 room action click 重新命名為「財報風控」，localStorage 與畫面同步更新為 2 個房間，drawer 保持開啟。

## PDF viewer 與 room 文字層實測

透過 same-origin fetch 將 `pdf_alignment_fixture.pdf` 注入 `#pdf-file-input` 後，PDF.js 成功載入 3 頁，產生 3 張縮圖；`state.textReady=true`、頁面文字數為 3，active「財報風控」房間同步保存 3 頁 `pageTexts`，`#pdf-empty-state.hidden=true`。瀏覽器 hidden input upload helper 不接受此頁的隱藏欄位索引，因此使用同源測試注入，未改變正式使用者流程。

## Quota drawer 與模型調度

直接從同源頁面請求 `https://quota.gugopro.com/gemini_rate_limits.json` 回傳 HTTP 200、JSON 約 61 KB、55 筆原始 model records。首次頁面啟動遇到 catalog 暫時載入 fallback；手動呼叫 unified engine refresh 後成功取得 7 個符合免費文字對話條件的模型，7 個均啟用，首批 queue 包含 `gemini-3.7-flash`（RPD 20/RPM 5）與 `gemini-3.5-flash`（RPD 500/RPM 15），drawer 顯示總免費上限 1100 requests。這確認 Quota 抽屜與導師式模型篩選、RPD/RPM meter、preferred queue 可用。

## 模型 Toggle / Preferred 實測

在 drawer 實際點擊第一個模型 Toggle 後，`gugopro_ai_pdf_suite_disabled_models_v1` 會寫入模型名稱；重新取得重繪後 DOM 節點並點擊可恢復啟用，最後 disabled list 為空、7 個模型均啟用。點擊第二個模型卡片後，`gugopro_ai_pdf_suite_model_preference_v1` 設為 `gemini-3.5-flash`，符合導師範本的 preferred queue 行為。

## Room 隔離與 viewer 還原

實測在「財報風控」房間載入 3 頁 PDF 後切換到「一般 PDF 分析」：active room 改變、viewer 無 PDF 且 empty-state 顯示。再切回「財報風控」後，PDF.js document 恢復為 3 頁，文字層 3 頁、縮圖 3 張，證明 `runtimeByRoom` 與 `gugopro_ai_pdf_rooms_v1` 的 PDF 分析上下文彼此隔離並可還原。

## 無 Key Guard

清除本機 Gemini key 後點擊 Summary 生成，摘要區顯示「請先輸入 Gemini API key，再重新生成摘要。」；標準 drawer 自動開啟且 `#pdf-drawer-api-key` 存在，未向 Gemini 發出分析請求。這符合 BYOK 與導師範本的 no-key guard。

## 英文頁重測

修正後本地 `en/tools/pdf/pdf-suite.html?alignment=2` 已移除舊的 `Set AI Key` 按鈕，改為 `≡ AI / Rooms`；AI pane 顯示 Active analysis room 與 New room，drawer 顯示 7 個免費模型、RPD/RPM、1100 requests quota、BYOK、Amazon/Ko-fi、聯絡與政策連結。英文頁 console 無輸出錯誤，且可讀取同一份本機保存的房間文字層。

## 房間匯入實測

以實際 `#pdf-room-import-input` change event 注入 JSON backup 後，localStorage 房間由 2 個增為 3 個，新增 active 房間為「外文翻譯」，對話與第 1 頁文字層均被 normalize 並保留，drawer room list 渲染 3 項。

## 英文手機 390×844

最新英文截圖 `/home/ubuntu/pdf_suite_mobile_en_alignment.png` 為 390×844：header 後直接呈現 PDF toolbar，英文 hero 完整隱藏，reader 以單欄顯示，Bottom Dock 顯示 Pages、Tools、Sign、AI、Open，且視覺上沒有水平溢出或孤字折行。
