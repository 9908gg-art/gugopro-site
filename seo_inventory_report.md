# 全站 SEO 版位盤點報告

- 掃描範圍：`/home/ubuntu/gugopro-site` 下所有 HTML（排除 `.git`、備份目錄與 `node_modules`）
- 掃描時間：本次執行
- HTML 總數：79
- 分類統計：首頁 3；工具 12；專欄 57；法規 5；其他 2

> 「疑似隱藏」依 HTML inline style、class/id 名稱及簡單內嵌 CSS 規則判斷；不會完整解析外部 CSS、媒體查詢或執行 JavaScript。錨點與工具頁關聯亦為路徑規則啟發式檢查，需人工確認語意對應。

## 重大異常摘要

- 缺少 H1：5 頁
- H1 疑似隱藏：1 頁
- 專欄沒有偵測到指向工具目錄的站內連結：57 / 57 篇
- 命中指定弱錨點詞：0 處
- Title 與 H1 文字未互相包含：20 頁

### 缺少 H1
- `googled0dfad57039c64f6.html`
- `tools/ai/english-speaking-tutor.html`
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
- `en/articles/fatty-liver-and-mediterranean-diet-guide.html`
- `en/articles/gemini-api-free-tier-and-developer-guide.html`
- `en/articles/how-to-master-tarot-guide.html`
- `en/articles/how-to-master-ziwei-guide.html`
- `en/articles/intermittent-fasting-and-calorie-deficit-guide.html`
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
- `ja/articles/fatty-liver-and-mediterranean-diet-guide.html`
- `ja/articles/gemini-api-free-tier-and-developer-guide.html`
- `ja/articles/how-to-master-tarot-guide.html`
- `ja/articles/how-to-master-ziwei-guide.html`
- `ja/articles/intermittent-fasting-and-calorie-deficit-guide.html`
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
- `articles/youtube-english-listening-and-shadowing-guide.html`：Title=`解鎖 YouTube 雙語精聽與影子跟讀：L-Player 零摩擦學習系統操作全書與神經聽覺重塑指南｜GugoPro 語言科學專欄`；H1=`解鎖 YouTube 雙語精聽與影子跟讀： L-Player 零摩擦學習系統操作全書與神經聽覺重塑指南`
- `articles/youtube-listening-connected-speech-guide.html`：Title=`看 YouTube 學英文為何總是無效？結合音韻知覺理論、Levenshtein 聽寫差量比對與影子跟讀（Shadowing）打造母語聽覺神經迴路全指南｜GugoPro 語言科學專欄`；H1=`看 YouTube 學英文為何總是無效？結合音韻知覺理論、 Levenshtein 聽寫差量比對與影子跟讀（Shadowing） 打造母語聽覺神經迴路全指南`
- `articles/youtube-sequel-tracker-guide.html`：Title=`2026 YouTube 影音演算法與連載檢索全指南：如何破解推薦漏片迷思、利用 NLP 正則去噪與差量比對打造跨頻道追劇閉環｜GugoPro 串流媒體研究專欄`；H1=`2026 YouTube 影音演算法與連載檢索全指南：如何破解推薦漏片迷思、利用 NLP 正則去噪與差量比對 打造跨頻道追劇閉環`
- `disclaimer.html`：Title=`免責聲明｜GugoPro 工具與 AI 服務使用限制`；H1=`GugoPro 免責聲明`
- `en/articles/amazon-ai-product-research-guide.html`：Title=`2026 Cross-Border E-Commerce & Global Sourcing Master Guide: Leveraging AI Semantic Reverse Engineering for Amazon Product Research, Negative Review Mining, and Listing Matrix Architecture | GugoPro Strategy Column`；H1=`2026 Cross-Border E-Commerce & Global Sourcing Master Guide: Leveraging AI Semantic Reverse Engineering for Amazon Product Research, Negative Review Mining, and Listing Keyword Matrix Architecture`
- `en/articles/how-to-master-tarot-guide.html`：Title=`How to Become a Tarot Master? From Rote Memorization to Intuitive Flow Reading: A Deliberate Practice Guide Combining Classical Semiotics, Narrative Psychology, and AI Collaboration | GugoPro Decision Science Column`；H1=`How to Become a Tarot Master? From Rote Memorization to "Intuitive Flow Reading": A Comprehensive Deliberate Practice Guide Combining Classical Semiotics, Narrative Psychology, and AI Collaboration`
- `en/articles/how-to-master-ziwei-guide.html`：Title=`How to Become a Ziwei Astrology Master? From Rote Memorization to Dynamic Pattern Reading: A Deliberate Practice Guide Combining Cultural Semiotics, System Dynamics, and AI Collaboration | GugoPro Decision Science Column`；H1=`How to Become a Ziwei Astrology Master? From Rote Memorization of 108 Stars to "Dynamic Pattern Reading": A Deliberate Practice Guide Combining Cultural Semiotics, System Dynamics, and AI Collaboration`
- `en/articles/youtube-listening-connected-speech-guide.html`：Title=`Why Watching YouTube Fails for English Learning: Speech Perception, Levenshtein Dictation Diff, and Shadowing Guide | GugoPro Language Science`；H1=`Why Watching YouTube Fails for English Learning: Building Native Auditory Circuits via Speech Perception, Levenshtein Dictation Diff, and Shadowing`
- `ja/articles/how-to-master-tarot-guide.html`：Title=`タロットマスターへの道：78枚の丸暗記を脱し「直観的フロー・リーディング」へ——古典記号論、ナラティブ心理学、AI協同による限界的練習完全ガイド｜GugoPro 意思決定科学コラム`；H1=`如何にしてタロットマスターとなるか？ 78枚の意味の丸暗記から「直観的フロー・リーディング」へ：古典記号論・ナラティブ心理学・AI協同による限界的練習完全手引`
- `ja/articles/shadowing-with-ai-tutor.html`：Title=`「話せない英語」にサヨナラ！シャドーイング、CEFR文脈出力、AIチューターによるスピーキング実践ガイド｜GugoPro 言語科学コラム`；H1=`「話せない英語」にサヨナラ！シャドーイング、CEFR文脈輸出、AIチューターによるスピーキング実践ガイド`
- `ja/articles/youtube-english-listening-and-shadowing-guide.html`：Title=`YouTube英語学習が挫折する真の理由とは？音韻知覚理論、レーベンシュタイン聴解、シャドーイングで母語レベルの聴覚神経回路を構築する完全ガイド｜GugoPro 言語科学コラム`；H1=`YouTube英語学習が挫折する真の理由とは？音韻知覚理論、 レーベンシュタイン聴解、シャドーイング で母語レベルの聴覚神経回路を構築する完全ガイド`
- `ja/articles/youtube-listening-connected-speech-guide.html`：Title=`YouTube英語学習が挫折する真の理由とは？音韻知覚理論、レーベンシュタイン聴解、シャドーイング完全ガイド｜GugoPro 言語科学コラム`；H1=`YouTube英語学習が挫折する真の理由とは？音韻知覚理論、 レーベンシュタイン聴解、シャドーイング で母語レベルの聴覚神経回路を構築する完全ガイド`
- `ja/articles/youtube-sequel-tracker-guide.html`：Title=`2026年YouTube動画推薦アルゴリズムとシリーズ検索完全ガイド：推薦漏れを解消しNLP正規表現ノイズ除去と差分照合で跨チャンネル追跡を実現する｜GugoPro ストリーミング研究コラム`；H1=`2026年YouTube動画推薦アルゴリズムとシリーズ検索完全ガイド：推薦漏れを解消し NLP正規表現ノイズ除去と差分照合 で跨チャンネル追跡を実現する`
- `tools/ai/realtime-translator.html`：Title=`面對面旅遊對話翻譯｜出國旅遊即時翻譯與雙向語音對話｜GugoPro`；H1=`面對面旅遊對話翻譯：出國旅遊即時翻譯與雙向語音對話`
- `tools/ai/ziwei-astrology.html`：Title=`AI 紫微斗數大師｜紫微斗數線上排盤資料整理與十二宮位指南 - GugoPro`；H1=`把命盤問題，整理成可行動的洞察`
- `tools/english/l-player-study.html`：Title=`【AB English Podcast】Ep.1 自我介紹與日常社交對話 (Mia & Alex)｜L-Player`；H1=`YouTube 影音「聽・寫・口說」多國語言跟讀器`
- `tools/pdf/pdf-suite.html`：Title=`PDF 全能工作站｜免安裝線上閱讀、合併、分割與標註、零檔案外洩 - GugoPro`；H1=`先選擇要處理的文件`
- `tools/tutorials/how-to-get-gemini-api-key.html`：Title=`Gemini API Key 申請教學｜Google Gemini API Key 取得與安全設定教學、免安裝與隱私說明 - GugoPro`；H1=`Google Gemini API Key 1 分鐘快速申請步驟`
- `tools/tw-market/taiwan-pair-trading.html`：Title=`Taiwan Pair Trading 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro`；H1=`台灣股票與期貨 配對交易掃描工作站`

