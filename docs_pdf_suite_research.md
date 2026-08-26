# GugoPro AI PDF Suite 研究筆記

## 既有主站架構
- GitHub repo: https://github.com/9908gg-art/gugopro-site
- 主分支：main；目前工作樹在 clone 後乾淨。
- Hub 入口：`tools/converter-hub.html` 與 `en/tools/converter-hub.html`。
- 既有共用樣式：`tools/converter-base.css`、`tools/converter-hub.css`、`css/app.css`。
- 既有 PDF 函式：`tools/converter-document-tools.js`，已包含 pdf-lib 合併/旋轉/浮水印/頁碼/拆分，以及 pdf.js 轉圖片/文字的本機流程。
- 既有 AI 引擎：`js/global-ai-quota.js` + `js/unified-ai-model-engine.js`。引擎從 `https://quota.gugopro.com/gemini_rate_limits.json` 載入動態免費文字模型，從 localStorage 讀取 `gugopro_gemini_api_key` 或 `gemini_api_key`，依模型佇列自動 fallback，成功後記錄本地 quota。
- 目前 `manus-config config load --search quota` 沒有找到 Quota connector；因此頁面應以既有公開 quota URL 與站內 script 方式整合，不新增 connector。

## 公開 benchmark：OfficeSuite PDF Viewer
來源：https://mobisystems-storage.mobisystems.com/helpcenter/officesuite/windows/en/pdfs.html

可轉化到純前端工作站的核心動線：
1. View 選單整合 Contents、Pages、Annotations、Editing Tools、Digital Signatures，採左側功能切換。
2. Page 選單整合 Pages、Insert Pages、Extract、Rotate、Page Labels、Print Pages、Delete Pages。
3. 頂部提供 Save、Undo/Redo、Print、Share、Full Screen，以及檔案視窗控制。
4. 頁面管理和閱讀檢視是同一個工作流，而不是分離工具；因此新頁面採三欄桌面配置：左側縮圖/目錄、中間畫布閱讀、右側 AI/工具面板。

## 實作決策
- 大檔案處理採 pdf.js 分頁載入/渲染與 pdf-lib 對選取頁面進行輸出；不將檔案送到伺服器。
- 先完成可用的閱讀、縮圖排序、頁面選取/旋轉/刪除/提取、合併/分割、簽名、浮水印、PDF↔圖片與 AI 面板，並保留無 API key 時的本地 demo 回覆/清楚提示。
- AI 回覆必須顯示「由本機文字層提供內容」與引用頁碼；掃描影像 PDF 若無文字層則提示需 OCR，不假裝已完成 OCR。

## 公開 benchmark：KDAN / Nitro
來源：https://support.kdan.com/hc/en-us/articles/115003673034-Thumbnails-Annotations-Bookmarks-and-Outlines
- KDAN 將 Thumbnails、Annotations、Bookmarks、Outlines 統一放在左側 toolbar，點擊縮圖可跳頁；Annotations panel 可列出 note/highlight/underline/strikethrough，並能從右側 properties panel 調整屬性。
- 若文件沒有 outline，目錄面板顯示空白；這對新工具的空狀態與提示文案有參考價值。

來源：https://www.gonitro.com/user-guide/mac/article/sidebar-navigation
- Nitro 的縮圖側欄支援底部 slider 調整縮圖大小，側欄與頁面區之間可拖曳調整寬度。
- Table of Contents view 以書籤/目錄項目導覽，並用藍色指示目前所在章節。
- Annotations view 列出 highlight、note、comment；點擊跳到位置，雙擊同時選取，Shift-click 可多選刪除。

## 介面落地原則
工作站會提供三層導覽：左側 panel tabs（縮圖、目錄、註記），中間閱讀器與上方工具列，右側 AI / 匯出 / 簽名區；手機改為 bottom dock 與可收合 panel。所有重要按鈕提供文字或 aria-label，避免只依賴圖示。

## 公開 Quota 服務
來源：https://quota.gugopro.com/
- 頁面提供每日更新的 Official Gemini API Quotas & Model Categories，並公開 `gemini_rate_limits.json` 與 CSV 下載。
- 分類包含 General Chat & Creation、Vision & Multimodal、Speech & TTS 等；工作站應依站內統一引擎過濾成免費文字對話模型，不自行硬編型號。
- 頁面明確區分免費層與需綁卡的付費層，因此 UI 需提示使用者自備 Gemini API key，並讓模型佇列/額度顯示保持透明。

## 本地初始驗證
- 本地靜態伺服器開啟 `tools/pdf/pdf-suite.html` 成功，頁面標題、三欄工作區、縮圖/目錄/註記側欄、閱讀工具列、AI 四分頁、批次工具與安全控制項均正常出現在 DOM。
- 初始視窗無明顯水平溢出；PDF.js、pdf-lib、JSZip script tags 已列入頁面。
- AI model drawer 與 API key modal 已預留；未設定 key 時不會自動發送 AI 請求。

## Viewer fixture 驗證
- 以 ReportLab 產生的三頁 searchable PDF fixture 經 viewer loader 載入成功。
- DOM 驗證結果：`pages=3`、`thumbs=3`、`outlineButtons=4`、主頁 canvas=1；PDF.js 分頁渲染與 outline 讀取均可工作。
- 隱藏的主 viewer input 不適合自動上傳工具定位，因此測試使用可見的批次 PDF input 取得 File，再交給相同 `loadPdf()` 流程；正式使用仍可由「開啟 PDF」或拖放區進入。

