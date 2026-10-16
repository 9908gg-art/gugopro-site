# 交易期望值計算器 QA

## 本地瀏覽器

測試網址：`http://127.0.0.1:8124/academy/tools/trade-expectancy.html`。工具初始即用前述 3R 成本假設計算，不預填市場行情，頁面以瀏覽器本地 JavaScript 執行。

### 預設 3R 成本案例

多頭 Entry 100、Stop 95、Target 115、部位 200、勝率 25%、評估 20 筆、進／出場手續費各 0.10%、進／出場滑價各 0.05%。瀏覽器輸出計畫 R:R 3.00R、淨獲利 +2.9355R、淨虧損 -1.0585R、每筆期望 -0.0600R、損益兩平勝率 26.50%、評估期間期望 NT$ -1,200.00；結果表產生 2 列。

### 即時輸入

將勝率由 25% 改為 30% 時，無需重新整理即可自動更新為 +0.1397R／筆，status 顯示計算完成。

### 空頭情境

切換為空頭 Entry 100、Stop 105、Target 85 後，工具顯示成本方向「賣便宜／買貴」，計畫 R:R 3.00R、淨獲利 +2.9445R、淨虧損 -1.0615R；確認與 Python 模型一致採用不利方向滑價。

### 無效輸入

切回多頭但設定 Stop 105、Entry 100、Target 115，工具立即清除舊結果：期望值顯示 `—`、結果表回到尚未計算、長條圖寬度為 0%，status 顯示 Stop < Entry < Target 的輸入錯誤。這確認即時輸入錯誤不會殘留上一筆有效結果。

## 待完成

1. 檢查 console 與外部 resource，確認無錯誤與行情／API 請求。
2. 以 390×844 檢查手機版輸入與結果排版。
3. 執行全站 validator、提交、部署與 production smoke test。

## Console 與手機版

本地瀏覽器 console 檢視未出現 JavaScript error 或 warning。390×844 headless 截圖確認頁面使用單欄 RWD；頁內導覽、標題、成本提示、方向 select、勝率與價格輸入均在視窗寬度內，無水平溢出或文字重疊。結果表在窄螢幕使用外層水平滾動保留欄位可讀性，核心 metrics 會改為兩欄。

本地 resource 檢查為 `externalRequests=[]`，未發出 API／quote／market／WebSocket 請求；桌面 viewport 1,280px、document scrollWidth 1,265px，無水平溢出。console 未出現錯誤。上一次非法輸入測試後結果維持 `—`，符合 fail-closed 行為。

## Validator 與部署前狀態

`verify_trade_expectancy.py` 已通過：Academy 實際工具數量 16、淨獲利 +2.9355R、淨虧損 -1.0585R、每筆期望 -0.0600R、損益兩平勝率 26.5023%、external fetch none。`verify_academy.py`、`verify_research_contract.py`、`verify_quant_upgrade.py`、Node syntax、JSON parse、HTML parser、sitemap XML 與 `git diff --check` 均通過；Academy missing links 0，required files 0。

已完成待辦的本地驗證：console 沒有 JavaScript error／warning；桌面 document scrollWidth 1,265px 小於 viewport 1,280px；390×844 截圖顯示單欄 RWD，輸入表單與結果區沒有水平破版。production deployment 與 Telegram 通知將在 commit／Pages success 後完成。

## Production regression

GitHub Pages run `32995582242` 對 commit `4130ac2e79123e2176af73328fd54183d73f28e5` 已完成 `success`。在 `https://gugopro.com/academy/tools/trade-expectancy.html?qa=4130ac2` 正式頁執行預設 3R 成本案例，輸出期望值 -0.0600R、淨獲利 +2.9355R、淨虧損 -1.0585R、損益兩平勝率 26.50%、評估期間期望 NT$ -1,200.00、2 筆結果列；performance resource 為空，沒有 API／quote／market／WebSocket 請求。
