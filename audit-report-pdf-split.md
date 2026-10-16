# PDF 頁面拆分與提取器：深度審核與三語重構報告

**目標頁面**：`tools/converter-pdf-split.html`。本次先以本機 HTTP 服務與無頭瀏覽器實測，再完成三語介面、頁碼解析、單檔／多檔輸出與結構化資料重構。測試使用一個五頁、可解析的 PDF；測試檔未納入提交。

## 工具頁面深度審核表

| 審核項目 | 修正前實測 | 修正後驗收 | 判定 |
|---|---|---|---|
| PDF 上傳與頁數讀取 | 五頁 PDF 成功上傳，清單顯示 `5 頁` | 保留多檔輸入，逐檔解析頁數並顯示 | 通過 |
| 自訂範圍 `1-3, 5` | 成功解析並提取，進度到 100% | 保留逗號、單頁、範圍、去重與超範圍忽略 | 通過 |
| 單檔輸出 | 原頁面產生 ZIP，未依單檔情境產生直接 PDF | 單一來源檔輸出 `*-split.pdf` | 已修正 |
| 多檔輸出 | 原邏輯具備 ZIP 打包 | 多檔輸出 `pdf-split-batch.zip`，每個拆分 PDF 為 ZIP 成員 | 通過 |
| 頁面預覽 | 沒有實際輸出預覽；只有進度與狀態文字 | 新增輸出摘要，例如「Generated a 4-page PDF」 | 已修正 |
| 進度回饋 | 成功到 100%，但輸出類型未明確 | 保留逐檔與 ZIP 生成進度，完成後解除下載按鈕 | 通過 |
| 下載鏈路 | 成功後「下載 ZIP」解除 disabled，可點擊 | 單檔下載 PDF、多檔下載 ZIP，按鈕三語化 | 通過 |
| 按鈕巡檢 | 拆分、清除、下載均可點擊；清除可重設狀態 | 明確改為拆分頁面、清空清單、下載輸出檔，並同步預覽／進度 | 通過 |
| 錯誤阻擋 | 非 PDF 過濾與解析失敗 catch 存在 | 補上無效頁碼、損毀／加密 PDF 的三語錯誤回饋 | 已修正 |
| 主控台 | 修改前無 Uncaught Error / Warning | 修改後 console 無輸出，inline JavaScript 通過 `node --check` | 通過 |
| 內容原創性 | 工具區與 SEO 區合計 6 題 FAQ，主題重複且偏模板 | 重寫頁面樹、字型／向量資源、記憶體、大檔效能、跨頁連結與解析度內容 | 已修正 |
| FAQ 數量與痛點 | 原有 6 題，未聚焦指定痛點 | 唯一 3 題：超連結、加密檔案、單頁解析度 | 已修正 |
| 語系支援 | 繁中頁面僅有英文連結，無日文切換 | `navigator.language` 自動辨識；手動 `zh-TW`／`en`／`ja` 切換並保存 `localStorage` 偏好 | 已修正 |
| 結構化資料 | FAQPage 與頁面 FAQ 不一致，且內容重複 | 單一靜態 `SoftwareApplication` + `FAQPage`，3 題逐字一致，無 `HowTo` | 已修正 |

## 實測流程與結果

修改前以五頁 PDF 實測，確認頁數讀取為 5 頁；輸入 `1-3, 5` 後點擊拆分，頁面顯示 100% 並回報「PDF 頁面已提取，ZIP 已準備下載」。修改後重新以相同五頁 PDF 實測，頁面顯示 `Generated a 4-page PDF`，狀態為輸出可下載，進度為 100%；下載按鈕點擊後沒有主控台錯誤。

重構後單檔模式會使用 pdf-lib 建立新的 PDF 並複製所選頁面；多檔模式則先為每個來源建立拆分 PDF，再由 JSZip 打包。範圍解析採有效頁碼集合，重複頁碼只輸出一次，超出來源頁數的項目忽略；沒有有效頁碼時會阻擋輸出並顯示檔名與錯誤原因。

## 三語渲染截圖

| 語系 | 驗收畫面 |
|---|---|
| 繁體中文 `zh-TW` | [pdf-split-zh-TW.webp](audit-screenshots/pdf-split-zh-TW.webp) |
| English `en` | [pdf-split-en.webp](audit-screenshots/pdf-split-en.webp) |
| 日本語 `ja` | [pdf-split-ja.webp](audit-screenshots/pdf-split-ja.webp) |

## 技術重構摘要

頁面以語系初始化腳本在共用腳本載入前設定 `document.documentElement.lang`，再由三語字典更新所有標題、按鈕、頁碼輸入提示、狀態、技術指南、FAQ 與頁尾。使用者手動選擇後會寫入 `gugopro-pdf-split-locale` 並重新載入。PDF 分割採頁面物件複製而非影像截圖，因此通常維持文字層、向量圖形、嵌入字型與原始影像解析度；跨頁連結、命名目標、書籤與特殊互動表單則在內容中明確標示需另行驗證。

靜態檢查確認頁面只有三個 FAQ `<details>`、一個 JSON-LD、兩個結構化資料類型（`SoftwareApplication`、`FAQPage`），且沒有 `HowTo`。測試亦通過 `git diff --check`、inline JavaScript `node --check` 與主控台巡檢。

## 交付變更

本次新增 `tools/converter-pdf-split.html` 的完整三語重構，以及 `audit-report-pdf-split.md` 與三張驗收截圖。未將測試 PDF 放入專案或提交。

## Commit

待推送後以最終交付回覆提供 commit hash。