## 互動控制驗證
- 重新載入後，fixture 仍可保持三頁 viewer 狀態；實際點擊 180° 按鈕會在工具列呈現 active 狀態，閱讀畫布重繪。
- 實際點擊夜間閱讀按鈕後，頁面進入閱讀模式，按鈕呈現 active 狀態；畫布以濾鏡維持文件對比。
- 初次以 console 連續呼叫 click 的狀態回傳未更新，改以瀏覽器可見互動點擊確認後，視覺結果正常；推測前次是非同步重繪尚未完成，非功能錯誤。

## 初始化修正
- 發現 `addFileInputListeners()` 原先尋找不存在的 `#pdf-upload-zone`，導致初始化在事件綁定前中斷；已改為使用 `#pdf-empty-state` fallback，並保留 `#pdf-upload-zone` 未來擴充相容性。
- 同時修正縮圖點擊時 checkbox 的判斷，避免點選 checkbox 被誤認為頁面跳轉。
- 修正後重新載入頁面，批次 PDF 輸入欄可正常顯示 fixture 檔名並出現移除控制，初始化錯誤已排除。

## 修正後實際互動
- viewer loader 載入 fixture 後，點擊 180° 會在縮圖顯示旋轉標籤，並 toast「已旋轉 1 頁 180°」。
- 點擊夜間閱讀會套用閱讀模式並顯示「已開啟夜間閱讀」。
- 點擊簽名後 modal 正常出現，包含 Canvas、清除、PNG/JPEG 上傳與放置按鈕；測試按下放置後 modal 關閉並建立可拖曳/縮放/雙擊旋轉的簽名物件。

## Converter Hub 驗證
- 本地中文 Hub 搜尋 `GugoPro AI PDF` 後只顯示 1 個結果，分類計數為文檔處理 1，旗艦卡片位於分類最前，且全卡片 role=link/入口可見。
- Hub topbar 顯示 91 個工具；新卡片的深黑藍底、紅橘漸層 badge、PDF.js + pdf-lib / ChatPDF / 本機處理 tags 與 CTA 均已套用。

## Mobile RWD 驗證
- 以 headless Chromium 的 390×844 viewport 截圖成功，PNG 尺寸為 390×844。
- 手機版自動隱藏左側縮圖與右側 AI 常駐欄，閱讀器改為單欄，工具列以短按鈕呈現，底部固定顯示「頁面／工具／簽名／AI／開啟」Bottom Dock。
- 截圖中主要內容完全落在 viewport 內，未見水平溢出；上方品牌、privacy badge、reader card 與底部 dock 均可辨識。

## English 版本驗證
- 英文 Hub 顯示 `GugoPro AI PDF Suite` 旗艦卡片，位於 Document Process 分類頂部，CTA 指向 `pdf/pdf-suite.html`。
- 英文 PDF Suite 正常載入三欄工作區、Pages/Outline/Notes、ChatPDF/Summary/Contract/Translate、簽名、頁面組織、批次工具與 AI key modal，且共用 CSS/JS 資產的相對路徑正確。

## AI Quota 抽屜驗證
- 英文版 PDF Suite 點擊 Models 後可載入 quota.gugopro.com 動態清單：7 個合格免費文字模型、7 個啟用、今日總額度 1100 requests、使用量 0。
- UI 顯示目前模型、RPD、RPM、使用量、Pacific reset 倒數、模型開關與 Open Quota 連結，符合既有 unified engine 的 fallback/配額顯示契約。

## API key 入口驗證
- 英文版 Set AI Key 按鈕可開啟 modal，明確說明請求從瀏覽器直送 Google Gemini，key 僅存 localStorage，不由 GugoPro 上傳或代管。
- 未設定 key 時 AI 功能會開啟此 modal，而不是靜默失敗；這符合純前端、使用者自行提供憑證的隱私模型。

## 英文 fixture 與 AI 上下文
- 英文版以相同三頁 fixture 載入成功，全文文字層擷取結果為 1173 字元，包含頁碼標記、日期、金額與自動續約條款。
- 這些文字會被 `requestAi()` 轉成含 `[第 N 頁]` 的上下文，並傳給既有 unified model engine；沒有 API key 時不會發出 Gemini request。

## AI no-key guard 驗證
- 以英文版三頁 fixture 測試 Summary；點擊 Generate summary 後，面板顯示「請先輸入 Gemini API key，再重新生成摘要」，同時開啟 Set Gemini API key modal。
- 這證明 AI 摘要入口、文字層前置檢查與無憑證防護可工作；正式 Gemini 回答需使用者在自己的瀏覽器輸入有效 API key，測試環境未使用或提交任何秘密憑證。

## 安全輸出驗證
- 英文版三頁 fixture 填入測試密碼 `test1234` 後點擊 AES-GCM lock，頁面狀態顯示已產生本機 AES-GCM 鎖定包，未出現 JavaScript 錯誤。
- 鎖定包輸出使用 PBKDF2 + AES-GCM，下載內容為帶有 salt、iv 與 ciphertext 的 JSON package；密碼不寫入檔案。
