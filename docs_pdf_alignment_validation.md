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

## 正式部署驗證

對齊 commit `e7ead26` 推送後，Pages build `32924690297` 完成 success；正式頁一度先顯示舊的「設定 AI Key」是 CDN/browser cache 尚未更新。追加 cache-bust commit `387fece`，為雙語 HTML 的 PDF Suite CSS/JS/rooms engine 加上 `?v=e7ead26`，Pages build `32924837913` 完成 success。

最終正式中文 URL `https://gugopro.com/tools/pdf/pdf-suite.html?alignment=387fece` 已回傳新版 drawer trigger `#pdf-drawer-open`、房間與 BYOK DOM；production computed style 確認 `#pdf-ai-error-panel` 初始 `display:none`，資產 URL 為版本化 CSS/JS，沒有殘留 `Set AI Key` 或舊 key modal。正式頁可正常取得 HTML。

## ChatPDF PointerEvent 修復驗證

在本地頁面輸入「請找出文件中的待辦事項」並觸發 Enter：送出後 `textarea.value` 為空，聊天記錄包含完整真實問題，完全不含 `[object PointerEvent]`；無 API key 時正確開啟標準 Quota/BYOK drawer 並顯示設定提示，沒有送出無效 Gemini 請求。


## PDF 功能覆核 fixture

以同源三頁 searchable fixture 注入本機檔案選擇器後，PDF.js 成功載入 3 頁，頁序為 `[1,2,3]`，產生 3 張縮圖並擷取 3 頁文字層；聊天區未出現 `[object PointerEvent]`。


## 新增 parity 操作驗證

本地 fixture 實測壓縮按鈕成功攔截下載檔名 `pdf-parity-fixture-compressed.pdf`，進度到 100%。旋轉右轉更新目前頁為 90°；翻頁方向切換為橫向並加入 `is-horizontal-flow`；24pt 裁切設定成功寫入操作狀態；Text Annotation pointerdown 透過瀏覽器 prompt 產生 1 筆文字註記並更新畫布，toast 顯示「文字註記已加入本頁」。


## 插入與解密驗證

Insert pages 實測成功：在 3 頁 PDF 插入 1 頁 PDF 後重建為 `pdf-parity-fixture-inserted.pdf`，viewer 重新載入 4 頁、4 張縮圖且狀態顯示插入完成。AES-GCM 解密實測使用本機既有測試鎖定包與短期測試密碼，成功下載 `pdf-suite-fixture-locked.pdf`，進度為 100%。


## Viewport 版面驗證

Desktop 1440×900 截圖確認頁面採 full-bleed 100vh：header、簡潔 hero、toolbar、三欄工作區、工具區與 footer 同屏；中間 PDF stage、左側 sidebar、右側 AI scroll 各自保有內部滾動，外層頁面不產生垂直滑動。Mobile 390×844 截圖確認 hero 完全隱藏，header 後直接進入核心 toolbar；單欄 reader 佔主要空間，Bottom Dock 固定於安全區上方，無水平溢出。


## Mobile AI overlay 驗證

在 virtual-time 充分等待後，以 390×844 開啟 AI dock，截圖確認 `pdf-ai-pane.is-mobile-open` 會覆蓋主要工作區；hero、reader 與 AI header/room strip 被收合，ChatPDF/Summary/Contract/Translate tabs 直接置頂，對話內容區占大部分視窗，composer 固定在底部安全區上方，Bottom Dock 保留 AI active state。第一次截圖因 headless capture 過早未觸發固定延遲，改用 virtual-time budget 後重測成功。


## ChatPDF 快捷鍵驗證

本地鍵盤測試通過：Shift+Enter 保留輸入內容以便換行；Ctrl+Enter 送出後清空 textarea，對話區出現「Ctrl 快捷鍵測試」真實文字；無 API key 時顯示標準設定提示，對話內容完全不含 `[object PointerEvent]`。

## 正式站 production 驗證

Pages run `32932576786` 對應 commit `2bf5ae8` 已完成 success。正式中文 URL `https://gugopro.com/tools/pdf/pdf-suite.html?verify=2bf5ae8` 的 production DOM 已提供文字註記、裁切、插入頁面、壓縮 PDF、AES-GCM 解密與既有閱讀/標註/簽名工具；實際 CSS/JS URL 均帶 `?v=feature-parity-20260826`。直接 fetch production JS 確認含 `typeof retryQuestion === 'string'` PointerEvent 防護、plain click handler、Enter/Shift+Enter handler，以及 `insertPdfPages`、`compressCurrentPdf`、`decryptLockPackage`。

