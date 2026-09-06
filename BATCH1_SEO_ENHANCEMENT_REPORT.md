# 第 1 批：文檔處理與 PDF 工具群 SEO 內容深化報告

執行日期：2026-09-06

## 執行摘要

本批次已完成 18 個文檔處理與 PDF 工具頁的內容深化。每頁均新增可見的原理／公式說明、三步驟使用流程與三題痛點 FAQ，並同步注入 `SoftwareApplication`、`HowTo` 與 `FAQPage` JSON-LD。所有 Schema 的問題與答案均與頁面上可見的 FAQ 內容一致；頁面未新增任何硬編碼廣告空位。

## 已處理頁面

| 類別 | 頁面 |
|---|---|
| 圖片／資料轉 PDF | `tools/converter-image-pdf.html`、`tools/converter-excel-pdf.html`、`tools/converter-universal-pdf.html` |
| PDF 編輯與整理 | `tools/converter-pdf-split.html`、`tools/converter-pdf-merge.html`、`tools/converter-pdf-rotate.html`、`tools/converter-pdf-watermark.html`、`tools/converter-pdf-pagenumber.html`、`tools/converter-pdf-remove-pages.html` |
| Excel 工作簿處理 | `tools/converter-excel-merge.html`、`tools/converter-excel-split.html` |
| 資料與格式轉換 | `tools/converter-data.html`、`tools/converter-excel-to-markdown.html`、`tools/converter-excel-to-html.html`、`tools/converter-word-to-markdown.html`、`tools/converter-html-to-docx.html` |
| PDF 內容提取 | `tools/converter-pdf-to-images.html`、`tools/converter-pdf-to-text.html` |

## 注入內容

新增的 `.tool-seo-content` 區塊包括工具用途、原理與公式、三步驟使用流程，以及使用 `<details>` 呈現的三題 FAQ。公式依工具類型提供，例如 PDF 合併的頁數加總、拆分／刪頁的頁集合、PDF 轉圖片的 DPI 與像素估算、試算表分割的資料列估算，以及文件格式轉換的結構映射。這些內容刻意以教育與操作說明為主，不宣稱超出工具實際支援範圍的功能。

每一頁同時載入共用樣式 `/tools/seo-content.css`，確保桌面與窄視口下的內容寬度、標題、步驟列表與 FAQ 摺疊區一致，不改動既有工具面板與核心 JavaScript。

## 結構化資料

每頁新增單一 JSON-LD 圖譜，包含下列三種型別：

| Schema 類型 | 用途 | 驗證結果 |
|---|---|---:|
| `SoftwareApplication` | 描述工具名稱、用途、瀏覽器環境與免費使用屬性 | 18／18 |
| `HowTo` | 描述頁面上可見的三步驟使用流程 | 18／18 |
| `FAQPage` | 描述頁面上可見的三題問題與答案 | 18／18 |

## 驗證結果

| 檢查項目 | 結果 |
|---|---:|
| 完成注入頁面 | 18 |
| 缺失本地引用 | 0 |
| Schema 驗證錯誤 | 0 |
| 每頁可見 FAQ | 3 題 |
| 每頁 HowTo 步驟 | 3 步 |
| PDF／文檔批次廣告占位 | 0 |
| 全站 HTML 本地引用缺失 | 0（5,817 個參照已檢查） |

第 1 批 18 頁均通過 JSON-LD、FAQ、HowTo、共用 CSS 與廣告占位驗證；全站 HTML 引用檢查仍維持零缺失。後續批次可沿用同一個 `.tool-seo-content` 與 JSON-LD 圖譜模式，但必須依每項工具的真實輸入、輸出與限制重新撰寫內容，不應批量複製不相關公式或 FAQ。

## 參考規範

[1]: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
[2]: https://developers.google.com/search/docs/appearance/structured-data/faqpage
[3]: https://developers.google.com/search/docs/appearance/structured-data/how-to
