# 全站 SEO 版位盤點報告

- 掃描範圍：`/home/ubuntu/gugopro-site` 下所有 HTML（排除 `.git`、備份目錄與 `node_modules`）
- 掃描時間：本次執行
- HTML 總數：167
- 分類統計：首頁 9；工具 41；專欄 96；法規 16；其他 5

> 「疑似隱藏」依 HTML inline style、class/id 名稱及簡單內嵌 CSS 規則判斷；不會完整解析外部 CSS、媒體查詢或執行 JavaScript。錨點與工具頁關聯亦為路徑規則啟發式檢查，需人工確認語意對應。

## 重大異常摘要

- 缺少 H1：23 頁
- H1 疑似隱藏：1 頁
- 專欄沒有偵測到指向工具目錄的站內連結：94 / 96 篇
- 命中指定弱錨點詞：0 處
- Title 與 H1 文字未互相包含：58 頁

### 缺少 H1
- `en/tools/ai/english-speaking-tutor.html`
- `en/tools/ai/realtime-translator.html`
- `en/tools/ai/tarot-master.html`
- `en/tools/ai/ziwei-astrology.html`
- `en/tools/ai-media/ai-video-tracker.html`
- `en/tools/english/l-player-study.html`
- `en/tools/health/tdee-macros-calculator.html`
- `en/tools/health/weight-loss-planner.html`
- `en/tools/pdf/pdf-suite.html`
- `googled0dfad57039c64f6.html`
- `ja/tools/ai/english-speaking-tutor.html`
- `ja/tools/ai/realtime-translator.html`
- `ja/tools/ai/tarot-master.html`
- `ja/tools/ai/ziwei-astrology.html`
- `ja/tools/ai-media/ai-video-tracker.html`
- `ja/tools/english/l-player-study.html`
- `ja/tools/health/tdee-macros-calculator.html`
- `ja/tools/health/weight-loss-planner.html`
- `tools/ai/english-speaking-tutor.html`
- `tools/ai/nutritionist.html`
- `tools/ai/tarot-master.html`
- `tools/health/tdee-macros-calculator.html`
- `tools/health/weight-loss-planner.html`

### H1 疑似隱藏
- `tools/english/l-player-study.html`

### 專欄文章未連向工具頁
- `articles/affective-filter-with-ai-tutor.html`
- `articles/amazon-ai-product-research-guide.html`
- `articles/carb-cycling-and-home-workout-guide.html`
- `articles/diabetes-and-insulin-resistance-guide.html`
- `articles/english-intro-break-the-ice.html`
- `articles/fatty-liver-and-mediterranean-diet-guide.html`
- `articles/gemini-api-free-tier-and-developer-guide.html`
- `articles/how-to-master-tarot-guide.html`
- `articles/how-to-master-ziwei-guide.html`
- `articles/intermittent-fasting-and-calorie-deficit-guide.html`
- `articles/modern-ziwei-guide.html`
- `articles/shadowing-with-ai-tutor.html`
- `articles/tarot-decision-framework.html`
- `articles/tblt-with-ai-tutor.html`
- `articles/tdee-and-macros-guide.html`
- `articles/travel-translator-guide.html`
- `articles/weight-loss-planner-guide.html`
- `articles/youtube-english-listening-and-shadowing-guide.html`
- `articles/youtube-listening-connected-speech-guide.html`
- `articles/youtube-sequel-tracker-guide.html`
- `en/articles/affective-filter-with-ai-tutor.html`
- `en/articles/amazon-ai-product-research-guide.html`
- `en/articles/carb-cycling-and-home-workout-guide.html`
- `en/articles/diabetes-and-insulin-resistance-guide.html`
- `en/articles/english-intro-break-the-ice.html`
- `en/articles/fatty-liver-and-mediterranean-diet-guide.html`
- `en/articles/gemini-api-free-tier-and-developer-guide.html`
- `en/articles/how-to-master-tarot-guide.html`
- `en/articles/how-to-master-ziwei-guide.html`
- `en/articles/intermittent-fasting-and-calorie-deficit-guide.html`
- `en/articles/investment/02-etf-investing-bible.html`
- `en/articles/investment/03-asset-allocation-rebalancing.html`
- `en/articles/investment/04-brokerage-comparison.html`
- `en/articles/investment/05-fundamental-valuation-metrics.html`
- `en/articles/investment/06-sharpe-mdd-risk-control.html`
- `en/articles/investment/07-fire-4-percent-rule.html`
- `en/articles/investment/08-overseas-tax-guide.html`
- `en/articles/investment/09-high-dividend-etf-trap.html`
- `en/articles/investment/10-bond-investing-guide.html`
- `en/articles/investment/11-brokerage-deep-review.html`
- `en/articles/investment/12-inflation-hedging-reits-gold.html`
- `en/articles/investment/13-technical-indicators-truth.html`
- `en/articles/investment/14-backtesting-overfitting-guide.html`
- `en/articles/investment/15-quant-research-workflow.html`
- `en/articles/investment/16-futures-pairs-basis.html`
- `en/articles/investment/17-practical-trading.html`
- `en/articles/investment/18-trend-following-breakout-playbook.html`
- `en/articles/modern-ziwei-guide.html`
- `en/articles/shadowing-with-ai-tutor.html`
- `en/articles/tarot-decision-framework.html`
- `en/articles/tblt-with-ai-tutor.html`
- `en/articles/tdee-and-macros-guide.html`
- `en/articles/travel-translator-guide.html`
- `en/articles/weight-loss-planner-guide.html`
- `en/articles/youtube-english-listening-and-shadowing-guide.html`
- `en/articles/youtube-listening-connected-speech-guide.html`
- `en/articles/youtube-sequel-tracker-guide.html`
- `ja/articles/affective-filter-with-ai-tutor.html`
- `ja/articles/amazon-ai-product-research-guide.html`
- `ja/articles/carb-cycling-and-home-workout-guide.html`
- `ja/articles/diabetes-and-insulin-resistance-guide.html`
- `ja/articles/english-intro-break-the-ice.html`
- `ja/articles/fatty-liver-and-mediterranean-diet-guide.html`
- `ja/articles/gemini-api-free-tier-and-developer-guide.html`
- `ja/articles/how-to-master-tarot-guide.html`
- `ja/articles/how-to-master-ziwei-guide.html`
- `ja/articles/intermittent-fasting-and-calorie-deficit-guide.html`
- `ja/articles/investment/02-etf-investing-bible.html`
- `ja/articles/investment/03-asset-allocation-rebalancing.html`
- `ja/articles/investment/04-brokerage-comparison.html`
- `ja/articles/investment/05-fundamental-valuation-metrics.html`
- `ja/articles/investment/06-sharpe-mdd-risk-control.html`
- `ja/articles/investment/07-fire-4-percent-rule.html`
- `ja/articles/investment/08-overseas-tax-guide.html`
- `ja/articles/investment/09-high-dividend-etf-trap.html`
- `ja/articles/investment/10-bond-investing-guide.html`
- `ja/articles/investment/11-brokerage-deep-review.html`
- `ja/articles/investment/12-inflation-hedging-reits-gold.html`
- `ja/articles/investment/13-technical-indicators-truth.html`
- `ja/articles/investment/14-backtesting-overfitting-guide.html`
- `ja/articles/investment/15-quant-research-workflow.html`
- `ja/articles/investment/16-futures-pairs-basis.html`
- `ja/articles/investment/17-practical-trading.html`
- `ja/articles/investment/18-trend-following-breakout-playbook.html`
- `ja/articles/modern-ziwei-guide.html`
- `ja/articles/shadowing-with-ai-tutor.html`
- `ja/articles/tarot-decision-framework.html`
- `ja/articles/tblt-with-ai-tutor.html`
- `ja/articles/tdee-and-macros-guide.html`
- `ja/articles/travel-translator-guide.html`
- `ja/articles/weight-loss-planner-guide.html`
- `ja/articles/youtube-english-listening-and-shadowing-guide.html`
- `ja/articles/youtube-listening-connected-speech-guide.html`
- `ja/articles/youtube-sequel-tracker-guide.html`

### 弱錨點文字命中
- 無