## 各頁 SEO 欄位清單

| 分類 | 檔案 | 語系 | Title | H1（狀態） | 前三個 H2 | Description 字數 | 站內連結數 |
|---|---|---|---|---|---|---:|---:|
| 其他 | `404.html` | zh-TW | 頁面不存在｜GugoPro | 頁面不存在或已搬移（可見（靜態檢查）） |  | 0 | 1 |
| 法規 | `about.html` | zh-TW | 關於 GugoPro｜AI、影音學習與瀏覽器工具 | 關於 GugoPro（可見（靜態檢查）） | 多國語言對話與口說練習 \| YouTube 追蹤與影音學習 \| 文件處理與 AI 輔助 | 58 | 7 |
| 專欄 | `articles/affective-filter-with-ai-tutor.html` | zh-TW | 克服開口恐懼的心理學解方：克拉申「情意濾網假說」、外語焦慮（FLA）與 AI 導師的零壓力口說閉環｜GugoPro 語言學習專欄 | 克服開口恐懼的心理學解方：克拉申「情意濾網假說」、外語焦慮（FLA）與 AI 導師的零壓力口說閉環（可見（靜態檢查）） | 第一章：情意濾網假說與外語焦慮（FLA）的學術起源與心理機制 \| 第二章：神經科學與人機互動（HCI）視角：為什麼面對「真人」會大腦空白，而 AI 能實現「零濾網」？ \| 第三章：情意降濾與心理支架如何與 GugoPro 實體代碼深度映射 | 177 | 0 |
| 專欄 | `articles/amazon-ai-product-research-guide.html` | zh-TW | 2026 跨境電商與高階海淘全指南：如何利用 AI 語意反向工程打造 Amazon 爆款選品、競品差評痛點挖掘與 Listing 關鍵字佈局矩陣｜GugoPro 電商戰略專欄 | 2026 跨境電商與高階海淘全指南：如何利用 AI 語意反向工程打造 Amazon 爆款選品、競品差評痛點挖掘與 Listing 關鍵字佈局矩陣（可見（靜態檢查）） | 第一章：電商搜尋演算法演進與 AI 語意反向工程 \| 第二章：VOC（客戶聲音）數據挖掘與競品差評逆向研發 \| 第三章：Listing 標題與後台關鍵字（Search Terms）的高轉化佈局矩陣 | 210 | 0 |
| 專欄 | `articles/carb-cycling-and-home-workout-guide.html` | zh-TW | 碳水循環法（Carb Cycling）怎麼吃最減脂？高低碳日生化機制、居家無器材燃脂課表與防止掉肌肉全攻略｜GugoPro 減脂運動生理學專欄 | 碳水循環法（Carb Cycling）怎麼吃最減脂？高低碳日生化機制、居家無器材燃脂課表與防止掉肌肉全攻略（可見（靜態檢查）） | 第一章：碳水循環法（Carb Cycling）的運動生理學與內分泌調控機制 \| 第二章：運動生理學：居家無器材訓練如何達到「增肌減脂／防掉肌肉」？ \| 第三章：GugoPro 居家燃脂課表與碳水循環的「週期化完美咬合」 | 207 | 0 |
| 專欄 | `articles/diabetes-and-insulin-resistance-guide.html` | zh-TW | 糖尿病前期與胰島素阻抗怎麼吃？從升糖指數（GI/GL）、碳水計數到 AI 拍餐：告別血糖震盪的巨量營養素調控全指南｜GugoPro 慢病代謝專欄 | 糖尿病前期與胰島素阻抗怎麼吃？從升糖指數（GI/GL）、碳水計數到 AI 拍餐：告別血糖震盪的巨量營養素調控全指南（可見（靜態檢查）） | 第一章：胰島素阻抗（Insulin Resistance）與血糖震盪的分子生化機制 \| 第二章：營養學武器庫：升糖指數（GI）、升糖負荷（GL）與碳水化合物計數法 \| 第三章：GugoPro AI 拍餐辨識在「控糖防禦」中的實戰應用與 YMYL 醫療免責規範 | 194 | 0 |
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
| 專欄 | `en/articles/fatty-liver-and-mediterranean-diet-guide.html` | en | What to Eat for Fatty Liver: Low-Carb vs. Mediterranean Diet? From Reversing Hepatic Steatosis & Visceral Fat to Optimal Macronutrient Ratios: The Dining-Out Longevity Handbook \| GugoPro Liver Metabolism Column | What to Eat for Fatty Liver: Low-Carb vs. Mediterranean Diet? From Reversing Hepatic Steatosis & Visceral Fat to Optimal Macronutrient Ratios: The Dining-Out Longevity Handbook（可見（靜態檢查）） | Chapter 1: The Molecular Pathophysiology of Steatotic Liver Disease (MASLD / NAFLD) and Visceral Fat \| Chapter 2: The Longevity Dietary Showdown: Low-Carb vs. Mediterranean Diet \| Chapter 3: Auditing Pro-inflammatory Seed Oils and Sourcing Clean Lipids | 473 | 0 |
| 專欄 | `en/articles/gemini-api-free-tier-and-developer-guide.html` | en | 2026 Developer Blueprint: Building Zero-Cost Commercial-Grade Apps with Google Gemini Free API & Comprehensive Error Troubleshooting Guide \| GugoPro Cloud Systems Column | 2026 Developer Blueprint: Building Zero-Cost Commercial-Grade Apps with Google Gemini Free API & Comprehensive Error Troubleshooting Guide（可見（靜態檢查）） | Chapter 1: Gemini API Free Tier Quota Mechanics & Biological Clock Physical Constraints \| Chapter 2: Complete HTTP Error Code Topology, Root Causes, and Deterministic Defense Matrix \| Chapter 3: Production-Grade Automatic Failover & High-Availability Architecture | 394 | 0 |
| 專欄 | `en/articles/how-to-master-tarot-guide.html` | en | How to Become a Tarot Master? From Rote Memorization to Intuitive Flow Reading: A Deliberate Practice Guide Combining Classical Semiotics, Narrative Psychology, and AI Collaboration \| GugoPro Decision Science Column | How to Become a Tarot Master? From Rote Memorization to "Intuitive Flow Reading": A Comprehensive Deliberate Practice Guide Combining Classical Semiotics, Narrative Psychology, and AI Collaboration（可見（靜態檢查）） | Chapter 1: Dismantling Rote Memorization: Why Cramming Keywords is the Beginner's Graveyard \| Chapter 2: Classical Semiotic Decoding: Four Elements, Numerology, and Court Card Dynamics \| Chapter 3: Spatial Deconstruction & "Flow Reading" Master Techniques | 384 | 0 |
| 專欄 | `en/articles/how-to-master-ziwei-guide.html` | en | How to Become a Ziwei Astrology Master? From Rote Memorization to Dynamic Pattern Reading: A Deliberate Practice Guide Combining Cultural Semiotics, System Dynamics, and AI Collaboration \| GugoPro Decision Science Column | How to Become a Ziwei Astrology Master? From Rote Memorization of 108 Stars to "Dynamic Pattern Reading": A Deliberate Practice Guide Combining Cultural Semiotics, System Dynamics, and AI Collaboration（可見（靜態檢查）） | Chapter 1: Dismantling Rote Memorization: Fragmentation Pitfalls & High-Level Mental Representations \| Chapter 2: Foundational Architecture: 14 Major Star Chunks, Palace Polar Topology, and Trine Geometry \| Chapter 3: Dynamic Energy Fluxes: Reconstructing the Four Transformations & Negative Entropy | 497 | 0 |
| 專欄 | `en/articles/intermittent-fasting-and-calorie-deficit-guide.html` | en | Is 16:8 Intermittent Fasting Really Better Than Counting Calories? From Autophagy and the Insulin Hypothesis to Caloric Deficit Realities: Escaping the Fasting Rebound Trap \| GugoPro Metabolic Science Column | Is 16:8 Intermittent Fasting Really Better Than Counting Calories? From Autophagy and the Insulin Hypothesis to Caloric Deficit Realities: Escaping the Fasting Rebound Trap（可見（靜態檢查）） | Chapter 1: The Molecular Biochemistry of 16:8 Time-Restricted Feeding and Autophagy \| Chapter 2: Scientific Paradigms: The Carbohydrate-Insulin Model (CIM) vs. The Energy Balance Model (EBM) \| Chapter 3: Safety Limits: Cortisol Spikes, Amenorrhea, and Medical Contraindications | 643 | 0 |
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
| 其他 | `googled0dfad57039c64f6.html` |  |  | （缺失） |  | 0 | 0 |
| 首頁 | `index.html` | zh-TW | GugoPro 工具箱｜YouTube 雙語字幕學習、AI 翻譯塔羅、TDEE 減脂計算與 Gemini API 配額監控等 9 款免費工具 | GugoPro 工具箱（可見（靜態檢查）） | 工具分類 \| 核心功能與深度應用手冊 \| 端點安全承諾：先在你的裝置處理 | 194 | 0 |
| 首頁 | `index_en.html` | en | GugoPro Hub \| 9 Free Browser Tools for YouTube Study, AI Translation, Tarot, TDEE & Gemini Quota | GugoPro Hub（可見（靜態檢查）） | Tool Categories \| Core Features & In-Depth Application Manual \| Endpoint Security Commitment: Processed Locally First | 360 | 0 |
| 首頁 | `index_ja.html` | ja | GugoPro ツールボックス｜YouTube 2言語字幕学習、AI 翻訳タロット、TDEE 減脂計算、Gemini API 配額監視など無料ブラウザツール9選 | GugoPro ツールボックス（可見（靜態檢查）） | ツール分類 \| コア機能と詳細応用マニュアル \| エンドポイントセキュリティ：あなたの端末内で最優先処理 | 194 | 0 |
| 專欄 | `ja/articles/affective-filter-with-ai-tutor.html` | ja | 話す恐怖を克服する心理学：クラッシェンの「情意フィルター仮説」、外国語不安（FLA）と AI チューターのゼロ圧力スピーキング完全ガイド｜GugoPro 言語学習コラム | 話す恐怖を克服する心理学：クラッシェンの「情意フィルター仮説」、外国語不安（FLA）と AI チューターのゼロ圧力スピーキング完全ガイド（可見（靜態檢查）） | 第一章：情意フィルター仮説と外国語不安（FLA）の学術的起源と心理メカニズム \| 第二章：神経科学とHCI（ヒューマンコンピュータインタラクション）：なぜ「生身の人間」の前で頭が真っ白になり、AIなら「ゼロフィルター」を実現できるのか？ \| 第三章：情意降下と認知的足場かけが GugoPro の実装コードとどう結びついているか | 221 | 0 |
| 專欄 | `ja/articles/amazon-ai-product-research-guide.html` | ja | 2026 越境EC・高精度リサーチ完全攻略：AIセマンティック・リバースエンジニアリングによるAmazonヒット商品開発、競合低評価（VOC）痛点分析とListingキーワード配置マトリクス｜GugoPro EC戦略コラム | 2026 越境EC・高精度リサーチ完全攻略：AIセマンティック・リバースエンジニアリングによるAmazonヒット商品開発、競合低評価（VOC）痛点分析とListingキーワード配置マトリクス（可見（靜態檢查）） | 第1章：EC検索アルゴリズムの進化とAIセマンティック・リバースエンジニアリング \| 第2章：VOC（顧客の声）データマイニングと競合低評価リバースエンジニアリング \| 第3章：ゴールデンListing設計と検索キーワード（Search Terms）249バイト最適化 | 227 | 0 |
| 專欄 | `ja/articles/carb-cycling-and-home-workout-guide.html` | ja | 炭水化物循環法（カーボサイクル）完全減脂ガイド：高・低炭水化物日の生化学機序、器具不要の自宅燃焼ルーティン、筋分解防止の極意｜GugoPro 運動生理学コラム | 炭水化物循環法（カーボサイクル）完全減脂ガイド：高・低炭水化物日の生化学機序、器具不要の自宅燃焼ルーティン、筋分解防止の極意（可見（靜態檢查）） | 第1章：炭水化物循環法（Carb Cycling）の運動生理学と内分泌調控機序 \| 第2章：運動生理学：自宅自重トレーニングで「筋肉を守りながら脂肪を燃やす」力学 \| 第3章：自宅燃焼課表と炭水化物循環の「期分け同期化」 | 204 | 0 |
| 專欄 | `ja/articles/diabetes-and-insulin-resistance-guide.html` | ja | 糖尿病予備群・インスリン抵抗性の食事法完全ガイド：GI/GL値・カーボカウントからAI写真食事管理まで——血糖値スパイクを防ぐ栄養素調控｜GugoPro 代謝医学コラム | 糖尿病予備群・インスリン抵抗性の食事法完全ガイド：GI/GL値・カーボカウントからAI写真食事管理まで——血糖値スパイクを防ぐ栄養素調控（可見（靜態檢查）） | 第1章：インスリン抵抗性（Insulin Resistance）と血糖値スパイクの分子生化学機序 \| 第2章：栄養学の武器庫：GI値・GL値とカーボカウント法 \| 第3章：AI写真食事解析の実戦とYMYL医療免責ガードレール | 164 | 0 |
| 專欄 | `ja/articles/fatty-liver-and-mediterranean-diet-guide.html` | ja | 脂肪肝を逆転する減糖＆地中海食完全ガイド：内臓脂肪燃焼からPFC黄金比率・外食AI管理まで——MASLDを根本改善する長寿実戦マニュアル｜GugoPro 肝臓代謝コラム | 脂肪肝を逆転する減糖＆地中海食完全ガイド：内臓脂肪燃焼からPFC黄金比率・外食AI管理まで——MASLDを根本改善する長寿実戦マニュアル（可見（靜態檢查）） | 第1章：脂肪肝（MASLD / NAFLD）と内臓脂肪の分子病理メカニズム \| 第2章：長寿抗炎症食の対決：減糖食（Low-Carb）vs. 地中海食（Mediterranean Diet） \| 第3章：外食に潜む促炎症油脂の見破り方と食材調達の最適化 | 206 | 0 |
| 專欄 | `ja/articles/gemini-api-free-tier-and-developer-guide.html` | ja | 2026 開発者完全攻略ハンドブック：Google Gemini 公式無料APIを活用したゼロコスト商用グレードアプリのアーキテクチャ設計とエラー完全トラブルシューティング指南｜GugoPro クラウドシステムコラム | 2026 開発者完全攻略ハンドブック：Google Gemini 公式無料APIを活用したゼロコスト商用グレードアプリのアーキテクチャ設計とエラー完全トラブルシューティング指南（可見（靜態檢查）） | 第1章：Gemini API 無料枠の配額メカニズムと生体時計物理制約 \| 第2章：完全なHTTPエラーコードトポロジー、根本原因と確定性防御マトリクス \| 第3章：プロダクショングレードの自動耐障害フォールバック（Failover）と高可用性アーキテクチャ | 271 | 0 |
| 專欄 | `ja/articles/how-to-master-tarot-guide.html` | ja | タロットマスターへの道：78枚の丸暗記を脱し「直観的フロー・リーディング」へ——古典記号論、ナラティブ心理学、AI協同による限界的練習完全ガイド｜GugoPro 意思決定科学コラム | 如何にしてタロットマスターとなるか？ 78枚の意味の丸暗記から「直観的フロー・リーディング」へ：古典記号論・ナラティブ心理学・AI協同による限界的練習完全手引（可見（靜態檢查）） | 第1章：丸暗記の打破——なぜ単語暗記は初学者の墓場なのか？ \| 第2章：古典記号論の解読：四大元素・生命数秘術・コートカード力学 \| 第3章：空間構造解読と「フロー・リーディング法」 | 145 | 0 |
| 專欄 | `ja/articles/how-to-master-ziwei-guide.html` | ja | 紫微斗数マスターへの道：百の星の丸暗記を脱し「動態格局解盤」へ——文化記号論、システムダイナミクス、AI協同による限界的練習完全ガイド｜GugoPro 意思決定科学コラム | 紫微斗数マスターへの道：百の星の丸暗記を脱し「動態格局解盤」へ——文化記号論、システムダイナミクス、AI協同による限界的練習完全ガイド（可見（靜態檢查）） | 第1章：丸暗記の打破：記号破砕化の罠と高階層心的表象の構築 \| 第2章：基盤構造の解読：十四主星のチャンク化、十二宮対宮トポロジーと三方四正の幾何学 \| 第3章：動態エネルギー流動：十干四化のシステムダイナミクスと負のエントロピー | 199 | 0 |
| 專欄 | `ja/articles/intermittent-fasting-and-calorie-deficit-guide.html` | ja | 168断食はカロリー計算より本当に痩せるのか？細胞自噬、インスリン仮説からエネルギー赤字の真相まで：リバウンドと筋肉減少の罠を解体する完全ガイド｜GugoPro 代謝内分泌コラム | 168断食はカロリー計算より本当に痩せるのか？細胞自噬、インスリン仮説からエネルギー赤字の真相まで：リバウンドと筋肉減少の罠を解体する完全ガイド（可見（靜態檢查）） | 第1章：168断食（16:8 TRF）の分子生化学機序とノーベル賞理論の淵源 \| 第2章：2大科学陣営の対決：炭水化物-インスリンモデル（CIM）vs. エネルギー平衡モデル（EBM） \| 第3章：168断食の安全限界、コルチゾール急上昇と医学的禁忌 | 233 | 0 |
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
| 法規 | `privacy.html` | zh-TW | 隱私權政策｜GugoPro | 隱私權政策（可見（靜態檢查）） | 1. 瀏覽器中的設定與內容 \| 2. 依功能而異的第三方服務 \| 3. 網站交付、分析與廣告 | 60 | 7 |
| 法規 | `terms.html` | zh-TW | 服務條款｜GugoPro | 服務條款（可見（靜態檢查）） | 1. 條款接受與更新 \| 2. 工具輸出與專業限制 \| 3. AI 與第三方服務 | 49 | 9 |
| 工具 | `tools/ai/english-speaking-tutor.html` | zh-TW | AI多國語言對話導師 | （缺失） | 使用說明與常見問題 | 65 | 11 |
| 工具 | `tools/ai/gemini-api-quota.html` | zh-TW | Gemini API 配額服務導覽｜GugoPro | Gemini API 配額服務導覽（可見（靜態檢查）） | 查看配額時可核對的項目 \| 使用前注意 \| 常見問題 | 61 | 0 |
| 工具 | `tools/ai/realtime-translator.html` | zh-TW | 面對面旅遊對話翻譯｜出國旅遊即時翻譯與雙向語音對話｜GugoPro | 面對面旅遊對話翻譯：出國旅遊即時翻譯與雙向語音對話（可見（靜態檢查）） | 一、手機雙向翻譯如何運作？ \| 二、四個為旅途中實際對話設計的優點 \| 三、出國旅遊即時翻譯：五步驟操作指南 | 82 | 7 |
| 工具 | `tools/ai/tarot-master.html` | zh-TW | AI 塔羅大師｜五種塔羅牌陣、提問指南與自我反思 - GugoPro | （缺失） | AI 塔羅大師：牌陣選擇、提問心法與實戰指南 \| AI Tarot Master: A Practical Guide to Spreads, Questions, and Reflection \| AI タロットマスター：スプレッドの選び方・質問のコツ・実践ガイド | 63 | 11 |
| 工具 | `tools/ai/ziwei-astrology.html` | zh-TW | AI 紫微斗數大師｜紫微斗數線上排盤資料整理與十二宮位指南 - GugoPro | 把命盤問題，整理成可行動的洞察（可見（靜態檢查）） | 排盤輸入輔助 \| 未來三年流年合盤軌跡 \| 年度流年四化與化忌提醒 | 70 | 9 |
| 工具 | `tools/ai-media/ai-video-tracker.html` | zh-TW | YouTube 續集與新季追蹤器 - GugoPro | YouTube 續集與新季追蹤器（可見（靜態檢查）） | YouTube 續集與新季 追蹤器 \| 📺 已追蹤影集 0 \| 不再漏看分散在不同頻道的下一季 | 112 | 0 |
| 工具 | `tools/english/l-player-study.html` | zh-TW | 【AB English Podcast】Ep.1 自我介紹與日常社交對話 (Mia & Alex)｜L-Player | YouTube 影音「聽・寫・口說」多國語言跟讀器（疑似隱藏） | 多語言字幕時間軸 \| 把真實影音變成可重複的聽說訓練閉環 \| 使用播放器時的深度 FAQ | 74 | 7 |
| 工具 | `tools/health/tdee-macros-calculator.html` | zh-TW | AI 專屬營養師 \| GugoPro | （缺失） | TDEE、BMR 與三大營養素：從拍餐到每日飲食規劃 | 58 | 10 |
| 工具 | `tools/health/weight-loss-planner.html` | zh-TW | AI減肥瘦身教練｜科學減脂與熱量赤字規劃 \| GugoPro | （缺失） | AI減肥瘦身教練：科學減脂、熱量赤字與體態追蹤指南 | 52 | 10 |
| 工具 | `tools/pdf/pdf-suite.html` | zh-TW | PDF 全能工作站｜免安裝線上閱讀、合併、分割與標註、零檔案外洩 - GugoPro | 先選擇要處理的文件（可見（靜態檢查）） | 拖入文件，立即開始 \| PDF 全能工作站：運作機制與隱私解析 \| PDF 全能工作站: how it works and privacy | 38 | 10 |
| 工具 | `tools/tutorials/how-to-get-gemini-api-key.html` | zh-TW | Gemini API Key 申請教學｜Google Gemini API Key 取得與安全設定教學、免安裝與隱私說明 - GugoPro | Google Gemini API Key 1 分鐘快速申請步驟（可見（靜態檢查）） | 更多關於 Gemini API Key 的資訊 \| Gemini API Key 申請教學：運作機制與隱私解析 \| Gemini API Key 申請教學: mechanism and privacy | 61 | 1 |
| 工具 | `tools/tw-market/taiwan-pair-trading.html` | zh-Hant-TW | Taiwan Pair Trading 線上工具｜免安裝瀏覽器本機處理、零檔案外洩隱私 - GugoPro | 台灣股票與期貨 配對交易掃描工作站（可見（靜態檢查）） | 今日精選配對套利雷達榜 \| 配對交易與均值回歸：從統計關係到風險控制 \| Taiwan Pair Trading 線上工具：運作機制與隱私解析 | 64 | 4 |

## 完整欄位檔案

- CSV：`seo_inventory_report.csv`（UTF-8-SIG；含描述、關鍵字、錨點及文章→工具連結明細）
