# Amazon 跨國選品工具 — 全面重構修復日誌與測試報告

**執行日期：** 2026-08-20  
**Commit Hash：** 469c0e2  
**推送分支：** main  
**倉庫：** https://github.com/9908gg-art/gugopro-site

---

## 一、修復項目總覽

### 1. 分潤 Tag 修正（Critical Fix）

所有三個頁面（`amazon/index.html`、`amazon-us/index.html`、`amazon-jp/index.html`）及 JSON 資料檔中的分潤 Tag 已全面更新：

| 項目 | 修復前（舊值） | 修復後（正確值） |
|------|---------------|-----------------|
| 美國站 US_TAG | `gugopro-20` | `9908qq-20` |
| 日本站 JP_TAG | `gugoprojp-22` | `gugopro-22` |
| US JSON affiliate_tag | `gugopro-20` | `9908qq-20` |
| JP JSON affiliate_tag | `gugoprojp-22` | `gugopro-22` |

**影響檔案（共 9 個）：**
- `amazon/index.html`、`amazon-us/index.html`、`amazon-jp/index.html`
- `amazon/data/us/categories_tree.json`、`amazon-us/data/us/categories_tree.json`、`amazon-jp/data/us/categories_tree.json`
- `amazon/data/jp/categories_tree.json`、`amazon-us/data/jp/categories_tree.json`、`amazon-jp/data/jp/categories_tree.json`

### 2. JSON 載入路徑修復（Path Resolution Fix）

**問題：** 原始代碼使用多組硬編碼路徑陣列（如 `/data/us/...`、`/amazon/data/us/...`、`../data/us/...`、`data/us/...`），在不同子路徑下存取時容易產生 404 錯誤導致頁面卡在「載入中...」狀態。

**解決方案：** 新增 `BASE_PATH` 動態路徑解析機制：

```javascript
var BASE_PATH = (function() {
    var path = window.location.pathname;
    if (path.indexOf('/amazon-us') !== -1) return '/amazon-us';
    if (path.indexOf('/amazon-jp') !== -1) return '/amazon-jp';
    if (path.indexOf('/amazon') !== -1) return '/amazon';
    return '/amazon';
})();
```

所有 `dataPaths` 和 `facetsPaths` 統一使用 `BASE_PATH + '/data/...'` 格式，確保無論從哪個子路徑存取都能正確載入 JSON 資料。

### 3. 內嵌式 Fallback 分類資料庫（已存在，已驗證）

頁面內已內建完整的 `EMBEDDED_DATA` 物件，包含 US 和 JP 兩個市場各 12 大品類的完整分類樹。即使 JSON 檔案載入失敗，也能在 0ms 內秒開呈現所有品類目錄。

### 4. UI 淨化（Tag 隱藏）

**驗證結果：** HTML body 中完全沒有外露的分潤 Tag 文字。所有 Tag 均透過 JavaScript 變數 (`US_TAG`、`JP_TAG`) 在背景靜默拼接至搜尋 URL 中，前台使用者完全不可見。

### 5. 搜尋跳轉重構

搜尋按鈕點擊事件 `handleCustomSearch()` 正確組合以下參數：
- 關鍵字 (`k`)
- 排序方式 (`s`)
- 最低評分 (`rh`)
- 價格範圍 (`low-price` / `high-price`)
- 專屬分潤 Tag (`tag`)

使用 `window.open(targetUrl, '_blank', 'noopener,noreferrer')` 順暢跳轉。

---

## 二、沙盒測試報告

### TEST 1: 頁面載入測試
| 測試項目 | 結果 |
|---------|------|
| `amazon/index.html` HTTP 狀態碼 | ✅ 200 OK |
| `amazon-us/index.html` HTTP 狀態碼 | ✅ 200 OK |
| `amazon-jp/index.html` HTTP 狀態碼 | ✅ 200 OK |
| 「12 大核心品類目錄」文字呈現 | ✅ 正常顯示 |
| EMBEDDED_DATA Fallback 資料存在 | ✅ 確認存在 |

### TEST 2: UI 淨化驗證
| 測試項目 | 結果 |
|---------|------|
| HTML body 無外露分潤 Tag | ✅ PASS |
| 無 Tag 按鈕/標籤/Modal | ✅ PASS |

### TEST 3: JSON 資料檔存取
| 測試項目 | 結果 |
|---------|------|
| US categories_tree.json | ✅ 200 OK |
| JP categories_tree.json | ✅ 200 OK |
| US facets/electronics.json | ✅ 200 OK |
| JP facets/electronics.json | ✅ 200 OK |

### TEST 4: 搜尋 URL 構建驗證
| 測試場景 | 預期 URL | 結果 |
|---------|---------|------|
| US 搜尋 "headphones" | `amazon.com/s?k=headphones&tag=9908qq-20` | ✅ PASS |
| JP 搜尋 "headphones" | `amazon.co.jp/s?k=headphones&tag=gugopro-22` | ✅ PASS |
| JP 日文搜尋 "ノイズキャンセリング ヘッドホン" | `amazon.co.jp/s?k=...&tag=gugopro-22` | ✅ PASS |
| US 含價格範圍 "laptop" $500-$1000 | `amazon.com/s?k=laptop&tag=9908qq-20&low-price=500&high-price=1000` | ✅ PASS |

### TEST 5: 市場切換邏輯驗證
| 測試項目 | 結果 |
|---------|------|
| US 模式 Base URL = amazon.com | ✅ PASS |
| JP 模式 Base URL = amazon.co.jp | ✅ PASS |
| US 模式 Tag = 9908qq-20 | ✅ PASS |
| JP 模式 Tag = gugopro-22 | ✅ PASS |
| switchMarket() 函數存在 | ✅ PASS |

### TEST 6: CNAME 保護驗證
| 測試項目 | 結果 |
|---------|------|
| CNAME 檔案內容 = `gugopro.com` | ✅ 未被修改 |

---

## 三、Git Commit 記錄

```
Commit: 469c0e2
Branch: main
Message: refactor: Amazon跨國選品工具全面重構 - 修復JSON載入/Fallback/UI淨化/Tag靜默拼接

修改檔案數: 9
新增行數: 75
刪除行數: 90
```

---

## 四、修改檔案清單

| 檔案路徑 | 修改類型 |
|---------|---------|
| `amazon/index.html` | Tag 修正 + BASE_PATH 路徑修復 |
| `amazon-us/index.html` | Tag 修正 + BASE_PATH 路徑修復 |
| `amazon-jp/index.html` | Tag 修正 + BASE_PATH 路徑修復 |
| `amazon/data/us/categories_tree.json` | affiliate_tag 修正 |
| `amazon/data/jp/categories_tree.json` | affiliate_tag 修正 |
| `amazon-us/data/us/categories_tree.json` | affiliate_tag 修正 |
| `amazon-us/data/jp/categories_tree.json` | affiliate_tag 修正 |
| `amazon-jp/data/us/categories_tree.json` | affiliate_tag 修正 |
| `amazon-jp/data/jp/categories_tree.json` | affiliate_tag 修正 |