### Title / H1 可能不一致
- `404.html`：Title=`頁面不存在｜GugoPro`；H1=`頁面不存在或已搬移`
- `amazon/index.html`：Title=`Amazon AI 全品類智能選品導購 | GugoPro`；H1=`🛒 Amazon AI 智能購物導師`
- `amazon-jp/index.html`：Title=`Amazon AI 智能購物導師 | GugoPro 多模態尋寶助手`；H1=`🛒 Amazon AI 智能購物導師`
- `amazon-us/index.html`：Title=`Amazon AI 全品類智能選品導購 | GugoPro`；H1=`🛒 Amazon AI 智能購物導師`
- `articles/english-intro-break-the-ice.html`：Title=`看 YouTube 學英文為何總是無效？結合音韻知覺理論、Levenshtein 聽寫差量比對與影子跟讀（Shadowing）打造母語聽覺神經迴路全指南｜GugoPro 語言科學專欄`；H1=`看 YouTube 學英文為何總是無效？結合音韻知覺理論、 Levenshtein 聽寫差量比對與影子跟讀（Shadowing） 打造母語聽覺神經迴路全指南`
- `articles/youtube-english-listening-and-shadowing-guide.html`：Title=`解鎖 YouTube 雙語精聽與影子跟讀：L-Player 零摩擦學習系統操作全書與神經聽覺重塑指南｜GugoPro 語言科學專欄`；H1=`解鎖 YouTube 雙語精聽與影子跟讀： L-Player 零摩擦學習系統操作全書與神經聽覺重塑指南`
- `articles/youtube-listening-connected-speech-guide.html`：Title=`看 YouTube 學英文為何總是無效？結合音韻知覺理論、Levenshtein 聽寫差量比對與影子跟讀（Shadowing）打造母語聽覺神經迴路全指南｜GugoPro 語言科學專欄`；H1=`看 YouTube 學英文為何總是無效？結合音韻知覺理論、 Levenshtein 聽寫差量比對與影子跟讀（Shadowing） 打造母語聽覺神經迴路全指南`
- `articles/youtube-sequel-tracker-guide.html`：Title=`2026 YouTube 影音演算法與連載檢索全指南：如何破解推薦漏片迷思、利用 NLP 正則去噪與差量比對打造跨頻道追劇閉環｜GugoPro 串流媒體研究專欄`；H1=`2026 YouTube 影音演算法與連載檢索全指南：如何破解推薦漏片迷思、利用 NLP 正則去噪與差量比對 打造跨頻道追劇閉環`
- `disclaimer.html`：Title=`免責聲明｜GugoPro 工具與 AI 服務使用限制`；H1=`GugoPro 免責聲明`
- `en/articles/amazon-ai-product-research-guide.html`：Title=`2026 Cross-Border E-Commerce & Global Sourcing Master Guide: Leveraging AI Semantic Reverse Engineering for Amazon Product Research, Negative Review Mining, and Listing Matrix Architecture | GugoPro Strategy Column`；H1=`2026 Cross-Border E-Commerce & Global Sourcing Master Guide: Leveraging AI Semantic Reverse Engineering for Amazon Product Research, Negative Review Mining, and Listing Keyword Matrix Architecture`
- `en/articles/english-intro-break-the-ice.html`：Title=`Why Watching YouTube Fails for English Learning: Speech Perception, Levenshtein Dictation Diff, and Shadowing Guide | GugoPro Language Science`；H1=`Why Watching YouTube Fails for English Learning: Building Native Auditory Circuits via Speech Perception, Levenshtein Dictation Diff, and Shadowing`
- `en/articles/how-to-master-tarot-guide.html`：Title=`How to Become a Tarot Master? From Rote Memorization to Intuitive Flow Reading: A Deliberate Practice Guide Combining Classical Semiotics, Narrative Psychology, and AI Collaboration | GugoPro Decision Science Column`；H1=`How to Become a Tarot Master? From Rote Memorization to "Intuitive Flow Reading": A Comprehensive Deliberate Practice Guide Combining Classical Semiotics, Narrative Psychology, and AI Collaboration`
- `en/articles/how-to-master-ziwei-guide.html`：Title=`How to Become a Ziwei Astrology Master? From Rote Memorization to Dynamic Pattern Reading: A Deliberate Practice Guide Combining Cultural Semiotics, System Dynamics, and AI Collaboration | GugoPro Decision Science Column`；H1=`How to Become a Ziwei Astrology Master? From Rote Memorization of 108 Stars to "Dynamic Pattern Reading": A Deliberate Practice Guide Combining Cultural Semiotics, System Dynamics, and AI Collaboration`
- `en/articles/investment/03-asset-allocation-rebalancing.html`：Title=`Asset allocation and dynamic rebalancing: from target weights to trading frictions｜GugoPro Academy`；H1=`Asset allocation and dynamic rebalancing: Turn target weights into actionable decision rules.`
- `en/articles/investment/04-brokerage-comparison.html`：Title=`Complete guide to opening a US brokerage account: Taiwan sub-account vs. overseas brokers | GugoPro Academy`；H1=`Complete guide to opening a US brokerage account: Taiwan sub-account vs. overseas brokers (Firstrade, IB, Schwab) comparison`
- `en/articles/investment/05-fundamental-valuation-metrics.html`：Title=`Fundamental valuation metrics: P/E, P/B and ROE | GugoPro Academy`；H1=`Fundamental valuation metrics: correctly reading P/E, P/B and ROE`
- `en/articles/investment/15-quant-research-workflow.html`：Title=`Quant research workflow: 5MA offsets, volatility Z‑Score and out‑of‑sample backtesting｜GugoPro Academy Z-Score`；H1=`Quant research workflow: Put 5MA, volatility and backtests into the same chain of evidence.`
- `en/articles/investment/16-futures-pairs-basis.html`：Title=`Pair trading and cash‑futures spread for Taiwan index futures / 富台期: from Basis to roll risk｜GugoPro Academy`；H1=`Taiwan index futures / 富台期 pair trading: Break down the Basis first, then discuss arbitrage.`
- `en/articles/investment/17-practical-trading.html`：Title=`Category 13 Practical Trading: trading plan, execution, risk control and review — complete knowledge tree｜GugoPro Academy`；H1=`Practical trading: Turn ideas into executable, stop‑lossable and reviewable processes.`
- `en/articles/investment/18-trend-following-breakout-playbook.html`：Title=`Trend following and breakout strategy Playbook: rules, sizing, false breakouts and backtest validation｜GugoPro Academy`；H1=`Trend following and breakout strategy: Write your view as verifiable rules.`
- `en/articles/investment/index.html`：Title=`Investment Education Academy | GugoPro Academy`；H1=`Systematized Investment education and practical matrix`
- `en/articles/youtube-listening-connected-speech-guide.html`：Title=`Why Watching YouTube Fails for English Learning: Speech Perception, Levenshtein Dictation Diff, and Shadowing Guide | GugoPro Language Science`；H1=`Why Watching YouTube Fails for English Learning: Building Native Auditory Circuits via Speech Perception, Levenshtein Dictation Diff, and Shadowing`
- `en/index.html`：Title=`GugoPro Official Homepage | AI and Utility Tools`；H1=`Web AI, data and utility tools for everyday work.`
- `guides/risk-reward-ratio.html`：Title=`交易風險報酬比（R:R）｜GugoPro 財經學院`；H1=`交易風險報酬比（R:R）：先理解，再計算，最後管理風險。`
- `ja/articles/english-intro-break-the-ice.html`：Title=`YouTube英語学習が挫折する真の理由とは？音韻知覚理論、レーベンシュタイン聴解、シャドーイング完全ガイド｜GugoPro 言語科学コラム`；H1=`YouTube英語学習が挫折する真の理由とは？音韻知覚理論、 レーベンシュタイン聴解、シャドーイング で母語レベルの聴覚神経回路を構築する完全ガイド`
- `ja/articles/how-to-master-tarot-guide.html`：Title=`タロットマスターへの道：78枚の丸暗記を脱し「直観的フロー・リーディング」へ——古典記号論、ナラティブ心理学、AI協同による限界的練習完全ガイド｜GugoPro 意思決定科学コラム`；H1=`如何にしてタロットマスターとなるか？ 78枚の意味の丸暗記から「直観的フロー・リーディング」へ：古典記号論・ナラティブ心理学・AI協同による限界的練習完全手引`
- `ja/articles/investment/03-asset-allocation-rebalancing.html`：Title=`資産配分と動的リバランス：目標ウェイトから取引摩擦まで｜GugoPro Academy`；H1=`資産配分と動的リバランス： 目標ウェイトを実行可能な意思決定ルールにする。`
- `ja/articles/investment/04-brokerage-comparison.html`：Title=`米国ブローカー口座開設完全ガイド：台湾の複委託 vs 海外ブローカー | GugoPro Academy`；H1=`米国ブローカー口座開設完全ガイド：台湾の複委託 vs 海外ブローカー（Firstrade、IB、Schwab）比較`
- `ja/articles/investment/05-fundamental-valuation-metrics.html`：Title=`ファンダメンタル評価指標：P/E、P/B、ROE | GugoPro Academy`；H1=`ファンダメンタル評価指標：P/E（株価収益率）、P/B（株価純資産倍率）、ROEの正しい読み方`
- `ja/articles/investment/06-sharpe-mdd-risk-control.html`：Title=`リスクリターンと最大ドローダウン分析：Sharpe、Sortino、Calmar 実装ガイド｜GugoPro Academy`；H1=`リスクリターンと最大ドローダウンの分析`
- `ja/articles/investment/15-quant-research-workflow.html`：Title=`量的研究ワークフロー：5MAオフセット、ボラティリティのZ‑Score、アウト‑オブ‑サンプルバックテスト｜GugoPro Academy Z-Score`；H1=`量的研究ワークフロー： 5MA、ボラティリティ、バックテストを同じ証拠チェーンに組み込む。`
- `ja/articles/investment/16-futures-pairs-basis.html`：Title=`臺指期／富台期のペア取引と期現價差：Basisからロールリスクまで｜GugoPro Academy`；H1=`臺指期／富台期ペア取引： まず Basis を分解し、その後で裁定について議論する。`
- `ja/articles/investment/17-practical-trading.html`：Title=`第13類 実戦取引：取引計画、実行、リスク管理、レビューの完全なナレッジツリー｜GugoPro Academy`；H1=`実戦トレーディング： アイデアを実行可能でストップが設定でき、再検討できるプロセスにする。`
- `ja/articles/investment/18-trend-following-breakout-playbook.html`：Title=`トレンド追跡とブレイクアウト戦略プレイブック：ルール、ポジション、フェイクブレイク、バックテスト検証｜GugoPro Academy`；H1=`トレンド追跡とブレイクアウト戦略： 自分の「見解」を検証可能なルールに書き換える。`
- `ja/articles/investment/index.html`：Title=`投資教育アカデミー | GugoPro Academy`；H1=`システム化 投資教育と実戦のマトリクス`
- `ja/articles/shadowing-with-ai-tutor.html`：Title=`「話せない英語」にサヨナラ！シャドーイング、CEFR文脈出力、AIチューターによるスピーキング実践ガイド｜GugoPro 言語科学コラム`；H1=`「話せない英語」にサヨナラ！シャドーイング、CEFR文脈輸出、AIチューターによるスピーキング実践ガイド`
- `ja/articles/youtube-english-listening-and-shadowing-guide.html`：Title=`YouTube英語学習が挫折する真の理由とは？音韻知覚理論、レーベンシュタイン聴解、シャドーイングで母語レベルの聴覚神経回路を構築する完全ガイド｜GugoPro 言語科学コラム`；H1=`YouTube英語学習が挫折する真の理由とは？音韻知覚理論、 レーベンシュタイン聴解、シャドーイング で母語レベルの聴覚神経回路を構築する完全ガイド`
- `ja/articles/youtube-listening-connected-speech-guide.html`：Title=`YouTube英語学習が挫折する真の理由とは？音韻知覚理論、レーベンシュタイン聴解、シャドーイング完全ガイド｜GugoPro 言語科学コラム`；H1=`YouTube英語学習が挫折する真の理由とは？音韻知覚理論、 レーベンシュタイン聴解、シャドーイング で母語レベルの聴覚神経回路を構築する完全ガイド`
- `ja/articles/youtube-sequel-tracker-guide.html`：Title=`2026年YouTube動画推薦アルゴリズムとシリーズ検索完全ガイド：推薦漏れを解消しNLP正規表現ノイズ除去と差分照合で跨チャンネル追跡を実現する｜GugoPro ストリーミング研究コラム`；H1=`2026年YouTube動画推薦アルゴリズムとシリーズ検索完全ガイド：推薦漏れを解消し NLP正規表現ノイズ除去と差分照合 で跨チャンネル追跡を実現する`
- `quant/pine-script-basics.html`：Title=`Unit 4.2: TradingView Pine Script 程式交易入門 | GugoPro 財經教學學院`；H1=`TradingView Pine Script 程式交易入門與指標開發`
- `support.html`：Title=`GugoPro｜贊助支持`；H1=`支持 GugoPro`
- `tools/ai/realtime-translator.html`：Title=`面對面旅遊對話翻譯｜出國旅遊即時翻譯與雙向語音對話｜GugoPro`；H1=`面對面旅遊對話翻譯：出國旅遊即時翻譯與雙向語音對話`
- `tools/ai/ziwei-astrology.html`：Title=`AI 紫微斗數大師｜紫微斗數線上排盤資料整理與十二宮位指南 - GugoPro`；H1=`把命盤問題，整理成可行動的洞察`
- `tools/compound-interest.html`：Title=`Compound Interest 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`進階複利與退休目標規劃計算機`
- `tools/english/l-player-study.html`：Title=`【AB English Podcast】Ep.1 自我介紹與日常社交對話 (Mia & Alex)｜L-Player`；H1=`YouTube 影音「聽・寫・口說」多國語言跟讀器`
- `tools/etf-dividend-calculator.html`：Title=`Etf Dividend Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`把配息拆成一條， 看得懂的現金流曲線。`
- `tools/finance/kelly-criterion-calculator.html`：Title=`Kelly Criterion Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`凱利公式與資金控管模擬器`
- `tools/finance/sports-hedging-calculator.html`：Title=`Sports Hedging Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`運動彩券賠率換算與套利對沖計算器`
- `tools/games/mahjong-waits-calculator.html`：Title=`Mahjong Waits Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`麻將聽牌張數與進張勝率計算器`
- `tools/games/poker-odds-calculator.html`：Title=`Poker Odds Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`德州撲克即時勝率計算器 Texas Hold'em Odds Calculator`
- `tools/gaming/gacha-odds-calculator.html`：Title=`Gacha Odds Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`Gacha Odds & Pity Simulator v5`
- `tools/pdf/pdf-suite.html`：Title=`PDF 全能工作站｜免安裝線上閱讀、合併、分割與標註、零檔案外洩 - GugoPro`；H1=`先選擇要處理的文件`
- `tools/poker/poker-odds-calculator.html`：Title=`Poker Odds Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`德州撲克即時勝率計算器 Texas Hold'em Odds Calculator`
- `tools/realestate-amortization.html`：Title=`Realestate Amortization 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`房貸本息攤還、利息與提前還款工具`
- `tools/risk-reward-calculator.html`：Title=`Risk Reward Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`先看即時價格，再決定風險。`
- `tools/tradingview-guide.html`：Title=`Tradingview Guide 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`全球最強圖表工具 TradingView`
- `tools/tutorials/how-to-get-gemini-api-key.html`：Title=`Gemini API Key 申請教學｜Google Gemini API Key 取得與安全設定教學、免安裝與隱私說明 - GugoPro`；H1=`Google Gemini API Key 1 分鐘快速申請步驟`
- `tools/tw-market/taiwan-pair-trading.html`：Title=`Taiwan Pair Trading 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`台灣股票與期貨 配對交易掃描工作站`

## 各頁 SEO 欄位清單

