# 第 4 號工具：PDF 文字提取器深度審核與三語重構報告

**目標頁面**：`tools/converter-pdf-to-text.html`  
**驗收日期**：2026-09-09  
**實測方式**：本機 HTTP 頁面、Sandbox 無頭瀏覽器、956 bytes／2 頁含文字層 PDF

## 一、頁面健康度審核表

| 審核項目 | 修改前基線 | 修正後結果 |
|---|---|---|
| PDF 上傳與解析 | 2 頁測試 PDF 成功讀取，顯示「已讀取 2 頁」 | 保留本機 pdf.js 解析，增加 PDF 不可讀與可能受保護檔案的明確錯誤提示 |
| 文字提取 | 逐頁提取成功，輸出頁面標記、段落與文字內容 | 實測 2/2 頁成功提取；以頁面與文字座標重建行列，完成後進度固定為 100% |
| 複製結果 | 點擊後顯示「結果已複製到剪貼簿」 | 保留成功回饋；剪貼簿不可用時改顯示可直接選取預覽文字的錯誤指引 |
| TXT 下載 | 點擊後可觸發下載 | 保留下載鏈路，使用來源 PDF 基底名稱產生 `.txt` 檔 |
| 清除 | 可清空檔案與輸出 | 清除檔案、PDF 物件、預覽文字、下載／複製狀態與進度 |
| 進度回饋 | 提取完成後停在 **90%**，與成功狀態不一致 | 完成後明確設定為 **100%**，上傳完成也顯示 100% |
| 掃描 PDF | 說明不支援 OCR，但沒有把空文字結果轉成明確操作提示 | 若所有頁面沒有文字層，顯示「找不到文字層，這可能是需要 OCR 的掃描 PDF」及英文／日文對應訊息 |
| Console | 基線測試沒有錯誤或警告 | worker URL 明確設定；重構後驗收為零 Console error／warning |
| FAQ 與內容重複 | 工作區 FAQ 3 題，SEO 區又出現另一組 FAQ 3 題，共 6 題且內容重複 | 移除重複區塊，只保留 3 題專屬 FAQ，內容與 JSON-LD 同步 |
| 實質文字深度 | 內容偏短，且「選擇頁面範圍」與實際工具不符 | 重寫 PDF 文字層、座標排序、ToUnicode 字型映射、OCR 邊界、表格／多欄限制與三步指南 |
| 語系 | 繁中頁面只有英文連結，沒有日文切換；動態訊息僅中英 | 加入 zh-TW／en／ja 選單、自動語系偵測與 localStorage 偏好記憶；所有介面、狀態、指南與 FAQ 三語化 |
| 結構化資料 | 靜態 FAQ 對應 SEO 區，與工作區實際 FAQ 不一致；未以當前語系同步 | 動態建立免費 `SoftwareApplication` 與當前語系 3 題 `FAQPage`；沒有 `HowTo` |

## 二、核心功能實測

修改前以含有兩頁 Helvetica 文字層的測試 PDF 執行完整路徑，實際輸出如下：

```text
--- Page 1 ---
PDF Text Test Page One
alpha beta gamma

--- Page 2 ---
PDF Text Test Page Two
delta epsilon zeta
```

修改後重新執行同一流程，繁中輸出正確顯示「第 1 頁／第 2 頁」，英文與日文介面均完成渲染。提取後狀態顯示 `已從 2/2 頁提取文字`，進度為 100%，複製結果與 TXT 下載均已點擊實測成功。

頁面採純前端處理：檔案透過瀏覽器 File API 讀入 ArrayBuffer，pdf.js 從每頁取得文字項目，依 transform 中的 x／y 座標排序並合併成行。這讓文件不必經過伺服器；但純影像掃描、缺少文字層的檔案仍需要 OCR，頁面會明確說明這個限制。

## 三、三語與內容驗收

| 語系 | 驗收結果 | 截圖 |
|---|---|---|
| 繁中（zh-TW） | 標題、按鈕、進度、輸出狀態、技術說明與 3 題 FAQ 均為繁中；含 2 頁提取結果 | [pdf-to-text-zh-TW.webp](audit-screenshots/pdf-to-text-zh-TW.webp) |
| English（en） | 介面、狀態、座標排序說明、三步指南與 FAQ 均為英文 | [pdf-to-text-en.webp](audit-screenshots/pdf-to-text-en.webp) |
| 日本語（ja） | 介面、狀態、技術說明、三步指南與 FAQ 均為日文，無亂碼 | [pdf-to-text-ja.webp](audit-screenshots/pdf-to-text-ja.webp) |

三題 FAQ 聚焦真實使用痛點：掃描 PDF 無文字層、多欄／表格是否保留版面、字型映射造成亂碼或座標順序錯誤。頁面 FAQ 與結構化資料使用同一份語系字典，避免搜尋引擎答案與可見內容不一致。

## 四、交付與下一工具安排

**重構後工具網址**：<https://gugopro.com/tools/converter-pdf-to-text.html>

**本次交付檔案**：

- `tools/converter-pdf-to-text.html`
- `audit-report-pdf-to-text.md`
- `audit-screenshots/pdf-to-text-zh-TW.webp`
- `audit-screenshots/pdf-to-text-en.webp`
- `audit-screenshots/pdf-to-text-ja.webp`

**下一個工具安排（第 5 號）**：`tools/converter-pdf-remove-pages.html`（PDF 頁面移除工具）。下一階段會先實測上傳、多頁預覽、頁碼選取／移除、輸出 PDF 下載與清空流程，再沿用三語自動偵測、原創技術指南、3 題 FAQ、SoftwareApplication／FAQPage 與 Console 零錯誤標準。
