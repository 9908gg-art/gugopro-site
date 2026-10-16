# GugoPro 全站 Schema 巡檢與改進清單

執行日期：2026-09-06

## 摘要

本報告由自動化腳本依目前 sitemap.xml 的 92 款工具逐頁解析 JSON-LD，並把可見 `.tool-faq-list` 的問題與答案重新對照 FAQPage。核心工具腳本未被修改；本次修正只涉及 JSON-LD、首頁 WebSite 標記、AI SEO 靜態容器與 R:R 文章關聯。

| 指標 | 結果 |
|---|---:|
| Sitemap 工具頁 | 92 |
| 成功解析 | 92 |
| SoftwareApplication | 92 |
| 可見 FAQPage | 92 |
| 保留 HowTo | 0 |
| 缺失頁面 | 0 |
| Schema 警告 | 0 |

## 逐頁檢查

| 頁面 | JSON-LD 類型 | 可見 FAQ 題數 | HowTo | 警告／缺漏 |
|---|---|---:|:---:|---|
| tools/ai/english-speaking-tutor.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/ai/realtime-translator.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/pdf/pdf-suite.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/ai/tarot-master.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/ai/ziwei-astrology.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/health/tdee-macros-calculator.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/health/weight-loss-planner.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/ai/gemini-api-quota.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| amazon/index.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/compound-interest.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/etf-dividend-calculator.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/realestate-amortization.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-finance-salary-tax.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/risk-reward-calculator.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/risk-reward-scanner.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/tradingview-guide.html | SoftwareApplication,Article,FAQPage | 3 | 否 | 無 |
| tools/converter-image.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-color.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-image-batch.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-image-enhance.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-image-cropper.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-image-bgremover.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-image-watermark.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-svg-raster.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-image-merge.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-image-splitter.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-gif-maker.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-image-colorpicker.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-audio.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-audio-cutter.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-audio-volume.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-audio-fade.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-audio-reverse.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-audio-merge.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-audio-format.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-subtitles.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-subtitles-batch.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-video-frame-capture.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-video-to-gif.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-video-extract-audio.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-video-rotate.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-video-speed.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-video-mute.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-video-crop.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-image-pdf.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-excel-pdf.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-pdf-split.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-universal-pdf.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-pdf-merge.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-pdf-rotate.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-pdf-watermark.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-pdf-pagenumber.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-excel-merge.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-excel-split.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-pdf-remove-pages.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-data.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-pdf-to-images.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-pdf-to-text.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-excel-to-markdown.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-excel-to-html.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-word-to-markdown.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-html-to-docx.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-markdown.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-text-encoding.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-base64.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-hash-generator.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-crypto-aes.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-crypto-jwt.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-crypto-encode.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-crypto-checksum.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-crypto-uuid.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-chart-bar.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-chart-line.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-chart-pie.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-chart-radar.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-chart-scatter.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-chart-funnel.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-office-qrcode.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-office-barcode.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-office-text-to-image.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-office-markdown-editor.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-office-pomodoro.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-office-json-formatter.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-office-password.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-unit-length.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-unit-weight.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-unit-area.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-unit-volume.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-unit-temperature.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-unit-data.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-unit-speed.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |
| tools/converter-unit-pressure.html | SoftwareApplication,FAQPage | 3 | 否 | 無 |

## AI 與首頁補充

| 項目 | 結果 |
|---|---|
| AI SEO 頁面 | 9／9 已追加獨立 `.tool-seo-content`，每頁 3 步與 3 題 FAQ |
| 中文首頁 WebSite | 已注入 `WebSite`、`SearchAction` 與 `https://gugopro.com/` |
| 英文模板 WebSite | 已注入 `WebSite`、`SearchAction`，並保留英文入口 |
| R:R Scanner 關聯 | 已加入 `guides/risk-reward-ratio.html` related link 與可見教學入口 |
| 核心 JS | 本次 Git 變更無 `.js`／`.mjs` 檔案 |

## 判定說明

本次巡檢移除所有工具頁 JSON-LD 中的 `HowTo` 節點，工具主標記統一為免費 Web Browser 環境的 `SoftwareApplication`；可見 FAQ 存在時才保留 FAQPage，並以頁面實際文字重建 `mainEntity`。此報告是靜態 Schema 合規檢查，不取代 Google Rich Results Test 的外部抓取結果。
