# 第 3 號工具：PDF 轉圖片深度審核與三語重構報告

**目標頁面**：`tools/converter-pdf-to-images.html`  
**驗收方式**：本機 HTTP 靜態服務 + Sandbox 無頭瀏覽器 + 870 bytes、2 頁可讀 PDF 實測  
**驗收日期**：2026-09-09

## 一、頁面健康度審核表

| 審核項目 | 修改前實測 | 修正後實測與結果 |
|---|---|---|
| PDF 載入 | 2 頁 PDF 可讀取，進度到 100%，狀態顯示已讀取頁數 | 保留 pdf.js 本機讀取；增加損毀／不可讀檔案的明確錯誤狀態 |
| PDF 逐頁渲染 | PNG 渲染成功，兩張縮圖可見 | PNG、JPG 皆由 Canvas 逐頁輸出；顯示每頁縮圖、檔名與輸出摘要 |
| 格式與倍率 | 有 PNG/JPG、1x/2x/3x 控制，但內容說明使用 DPI，與實際倍率不完全一致 | 改為清楚說明格式、倍率、JPG 品質與 Canvas 像素／記憶體關係；PNG 不受品質滑桿影響 |
| 單頁下載 | 點擊「下載第一頁」可觸發下載 | 實測成功，按鈕在渲染完成前保持 disabled，完成後解除 |
| 全部下載 | 點擊「下載全部 ZIP」可觸發下載 | 實測成功，JSZip 產生 ZIP；檔名使用來源 PDF 基底名稱 |
| 輸出回饋 | 主要狀態有「已產生」，但輸出預覽區仍固定顯示「等待輸出檔案」 | 新增動態輸出摘要，例如「Generated 2 PNG page images」／對應繁中與日文文字 |
| 清空 | 可清除清單與輸出狀態 | 清除檔案、PDF 物件、縮圖、Blob、ZIP、進度與按鈕狀態 |
| 主控台 | 初次渲染無錯誤，但出現 pdf.js `GlobalWorkerOptions.workerSrc` deprecated warning | 補上固定 pdf.worker URL；修正後重新驗收為無 Console error／warning |
| 內容重複 | 同頁有工作區 FAQ 3 題，加上 SEO 區 FAQ 3 題，形成 6 題重複內容 | 移除重複 FAQ，只保留 3 題針對圖片化工作流的原創問題 |
| 原創技術深度 | 有簡短公式，但未完整解釋文字層消失、Canvas 像素與倍率關係 | 新增 pdf.js 頁面指令重建、文字層不保留、倍率與像素四倍增長、PNG/JPG 取捨與記憶體策略 |
| 語系 | 只有繁中頁面與英文連結，沒有日文切換；動態訊息亦非完整三語 | 自動讀取 `navigator.language`：中文→zh-TW、日文→ja、其他→en；手動選單以 `localStorage` 記憶；介面、狀態、指南、FAQ 完整三語 |
| 結構化資料 | 靜態 FAQ 與頁面另有重複內容，未配合三語渲染 | 動態建立 `SoftwareApplication`（免費 Web Browser app）與 3 題當前語系 FAQPage；移除 `HowTo` |

## 二、修正內容

頁面已改為自包含的三語前端工作站。載入前會先讀取 `gugopro-pdf-images-locale`；沒有偏好時依 `navigator.language` 自動選擇繁中、日文或英文。語系選單會立即保存偏好並重新渲染頁面，確保下一次開啟仍使用上次選擇。

功能層面保留 pdf.js 與 JSZip 的瀏覽器本機架構，並補強拖曳／點擊上傳、PDF 可讀性驗證、PNG／JPG、1x／2x／3x、JPG 品質、Canvas 縮圖、單頁下載、ZIP 下載、清空與進度狀態。所有檔案位元組只留在目前分頁；沒有新增上傳端點。

內容層面重新撰寫三步操作、Canvas／解析度／檔案大小技術說明，以及三題與實際搜尋痛點相符的 FAQ：圖片化後文字不可搜尋、PNG 與 JPG 的選擇、2x／3x 的記憶體風險。FAQ 與 JSON-LD 使用同一份當前語系字典，避免答案與頁面文字不一致。

## 三、三語瀏覽器驗收

| 語系 | 渲染結果 |
|---|---|
| 繁中（zh-TW） | 頁面標題、按鈕、狀態、技術指南與 3 題 FAQ 均為繁中；截圖：[pdf-to-images-zh-TW.webp](audit-screenshots/pdf-to-images-zh-TW.webp) |
| English（en） | 標題、控制項、輸出摘要、指南與 FAQ 均為英文；截圖：[pdf-to-images-en.webp](audit-screenshots/pdf-to-images-en.webp) |
| 日本語（ja） | 標題、控制項、狀態、指南與 FAQ 均為日文；截圖：[pdf-to-images-ja.webp](audit-screenshots/pdf-to-images-ja.webp) |

實測英文環境上傳 2 頁 PDF 後顯示 `2 pages ready`，渲染完成顯示 `Generated 2 PNG page images`，並產生兩張預覽；單頁與 ZIP 下載按鈕均成功觸發下載。繁中與日文完成語系切換與完整文字渲染驗收。修正 worker 設定後 Console 為零錯誤、零警告。

## 四、交付與下一階段

**重構後工具網址**：<https://gugopro.com/tools/converter-pdf-to-images.html>

**本次交付檔案**：

- `tools/converter-pdf-to-images.html`
- `audit-report-pdf-to-images.md`
- `audit-screenshots/pdf-to-images-zh-TW.webp`
- `audit-screenshots/pdf-to-images-en.webp`
- `audit-screenshots/pdf-to-images-ja.webp`

**下一個安排（第 4 號工具）**：`tools/converter-pdf-to-text.html`（PDF 文字提取器）。安排理由是它與本次圖片化工具形成高頻互補流程，且可直接驗證 PDF 文字層、頁面順序、複製／下載與不可搜尋掃描檔的錯誤提示。下一階段將沿用本次標準：先實測，再做 zh-TW／en／ja、原創技術說明、3 題 FAQ 與 SoftwareApplication／FAQPage 結構化資料。

**本地驗收服務**：測試完成後會停止，不作為持續部署服務。
