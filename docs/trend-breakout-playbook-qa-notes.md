# 趨勢追蹤與突破策略 Playbook QA

日期：2026-08-27

## 本地文章回歸

本地頁面：`http://127.0.0.1:8126/articles/investment/18-trend-following-breakout-playbook.html`

文章標題已正確渲染，頁面包含九個章節導航：`#definition`、`#regime`、`#breakout`、`#execution`、`#sizing`、`#exit`、`#false-breakout`、`#backtest`、`#playbook`。瀏覽器可見內容包括 Donchian 公式、突破成交模型比較、ATR／部位案例、假突破表、回測檢查表、Playbook 表與正式 References 區段。

頁面為長文教學，不套用工具的 single-screen 限制；手機版會讓章節膠囊橫向可滾動，避免擠壓內容。文章不執行行情抓取、API 呼叫或 WebSocket 連線。

## 靜態驗證

- `verify_trend_breakout_playbook.py`: PASS，article_chars=19279、visible_chars=8276、chapters=9、tables=4、registry=synchronized、sitemap=ok、external_data_logic=none。
- `verify_practical_trading.py`: PASS，原第 13 類文章、工具與新 Playbook 入口同步。
- `verify_quant_upgrade.py`: PASS；Academy 22 課程、19 工具。
- `verify_academy.py`: PASS；Academy HTML 47、missing links 0、missing required 0。
- `verify_research_contract.py`: PASS；sources=4、datasets=3、fixtures 與 secret scan 通過。
- JSON、sitemap XML、Node 語法與 `git diff --check`: PASS。

後續待辦：完成 390×844 文章截圖與 production smoke test；加入最後瀏覽器證據後再 commit／push。

## 本地 DOM smoke test

浏览器检查脚本已执行并输出完成标记；检查目标包括九个 jump 导航、内部 Academy 工具链接、References 是否存在、横向溢出检测，以及 performance resource 中是否出现 API／quote／market／WebSocket 等行情资源。文章页面本身没有脚本逻辑，不建立外部数据连接；后续以 390×844 截图与 production smoke test 作为最终视觉和公开页面证据。

## 390×844 視覺檢查

截图：`/tmp/trend-breakout-playbook-390.png`，尺寸 390×844。手机首屏的品牌列、分类标题、主标题、说明段落、badge 与章节胶囊均可读；章节导航按设计横向滚动，不将长按钮强行压缩或造成整页横向溢出。文章标题与正文没有文字重叠，符合长文教学不限制 single-screen 的设计原则。