| 分類 | 檔案 | 語系 | Title | H1（狀態） | 前三個 H2 | Description 字數 | 站內連結數 |
|---|---|---|---|---|---|---:|---:|
| 其他 | `404.html` | zh-TW | 頁面不存在｜GugoPro | 頁面不存在或已搬移（可見（靜態檢查）） |  | 0 | 1 |
| 法規 | `about.html` | zh-TW | 關於 GugoPro｜AI、影音學習與瀏覽器工具 | 關於 GugoPro（可見（靜態檢查）） | 多國語言對話與口說練習 \| YouTube 追蹤與影音學習 \| 文件處理與 AI 輔助 | 58 | 7 |
| 首頁 | `amazon/index.html` | zh-TW | Amazon AI 全品類智能選品導購 \| GugoPro | 🛒 Amazon AI 智能購物導師（可見（靜態檢查）） | Amazon AI 選品導購是什麼？從需求到可驗證商品清單的研究工作台 \| Amazon 美國代購、日本亞馬遜直送台灣：AI 選品與海淘避坑完整指南 | 76 | 6 |
| 首頁 | `amazon-jp/index.html` | zh-TW | Amazon AI 智能購物導師 \| GugoPro 多模態尋寶助手 | 🛒 Amazon AI 智能購物導師（可見（靜態檢查）） |  | 89 | 1 |
| 首頁 | `amazon-us/index.html` | zh-TW | Amazon AI 全品類智能選品導購 \| GugoPro | 🛒 Amazon AI 智能購物導師（可見（靜態檢查）） |  | 76 | 1 |
| 專欄 | `articles/affective-filter-with-ai-tutor.html` | zh-TW | 克服開口恐懼的心理學解方：克拉申「情意濾網假說」、外語焦慮（FLA）與 AI 導師的零壓力口說閉環｜GugoPro 語言學習專欄 | 克服開口恐懼的心理學解方：克拉申「情意濾網假說」、外語焦慮（FLA）與 AI 導師的零壓力口說閉環（可見（靜態檢查）） | 第一章：情意濾網假說與外語焦慮（FLA）的學術起源與心理機制 \| 第二章：神經科學與人機互動（HCI）視角：為什麼面對「真人」會大腦空白，而 AI 能實現「零濾網」？ \| 第三章：情意降濾與心理支架如何與 GugoPro 實體代碼深度映射 | 177 | 0 |
| 專欄 | `articles/amazon-ai-product-research-guide.html` | zh-TW | 2026 跨境電商與高階海淘全指南：如何利用 AI 語意反向工程打造 Amazon 爆款選品、競品差評痛點挖掘與 Listing 關鍵字佈局矩陣｜GugoPro 電商戰略專欄 | 2026 跨境電商與高階海淘全指南：如何利用 AI 語意反向工程打造 Amazon 爆款選品、競品差評痛點挖掘與 Listing 關鍵字佈局矩陣（可見（靜態檢查）） | 第一章：電商搜尋演算法演進與 AI 語意反向工程 \| 第二章：VOC（客戶聲音）數據挖掘與競品差評逆向研發 \| 第三章：Listing 標題與後台關鍵字（Search Terms）的高轉化佈局矩陣 | 210 | 0 |
| 專欄 | `articles/carb-cycling-and-home-workout-guide.html` | zh-TW | 碳水循環法（Carb Cycling）怎麼吃最減脂？高低碳日生化機制、居家無器材燃脂課表與防止掉肌肉全攻略｜GugoPro 減脂運動生理學專欄 | 碳水循環法（Carb Cycling）怎麼吃最減脂？高低碳日生化機制、居家無器材燃脂課表與防止掉肌肉全攻略（可見（靜態檢查）） | 第一章：碳水循環法（Carb Cycling）的運動生理學與內分泌調控機制 \| 第二章：運動生理學：居家無器材訓練如何達到「增肌減脂／防掉肌肉」？ \| 第三章：GugoPro 居家燃脂課表與碳水循環的「週期化完美咬合」 | 207 | 0 |
| 專欄 | `articles/diabetes-and-insulin-resistance-guide.html` | zh-TW | 糖尿病前期與胰島素阻抗怎麼吃？從升糖指數（GI/GL）、碳水計數到 AI 拍餐：告別血糖震盪的巨量營養素調控全指南｜GugoPro 慢病代謝專欄 | 糖尿病前期與胰島素阻抗怎麼吃？從升糖指數（GI/GL）、碳水計數到 AI 拍餐：告別血糖震盪的巨量營養素調控全指南（可見（靜態檢查）） | 第一章：胰島素阻抗（Insulin Resistance）與血糖震盪的分子生化機制 \| 第二章：營養學武器庫：升糖指數（GI）、升糖負荷（GL）與碳水化合物計數法 \| 第三章：GugoPro AI 拍餐辨識在「控糖防禦」中的實戰應用與 YMYL 醫療免責規範 | 194 | 0 |
| 專欄 | `articles/english-intro-break-the-ice.html` | zh-TW | 看 YouTube 學英文為何總是無效？結合音韻知覺理論、Levenshtein 聽寫差量比對與影子跟讀（Shadowing）打造母語聽覺神經迴路全指南｜GugoPro 語言科學專欄 | 看 YouTube 學英文為何總是無效？結合音韻知覺理論、 Levenshtein 聽寫差量比對與影子跟讀（Shadowing） 打造母語聽覺神經迴路全指南（可見（靜態檢查）） | 第一章：認知神經科學剖析：雙語字幕刷片無效之神經機制 \| 第二章：英語語音學與音韻學解密：語流音變與生理聽覺斷層 \| 第三章：計算語言學與演算法解析：GugoPro Levenshtein 聽寫差量比對引擎 | 224 | 0 |
| 專欄 | `articles/fatty-liver-and-mediterranean-diet-guide.html` | zh-TW | 減醣飲食與地中海飲食怎麼吃？從逆轉脂肪肝、內臟脂肪燃燒到三大營養素黃金配比：外食族健康長壽實戰手冊｜GugoPro 肝臟代謝專欄 | 減醣飲食與地中海飲食怎麼吃？從逆轉脂肪肝、內臟脂肪燃燒到三大營養素黃金配比：外食族健康長壽實戰手冊（可見（靜態檢查）） | 第一章：脂肪肝（MASLD / NAFLD）與內臟脂肪的分子病理機制 \| 第二章：兩大長壽抗炎飲食對決：減醣飲食（Low-Carb）vs. 地中海飲食（Mediterranean Diet） \| 第三章：外食隱形促炎油脂辨識與食材品質優化 | 207 | 0 |
| 專欄 | `articles/gemini-api-free-tier-and-developer-guide.html` | zh-TW | 2026 終極開發者手冊：利用 Google Gemini 官方免費 API 打造零成本商用級應用之架構設計與故障排除全指南｜GugoPro 雲端系統專欄 | 2026 終極開發者手冊：利用 Google Gemini 官方免費 API 打造零成本商用級應用之架構設計與故障排除全指南（可見（靜態檢查）） | 第一章：Gemini API 免費層額度機制與生物鐘物理限制 \| 第二章：完整 HTTP 錯誤代碼拓撲、底層病因與確定性防禦矩陣 \| 第三章：生產級自動容錯降級（Failover）與高可用架構 | 260 | 0 |
| 專欄 | `articles/how-to-master-tarot-guide.html` | zh-TW | 如何成為塔羅牌大師？從 78 張牌義生吞活剝到「直覺流動解牌」：結合古典符號學、敘事心理學與 AI 協同實戰刻意練習全指南｜GugoPro 決策科學專欄 | 如何成為塔羅牌大師？從 78 張牌義生吞活剝到「直覺流動解牌」：結合古典符號學、敘事心理學與 AI 協同實戰刻意練習全指南（可見（靜態檢查）） | 第一章：破除死記硬背：為什麼背牌義是初學者的墓地？ \| 第二章：古典符號學解碼：四元素哲學、生命數字學與宮廷牌角色動力學 \| 第三章：牌陣空間解構與「流動閱讀法（Flow Reading）」實戰心法 | 159 | 0 |
| 專欄 | `articles/how-to-master-ziwei-guide.html` | zh-TW | 如何成為紫微斗數大師？從死背百顆星曜到「動態格局解盤」：結合文化符號學、系統動力學與 AI 協同實戰刻意練習全指南｜GugoPro 決策科學專欄 | 如何成為紫微斗數大師？從死背百顆星曜到「動態格局解盤」：結合文化符號學、系統動力學與 AI 協同實戰刻意練習全指南（可見（靜態檢查）） | 第一章：破除死記硬背：符號碎裂化認知陷阱與高階心智表徵建構 \| 第二章：底層架構解碼：十四主星組塊化、十二宮對宮拓撲與三方四正力學幾何 \| 第三章：動態能量流動：十干四化系統動力學重構與負熵修復機制 | 207 | 0 |
| 專欄 | `articles/intermittent-fasting-and-calorie-deficit-guide.html` | zh-TW | 168 斷食真的比算熱量有效嗎？從自噬反應、胰島素假說到熱量赤字真相：打破越斷越肥的復胖陷阱｜GugoPro 減脂代謝專欄 | 168 斷食真的比算熱量有效嗎？從自噬反應、胰島素假說到熱量赤字真相：打破越斷越肥的復胖陷阱（可見（靜態檢查）） | 第一章：168 間歇性斷食（16:8 TRF）的分子生化機制與諾貝爾獎理論淵源 \| 第二章：兩大科學陣營對決：碳水化合物-胰島素模型（CIM）vs. 能量平衡模型（EBM） \| 第三章：168 斷食的安全邊界、皮質醇飆升與醫學禁忌 | 265 | 0 |
| 專欄 | `articles/modern-ziwei-guide.html` | zh-TW | 告別宿命論與玄學恐嚇！用現代心理學重構紫微斗數：從十二宮位、四化動態到 AI 決策反思模型｜GugoPro 決策科學專欄 | 告別宿命論與玄學恐嚇！用現代心理學重構紫微斗數：從十二宮位、四化動態到 AI 決策反思模型（可見（靜態檢查）） | 第一章：符號學與認知科學：解密紫微斗數的科學本質（去玄學化與去恐嚇化） \| 第二章：十二宮位與四化星曜的「現代生活資訊架構學」 \| 第三章：關係合盤的系統動力學：打破「八字相剋」迷信 | 140 | 0 |
| 專欄 | `articles/shadowing-with-ai-tutor.html` | zh-TW | 擺脫「啞巴英語」的科學自學法：結合影子跟讀（Shadowing）、CEFR 脈絡輸出與 AI 導師的高效閉環｜GugoPro 語言學習專欄 | 擺脫「啞巴英語」的科學自學法：結合影子跟讀（Shadowing）、CEFR 脈絡輸出與 AI 導師的高效閉環（可見（靜態檢查）） | 第一章：認知心理學解密「啞巴英語」的生理阻斷 \| 第二章：影子跟讀法（Shadowing）與語音辨識糾偏機制 \| 第三章：自訂教材匯入與 CEFR 分級情境化輸出 | 141 | 0 |
| 專欄 | `articles/tarot-decision-framework.html` | zh-TW | 告別迷信宿命論！從榮格「原型」心理學、共時性到 AI 塔羅：拆解職涯二選一與感情焦慮的結構化決策模型｜GugoPro 決策科學專欄 | 告別迷信宿命論！從榮格「原型」心理學、共時性到 AI 塔羅：拆解職涯二選一與感情焦慮的結構化決策模型（可見（靜態檢查）） | 第一章：符號學與認知心理學：解密塔羅牌的科學本質（去迷信化） \| 第二章：認知偏誤突破與決策工程：塔羅牌陣如何重塑理性大腦 \| 第三章：提問的認知工程與 GugoPro 實體代碼功能映射 | 143 | 0 |
| 專欄 | `articles/tblt-with-ai-tutor.html` | zh-TW | 告別死記硬背！結合任務型教學法（TBLT）、Robinson 認知假說與 AI 導師的高效口說實戰指南｜GugoPro 語言學習專欄 | 告別死記硬背！結合任務型教學法（TBLT）、Robinson 認知假說與 AI 導師的高效口說實戰指南（可見（靜態檢查）） | 第一章：TBLT 的學術起源與理論基石 \| 第二章：認知心理學機制：Robinson「認知假說」與認知負載 \| 第三章：Jane Willis 三階段流程與 GugoPro 實體代碼深度映射 | 178 | 0 |
| 專欄 | `articles/tdee-and-macros-guide.html` | zh-TW | 告別無效節食與溜溜球效應！從能量平衡熱力學、自適應產熱到 AI 拍餐估算：外食族 TDEE 與三大營養素精準調控全指南｜GugoPro 代謝健康專欄 | 告別無效節食與溜溜球效應！從能量平衡熱力學、自適應產熱到 AI 拍餐估算：外食族 TDEE 與三大營養素精準調控全指南（可見（靜態檢查）） | 第一章：營養熱力學與代謝科學：破解節食迷思與溜溜球效應 \| 第二章：巨量營養素生化代謝與飽足感調控機制 \| 第三章：多模態視覺 AI 拍餐分析的「認知啟發法」與誤差控制 | 189 | 0 |
| 專欄 | `articles/travel-translator-guide.html` | zh-TW | 告別尷尬遞手機！180° 面對面翻轉介面的設計美學、人機互動（HCI）空間心理學與出國溝通實戰指南｜GugoPro 跨文化專欄 | 告別尷尬遞手機！180° 面對面翻轉介面的設計美學、人機互動（HCI）空間心理學與出國溝通實戰指南（可見（靜態檢查）） | 第一章：跨文化交際障礙與「遞手機」的人際空間心理學剖析 \| 第二章：人機互動（HCI）視角：共享單螢幕介面之認知工程與輸入架構 \| 第三章：語用學（Pragmatics）與跨文化高風險溝通策略 | 184 | 0 |
| 專欄 | `articles/weight-loss-planner-guide.html` | zh-TW | 告別線性減重迷思！從 Wishnofsky 7700大卡法則失真、阻力訓練期程化到停滯期突破：動態減脂計畫與熱量赤字全指南｜GugoPro 運動生理學專欄 | 告別線性減重迷思！從 Wishnofsky 7700大卡法則失真、阻力訓練期程化到停滯期突破：動態減脂計畫與熱量赤字全指南（可見（靜態檢查）） | 第一章：能量赤字熱力學與 7700 大卡法則批判：靜態假設之破滅與動態能量平衡模型 \| 第二章：減重停滯期的多維度生理代償與排查機制：假性停滯與真性代謝適應 \| 第三章：運動生理學：阻力訓練、有氧耐力與 EPOC 後燃效應的週期化配比 | 200 | 0 |
| 專欄 | `articles/youtube-english-listening-and-shadowing-guide.html` | zh-TW | 解鎖 YouTube 雙語精聽與影子跟讀：L-Player 零摩擦學習系統操作全書與神經聽覺重塑指南｜GugoPro 語言科學專欄 | 解鎖 YouTube 雙語精聽與影子跟讀： L-Player 零摩擦學習系統操作全書與神經聽覺重塑指南（可見（靜態檢查）） | 理論基石：第二語言習得與認知神經科學理論構架 \| 第一章：系統架構與介面導覽：L-Player 的三合一視窗配置 \| 第二章：三大核心學習模式與演算法運作實務 | 244 | 0 |
| 專欄 | `articles/youtube-listening-connected-speech-guide.html` | zh-TW | 看 YouTube 學英文為何總是無效？結合音韻知覺理論、Levenshtein 聽寫差量比對與影子跟讀（Shadowing）打造母語聽覺神經迴路全指南｜GugoPro 語言科學專欄 | 看 YouTube 學英文為何總是無效？結合音韻知覺理論、 Levenshtein 聽寫差量比對與影子跟讀（Shadowing） 打造母語聽覺神經迴路全指南（可見（靜態檢查）） | 第一章：認知神經科學剖析：雙語字幕刷片無效之神經機制 \| 第二章：英語語音學與音韻學解密：語流音變與生理聽覺斷層 \| 第三章：計算語言學與演算法解析：GugoPro Levenshtein 聽寫差量比對引擎 | 224 | 0 |
| 專欄 | `articles/youtube-sequel-tracker-guide.html` | zh-TW | 2026 YouTube 影音演算法與連載檢索全指南：如何破解推薦漏片迷思、利用 NLP 正則去噪與差量比對打造跨頻道追劇閉環｜GugoPro 串流媒體研究專欄 | 2026 YouTube 影音演算法與連載檢索全指南：如何破解推薦漏片迷思、利用 NLP 正則去噪與差量比對 打造跨頻道追劇閉環（可見（靜態檢查）） | 第一章：YouTube 推薦演算法機制與「連載斷更/漏片」的結構性成因 \| 第二章：資訊檢索（IR）與 NLP 標題去噪工程 \| 第三章：無伺服器架構下的「本機差量記憶」與隱私工程 | 199 | 0 |
| 法規 | `contact.html` | zh-TW | 聯絡我們 \| GugoPro 官方 | 聯絡我們（可見（靜態檢查）） | 官方聯絡信箱 \| 問題回報與功能建議 \| 快速寄信 | 62 | 7 |
| 法規 | `disclaimer.html` | zh-TW | 免責聲明｜GugoPro 工具與 AI 服務使用限制 | GugoPro 免責聲明（可見（靜態檢查）） | 1. 一般資訊與專業建議 \| 2. AI 生成、語音辨識與數學估算 \| 3. 本機處理、瀏覽器儲存與第三方傳輸 | 57 | 8 |
| 專欄 | `en/articles/affective-filter-with-ai-tutor.html` | en | Overcoming the Fear of Speaking: Krashen's Affective Filter, Foreign Language Anxiety (FLA), and Zero-Pressure AI Tutoring \| GugoPro Language Science | Overcoming the Fear of Speaking: Krashen's Affective Filter, Foreign Language Anxiety (FLA), and Zero-Pressure AI Tutoring（可見（靜態檢查）） | Chapter 1: Academic Foundations: The Affective Filter Hypothesis and Foreign Language Anxiety \| Chapter 2: Neurobiology & HCI: Why Live Humans Induce Freezing While AI Unlocks Zero-Filter Acquisition \| Chapter 3: Affective Scaffolding Mapped to GugoPro's Engineering Architecture | 455 | 0 |
| 專欄 | `en/articles/amazon-ai-product-research-guide.html` | en | 2026 Cross-Border E-Commerce & Global Sourcing Master Guide: Leveraging AI Semantic Reverse Engineering for Amazon Product Research, Negative Review Mining, and Listing Matrix Architecture \| GugoPro Strategy Column | 2026 Cross-Border E-Commerce & Global Sourcing Master Guide: Leveraging AI Semantic Reverse Engineering for Amazon Product Research, Negative Review Mining, and Listing Keyword Matrix Architecture（可見（靜態檢查）） | Chapter 1: The Evolution of E-Commerce Search Algorithms & AI Semantic Reverse Engineering \| Chapter 2: VOC (Voice of Customer) Data Mining & Competitor Negative Review Reverse-Engineering \| Chapter 3: High-Converting Listing Titles and 249-Byte Backend Keyword Allocation | 452 | 0 |
| 專欄 | `en/articles/carb-cycling-and-home-workout-guide.html` | en | How to Master Carb Cycling for Maximum Fat Loss: High/Low Carb Biochemistry, Home Bodyweight Workout Splits, and Preserving Muscle Mass \| GugoPro Exercise Physiology Column | How to Master Carb Cycling for Maximum Fat Loss: High/Low Carb Biochemistry, Home Bodyweight Workout Splits, and Preserving Muscle Mass（可見（靜態檢查）） | Chapter 1: Exercise Physiology & Endocrine Mechanisms of Carb Cycling \| Chapter 2: Exercise Physiology: Bodyweight Training for Hypertrophy & Muscle Retention \| Chapter 3: Aligning Home Routines with Carb Cycling Waves | 452 | 0 |
| 專欄 | `en/articles/diabetes-and-insulin-resistance-guide.html` | en | What to Eat for Prediabetes and Insulin Resistance? From GI/GL and Carb Counting to AI Meal Tracking: The Definitive Macronutrient Guide to Ending Glucose Spikes \| GugoPro Metabolic Science Column | What to Eat for Prediabetes and Insulin Resistance? From GI/GL and Carb Counting to AI Meal Tracking: The Definitive Macronutrient Guide to Ending Glucose Spikes（可見（靜態檢查）） | Chapter 1: The Molecular Biochemistry of Insulin Resistance and Glycemic Volatility \| Chapter 2: The Nutritional Arsenal: Glycemic Index (GI), Glycemic Load (GL), and Carbohydrate Counting \| Chapter 3: Clinical AI Image Audits: Identifying Hidden Sugars & YMYL Medical Safety Guardrails | 437 | 0 |
| 專欄 | `en/articles/english-intro-break-the-ice.html` | en | Why Watching YouTube Fails for English Learning: Speech Perception, Levenshtein Dictation Diff, and Shadowing Guide \| GugoPro Language Science | Why Watching YouTube Fails for English Learning: Building Native Auditory Circuits via Speech Perception, Levenshtein Dictation Diff, and Shadowing（可見（靜態檢查）） | Chapter 1: Cognitive Neuroscience: The Subtitle Immersion Trap \| Chapter 2: Phonology Decoded: Connected Speech and Perceptual Failures \| Chapter 3: Computational Linguistics: Levenshtein Dictation Diff Engine | 413 | 0 |
| 專欄 | `en/articles/fatty-liver-and-mediterranean-diet-guide.html` | en | What to Eat for Fatty Liver: Low-Carb vs. Mediterranean Diet? From Reversing Hepatic Steatosis & Visceral Fat to Optimal Macronutrient Ratios: The Dining-Out Longevity Handbook \| GugoPro Liver Metabolism Column | What to Eat for Fatty Liver: Low-Carb vs. Mediterranean Diet? From Reversing Hepatic Steatosis & Visceral Fat to Optimal Macronutrient Ratios: The Dining-Out Longevity Handbook（可見（靜態檢查）） | Chapter 1: The Molecular Pathophysiology of Steatotic Liver Disease (MASLD / NAFLD) and Visceral Fat \| Chapter 2: The Longevity Dietary Showdown: Low-Carb vs. Mediterranean Diet \| Chapter 3: Auditing Pro-inflammatory Seed Oils and Sourcing Clean Lipids | 473 | 0 |
| 專欄 | `en/articles/gemini-api-free-tier-and-developer-guide.html` | en | 2026 Developer Blueprint: Building Zero-Cost Commercial-Grade Apps with Google Gemini Free API & Comprehensive Error Troubleshooting Guide \| GugoPro Cloud Systems Column | 2026 Developer Blueprint: Building Zero-Cost Commercial-Grade Apps with Google Gemini Free API & Comprehensive Error Troubleshooting Guide（可見（靜態檢查）） | Chapter 1: Gemini API Free Tier Quota Mechanics & Biological Clock Physical Constraints \| Chapter 2: Complete HTTP Error Code Topology, Root Causes, and Deterministic Defense Matrix \| Chapter 3: Production-Grade Automatic Failover & High-Availability Architecture | 394 | 0 |
| 專欄 | `en/articles/how-to-master-tarot-guide.html` | en | How to Become a Tarot Master? From Rote Memorization to Intuitive Flow Reading: A Deliberate Practice Guide Combining Classical Semiotics, Narrative Psychology, and AI Collaboration \| GugoPro Decision Science Column | How to Become a Tarot Master? From Rote Memorization to "Intuitive Flow Reading": A Comprehensive Deliberate Practice Guide Combining Classical Semiotics, Narrative Psychology, and AI Collaboration（可見（靜態檢查）） | Chapter 1: Dismantling Rote Memorization: Why Cramming Keywords is the Beginner's Graveyard \| Chapter 2: Classical Semiotic Decoding: Four Elements, Numerology, and Court Card Dynamics \| Chapter 3: Spatial Deconstruction & "Flow Reading" Master Techniques | 384 | 0 |
| 專欄 | `en/articles/how-to-master-ziwei-guide.html` | en | How to Become a Ziwei Astrology Master? From Rote Memorization to Dynamic Pattern Reading: A Deliberate Practice Guide Combining Cultural Semiotics, System Dynamics, and AI Collaboration \| GugoPro Decision Science Column | How to Become a Ziwei Astrology Master? From Rote Memorization of 108 Stars to "Dynamic Pattern Reading": A Deliberate Practice Guide Combining Cultural Semiotics, System Dynamics, and AI Collaboration（可見（靜態檢查）） | Chapter 1: Dismantling Rote Memorization: Fragmentation Pitfalls & High-Level Mental Representations \| Chapter 2: Foundational Architecture: 14 Major Star Chunks, Palace Polar Topology, and Trine Geometry \| Chapter 3: Dynamic Energy Fluxes: Reconstructing the Four Transformations & Negative Entropy | 497 | 0 |
| 專欄 | `en/articles/intermittent-fasting-and-calorie-deficit-guide.html` | en | Is 16:8 Intermittent Fasting Really Better Than Counting Calories? From Autophagy and the Insulin Hypothesis to Caloric Deficit Realities: Escaping the Fasting Rebound Trap \| GugoPro Metabolic Science Column | Is 16:8 Intermittent Fasting Really Better Than Counting Calories? From Autophagy and the Insulin Hypothesis to Caloric Deficit Realities: Escaping the Fasting Rebound Trap（可見（靜態檢查）） | Chapter 1: The Molecular Biochemistry of 16:8 Time-Restricted Feeding and Autophagy \| Chapter 2: Scientific Paradigms: The Carbohydrate-Insulin Model (CIM) vs. The Energy Balance Model (EBM) \| Chapter 3: Safety Limits: Cortisol Spikes, Amenorrhea, and Medical Contraindications | 643 | 0 |
| 專欄 | `en/articles/investment/01-compound-interest-guide.html` | en | Compounding and time value of money: how to build your first financial system from a balance sheet? \| GugoPro Academy | Compounding and time value of money: how to build your first financial system from a balance sheet?（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. Deep breakdown of the compound interest formula (複利公式) \| 2. Inflation defense and asset value | 164 | 9 |
| 專欄 | `en/articles/investment/02-etf-investing-bible.html` | en | Index Investing Bible: Taiwan 0050/006208 vs US VTI/VOO/QQQ — complete analysis \| GugoPro Academy | Index Investing Bible: Taiwan 0050/006208 vs US VTI/VOO/QQQ — complete analysis（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. Fundamental comparison of popular Taiwan vs US ETFs ETF \| 2. Expense ratio: the decisive factor for long‑term returns | 171 | 9 |
| 專欄 | `en/articles/investment/03-asset-allocation-rebalancing.html` | en | Asset allocation and dynamic rebalancing: from target weights to trading frictions｜GugoPro Academy | Asset allocation and dynamic rebalancing: Turn target weights into actionable decision rules.（可見（靜態檢查）） | Read the conclusion first. \| Define the objective first, then discuss the equity vs. bond allocation. \| A large number of assets does not necessarily imply true diversification. | 217 | 17 |
| 專欄 | `en/articles/investment/04-brokerage-comparison.html` | en | Complete guide to opening a US brokerage account: Taiwan sub-account vs. overseas brokers \| GugoPro Academy | Complete guide to opening a US brokerage account: Taiwan sub-account vs. overseas brokers (Firstrade, IB, Schwab) comparison（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. Core comparison table of US brokers \| 2. Hidden costs: wire transfers and exchange rates | 169 | 9 |
| 專欄 | `en/articles/investment/05-fundamental-valuation-metrics.html` | en | Fundamental valuation metrics: P/E, P/B and ROE \| GugoPro Academy | Fundamental valuation metrics: correctly reading P/E, P/B and ROE（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. Core valuation metrics explained \| 2. Beware the "high‑yield trap" | 117 | 9 |
| 專欄 | `en/articles/investment/06-sharpe-mdd-risk-control.html` | en | Risk‑return and maximum drawdown analysis: Sharpe, Sortino, Calmar implementation guide｜GugoPro Academy | Risk‑return and maximum drawdown analysis（可見（靜態檢查）） | 1. First split the two worlds of risk‑reward ratio \| 2. Convert price series into comparable returns \| 3. Maximum drawdown: find the deepest pit along the entire equity path | 219 | 10 |
| 專欄 | `en/articles/investment/07-fire-4-percent-rule.html` | en | [Retirement Planning] What is the FIRE movement and the 4% rule? How to calculate withdrawal rates and your retirement funding gap \| GugoPro Academy | [Retirement Planning] What is the FIRE movement and the 4% rule? How to calculate withdrawal rates and your retirement funding gap（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. Origins and core philosophy of the FIRE movement \| 2. The science behind the 4% rule: the Trinity Study | 250 | 10 |
| 專欄 | `en/articles/investment/08-overseas-tax-guide.html` | en | [Tax Optimization & Filing] How are US stock investments taxed? Practical guide to the 750 萬 tax‑exempt threshold for foreign income and 30% dividend withholding practice \| GugoPro Academy | [Tax Optimization & Filing] How are US stock investments taxed? Practical guide to the 750 萬 tax‑exempt threshold for foreign income and 30% dividend withholding practice（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. Taiwan rules for reporting foreign income and the 750 萬 tax‑exempt threshold \| 2. US equities: 30% dividend withholding tax and W-8BEN form explained | 227 | 9 |
| 專欄 | `en/articles/investment/09-high-dividend-etf-trap.html` | en | [High‑Dividend ETF Review] Taiwan ETFs 00878/00919/00929 vs US ETF SCHD: debunking high‑yield traps and the truth about total return \| GugoPro Academy | [High‑Dividend ETF Review] Taiwan ETFs 00878/00919/00929 vs US ETF SCHD: debunking high‑yield traps and the truth about total return（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. The operational nature of high‑dividend ETFs and the dividend‑yield misconception ETF \| 2. In‑depth review of popular Taiwan high‑dividend ETFs (00878 vs 00919 vs 00929) ETF | 201 | 9 |
| 專欄 | `en/articles/investment/10-bond-investing-guide.html` | en | [Bond Investment Guide] US Treasuries (TLT/IEF) vs. Investment‑Grade Corporate Bonds (LQD): Asset‑allocation strategies in a rate‑cutting cycle \| GugoPro Academy | [Bond Investment Guide] US Treasuries (TLT/IEF) vs. Investment‑Grade Corporate Bonds (LQD): Asset‑allocation strategies in a rate‑cutting cycle（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. Bond core fundamentals: duration and interest rate sensitivity \| 2. In‑depth review of the three major bond ETFs (TLT vs IEF vs LQD) ETF | 219 | 10 |
| 專欄 | `en/articles/investment/11-brokerage-deep-review.html` | en | [Encyclopedia of Overseas Broker Reviews] IB (Interactive Brokers), Firstrade, Charles Schwab — pros, cons, safety and hidden cost comparisons \| GugoPro Academy | [Encyclopedia of Overseas Broker Reviews] IB (Interactive Brokers), Firstrade, Charles Schwab — pros, cons, safety and hidden cost comparisons（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. Overseas brokers' safety lines: SIPC insurance and regulatory frameworks \| 2. Comprehensive comparative review of three major overseas brokers | 202 | 9 |
| 專欄 | `en/articles/investment/12-inflation-hedging-reits-gold.html` | en | [Hedge Assets] How do gold (GLD) and real estate investment trusts (REITs) fit into asset allocation to hedge inflation? \| GugoPro Academy | [Hedge Assets] How do gold (GLD) and real estate investment trusts (REITs) fit into asset allocation to hedge inflation?（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. The inflation monster and blind spots of traditional equity‑bond approaches \| 2. Hedging philosophy of gold ETFs (GLD / IAU) ETF | 216 | 9 |
| 專欄 | `en/articles/investment/13-technical-indicators-truth.html` | en | [The Truth About Technical Analysis] Moving averages (MA), RSI, MACD — are they really useful? Technical indicators and blind spots from a quant trader's perspective \| GugoPro Academy | [The Truth About Technical Analysis] Moving averages (MA), RSI, MACD — are they really useful? Technical indicators and blind spots from a quant trader's perspective（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. The mathematical nature of technical indicators and their lagging behavior \| 2. Main technical indicators: principles and blind spots explained | 205 | 10 |
| 專欄 | `en/articles/investment/14-backtesting-overfitting-guide.html` | en | [Systematic Trading] What is backtesting (回測)? How to avoid overfitting (過度擬合) and historical traps \| GugoPro Academy | [Systematic Trading] What is backtesting (回測)? How to avoid overfitting (過度擬合) and historical traps（可見（靜態檢查）） | 30-second key takeaways (Key Takeaways) \| 1. Basic concepts and importance of backtesting (回測) \| 2. The biggest fatal backtest trap: overfitting | 168 | 10 |
| 專欄 | `en/articles/investment/15-quant-research-workflow.html` | en | Quant research workflow: 5MA offsets, volatility Z‑Score and out‑of‑sample backtesting｜GugoPro Academy Z-Score | Quant research workflow: Put 5MA, volatility and backtests into the same chain of evidence.（可見（靜態檢查）） | Read the conclusion first. \| 1. First write the research question as a falsifiable proposition \| 2. 5MA/20MA offset: understand the window first, then discuss turning points | 200 | 10 |
| 專欄 | `en/articles/investment/16-futures-pairs-basis.html` | en | Pair trading and cash‑futures spread for Taiwan index futures / 富台期: from Basis to roll risk｜GugoPro Academy | Taiwan index futures / 富台期 pair trading: Break down the Basis first, then discuss arbitrage.（可見（靜態檢查）） | Read the conclusion first. \| 1. First align contract specs and nominal units \| 2. Basis and term structure: decompose the spread into verifiable components | 237 | 8 |
| 專欄 | `en/articles/investment/17-practical-trading.html` | en | Category 13 Practical Trading: trading plan, execution, risk control and review — complete knowledge tree｜GugoPro Academy | Practical trading: Turn ideas into executable, stop‑lossable and reviewable processes.（可見（靜態檢查）） | First look at the core of this category. \| 1. First pick the market and instrument: trading opportunities carry execution costs \| 2. Trading plan: turn subjective narratives into pre‑defined rules | 221 | 18 |
| 專欄 | `en/articles/investment/18-trend-following-breakout-playbook.html` | en | Trend following and breakout strategy Playbook: rules, sizing, false breakouts and backtest validation｜GugoPro Academy | Trend following and breakout strategy: Write your view as verifiable rules.（可見（靜態檢查）） | First grasp the five core judgments. \| 1. First clarify: trend‑following, breakout and momentum are not synonyms \| 2. First determine market environment: the same rule won’t work the same in all markets | 205 | 21 |
| 首頁 | `en/articles/investment/index.html` | en | Investment Education Academy \| GugoPro Academy | Systematized Investment education and practical matrix（可見（靜態檢查）） | Financial risk disclaimer | 168 | 28 |
| 專欄 | `en/articles/modern-ziwei-guide.html` | en | Farewell to Fatalism and Esoteric Intimidation! Reconstructing Ziwei Astrology with Modern Psychology: From Twelve Palaces and Si-Hua Dynamics to AI Decision Reflection Models \| GugoPro Decision Science Column | Farewell to Fatalism and Esoteric Intimidation! Reconstructing Ziwei Astrology with Modern Psychology: From Twelve Palaces and Si-Hua Dynamics to AI Decision Reflection Models（可見（靜態檢查）） | Chapter 1: Semiotics and Cognitive Science: Demystifying Ziwei Dou Shu \| Chapter 2: Modern Life Information Architecture: Twelve Palaces & Four Transformations \| Chapter 3: Relational Synastry Dynamics: Overcoming Incompatibility Myths | 539 | 0 |
| 專欄 | `en/articles/shadowing-with-ai-tutor.html` | en | Overcoming 'Mute English': Shadowing, CEFR Output, and AI Tutoring for Fluent Speaking \| GugoPro Language Science | Overcoming 'Mute English': Shadowing, CEFR Output, and AI Tutoring for Fluent Speaking（可見（靜態檢查）） | Chapter 1: Cognitive Psychology: Deconstructing 'Mute English' \| Chapter 2: Shadowing & Pronunciation Correction Algorithms \| Chapter 3: Custom Materials and CEFR Scaffolding | 281 | 0 |
| 專欄 | `en/articles/tarot-decision-framework.html` | en | Farewell to Fatalism: From Jungian Archetypal Psychology and Synchronicity to AI Tarot: Deconstructing Career Dilemmas and Relationship Anxiety via Structured Decision Models \| GugoPro Decision Science Column | Farewell to Fatalism: From Jungian Archetypal Psychology and Synchronicity to AI Tarot: Deconstructing Career Dilemmas and Relationship Anxiety via Structured Decision Models（可見（靜態檢查）） | Chapter 1: Semiotics and Cognitive Psychology: Demystifying Tarot’s Scientific Essence \| Chapter 2: Overcoming Cognitive Biases: How Spreads Restructure Rational Thinking \| Chapter 3: Cognitive Query Engineering & Architecture Mapping | 496 | 0 |
| 專欄 | `en/articles/tblt-with-ai-tutor.html` | en | Beyond Rote Memorization: Task-Based Language Teaching (TBLT), Robinson's Cognition Hypothesis, and High-Impact Speaking with AI \| GugoPro Language Science | Beyond Rote Memorization: Task-Based Language Teaching (TBLT), Robinson's Cognition Hypothesis, and High-Impact Speaking with AI（可見（靜態檢查）） | Chapter 1: Theoretical Foundations: The Origins of TBLT \| Chapter 2: Cognitive Mechanisms: Robinson's Cognition Hypothesis & Cognitive Load \| Chapter 3: Jane Willis's Three-Stage Framework Mapped to GugoPro's Architecture | 522 | 0 |
| 專欄 | `en/articles/tdee-and-macros-guide.html` | en | Defeat Chronic Dieting & Yo-Yo Rebound: The Complete Scientific Guide to TDEE, Adaptive Thermogenesis & Macronutrient Control for Dining Out \| GugoPro Metabolic Health Column | Defeat Chronic Dieting & Yo-Yo Rebound: The Complete Scientific Guide to TDEE, Adaptive Thermogenesis & Macronutrient Control for Dining Out（可見（靜態檢查）） | Chapter 1: Nutritional Thermodynamics & Metabolic Science: Demystifying Dieting & the Yo-Yo Rebound \| Chapter 2: Macronutrient Biochemistry & Satiety Signaling Dynamics \| Chapter 3: Multimodal Vision AI Meal Estimation: Heuristics & Error Control | 543 | 0 |
| 專欄 | `en/articles/travel-translator-guide.html` | en | Say Goodbye to Awkward Phone-Passing! 180° Face-to-Face Flipped UI Design, HCI Spatial Psychology, and Practical Travel Communication Guide \| GugoPro Cross-Cultural Column | Say Goodbye to Awkward Phone-Passing! 180° Face-to-Face Flipped UI Design, HCI Spatial Psychology, and Practical Travel Communication Guide（可見（靜態檢查）） | Chapter 1: Intercultural Barriers & The Spatial Psychology of "Phone-Passing" \| Chapter 2: Human-Computer Interaction (HCI): Shared Mobile Displays & Input Architecture \| Chapter 3: Pragmatics and High-Stakes Cross-Cultural Communication | 501 | 0 |
| 專欄 | `en/articles/weight-loss-planner-guide.html` | en | Beyond Linear Weight Loss Myths: From Wishnofsky's 7,700 kcal Rule Flaws to Resistance Periodization and Plateau Breakthroughs: The Definitive Dynamic Fat Loss & Caloric Deficit Guide \| GugoPro Exercise Physiology Column | Beyond Linear Weight Loss Myths: From Wishnofsky's 7,700 kcal Rule Flaws to Resistance Periodization and Plateau Breakthroughs: The Definitive Dynamic Fat Loss & Caloric Deficit Guide（可見（靜態檢查）） | Chapter 1: Thermodynamics of Caloric Deficits & The Wishnofsky 7,700 kcal Rule: Static Fallacies vs. Dynamic Energy Balance \| Chapter 2: The Multi-Dimensional Physiology of Plateaus: Pseudo-Plateaus vs. True Metabolic Adaptation \| Chapter 3: Exercise Physiology: Resistance Training, Endurance & EPOC Periodization | 511 | 0 |
| 專欄 | `en/articles/youtube-english-listening-and-shadowing-guide.html` | en | Decoding YouTube Bilingual Listening & Shadowing: L-Player Mastery & Auditory Neural Shaping Guide \| GugoPro Language Science | Decoding YouTube Bilingual Listening & Shadowing: L-Player Mastery & Auditory Neural Shaping Guide（可見（靜態檢查）） | Theoretical Foundations: SLA and Cognitive Neuroscience Frameworks \| Chapter 1: Architecture & Interface: L-Player's 3-in-1 Workbench \| Chapter 2: Core Learning Modes & Algorithmic Execution | 474 | 0 |
| 專欄 | `en/articles/youtube-listening-connected-speech-guide.html` | en | Why Watching YouTube Fails for English Learning: Speech Perception, Levenshtein Dictation Diff, and Shadowing Guide \| GugoPro Language Science | Why Watching YouTube Fails for English Learning: Building Native Auditory Circuits via Speech Perception, Levenshtein Dictation Diff, and Shadowing（可見（靜態檢查）） | Chapter 1: Cognitive Neuroscience: The Subtitle Immersion Trap \| Chapter 2: Phonology Decoded: Connected Speech and Perceptual Failures \| Chapter 3: Computational Linguistics: Levenshtein Dictation Diff Engine | 413 | 0 |
| 專欄 | `en/articles/youtube-sequel-tracker-guide.html` | en | 2026 YouTube Video Algorithm & Series Retrieval Master Guide: Overcoming Recommendation Gaps via NLP Regex Denoising & Incremental Diff Tracking \| GugoPro Streaming Media Lab | 2026 YouTube Video Algorithm & Series Retrieval Master Guide: Overcoming Recommendation Gaps via NLP Regex Denoising & Incremental Diff Tracking（可見（靜態檢查）） | Chapter 1: The YouTube Recommendation Architecture & Structural Causes of Missing Sequels \| Chapter 2: Information Retrieval (IR) & NLP Title Denoising Pipelines \| Chapter 3: Serverless Architecture: Client-Side "Local Diff Engine" & Privacy Engineering | 492 | 0 |
| 法規 | `en/contact.html` | en | Contact Us \| GugoPro Official | Contact Us（可見（靜態檢查）） | Official contact email \| Bug reports and feature suggestions \| Send an email quickly | 156 | 5 |
| 首頁 | `en/index.html` | en | GugoPro Official Homepage \| AI and Utility Tools | Web AI, data and utility tools for everyday work.（可見（靜態檢查）） | AI services and practical tools \| Creator & researcher picks \| Support free tools and learning resources. | 108 | 9 |
| 法規 | `en/legal/about.html` | en | About GugoPro \| GugoPro | About GugoPro（可見（靜態檢查）） | What GugoPro provides \| Our quality approach | 118 | 5 |
| 法規 | `en/legal/contact.html` | en | Contact Us \| GugoPro | Contact Us（可見（靜態檢查）） | Official contact \| Privacy and correction requests | 120 | 5 |
| 法規 | `en/legal/disclaimer.html` | en | Disclaimer \| GugoPro | Disclaimer（可見（靜態檢查）） | General information \| Finance, health and other sensitive topics \| External services | 142 | 5 |
| 法規 | `en/legal/privacy.html` | en | Privacy Policy \| GugoPro | Privacy Policy（可見（靜態檢查）） | 1. Information and purpose \| 2. Cookies, Analytics and advertising \| 3. Local processing and external services | 136 | 5 |
| 法規 | `en/legal/terms.html` | en | Terms of Service \| GugoPro | Terms of Service（可見（靜態檢查）） | 1. Acceptance and permitted use \| 2. Educational and general information \| 3. Availability and limitations | 129 | 5 |
| 工具 | `en/tools/ai/english-speaking-tutor.html` | en | Redirecting - AI Multilingual Speaking Tutor \| GugoPro | （缺失） | Redirecting to AI Multilingual Speaking Tutor... | 0 | 0 |
| 工具 | `en/tools/ai/realtime-translator.html` | en | Redirecting - Face-to-Face Travel Voice Translator \| GugoPro | （缺失） | Redirecting to Face-to-Face Travel Voice Translator... | 0 | 0 |
| 工具 | `en/tools/ai/tarot-master.html` | en | Redirecting - AI Tarot Master \| GugoPro | （缺失） | Redirecting to AI Tarot Master... | 0 | 0 |
| 工具 | `en/tools/ai/ziwei-astrology.html` | en | Redirecting - GugoPro AI Ziwei Astrology Master \| GugoPro | （缺失） | Redirecting to GugoPro AI Ziwei Astrology Master... | 0 | 0 |
| 工具 | `en/tools/ai-media/ai-video-tracker.html` | en | Redirecting - YouTube Sequel Tracker \| GugoPro | （缺失） |  | 0 | 0 |
| 工具 | `en/tools/english/l-player-study.html` | en | Redirecting - YouTube Study Player \| GugoPro | （缺失） |  | 0 | 0 |
| 工具 | `en/tools/health/tdee-macros-calculator.html` | en | Redirecting - AI Nutritionist \| GugoPro | （缺失） |  | 0 | 0 |
| 工具 | `en/tools/health/weight-loss-planner.html` | en | Redirecting - AI Weight Loss Coach \| GugoPro | （缺失） |  | 0 | 0 |
| 工具 | `en/tools/pdf/pdf-suite.html` | en | Redirecting - PDF Suite \| GugoPro | （缺失） |  | 0 | 0 |
| 其他 | `googled0dfad57039c64f6.html` |  |  | （缺失） |  | 0 | 0 |
| 其他 | `guides/risk-reward-ratio.html` | zh-Hant | 交易風險報酬比（R:R）｜GugoPro 財經學院 | 交易風險報酬比（R:R）：先理解，再計算，最後管理風險。（可見（靜態檢查）） | R:R 的第一原則：先定義錯在哪裡，再定義能賺多少 \| 期望值：高勝率、高 R 與尾部風險如何同時成立 \| 部位大小與停損：用帳戶風險而不是信心調整曝險 | 52 | 39 |
| 首頁 | `index.html` | zh-TW | GugoPro 工具箱｜YouTube 雙語字幕學習、AI 翻譯塔羅、TDEE 減脂計算與跨境選品等 10 款免費免安裝工具 | GugoPro 工具箱（可見（靜態檢查）） | 工具分類 \| 核心功能與深度應用手冊 \| 端點安全承諾：先在你的裝置處理 | 214 | 0 |
| 首頁 | `index_en.html` | en | GugoPro Hub \| 10 Free Browser Tools for YouTube Study, AI Translation & Tarot, TDEE, and Product Research | GugoPro Hub（可見（靜態檢查）） | Tool Categories \| Core Features & In-Depth Application Manual \| Endpoint Security Commitment: Processed Locally First | 396 | 0 |
| 首頁 | `index_ja.html` | ja | GugoPro ツールボックス｜YouTube 2言語字幕学習、AI 翻訳タロット、TDEE 減脂計算、越境EC商品選定など無料ブラウザツール10選 | GugoPro ツールボックス（可見（靜態檢查）） | ツール分類 \| コア機能と詳細応用マニュアル \| エンドポイントセキュリティ：あなたの端末内で最優先処理 | 213 | 0 |
| 專欄 | `ja/articles/affective-filter-with-ai-tutor.html` | ja | 話す恐怖を克服する心理学：クラッシェンの「情意フィルター仮説」、外国語不安（FLA）と AI チューターのゼロ圧力スピーキング完全ガイド｜GugoPro 言語学習コラム | 話す恐怖を克服する心理学：クラッシェンの「情意フィルター仮説」、外国語不安（FLA）と AI チューターのゼロ圧力スピーキング完全ガイド（可見（靜態檢查）） | 第一章：情意フィルター仮説と外国語不安（FLA）の学術的起源と心理メカニズム \| 第二章：神経科学とHCI（ヒューマンコンピュータインタラクション）：なぜ「生身の人間」の前で頭が真っ白になり、AIなら「ゼロフィルター」を実現できるのか？ \| 第三章：情意降下と認知的足場かけが GugoPro の実装コードとどう結びついているか | 221 | 0 |
| 專欄 | `ja/articles/amazon-ai-product-research-guide.html` | ja | 2026 越境EC・高精度リサーチ完全攻略：AIセマンティック・リバースエンジニアリングによるAmazonヒット商品開発、競合低評価（VOC）痛点分析とListingキーワード配置マトリクス｜GugoPro EC戦略コラム | 2026 越境EC・高精度リサーチ完全攻略：AIセマンティック・リバースエンジニアリングによるAmazonヒット商品開発、競合低評価（VOC）痛点分析とListingキーワード配置マトリクス（可見（靜態檢查）） | 第1章：EC検索アルゴリズムの進化とAIセマンティック・リバースエンジニアリング \| 第2章：VOC（顧客の声）データマイニングと競合低評価リバースエンジニアリング \| 第3章：ゴールデンListing設計と検索キーワード（Search Terms）249バイト最適化 | 227 | 0 |
| 專欄 | `ja/articles/carb-cycling-and-home-workout-guide.html` | ja | 炭水化物循環法（カーボサイクル）完全減脂ガイド：高・低炭水化物日の生化学機序、器具不要の自宅燃焼ルーティン、筋分解防止の極意｜GugoPro 運動生理学コラム | 炭水化物循環法（カーボサイクル）完全減脂ガイド：高・低炭水化物日の生化学機序、器具不要の自宅燃焼ルーティン、筋分解防止の極意（可見（靜態檢查）） | 第1章：炭水化物循環法（Carb Cycling）の運動生理学と内分泌調控機序 \| 第2章：運動生理学：自宅自重トレーニングで「筋肉を守りながら脂肪を燃やす」力学 \| 第3章：自宅燃焼課表と炭水化物循環の「期分け同期化」 | 204 | 0 |
| 專欄 | `ja/articles/diabetes-and-insulin-resistance-guide.html` | ja | 糖尿病予備群・インスリン抵抗性の食事法完全ガイド：GI/GL値・カーボカウントからAI写真食事管理まで——血糖値スパイクを防ぐ栄養素調控｜GugoPro 代謝医学コラム | 糖尿病予備群・インスリン抵抗性の食事法完全ガイド：GI/GL値・カーボカウントからAI写真食事管理まで——血糖値スパイクを防ぐ栄養素調控（可見（靜態檢查）） | 第1章：インスリン抵抗性（Insulin Resistance）と血糖値スパイクの分子生化学機序 \| 第2章：栄養学の武器庫：GI値・GL値とカーボカウント法 \| 第3章：AI写真食事解析の実戦とYMYL医療免責ガードレール | 164 | 0 |
| 專欄 | `ja/articles/english-intro-break-the-ice.html` | ja | YouTube英語学習が挫折する真の理由とは？音韻知覚理論、レーベンシュタイン聴解、シャドーイング完全ガイド｜GugoPro 言語科学コラム | YouTube英語学習が挫折する真の理由とは？音韻知覚理論、 レーベンシュタイン聴解、シャドーイング で母語レベルの聴覚神経回路を構築する完全ガイド（可見（靜態檢查）） | 第一章：認知神経科学の分析：字幕付き動画視聴が非効率な神経学的根拠 \| 第二章：英語音声学と音韻論の解剖：自然な音変化（Connected Speech）の物理特性 \| 第三章：計算言語学とアルゴリズム：レーベンシュタイン・ディクテーション差分エンジン | 170 | 0 |
| 專欄 | `ja/articles/fatty-liver-and-mediterranean-diet-guide.html` | ja | 脂肪肝を逆転する減糖＆地中海食完全ガイド：内臓脂肪燃焼からPFC黄金比率・外食AI管理まで——MASLDを根本改善する長寿実戦マニュアル｜GugoPro 肝臓代謝コラム | 脂肪肝を逆転する減糖＆地中海食完全ガイド：内臓脂肪燃焼からPFC黄金比率・外食AI管理まで——MASLDを根本改善する長寿実戦マニュアル（可見（靜態檢查）） | 第1章：脂肪肝（MASLD / NAFLD）と内臓脂肪の分子病理メカニズム \| 第2章：長寿抗炎症食の対決：減糖食（Low-Carb）vs. 地中海食（Mediterranean Diet） \| 第3章：外食に潜む促炎症油脂の見破り方と食材調達の最適化 | 206 | 0 |
| 專欄 | `ja/articles/gemini-api-free-tier-and-developer-guide.html` | ja | 2026 開発者完全攻略ハンドブック：Google Gemini 公式無料APIを活用したゼロコスト商用グレードアプリのアーキテクチャ設計とエラー完全トラブルシューティング指南｜GugoPro クラウドシステムコラム | 2026 開発者完全攻略ハンドブック：Google Gemini 公式無料APIを活用したゼロコスト商用グレードアプリのアーキテクチャ設計とエラー完全トラブルシューティング指南（可見（靜態檢查）） | 第1章：Gemini API 無料枠の配額メカニズムと生体時計物理制約 \| 第2章：完全なHTTPエラーコードトポロジー、根本原因と確定性防御マトリクス \| 第3章：プロダクショングレードの自動耐障害フォールバック（Failover）と高可用性アーキテクチャ | 271 | 0 |
| 專欄 | `ja/articles/how-to-master-tarot-guide.html` | ja | タロットマスターへの道：78枚の丸暗記を脱し「直観的フロー・リーディング」へ——古典記号論、ナラティブ心理学、AI協同による限界的練習完全ガイド｜GugoPro 意思決定科学コラム | 如何にしてタロットマスターとなるか？ 78枚の意味の丸暗記から「直観的フロー・リーディング」へ：古典記号論・ナラティブ心理学・AI協同による限界的練習完全手引（可見（靜態檢查）） | 第1章：丸暗記の打破——なぜ単語暗記は初学者の墓場なのか？ \| 第2章：古典記号論の解読：四大元素・生命数秘術・コートカード力学 \| 第3章：空間構造解読と「フロー・リーディング法」 | 145 | 0 |
| 專欄 | `ja/articles/how-to-master-ziwei-guide.html` | ja | 紫微斗数マスターへの道：百の星の丸暗記を脱し「動態格局解盤」へ——文化記号論、システムダイナミクス、AI協同による限界的練習完全ガイド｜GugoPro 意思決定科学コラム | 紫微斗数マスターへの道：百の星の丸暗記を脱し「動態格局解盤」へ——文化記号論、システムダイナミクス、AI協同による限界的練習完全ガイド（可見（靜態檢查）） | 第1章：丸暗記の打破：記号破砕化の罠と高階層心的表象の構築 \| 第2章：基盤構造の解読：十四主星のチャンク化、十二宮対宮トポロジーと三方四正の幾何学 \| 第3章：動態エネルギー流動：十干四化のシステムダイナミクスと負のエントロピー | 199 | 0 |
| 專欄 | `ja/articles/intermittent-fasting-and-calorie-deficit-guide.html` | ja | 168断食はカロリー計算より本当に痩せるのか？細胞自噬、インスリン仮説からエネルギー赤字の真相まで：リバウンドと筋肉減少の罠を解体する完全ガイド｜GugoPro 代謝内分泌コラム | 168断食はカロリー計算より本当に痩せるのか？細胞自噬、インスリン仮説からエネルギー赤字の真相まで：リバウンドと筋肉減少の罠を解体する完全ガイド（可見（靜態檢查）） | 第1章：168断食（16:8 TRF）の分子生化学機序とノーベル賞理論の淵源 \| 第2章：2大科学陣営の対決：炭水化物-インスリンモデル（CIM）vs. エネルギー平衡モデル（EBM） \| 第3章：168断食の安全限界、コルチゾール急上昇と医学的禁忌 | 233 | 0 |
| 專欄 | `ja/articles/investment/01-compound-interest-guide.html` | ja | 複利効果と時間価値：バランスシートから最初のファイナンシャルシステムを構築するには？ \| GugoPro Academy | 複利効果と時間価値：バランスシートから最初のファイナンシャルシステムを構築するには？（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. 複利公式（複利公式）の詳細な分解 \| 2. インフレ対策と資産価値 | 43 | 9 |
| 專欄 | `ja/articles/investment/02-etf-investing-bible.html` | ja | インデックス投資バイブル：台湾 0050/006208 vs 米国 VTI/VOO/QQQ 完全解析 \| GugoPro Academy | インデックス投資バイブル：台湾 0050/006208 vs 米国 VTI/VOO/QQQ 完全解析（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. 台湾株と米国株の人気 ETF の基本的なファンダメンタル比較 \| 2. 費用率：長期リターンを左右する決定要因 | 63 | 9 |
| 專欄 | `ja/articles/investment/03-asset-allocation-rebalancing.html` | ja | 資産配分と動的リバランス：目標ウェイトから取引摩擦まで｜GugoPro Academy | 資産配分と動的リバランス： 目標ウェイトを実行可能な意思決定ルールにする。（可見（靜態檢查）） | まず結論を見る。 \| まず目標を定義し、その後株式と債券の比率を議論する。 \| 資産の数が多いことは必ずしも真の分散を意味しません。 | 88 | 17 |
| 專欄 | `ja/articles/investment/04-brokerage-comparison.html` | ja | 米国ブローカー口座開設完全ガイド：台湾の複委託 vs 海外ブローカー \| GugoPro Academy | 米国ブローカー口座開設完全ガイド：台湾の複委託 vs 海外ブローカー（Firstrade、IB、Schwab）比較（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. 米国ブローカーの主要比較表 \| 2. 見えないコスト：電信送金と為替レート | 63 | 9 |
| 專欄 | `ja/articles/investment/05-fundamental-valuation-metrics.html` | ja | ファンダメンタル評価指標：P/E、P/B、ROE \| GugoPro Academy | ファンダメンタル評価指標：P/E（株価収益率）、P/B（株価純資産倍率）、ROEの正しい読み方（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. 主要なバリュエーション指標の解析 \| 2. 「高配当利回りの罠」に注意する | 61 | 9 |
| 專欄 | `ja/articles/investment/06-sharpe-mdd-risk-control.html` | ja | リスクリターンと最大ドローダウン分析：Sharpe、Sortino、Calmar 実装ガイド｜GugoPro Academy | リスクリターンと最大ドローダウンの分析（可見（靜態檢查）） | 1. まず「リスク／リターン比」の二つの世界を分解すること \| 2. 価格系列を比較可能なリターンに変換する \| 3. 最大ドローダウン：エクイティ曲線全体で最も深い穴を探す | 108 | 10 |
| 專欄 | `ja/articles/investment/07-fire-4-percent-rule.html` | ja | 【退職金プラン】FIRE ムーブメントと 4% ルールとは？引き出し率と退職資金の不足額の計算方法 \| GugoPro Academy | 【退職金プラン】FIRE ムーブメントと 4% ルールとは？引き出し率と退職資金の不足額の計算方法（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. FIRE ムーブメントの起源と核となる哲学 \| 2. 4%ルールの科学的由来：Trinity Study（トリニティ研究） | 85 | 10 |
| 專欄 | `ja/articles/investment/08-overseas-tax-guide.html` | ja | 【節税と確定申告】米国株投資はどう申告するか？海外所得 750 萬 の免税枠と 30% 配当源泉徴収の実務 \| GugoPro Academy | 【節税と確定申告】米国株投資はどう申告するか？海外所得 750 萬 の免税枠と 30% 配当源泉徴収の実務（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. 台湾における海外所得申告ルールと 750 萬 の免税枠 \| 2. 米国株：配当の30%源泉徴収とW‑8BENフォームの解説 | 87 | 9 |
| 專欄 | `ja/articles/investment/09-high-dividend-etf-trap.html` | ja | 【高配当 ETF 評価】台湾上場 ETF 00878/00919/00929 vs 米国 ETF SCHD：高配当利回りの罠を解くと総リターンの真実が見える \| GugoPro Academy | 【高配当 ETF 評価】台湾上場 ETF 00878/00919/00929 vs 米国 ETF SCHD：高配当利回りの罠を解くと総リターンの真実が見える（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. 高配当 ETF の運用実態と配当利回りにまつわる誤解 \| 2. 人気の台湾高配当ETF徹底比較（00878 vs 00919 vs 00929） ETF | 98 | 9 |
| 專欄 | `ja/articles/investment/10-bond-investing-guide.html` | ja | 【債券投資ガイド】米国債 (TLT/IEF) vs 投資適格社債 (LQD)：利下げサイクルにおける資産配分戦略 \| GugoPro Academy | 【債券投資ガイド】米国債 (TLT/IEF) vs 投資適格社債 (LQD)：利下げサイクルにおける資産配分戦略（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. 債券の基本：デュレーションと金利感応度 \| 2. 主要3銘柄の債券ETF徹底比較（TLT vs IEF vs LQD） ETF | 70 | 10 |
| 專欄 | `ja/articles/investment/11-brokerage-deep-review.html` | ja | 【海外証券会社評価大全】IB（盈透／Interactive Brokers）、Firstrade、Charles Schwab（嘉信理財）─ 長所・短所、安全性と隠れたコスト比較 \| GugoPro Academy | 【海外証券会社評価大全】IB（盈透／Interactive Brokers）、Firstrade、Charles Schwab（嘉信理財）─ 長所・短所、安全性と隠れたコスト比較（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. 海外ブローカーの安全防線：SIPC 保険と監督体制 \| 2. 海外主要ブローカー3社の総合比較レビュー | 111 | 9 |
| 專欄 | `ja/articles/investment/12-inflation-hedging-reits-gold.html` | ja | 【ヘッジ資産】金（GLD）と不動産投資信託（REITs）はインフレ対策として資産配分にどう組み込むか？ \| GugoPro Academy | 【ヘッジ資産】金（GLD）と不動産投資信託（REITs）はインフレ対策として資産配分にどう組み込むか？（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. インフレという怪物と伝統的な株債の盲点 \| 2. 金ETF（GLD / IAU）のヘッジ哲学 ETF | 79 | 9 |
| 專欄 | `ja/articles/investment/13-technical-indicators-truth.html` | ja | 【テクニカル分析の真実】移動平均線 (MA)、RSI、MACD は本当に役立つのか？クオンツトレーダーが見るテクニカル指標の有効場面と盲点 \| GugoPro Academy | 【テクニカル分析の真実】移動平均線 (MA)、RSI、MACD は本当に役立つのか？クオンツトレーダーが見るテクニカル指標の有効場面と盲点（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. テクニカル指標の数学的本質と遅行性 \| 2. 主流テクニカル指標の原理と盲点の分解 | 80 | 10 |
| 專欄 | `ja/articles/investment/14-backtesting-overfitting-guide.html` | ja | 【システムトレード】バックテスト (Backtesting/回測) とは？過学習 (Overfitting/過度擬合) と歴史的罠を避ける方法 \| GugoPro Academy | 【システムトレード】バックテスト (Backtesting/回測) とは？過学習 (Overfitting/過度擬合) と歴史的罠を避ける方法（可見（靜態檢查）） | 30秒要点（Key Takeaways） \| 1. バックテスト（回測）の基本概念と重要性 \| 2. バックテストでの最大の致命的な罠：オーバーフィッティング（過剰適合） | 95 | 10 |
| 專欄 | `ja/articles/investment/15-quant-research-workflow.html` | ja | 量的研究ワークフロー：5MAオフセット、ボラティリティのZ‑Score、アウト‑オブ‑サンプルバックテスト｜GugoPro Academy Z-Score | 量的研究ワークフロー： 5MA、ボラティリティ、バックテストを同じ証拠チェーンに組み込む。（可見（靜態檢查）） | まず結論を見る。 \| 1. まず研究課題を反証可能な命題で書くこと \| 2. 5MA／20MAの差引値：まずウィンドウを理解し、その後転換を論じる | 92 | 10 |
| 專欄 | `ja/articles/investment/16-futures-pairs-basis.html` | ja | 臺指期／富台期のペア取引と期現價差：Basisからロールリスクまで｜GugoPro Academy | 臺指期／富台期ペア取引： まず Basis を分解し、その後で裁定について議論する。（可見（靜態檢查）） | まず結論を見る。 \| 1. まず契約仕様と名目単位を揃えること \| 2. Basisと期限構造：スプレッドを検証可能な要素に分解する | 84 | 8 |
| 專欄 | `ja/articles/investment/17-practical-trading.html` | ja | 第13類 実戦取引：取引計画、実行、リスク管理、レビューの完全なナレッジツリー｜GugoPro Academy | 実戦トレーディング： アイデアを実行可能でストップが設定でき、再検討できるプロセスにする。（可見（靜態檢查）） | まずこの分類のコアを確認する。 \| 1. まず市場と銘柄を選ぶこと：取引機会にも実行コストがある \| 2. 取引計画：主観的ナラティブを事前ルールに変える | 89 | 18 |
| 專欄 | `ja/articles/investment/18-trend-following-breakout-playbook.html` | ja | トレンド追跡とブレイクアウト戦略プレイブック：ルール、ポジション、フェイクブレイク、バックテスト検証｜GugoPro Academy | トレンド追跡とブレイクアウト戦略： 自分の「見解」を検証可能なルールに書き換える。（可見（靜態檢查）） | まず5つのコア判断を把握する。 \| 1. まず区別する：トレンドフォロー、ブレイクアウト、モメンタムは同義ではない \| 2. まず市場環境を判断する：同じルールが全ての市場で同じように機能するわけではない | 117 | 21 |
| 首頁 | `ja/articles/investment/index.html` | ja | 投資教育アカデミー \| GugoPro Academy | システム化 投資教育と実戦のマトリクス（可見（靜態檢查）） | 投資リスクに関する免責事項 | 68 | 28 |
| 專欄 | `ja/articles/modern-ziwei-guide.html` | ja | 宿命論とオカルト的脅迫からの脱却：現代心理学で再構築する紫微斗数——十二宮位、四化の動態からAI意思決定反省モデルへ｜GugoPro 意思決定科学コラム | 宿命論とオカルト的脅迫からの脱却：現代心理学で再構築する紫微斗数——十二宮位、四化の動態からAI意思決定反省モデルへ（可見（靜態檢查）） | 第1章：記号論と認知科学：紫微斗数の科学的本質を解明する（脱オカルト・脱脅迫化） \| 第2章：十二宮位と四化星曜の「現代生活情報アーキテクチャ学」 \| 第3章：関係合盤のシステムダイナミクス：「相性の悪さ」の迷信を打破する | 169 | 0 |
| 專欄 | `ja/articles/shadowing-with-ai-tutor.html` | ja | 「話せない英語」にサヨナラ！シャドーイング、CEFR文脈出力、AIチューターによるスピーキング実践ガイド｜GugoPro 言語科学コラム | 「話せない英語」にサヨナラ！シャドーイング、CEFR文脈輸出、AIチューターによるスピーキング実践ガイド（可見（靜態檢查）） | 第一章：認知心理学で解き明かす「話せない英語」の生理的遮断 \| 第二章：シャドーイング（Shadowing）と音声認識による糾偏メカニズム \| 第三章：カスタム教材のインポートとCEFR分級コンテキスト出力 | 146 | 0 |
| 專欄 | `ja/articles/tarot-decision-framework.html` | ja | 迷信的宿命論からの脱却：ユングの「元型」心理学・共時性からAIタロットへ——キャリアの二者択一と関係性不安を解体する構造化意思決定モデル｜GugoPro 意思決定科学コラム | 迷信的宿命論からの脱却：ユングの「元型」心理学・共時性からAIタロットへ——キャリアの二者択一と関係性不安を解体する構造化意思決定モデル（可見（靜態檢查）） | 第1章：記号論と認知心理学：タロットカードの科学的本質を解明する（脱迷信化） \| 第2章：認知バイアスの打破と意思決定工学：タロットスプレッドがいかに理性を再構築するか \| 第3章：問いの認知工学とGugoPro実装コードの機能マッピング | 161 | 0 |
| 專欄 | `ja/articles/tblt-with-ai-tutor.html` | ja | 丸暗記にサヨナラ！タスク型教授法（TBLT）、Robinson認知仮説とAIチューターによる英会話実践ガイド｜GugoPro 言語科学コラム | 丸暗記にサヨナラ！タスク型教授法（TBLT）、Robinson認知仮説とAIチューターによる英会話実践ガイド（可見（靜態檢查）） | 第一章：TBLTの学術的起源と理論基石 \| 第二章：認知心理学メカニズム：Robinson「認知仮説」と認知負荷 \| 第三章：Willis の3段階フレームワークと GugoPro の実装コードマッピング | 184 | 0 |
| 專欄 | `ja/articles/tdee-and-macros-guide.html` | ja | 無駄な食事制限とリバウンドを完全に卒業！熱力学エネルギー収支、適応熱産生からAI食事解析まで：外食派のためのTDEE＆PFCバランス精密調整バイブル｜GugoPro 代謝健康專欄 | 無駄な食事制限とリバウンドを完全に卒業！熱力学エネルギー収支、適応熱産生からAI食事解析まで：外食派のためのTDEE＆PFCバランス精密調整バイブル（可見（靜態檢查）） | 第一章：栄養熱力学と代謝科学：食事制限の幻想とリバウンドの正体 \| 第二章：マクロ栄養素の生化学代謝と食欲制御メカニズム \| 第三章：マルチモーダルAI画像食事解析の「認知的ヒューリスティクス」と誤差制御 | 248 | 0 |
| 專欄 | `ja/articles/travel-translator-guide.html` | ja | スマホの気まずい手渡しにサヨナラ！180°対面反転UIのデザイン美学・HCI空間心理学と海外旅行会話実践ガイド｜GugoPro 異文化コミュニケーションコラム | スマホの気まずい手渡しにサヨナラ！180°対面反転UIのデザイン美学・HCI空間心理学と海外旅行会話実践ガイド（可見（靜態檢查）） | 第1章：異文化コミュニケーションの障壁と「スマホ手渡し」の空間心理学 \| 第2章：HCI（人機相互作用）の視座：単一共有画面の認知工学と入力制御 \| 第3章：語用論（プラグマティクス）と高リスク対話の戦略 | 206 | 0 |
| 專欄 | `ja/articles/weight-loss-planner-guide.html` | ja | 線形減量の幻想からの脱却！Wishnofsky 7700kcal法則の破綻からレジスタンストレーニング期分け・停滞期突破まで：動的減量計画とカロリー赤字完全ガイド｜GugoPro 運動生理学コラム | 線形減量の幻想からの脱却！Wishnofsky 7700kcal法則の破綻からレジスタンストレーニング期分け・停滞期突破まで：動的減量計画とカロリー赤字完全ガイド（可見（靜態檢查）） | 第1章：エネルギー赤字の熱力学と7,700kcalの法則批判：静的仮定の崩壊と動的平衡モデル \| 第2章：減量停滞期の生理学的代償メカニズム：偽性停滞期と真性代謝適応の鑑別 \| 第3章：運動生理学：レジスタンストレーニング、有氧耐力、EPOCアフターバーンの期分け配分 | 229 | 0 |
| 專欄 | `ja/articles/youtube-english-listening-and-shadowing-guide.html` | ja | YouTube英語学習が挫折する真の理由とは？音韻知覚理論、レーベンシュタイン聴解、シャドーイングで母語レベルの聴覚神経回路を構築する完全ガイド｜GugoPro 言語科学コラム | YouTube英語学習が挫折する真の理由とは？音韻知覚理論、 レーベンシュタイン聴解、シャドーイング で母語レベルの聴覚神経回路を構築する完全ガイド（可見（靜態檢查）） | 第一章：認知神経科学の分析：字幕付き動画視聴が非効率な神経学的根拠 \| 第二章：英語音声学と音韻論の解剖：自然な音変化（Connected Speech）の物理特性 \| 第三章：計算言語学とアルゴリズム：レーベンシュタイン・ディクテーション差分エンジン | 161 | 0 |
| 專欄 | `ja/articles/youtube-listening-connected-speech-guide.html` | ja | YouTube英語学習が挫折する真の理由とは？音韻知覚理論、レーベンシュタイン聴解、シャドーイング完全ガイド｜GugoPro 言語科学コラム | YouTube英語学習が挫折する真の理由とは？音韻知覚理論、 レーベンシュタイン聴解、シャドーイング で母語レベルの聴覚神経回路を構築する完全ガイド（可見（靜態檢查）） | 第一章：認知神経科学の分析：字幕付き動画視聴が非効率な神経学的根拠 \| 第二章：英語音声学と音韻論の解剖：自然な音変化（Connected Speech）の物理特性 \| 第三章：計算言語学とアルゴリズム：レーベンシュタイン・ディクテーション差分エンジン | 170 | 0 |
| 專欄 | `ja/articles/youtube-sequel-tracker-guide.html` | ja | 2026年YouTube動画推薦アルゴリズムとシリーズ検索完全ガイド：推薦漏れを解消しNLP正規表現ノイズ除去と差分照合で跨チャンネル追跡を実現する｜GugoPro ストリーミング研究コラム | 2026年YouTube動画推薦アルゴリズムとシリーズ検索完全ガイド：推薦漏れを解消し NLP正規表現ノイズ除去と差分照合 で跨チャンネル追跡を実現する（可見（靜態檢查）） | 第一章：YouTube推薦アルゴリズムの深層構造と「連載推薦漏れ」の構造的原因 \| 第二章：情報検索（IR）と自然言語処理（NLP）によるタイトルノイズ除去工学 \| 第三章：サーバーレス環境における「ローカル差分メモリ」とプライバシー保護 | 224 | 0 |
| 法規 | `ja/legal/about.html` | ja | GugoProについて \| GugoPro | GugoProについて（可見（靜態檢查）） | What GugoPro provides \| Our quality approach | 118 | 5 |
| 法規 | `ja/legal/contact.html` | ja | お問い合わせ \| GugoPro | お問い合わせ（可見（靜態檢查）） | Official contact \| Privacy and correction requests | 120 | 5 |
| 法規 | `ja/legal/disclaimer.html` | ja | 免責事項 \| GugoPro | 免責事項（可見（靜態檢查）） | General information \| Finance, health and other sensitive topics \| External services | 142 | 5 |
| 法規 | `ja/legal/privacy.html` | ja | プライバシーポリシー \| GugoPro | プライバシーポリシー（可見（靜態檢查）） | 1. Information and purpose \| 2. Cookies, Analytics and advertising \| 3. Local processing and external services | 136 | 5 |
| 法規 | `ja/legal/terms.html` | ja | 利用規約 \| GugoPro | 利用規約（可見（靜態檢查）） | 1. Acceptance and permitted use \| 2. Educational and general information \| 3. Availability and limitations | 129 | 5 |
| 工具 | `ja/tools/ai/english-speaking-tutor.html` | ja | リダイレクト中 - AI多言語スピーキングチューター \| GugoPro | （缺失） | AI多言語スピーキングチューター へ移動しています... | 0 | 0 |
| 工具 | `ja/tools/ai/realtime-translator.html` | ja | リダイレクト中 - 対面型リアルタイム音声翻訳 \| GugoPro | （缺失） | 対面型リアルタイム音声翻訳 へ移動しています... | 0 | 0 |
| 工具 | `ja/tools/ai/tarot-master.html` | ja | リダイレクト中 - AIタロットマスター \| GugoPro | （缺失） | AIタロットマスター へ移動しています... | 0 | 0 |
| 工具 | `ja/tools/ai/ziwei-astrology.html` | ja | リダイレクト中 - AI紫微斗数マスター \| GugoPro | （缺失） | AI紫微斗数マスター へ移動しています... | 0 | 0 |
| 工具 | `ja/tools/ai-media/ai-video-tracker.html` | ja | リダイレクト中 - YouTube続編追跡 \| GugoPro | （缺失） |  | 0 | 0 |
| 工具 | `ja/tools/english/l-player-study.html` | ja | リダイレクト中 - YouTube学習プレイヤー \| GugoPro | （缺失） |  | 0 | 0 |
| 工具 | `ja/tools/health/tdee-macros-calculator.html` | ja | リダイレクト中 - AI栄養士 \| GugoPro | （缺失） |  | 0 | 0 |
| 工具 | `ja/tools/health/weight-loss-planner.html` | ja | リダイレクト中 - AI減量コーチ \| GugoPro | （缺失） |  | 0 | 0 |
| 法規 | `privacy.html` | zh-TW | 隱私權政策｜GugoPro | 隱私權政策（可見（靜態檢查）） | 1. 瀏覽器中的設定與內容 \| 2. 依功能而異的第三方服務 \| 3. 網站交付、分析與廣告 | 60 | 7 |
| 其他 | `quant/pine-script-basics.html` | zh-TW | Unit 4.2: TradingView Pine Script 程式交易入門 \| GugoPro 財經教學學院 | TradingView Pine Script 程式交易入門與指標開發（可見（靜態檢查）） | 1. 什麼是 Pine Script？ \| 2. Pine Script 的兩大運行模式 \| 3. 實戰：編寫您的第一個 Pine 均線策略 | 32 | 18 |
| 其他 | `support.html` | zh-TW | GugoPro｜贊助支持 | 支持 GugoPro（可見（靜態檢查）） |  | 22 | 8 |
| 法規 | `terms.html` | zh-TW | 服務條款｜GugoPro | 服務條款（可見（靜態檢查）） | 1. 條款接受與更新 \| 2. 工具輸出與專業限制 \| 3. AI 與第三方服務 | 49 | 9 |
| 工具 | `tools/ai/english-speaking-tutor.html` | zh-TW | AI多國語言對話導師 | （缺失） | 使用說明與常見問題 | 65 | 11 |
| 工具 | `tools/ai/gemini-api-quota.html` | zh-TW | Gemini API 配額服務導覽｜GugoPro | Gemini API 配額服務導覽（可見（靜態檢查）） | 查看配額時可核對的項目 \| 使用前注意 \| 常見問題 | 61 | 0 |
| 工具 | `tools/ai/nutritionist.html` | zh-TW | AI 專屬營養師｜AI 營養諮詢、TDEE 與飲食紀錄工具、免安裝與隱私說明 - GugoPro | （缺失） | AI 專屬營養師：運作機制與隱私解析 \| AI 專屬營養師: mechanism and privacy \| AI 專屬營養師：仕組みとプライバシー | 50 | 4 |
| 工具 | `tools/ai/realtime-translator.html` | zh-TW | 面對面旅遊對話翻譯｜出國旅遊即時翻譯與雙向語音對話｜GugoPro | 面對面旅遊對話翻譯：出國旅遊即時翻譯與雙向語音對話（可見（靜態檢查）） | 一、手機雙向翻譯如何運作？ \| 二、四個為旅途中實際對話設計的優點 \| 三、出國旅遊即時翻譯：五步驟操作指南 | 82 | 7 |
| 工具 | `tools/ai/tarot-master.html` | zh-TW | AI 塔羅大師｜五種塔羅牌陣、提問指南與自我反思 - GugoPro | （缺失） | AI 塔羅大師：牌陣選擇、提問心法與實戰指南 \| AI Tarot Master: A Practical Guide to Spreads, Questions, and Reflection \| AI タロットマスター：スプレッドの選び方・質問のコツ・実践ガイド | 63 | 11 |
| 工具 | `tools/ai/ziwei-astrology.html` | zh-TW | AI 紫微斗數大師｜紫微斗數線上排盤資料整理與十二宮位指南 - GugoPro | 把命盤問題，整理成可行動的洞察（可見（靜態檢查）） | 排盤輸入輔助 \| 未來三年流年合盤軌跡 \| 年度流年四化與化忌提醒 | 70 | 9 |
| 工具 | `tools/ai-media/ai-video-tracker.html` | zh-TW | YouTube 續集與新季追蹤器 - GugoPro | YouTube 續集與新季追蹤器（可見（靜態檢查）） | YouTube 續集與新季 追蹤器 \| 📺 已追蹤影集 0 \| 不再漏看分散在不同頻道的下一季 | 112 | 0 |
| 工具 | `tools/compound-interest.html` | zh-TW | Compound Interest 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 進階複利與退休目標規劃計算機（可見（靜態檢查）） | 高殖利率複利與退休規劃計算機：公式、假設與使用教學 \| Compound Interest 線上工具：運作機制與隱私解析 \| Compound Interest 線上工具: how it works and privacy | 62 | 16 |
| 工具 | `tools/english/l-player-study.html` | zh-TW | 【AB English Podcast】Ep.1 自我介紹與日常社交對話 (Mia & Alex)｜L-Player | YouTube 影音「聽・寫・口說」多國語言跟讀器（疑似隱藏） | 多語言字幕時間軸 \| 把真實影音變成可重複的聽說訓練閉環 \| 使用播放器時的深度 FAQ | 74 | 7 |
| 工具 | `tools/etf-dividend-calculator.html` | zh-Hant | Etf Dividend Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 把配息拆成一條， 看得懂的現金流曲線。（可見（靜態檢查）） | 建立你的投入假設 \| 現金流與資產比較 \| 再投入 vs. 領出現金 | 68 | 13 |
| 工具 | `tools/finance/kelly-criterion-calculator.html` | zh-TW | Kelly Criterion Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 凱利公式與資金控管模擬器（可見（靜態檢查）） | 為什麼專業交易員都選擇半凱利 (Half Kelly)？ \| 如何在股票交易中利用停損停利%計算凱利部位 \| 蒙特卡羅模擬如何幫你預測最大回撤 | 71 | 1 |
| 工具 | `tools/finance/sports-hedging-calculator.html` | zh-TW | Sports Hedging Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 運動彩券賠率換算與套利對沖計算器（可見（靜態檢查）） | 模組一：賠率與隱含勝率雙向換算器 \| 模組二：對沖與套利計算器 \| 操作教學與知識指南 | 70 | 1 |
| 工具 | `tools/games/mahjong-waits-calculator.html` | zh-Hant | Mahjong Waits Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 麻將聽牌張數與進張勝率計算器（可見（靜態檢查）） | 目前手牌 \| 牌面選擇器（點選加入手牌） \| 死牌 / 河牌標記（已出現的牌） | 69 | 1 |
| 工具 | `tools/games/poker-odds-calculator.html` | zh-TW | Poker Odds Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 德州撲克即時勝率計算器 Texas Hold'em Odds Calculator（可見（靜態檢查）） | 如何使用德州撲克勝率計算器？ \| Poker Odds Calculator 線上工具：運作機制與隱私解析 \| Poker Odds Calculator 線上工具: how it works and privacy | 66 | 1 |
| 工具 | `tools/gaming/gacha-odds-calculator.html` | zh-Hant | Gacha Odds Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | Gacha Odds & Pity Simulator v5（可見（靜態檢查）） | Gacha Odds Calculator 線上工具：運作機制與隱私解析 \| Gacha Odds Calculator 線上工具: how it works and privacy \| Gacha Odds Calculator 線上工具：仕組みとプライバシー | 66 | 1 |
| 工具 | `tools/health/tdee-macros-calculator.html` | zh-TW | AI 專屬營養師 \| GugoPro | （缺失） | TDEE、BMR 與三大營養素：從拍餐到每日飲食規劃 | 58 | 10 |
| 工具 | `tools/health/weight-loss-planner.html` | zh-TW | AI減肥瘦身教練｜科學減脂與熱量赤字規劃 \| GugoPro | （缺失） | AI減肥瘦身教練：科學減脂、熱量赤字與體態追蹤指南 | 52 | 10 |
| 工具 | `tools/pdf/pdf-suite.html` | zh-TW | PDF 全能工作站｜免安裝線上閱讀、合併、分割與標註、零檔案外洩 - GugoPro | 先選擇要處理的文件（可見（靜態檢查）） | 拖入文件，立即開始 \| PDF 全能工作站：運作機制與隱私解析 \| PDF 全能工作站: how it works and privacy | 38 | 10 |
| 工具 | `tools/poker/poker-odds-calculator.html` | zh-TW | Poker Odds Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 德州撲克即時勝率計算器 Texas Hold'em Odds Calculator（可見（靜態檢查）） | 如何使用德州撲克勝率計算器？ \| Poker Odds Calculator 線上工具：運作機制與隱私解析 \| Poker Odds Calculator 線上工具: how it works and privacy | 66 | 1 |
| 工具 | `tools/realestate-amortization.html` | zh-Hant | Realestate Amortization 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 房貸本息攤還、利息與提前還款工具（可見（靜態檢查）） | 輸入與查證條件 \| 結果視覺化與可驗證路徑 \| 怎麼使用與限制 | 68 | 15 |
| 工具 | `tools/risk-reward-calculator.html` | zh-Hant | Risk Reward Calculator 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 先看即時價格，再決定風險。（可見（靜態檢查）） | K 線與風報比原生價格線圖表 \| 全市場風報比智慧掃描器 \| 最近支撐與壓力 | 67 | 14 |
| 工具 | `tools/tradingview-guide.html` | zh-TW | Tradingview Guide 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 全球最強圖表工具 TradingView（可見（靜態檢查）） | 🌟 為什麼全球交易員都用 TradingView？ \| 📝 簡單 4 步：註冊與優惠領取教學 \| TradingView 註冊與實戰教學指南：公式、假設與使用教學 | 62 | 12 |
| 工具 | `tools/tutorials/how-to-get-gemini-api-key.html` | zh-TW | Gemini API Key 申請教學｜Google Gemini API Key 取得與安全設定教學、免安裝與隱私說明 - GugoPro | Google Gemini API Key 1 分鐘快速申請步驟（可見（靜態檢查）） | 更多關於 Gemini API Key 的資訊 \| Gemini API Key 申請教學：運作機制與隱私解析 \| Gemini API Key 申請教學: mechanism and privacy | 61 | 1 |
| 工具 | `tools/tw-market/taiwan-pair-trading.html` | zh-Hant-TW | Taiwan Pair Trading 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 台灣股票與期貨 配對交易掃描工作站（可見（靜態檢查）） | 今日精選配對套利雷達榜 \| 配對交易與均值回歸：從統計關係到風險控制 \| Taiwan Pair Trading 線上工具：運作機制與隱私解析 | 64 | 4 |

## 完整欄位檔案

- CSV：`seo_inventory_report.csv`（UTF-8-SIG；含描述、關鍵字、錨點及文章→工具連結明細）
