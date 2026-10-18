# 全站 SEO 版位盤點報告

- 掃描範圍：`/home/ubuntu/gugopro-site` 下所有 HTML（排除 `.git`、備份目錄與 `node_modules`）
- 掃描時間：本次執行
- HTML 總數：79
- 分類統計：首頁 3；工具 12；專欄 57；法規 5；其他 2

> 「疑似隱藏」依 HTML inline style、class/id 名稱及簡單內嵌 CSS 規則判斷；不會完整解析外部 CSS、媒體查詢或執行 JavaScript。錨點與工具頁關聯亦為路徑規則啟發式檢查，需人工確認語意對應。

## 重大異常摘要

- 缺少 H1：0 頁
- H1 疑似隱藏：1 頁
- 專欄沒有偵測到指向工具目錄的站內連結：57 / 57 篇
- 命中指定弱錨點詞：0 處
- Title 與 H1 文字未互相包含：2 頁

### 缺少 H1
- 無
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
- `disclaimer.html`：Title=`免責聲明｜GugoPro 工具與 AI 服務使用限制`；H1=`GugoPro 免責聲明`

## 各頁 SEO 欄位清單

| 分類 | 檔案 | 語系 | Title | H1（狀態） | 前三個 H2 | Description 字數 | 站內連結數 |
|---|---|---|---|---|---|---:|---:|
| 其他 | `404.html` | zh-TW | 頁面不存在｜GugoPro | 頁面不存在或已搬移（可見（靜態檢查）） |  | 0 | 1 |
| 法規 | `about.html` | zh-TW | 關於 GugoPro｜AI、影音學習與瀏覽器工具 | 關於 GugoPro（可見（靜態檢查）） | 多國語言對話與口說練習 \| YouTube 追蹤與影音學習 \| 文件處理與 AI 輔助 | 58 | 7 |
| 專欄 | `articles/affective-filter-with-ai-tutor.html` | zh-TW | 克服開口恐懼的心理學：克拉申情意濾網假說與 AI 零壓力口說｜GugoPro | 克服外語開口焦慮 (FLA)：情意濾網假說與 AI 導師的零壓力脫敏閉環（可見（靜態檢查）） | 第一章：情意濾網假說與外語焦慮（FLA）的學術起源與心理機制 \| 第二章：神經科學與人機互動（HCI）視角：為什麼面對「真人」會大腦空白，而 AI 能實現「零濾網」？ \| 第三章：情意降濾與心理支架如何與 GugoPro 實體代碼深度映射 | 177 | 0 |
| 專欄 | `articles/amazon-ai-product-research-guide.html` | zh-TW | 2026 Amazon 跨境選品全指南：AI 語意反向工程與差評痛點挖掘｜GugoPro | 跨境電商 Amazon AI 爆款選品指南：利用語意反向工程與差評痛點逆向研發（可見（靜態檢查）） | 第一章：電商搜尋演算法演進與 AI 語意反向工程 \| 第二章：VOC（客戶聲音）數據挖掘與競品差評逆向研發 \| 第三章：Listing 標題與後台關鍵字（Search Terms）的高轉化佈局矩陣 | 210 | 0 |
| 專欄 | `articles/carb-cycling-and-home-workout-guide.html` | zh-TW | 碳水循環法怎麼吃？高低碳日生化機制與居家燃脂課表全攻略｜GugoPro | 碳水循環法 (Carb Cycling) 減脂攻略：高低碳日生化機制與增肌防掉肉課表（可見（靜態檢查）） | 第一章：碳水循環法（Carb Cycling）的運動生理學與內分泌調控機制 \| 第二章：運動生理學：居家無器材訓練如何達到「增肌減脂／防掉肌肉」？ \| 第三章：GugoPro 居家燃脂課表與碳水循環的「週期化完美咬合」 | 207 | 0 |
| 專欄 | `articles/diabetes-and-insulin-resistance-guide.html` | zh-TW | 糖尿病前期與胰島素阻抗怎麼吃？GI/GL 值與碳水計數全指南｜GugoPro | 糖尿病前期與胰島素阻抗飲食指南：從升糖指數 (GI/GL) 到進食順序控糖（可見（靜態檢查）） | 第一章：胰島素阻抗（Insulin Resistance）與血糖震盪的分子生化機制 \| 第二章：營養學武器庫：升糖指數（GI）、升糖負荷（GL）與碳水化合物計數法 \| 第三章：GugoPro AI 拍餐辨識在「控糖防禦」中的實戰應用與 YMYL 醫療免責規範 | 194 | 0 |
| 專欄 | `articles/fatty-liver-and-mediterranean-diet-guide.html` | zh-TW | 脂肪肝怎麼逆轉？減醣與改良地中海飲食外食健康實戰手冊｜GugoPro | 逆轉脂肪肝 (MASLD) 全指南：減醣地中海飲食黃金配比與外食避坑手冊（可見（靜態檢查）） | 第一章：脂肪肝（MASLD / NAFLD）與內臟脂肪的分子病理機制 \| 第二章：兩大長壽抗炎飲食對決：減醣飲食（Low-Carb）vs. 地中海飲食（Mediterranean Diet） \| 第三章：外食隱形促炎油脂辨識與食材品質優化 | 207 | 0 |
| 專欄 | `articles/gemini-api-free-tier-and-developer-guide.html` | zh-TW | 2026 Google Gemini 免費 API 開發手冊：架構設計與429錯誤排查｜GugoPro | Google Gemini 官方免費 API 開發者手冊：零成本商用架構與高可用 Failover（可見（靜態檢查）） | 第一章：Gemini API 免費層額度機制與生物鐘物理限制 \| 第二章：完整 HTTP 錯誤代碼拓撲、底層病因與確定性防禦矩陣 \| 第三章：生產級自動容錯降級（Failover）與高可用架構 | 260 | 0 |
| 專欄 | `articles/how-to-master-tarot-guide.html` | zh-TW | 如何成為塔羅牌大師？78張牌古典符號學與直覺流動解牌全指南｜GugoPro | 如何成為塔羅牌大師：從死記牌義到直覺流動解牌的刻意練習指南（可見（靜態檢查）） | 第一章：破除死記硬背：為什麼背牌義是初學者的墓地？ \| 第二章：古典符號學解碼：四元素哲學、生命數字學與宮廷牌角色動力學 \| 第三章：牌陣空間解構與「流動閱讀法（Flow Reading）」實戰心法 | 159 | 0 |
| 專欄 | `articles/how-to-master-ziwei-guide.html` | zh-TW | 如何成為紫微斗數大師？百顆星曜文化符號學與動態格局解盤｜GugoPro | 如何成為紫微斗數大師：從死背星曜到動態格局解盤的系統動力學手冊（可見（靜態檢查）） | 第一章：破除死記硬背：符號碎裂化認知陷阱與高階心智表徵建構 \| 第二章：底層架構解碼：十四主星組塊化、十二宮對宮拓撲與三方四正力學幾何 \| 第三章：動態能量流動：十干四化系統動力學重構與負熵修復機制 | 207 | 0 |
| 專欄 | `articles/intermittent-fasting-and-calorie-deficit-guide.html` | zh-TW | 168 斷食真的比算熱量有效嗎？自噬反應真相與熱量赤字指南｜GugoPro | 168 斷食與熱量赤字真相對決：揭密自噬反應、皮質醇危機與防復胖課表（可見（靜態檢查）） | 第一章：168 間歇性斷食（16:8 TRF）的分子生化機制與諾貝爾獎理論淵源 \| 第二章：兩大科學陣營對決：碳水化合物-胰島素模型（CIM）vs. 能量平衡模型（EBM） \| 第三章：168 斷食的安全邊界、皮質醇飆升與醫學禁忌 | 265 | 0 |
| 專欄 | `articles/modern-ziwei-guide.html` | zh-TW | 告別玄學恐嚇！現代心理學重構紫微斗數：十二宮位與四化反思｜GugoPro | 用現代心理學重構紫微斗數：解鎖十二宮位、四化動態與人際合盤反思（可見（靜態檢查）） | 第一章：符號學與認知科學：解密紫微斗數的科學本質（去玄學化與去恐嚇化） \| 第二章：十二宮位與四化星曜的「現代生活資訊架構學」 \| 第三章：關係合盤的系統動力學：打破「八字相剋」迷信 | 140 | 0 |
| 專欄 | `articles/shadowing-with-ai-tutor.html` | zh-TW | 擺脫「啞巴英語」科學自學法：影子跟讀、CEFR 輸出與 AI 導師｜GugoPro | 擺脫啞巴英語的科學自學法：影子跟讀、CEFR 輸出與 AI 即時回饋閉環（可見（靜態檢查）） | 第一章：認知心理學解密「啞巴英語」的生理阻斷 \| 第二章：影子跟讀法（Shadowing）與語音辨識糾偏機制 \| 第三章：自訂教材匯入與 CEFR 分級情境化輸出 | 141 | 0 |
| 專欄 | `articles/tarot-decision-framework.html` | zh-TW | 告別迷信宿命論！榮格原型心理學、共時性與 AI 塔羅決策模型｜GugoPro | 榮格原型心理學與結構化塔羅：職涯二選一與感情焦慮的理性決策模型（可見（靜態檢查）） | 第一章：符號學與認知心理學：解密塔羅牌的科學本質（去迷信化） \| 第二章：認知偏誤突破與決策工程：塔羅牌陣如何重塑理性大腦 \| 第三章：提問的認知工程與 GugoPro 實體代碼功能映射 | 143 | 0 |
| 專欄 | `articles/tblt-with-ai-tutor.html` | zh-TW | 告別死背單字文法！任務型語言教學 (TBLT) 與 AI 口說實戰手冊｜GugoPro | 任務型語言教學 (TBLT) 實戰全指南：用 AI 打造沉浸式口說任務卡（可見（靜態檢查）） | 第一章：TBLT 的學術起源與理論基石 \| 第二章：認知心理學機制：Robinson「認知假說」與認知負載 \| 第三章：Jane Willis 三階段流程與 GugoPro 實體代碼深度映射 | 178 | 0 |
| 專欄 | `articles/tdee-and-macros-guide.html` | zh-TW | 告別溜溜球效應！TDEE 熱量計算、三大營養素與外食拍餐指南｜GugoPro | TDEE 與三大營養素精準調控全指南：能量平衡熱力學與外食減脂手冊（可見（靜態檢查）） | 第一章：營養熱力學與代謝科學：破解節食迷思與溜溜球效應 \| 第二章：巨量營養素生化代謝與飽足感調控機制 \| 第三章：多模態視覺 AI 拍餐分析的「認知啟發法」與誤差控制 | 189 | 0 |
| 專欄 | `articles/travel-translator-guide.html` | zh-TW | 告別尷尬遞手機！180° 對向翻轉介面與出國即時語音翻譯手冊｜GugoPro | 告別尷尬遞手機：180° 面對面翻轉介面設計美學與出國旅遊溝通實戰（可見（靜態檢查）） | 第一章：跨文化交際障礙與「遞手機」的人際空間心理學剖析 \| 第二章：人機互動（HCI）視角：共享單螢幕介面之認知工程與輸入架構 \| 第三章：語用學（Pragmatics）與跨文化高風險溝通策略 | 184 | 0 |
| 專欄 | `articles/weight-loss-planner-guide.html` | zh-TW | 告別7700大卡迷思！動態熱量赤字與突破減重停滯期全指南｜GugoPro | 告別線性減重迷思：Wishnofsky 法則失真、動態減脂計畫與停滯期突破（可見（靜態檢查）） | 第一章：能量赤字熱力學與 7700 大卡法則批判：靜態假設之破滅與動態能量平衡模型 \| 第二章：減重停滯期的多維度生理代償與排查機制：假性停滯與真性代謝適應 \| 第三章：運動生理學：阻力訓練、有氧耐力與 EPOC 後燃效應的週期化配比 | 200 | 0 |
| 專欄 | `articles/youtube-english-listening-and-shadowing-guide.html` | zh-TW | YouTube 雙語精聽與影子跟讀全書：L-Player 操作與神經聽覺重塑｜GugoPro | YouTube 雙語精聽與影子跟讀：L-Player 零摩擦學習系統操作全書（可見（靜態檢查）） | 理論基石：第二語言習得與認知神經科學理論構架 \| 第一章：系統架構與介面導覽：L-Player 的三合一視窗配置 \| 第二章：三大核心學習模式與演算法運作實務 | 244 | 0 |
| 專欄 | `articles/youtube-listening-connected-speech-guide.html` | zh-TW | 看 YouTube 學英文為何聽不懂？音韻知覺與聽寫差量比對全指南｜GugoPro | 破解英語聽力盲區：語流音變、聽寫差量比對與影子跟讀自學指南（可見（靜態檢查）） | 第一章：認知神經科學剖析：雙語字幕刷片無效之神經機制 \| 第二章：英語語音學與音韻學解密：語流音變與生理聽覺斷層 \| 第三章：計算語言學與演算法解析：GugoPro Levenshtein 聽寫差量比對引擎 | 224 | 0 |
| 專欄 | `articles/youtube-sequel-tracker-guide.html` | zh-TW | 2026 YouTube 演算法與連載檢索：NLP 去噪與跨頻道追劇指南｜GugoPro | YouTube 演算法與連載檢索指南：破解推薦漏片與跨頻道續集追蹤技術（可見（靜態檢查）） | 第一章：YouTube 推薦演算法機制與「連載斷更/漏片」的結構性成因 \| 第二章：資訊檢索（IR）與 NLP 標題去噪工程 \| 第三章：無伺服器架構下的「本機差量記憶」與隱私工程 | 199 | 0 |
| 法規 | `contact.html` | zh-TW | 聯絡我們 \| GugoPro 官方 | 聯絡我們（可見（靜態檢查）） | 官方聯絡信箱 \| 問題回報與功能建議 \| 快速寄信 | 62 | 7 |
| 法規 | `disclaimer.html` | zh-TW | 免責聲明｜GugoPro 工具與 AI 服務使用限制 | GugoPro 免責聲明（可見（靜態檢查）） | 1. 一般資訊與專業建議 \| 2. AI 生成、語音辨識與數學估算 \| 3. 本機處理、瀏覽器儲存與第三方傳輸 | 57 | 8 |
| 專欄 | `en/articles/affective-filter-with-ai-tutor.html` | en | Overcoming Speaking Fear: Krashen's Affective Filter & AI Tutoring \| GugoPro | Overcoming Foreign Language Anxiety: Affective Filter & Zero-Pressure AI（可見（靜態檢查）） | Chapter 1: Academic Foundations: The Affective Filter Hypothesis and Foreign Language Anxiety \| Chapter 2: Neurobiology & HCI: Why Live Humans Induce Freezing While AI Unlocks Zero-Filter Acquisition \| Chapter 3: Affective Scaffolding Mapped to GugoPro's Engineering Architecture | 455 | 0 |
| 專欄 | `en/articles/amazon-ai-product-research-guide.html` | en | 2026 Amazon AI Product Research: Review Mining & Listing Guide \| GugoPro | Amazon AI Product Research Guide: Semantic Reverse Engineering & Review Mining（可見（靜態檢查）） | Chapter 1: The Evolution of E-Commerce Search Algorithms & AI Semantic Reverse Engineering \| Chapter 2: VOC (Voice of Customer) Data Mining & Competitor Negative Review Reverse-Engineering \| Chapter 3: High-Converting Listing Titles and 249-Byte Backend Keyword Allocation | 452 | 0 |
| 專欄 | `en/articles/carb-cycling-and-home-workout-guide.html` | en | Master Carb Cycling for Fat Loss: High/Low Days & Home Workouts \| GugoPro | How to Master Carb Cycling for Maximum Fat Loss: Biochemistry & Bodyweight（可見（靜態檢查）） | Chapter 1: Exercise Physiology & Endocrine Mechanisms of Carb Cycling \| Chapter 2: Exercise Physiology: Bodyweight Training for Hypertrophy & Muscle Retention \| Chapter 3: Aligning Home Routines with Carb Cycling Waves | 452 | 0 |
| 專欄 | `en/articles/diabetes-and-insulin-resistance-guide.html` | en | Prediabetes & Insulin Resistance Diet Guide: GI/GL & Carb Control \| GugoPro | What to Eat for Prediabetes & Insulin Resistance: GI/GL & Carb Counting（可見（靜態檢查）） | Chapter 1: The Molecular Biochemistry of Insulin Resistance and Glycemic Volatility \| Chapter 2: The Nutritional Arsenal: Glycemic Index (GI), Glycemic Load (GL), and Carbohydrate Counting \| Chapter 3: Clinical AI Image Audits: Identifying Hidden Sugars & YMYL Medical Safety Guardrails | 437 | 0 |
| 專欄 | `en/articles/fatty-liver-and-mediterranean-diet-guide.html` | en | Reversing Fatty Liver: Low-Carb vs. Mediterranean Diet Handbook \| GugoPro | What to Eat to Reverse Fatty Liver (MASLD): Mediterranean Diet & Fat Loss（可見（靜態檢查）） | Chapter 1: The Molecular Pathophysiology of Steatotic Liver Disease (MASLD / NAFLD) and Visceral Fat \| Chapter 2: The Longevity Dietary Showdown: Low-Carb vs. Mediterranean Diet \| Chapter 3: Auditing Pro-inflammatory Seed Oils and Sourcing Clean Lipids | 473 | 0 |
| 專欄 | `en/articles/gemini-api-free-tier-and-developer-guide.html` | en | 2026 Google Gemini Free API Developer Blueprint & Rate Limits \| GugoPro | Building Zero-Cost Commercial Apps with Gemini Free API: Architecture & Failover（可見（靜態檢查）） | Chapter 1: Gemini API Free Tier Quota Mechanics & Biological Clock Physical Constraints \| Chapter 2: Complete HTTP Error Code Topology, Root Causes, and Deterministic Defense Matrix \| Chapter 3: Production-Grade Automatic Failover & High-Availability Architecture | 394 | 0 |
| 專欄 | `en/articles/how-to-master-tarot-guide.html` | en | How to Master Tarot: Classical Semiotics & Intuitive Reading \| GugoPro | Mastering Tarot: From Rote Memorization to Intuitive Flow Reading with AI（可見（靜態檢查）） | Chapter 1: Dismantling Rote Memorization: Why Cramming Keywords is the Beginner's Graveyard \| Chapter 2: Classical Semiotic Decoding: Four Elements, Numerology, and Court Card Dynamics \| Chapter 3: Spatial Deconstruction & "Flow Reading" Master Techniques | 384 | 0 |
| 專欄 | `en/articles/how-to-master-ziwei-guide.html` | en | How to Master Zi Wei Dou Shu: Dynamic Natal Chart Reading \| GugoPro | Mastering Zi Wei Dou Shu: From 108 Stars to Dynamic Pattern Chart Reading（可見（靜態檢查）） | Chapter 1: Dismantling Rote Memorization: Fragmentation Pitfalls & High-Level Mental Representations \| Chapter 2: Foundational Architecture: 14 Major Star Chunks, Palace Polar Topology, and Trine Geometry \| Chapter 3: Dynamic Energy Fluxes: Reconstructing the Four Transformations & Negative Entropy | 497 | 0 |
| 專欄 | `en/articles/intermittent-fasting-and-calorie-deficit-guide.html` | en | Is 16:8 Fasting Better Than Counting Calories? Autophagy Truth \| GugoPro | Is 16:8 Intermittent Fasting Really Better Than Counting Calories? Science Decoded（可見（靜態檢查）） | Chapter 1: The Molecular Biochemistry of 16:8 Time-Restricted Feeding and Autophagy \| Chapter 2: Scientific Paradigms: The Carbohydrate-Insulin Model (CIM) vs. The Energy Balance Model (EBM) \| Chapter 3: Safety Limits: Cortisol Spikes, Amenorrhea, and Medical Contraindications | 643 | 0 |
| 專欄 | `en/articles/modern-ziwei-guide.html` | en | Modernizing Zi Wei Dou Shu: Twelve Palaces & Psychological Growth \| GugoPro | Reconstructing Zi Wei Dou Shu with Modern Psychology: Twelve Palaces & Si-Hua（可見（靜態檢查）） | Chapter 1: Semiotics and Cognitive Science: Demystifying Ziwei Dou Shu \| Chapter 2: Modern Life Information Architecture: Twelve Palaces & Four Transformations \| Chapter 3: Relational Synastry Dynamics: Overcoming Incompatibility Myths | 539 | 0 |
| 專欄 | `en/articles/shadowing-with-ai-tutor.html` | en | Overcoming Mute English: Shadowing, CEFR Output & AI Tutoring \| GugoPro | Science-Backed Autonomous Speaking: Shadowing, CEFR Output & AI Dialogue（可見（靜態檢查）） | Chapter 1: Cognitive Psychology: Deconstructing 'Mute English' \| Chapter 2: Shadowing & Pronunciation Correction Algorithms \| Chapter 3: Custom Materials and CEFR Scaffolding | 281 | 0 |
| 專欄 | `en/articles/tarot-decision-framework.html` | en | Tarot Decision Framework: Jungian Archetypes & Synchronicity \| GugoPro | Deconstructing Dilemmas: Jungian Archetypal Psychology & AI Tarot Decisions（可見（靜態檢查）） | Chapter 1: Semiotics and Cognitive Psychology: Demystifying Tarot’s Scientific Essence \| Chapter 2: Overcoming Cognitive Biases: How Spreads Restructure Rational Thinking \| Chapter 3: Cognitive Query Engineering & Architecture Mapping | 496 | 0 |
| 專欄 | `en/articles/tblt-with-ai-tutor.html` | en | Task-Based Language Teaching (TBLT): High-Impact Speaking with AI \| GugoPro | Beyond Rote Memorization: Task-Based Language Teaching (TBLT) with AI（可見（靜態檢查）） | Chapter 1: Theoretical Foundations: The Origins of TBLT \| Chapter 2: Cognitive Mechanisms: Robinson's Cognition Hypothesis & Cognitive Load \| Chapter 3: Jane Willis's Three-Stage Framework Mapped to GugoPro's Architecture | 522 | 0 |
| 專欄 | `en/articles/tdee-and-macros-guide.html` | en | Defeat Yo-Yo Dieting: The Complete Science Guide to TDEE & Macros \| GugoPro | Mastering TDEE & Macronutrients: Energy Balance Thermodynamics & Dining Out（可見（靜態檢查）） | Chapter 1: Nutritional Thermodynamics & Metabolic Science: Demystifying Dieting & the Yo-Yo Rebound \| Chapter 2: Macronutrient Biochemistry & Satiety Signaling Dynamics \| Chapter 3: Multimodal Vision AI Meal Estimation: Heuristics & Error Control | 543 | 0 |
| 專欄 | `en/articles/travel-translator-guide.html` | en | No More Passing Phones: 180° Flipped Screen Travel Translator \| GugoPro | Say Goodbye to Awkward Phone-Passing! 180° Face-to-Face Flipped UI Design（可見（靜態檢查）） | Chapter 1: Intercultural Barriers & The Spatial Psychology of "Phone-Passing" \| Chapter 2: Human-Computer Interaction (HCI): Shared Mobile Displays & Input Architecture \| Chapter 3: Pragmatics and High-Stakes Cross-Cultural Communication | 501 | 0 |
| 專欄 | `en/articles/weight-loss-planner-guide.html` | en | Beyond 7,700 kcal Myth: Dynamic Caloric Deficit & Plateau Guide \| GugoPro | Beyond Linear Weight Loss Myths: Kevin Hall Dynamic Balance & Plateau Buster（可見（靜態檢查）） | Chapter 1: Thermodynamics of Caloric Deficits & The Wishnofsky 7,700 kcal Rule: Static Fallacies vs. Dynamic Energy Balance \| Chapter 2: The Multi-Dimensional Physiology of Plateaus: Pseudo-Plateaus vs. True Metabolic Adaptation \| Chapter 3: Exercise Physiology: Resistance Training, Endurance & EPOC Periodization | 511 | 0 |
| 專欄 | `en/articles/youtube-english-listening-and-shadowing-guide.html` | en | YouTube Bilingual Listening & Shadowing Guide: L-Player Mastery \| GugoPro | YouTube Bilingual Listening & Shadowing: L-Player System Blueprint（可見（靜態檢查）） | Theoretical Foundations: SLA and Cognitive Neuroscience Frameworks \| Chapter 1: Architecture & Interface: L-Player's 3-in-1 Workbench \| Chapter 2: Core Learning Modes & Algorithmic Execution | 474 | 0 |
| 專欄 | `en/articles/youtube-listening-connected-speech-guide.html` | en | Why Watching YouTube Fails for English: Speech Perception & Dictation \| GugoPro | Overcoming English Listening Plateaus: Connected Speech & Dictation Diff（可見（靜態檢查）） | Chapter 1: Cognitive Neuroscience: The Subtitle Immersion Trap \| Chapter 2: Phonology Decoded: Connected Speech and Perceptual Failures \| Chapter 3: Computational Linguistics: Levenshtein Dictation Diff Engine | 413 | 0 |
| 專欄 | `en/articles/youtube-sequel-tracker-guide.html` | en | 2026 YouTube Algorithm & Sequel Retrieval: NLP & Diff Tracking \| GugoPro | YouTube Recommendation Architecture & Client-Side Sequel Retrieval（可見（靜態檢查）） | Chapter 1: The YouTube Recommendation Architecture & Structural Causes of Missing Sequels \| Chapter 2: Information Retrieval (IR) & NLP Title Denoising Pipelines \| Chapter 3: Serverless Architecture: Client-Side "Local Diff Engine" & Privacy Engineering | 492 | 0 |
| 其他 | `googled0dfad57039c64f6.html` |  |  | —（非網頁驗證資產）（不適用） |  | 0 | 0 |
| 首頁 | `index.html` | zh-TW | GugoPro 工具箱｜YouTube 雙語學習、AI 對話翻譯與 TDEE 減脂計算器 | GugoPro 生產力與生活決策工具箱（可見（靜態檢查）） | 工具分類 \| 核心功能與深度應用手冊 \| 端點安全承諾：先在你的裝置處理 | 194 | 0 |
| 首頁 | `index_en.html` | en | GugoPro Hub \| Client-Side AI, YouTube Study & TDEE Health Tools | GugoPro Browser Tools & Methodology Hub（可見（靜態檢查）） | Tool Categories \| Core Features & In-Depth Application Manual \| Endpoint Security Commitment: Processed Locally First | 360 | 0 |
| 首頁 | `index_ja.html` | ja | GugoPro ツールボックス｜YouTube 2言語字幕学習・AI対話翻訳・TDEE計算機 | GugoPro ブラウザ完結型・生産性ツールボックス（可見（靜態檢查）） | ツール分類 \| コア機能と詳細応用マニュアル \| エンドポイントセキュリティ：あなたの端末内で最優先処理 | 194 | 0 |
| 專欄 | `ja/articles/affective-filter-with-ai-tutor.html` | ja | 英語を話す恐怖を克服する心理学：情意フィルターと AI チューター｜GugoPro | 話す恐怖を克服する心理学：情意フィルター仮説と AI ゼロ圧力スピーキング（可見（靜態檢查）） | 第一章：情意フィルター仮説と外国語不安（FLA）の学術的起源と心理メカニズム \| 第二章：神経科学とHCI（ヒューマンコンピュータインタラクション）：なぜ「生身の人間」の前で頭が真っ白になり、AIなら「ゼロフィルター」を実現できるのか？ \| 第三章：情意降下と認知的足場かけが GugoPro の実装コードとどう結びついているか | 221 | 0 |
| 專欄 | `ja/articles/amazon-ai-product-research-guide.html` | ja | 2026 越境EC Amazon 商品選定：AI 意味論リサーチと低評価分析｜GugoPro | 2026 越境EC・高精度リサーチ完全攻略：AIセマンティック反向工学とVOC痛点分析（可見（靜態檢查）） | 第1章：EC検索アルゴリズムの進化とAIセマンティック・リバースエンジニアリング \| 第2章：VOC（顧客の声）データマイニングと競合低評価リバースエンジニアリング \| 第3章：ゴールデンListing設計と検索キーワード（Search Terms）249バイト最適化 | 227 | 0 |
| 專欄 | `ja/articles/carb-cycling-and-home-workout-guide.html` | ja | カーボサイクル減脂法：高・低炭水化物日と自宅自重筋トレ攻略｜GugoPro | 炭水化物循環法（カーボサイクル）完全減脂ガイド：生化学機序と筋分解防止（可見（靜態檢查）） | 第1章：炭水化物循環法（Carb Cycling）の運動生理学と内分泌調控機序 \| 第2章：運動生理学：自宅自重トレーニングで「筋肉を守りながら脂肪を燃やす」力学 \| 第3章：自宅燃焼課表と炭水化物循環の「期分け同期化」 | 204 | 0 |
| 專欄 | `ja/articles/diabetes-and-insulin-resistance-guide.html` | ja | 糖尿病予備群・インスリン抵抗性の食事管理：GI/GL値と糖質調整｜GugoPro | 糖尿病予備群・インスリン抵抗性の食事法：血糖値スパイクを防ぐ栄養素管理（可見（靜態檢查）） | 第1章：インスリン抵抗性（Insulin Resistance）と血糖値スパイクの分子生化学機序 \| 第2章：栄養学の武器庫：GI値・GL値とカーボカウント法 \| 第3章：AI写真食事解析の実戦とYMYL医療免責ガードレール | 164 | 0 |
| 專欄 | `ja/articles/fatty-liver-and-mediterranean-diet-guide.html` | ja | 脂肪肝を逆転する食事法：減糖＆地中海食の外食実践バイブル｜GugoPro | 脂肪肝 (MASLD) を逆転する減糖＆地中海食：内臓脂肪燃焼と PFC 黄金比率（可見（靜態檢查）） | 第1章：脂肪肝（MASLD / NAFLD）と内臓脂肪の分子病理メカニズム \| 第2章：長寿抗炎症食の対決：減糖食（Low-Carb）vs. 地中海食（Mediterranean Diet） \| 第3章：外食に潜む促炎症油脂の見破り方と食材調達の最適化 | 206 | 0 |
| 專欄 | `ja/articles/gemini-api-free-tier-and-developer-guide.html` | ja | 2026年 Gemini 無料API開発ハンドブック：429エラー完全対策｜GugoPro | Google Gemini 公式無料API開発者完全攻略：商用アーキテクチャと自動縮退（可見（靜態檢查）） | 第1章：Gemini API 無料枠の配額メカニズムと生体時計物理制約 \| 第2章：完全なHTTPエラーコードトポロジー、根本原因と確定性防御マトリクス \| 第3章：プロダクショングレードの自動耐障害フォールバック（Failover）と高可用性アーキテクチャ | 271 | 0 |
| 專欄 | `ja/articles/how-to-master-tarot-guide.html` | ja | タロットマスターへの道：78枚の記号論と直観的リーディング｜GugoPro | タロットマスターへの道：78枚の丸暗記を脱し直観的フロー・リーディングへ（可見（靜態檢查）） | 第1章：丸暗記の打破——なぜ単語暗記は初学者の墓場なのか？ \| 第2章：古典記号論の解読：四大元素・生命数秘術・コートカード力学 \| 第3章：空間構造解読と「フロー・リーディング法」 | 145 | 0 |
| 專欄 | `ja/articles/how-to-master-ziwei-guide.html` | ja | 紫微斗数マスターへの道：文化記号論と動的命盤解読の極意｜GugoPro | 紫微斗数マスターへの道：星の丸暗記を脱し動態格局解盤へ至る実践手引（可見（靜態檢查）） | 第1章：丸暗記の打破：記号破砕化の罠と高階層心的表象の構築 \| 第2章：基盤構造の解読：十四主星のチャンク化、十二宮対宮トポロジーと三方四正の幾何学 \| 第3章：動態エネルギー流動：十干四化のシステムダイナミクスと負のエントロピー | 199 | 0 |
| 專欄 | `ja/articles/intermittent-fasting-and-calorie-deficit-guide.html` | ja | 168断食はカロリー計算より痩せるか？オートファジーの真実｜GugoPro | 168断食はカロリー計算より本当に痩せるのか？オートファジーとリバウンドの罠（可見（靜態檢查）） | 第1章：168断食（16:8 TRF）の分子生化学機序とノーベル賞理論の淵源 \| 第2章：2大科学陣営の対決：炭水化物-インスリンモデル（CIM）vs. エネルギー平衡モデル（EBM） \| 第3章：168断食の安全限界、コルチゾール急上昇と医学的禁忌 | 233 | 0 |
| 專欄 | `ja/articles/modern-ziwei-guide.html` | ja | 現代心理学で再構築する紫微斗数：十二宮位と四化の自己対話｜GugoPro | 宿命論と恐嚇占いにサヨナラ！現代心理学で再構築する紫微斗数と合盤（可見（靜態檢查）） | 第1章：記号論と認知科学：紫微斗数の科学的本質を解明する（脱オカルト・脱脅迫化） \| 第2章：十二宮位と四化星曜の「現代生活情報アーキテクチャ学」 \| 第3章：関係合盤のシステムダイナミクス：「相性の悪さ」の迷信を打破する | 169 | 0 |
| 專欄 | `ja/articles/shadowing-with-ai-tutor.html` | ja | 「話せない英語」脱却の科学的自学法：シャドーイングと AI 対話｜GugoPro | 「話せない英語」にサヨナラ！シャドーイングと CEFR 文脈出力の AI 閉ループ（可見（靜態檢查）） | 第一章：認知心理学で解き明かす「話せない英語」の生理的遮断 \| 第二章：シャドーイング（Shadowing）と音声認識による糾偏メカニズム \| 第三章：カスタム教材のインポートとCEFR分級コンテキスト出力 | 146 | 0 |
| 專欄 | `ja/articles/tarot-decision-framework.html` | ja | 迷信からの脱却！ユング元型心理学・共時性と AI タロット決断｜GugoPro | 宿命論を打破する！ユング元型心理学と AI タロットによる意思決定モデル（可見（靜態檢查）） | 第1章：記号論と認知心理学：タロットカードの科学的本質を解明する（脱迷信化） \| 第2章：認知バイアスの打破と意思決定工学：タロットスプレッドがいかに理性を再構築するか \| 第3章：問いの認知工学とGugoPro実装コードの機能マッピング | 161 | 0 |
| 專欄 | `ja/articles/tblt-with-ai-tutor.html` | ja | 丸暗記を脱するタスク型教授法 (TBLT)：AI 英会話実践ハンドブック｜GugoPro | 丸暗記にサヨナラ！タスク型教授法 (TBLT) と AI スピーキング実践ガイド（可見（靜態檢查）） | 第一章：TBLTの学術的起源と理論基石 \| 第二章：認知心理学メカニズム：Robinson「認知仮説」と認知負荷 \| 第三章：Willis の3段階フレームワークと GugoPro の実装コードマッピング | 184 | 0 |
| 專欄 | `ja/articles/tdee-and-macros-guide.html` | ja | リバウンドを完全に卒業！TDEE 計算と PFC バランス管理完全手引｜GugoPro | 無駄な食事制限とリバウンドを卒業！TDEE ＆ PFC バランス精密調整バイブル（可見（靜態檢查）） | 第一章：栄養熱力学と代謝科学：食事制限の幻想とリバウンドの正体 \| 第二章：マクロ栄養素の生化学代謝と食欲制御メカニズム \| 第三章：マルチモーダルAI画像食事解析の「認知的ヒューリスティクス」と誤差制御 | 248 | 0 |
| 專欄 | `ja/articles/travel-translator-guide.html` | ja | スマホ手渡しにサヨナラ！180° 対面反転海外旅行音声翻訳手引｜GugoPro | スマホの気まずい手渡しにサヨナラ！180°対面反転UIのデザイン美学と旅行会話（可見（靜態檢查）） | 第1章：異文化コミュニケーションの障壁と「スマホ手渡し」の空間心理学 \| 第2章：HCI（人機相互作用）の視座：単一共有画面の認知工学と入力制御 \| 第3章：語用論（プラグマティクス）と高リスク対話の戦略 | 206 | 0 |
| 專欄 | `ja/articles/weight-loss-planner-guide.html` | ja | 7700kcal 神話の崩壊！動的カロリー赤字と減量停滞期突破手引｜GugoPro | 直線的減量神話の崩壊：動的減量計画、筋トレ期分けと停滞期打破の科学（可見（靜態檢查）） | 第1章：エネルギー赤字の熱力学と7,700kcalの法則批判：静的仮定の崩壊と動的平衡モデル \| 第2章：減量停滞期の生理学的代償メカニズム：偽性停滞期と真性代謝適応の鑑別 \| 第3章：運動生理学：レジスタンストレーニング、有氧耐力、EPOCアフターバーンの期分け配分 | 229 | 0 |
| 專欄 | `ja/articles/youtube-english-listening-and-shadowing-guide.html` | ja | YouTube 英語精聴＆シャドーイング完全ガイド：L-Player 学習法｜GugoPro | YouTube 英語精聴・シャドーイング完全手引：L-Player 操作と聴覚神経回路（可見（靜態檢查）） | 第一章：認知神経科学の分析：字幕付き動画視聴が非効率な神経学的根拠 \| 第二章：英語音声学と音韻論の解剖：自然な音変化（Connected Speech）の物理特性 \| 第三章：計算言語学とアルゴリズム：レーベンシュタイン・ディクテーション差分エンジン | 161 | 0 |
| 專欄 | `ja/articles/youtube-listening-connected-speech-guide.html` | ja | YouTube 英語学習が挫折する真の理由：音韻知覚とディクテーション｜GugoPro | YouTube 英語リスニング挫折の真相：音声変化の解読とディクテーション差分（可見（靜態檢查）） | 第一章：認知神経科学の分析：字幕付き動画視聴が非効率な神経学的根拠 \| 第二章：英語音声学と音韻論の解剖：自然な音変化（Connected Speech）の物理特性 \| 第三章：計算言語学とアルゴリズム：レーベンシュタイン・ディクテーション差分エンジン | 170 | 0 |
| 專欄 | `ja/articles/youtube-sequel-tracker-guide.html` | ja | 2026年 YouTube アルゴリズムとシリーズ検索：NLP 差分追跡｜GugoPro | YouTube 動画推薦アルゴリズムとシリーズ検索完全ガイド：推薦漏れの解消（可見（靜態檢查）） | 第一章：YouTube推薦アルゴリズムの深層構造と「連載推薦漏れ」の構造的原因 \| 第二章：情報検索（IR）と自然言語処理（NLP）によるタイトルノイズ除去工学 \| 第三章：サーバーレス環境における「ローカル差分メモリ」とプライバシー保護 | 224 | 0 |
| 法規 | `privacy.html` | zh-TW | 隱私權政策｜GugoPro | 隱私權政策（可見（靜態檢查）） | 1. 瀏覽器中的設定與內容 \| 2. 依功能而異的第三方服務 \| 3. 網站交付、分析與廣告 | 60 | 7 |
| 法規 | `terms.html` | zh-TW | 服務條款｜GugoPro | 服務條款（可見（靜態檢查）） | 1. 條款接受與更新 \| 2. 工具輸出與專業限制 \| 3. AI 與第三方服務 | 49 | 9 |
| 工具 | `tools/ai/amazon-product-research.html` | zh-TW | Amazon AI 智慧選品助手｜競品差評挖掘、規格矩陣與藍海選品分析 - GugoPro | Amazon AI 智慧選品助手：差評痛點挖掘與規格矩陣分析（可見（靜態檢查）） | Amazon AI 選品導購是什麼？從需求到可驗證商品清單的研究工作台 \| Amazon 美國代購、日本亞馬遜直送台灣：AI 選品與海淘避坑完整指南 | 76 | 6 |
| 工具 | `tools/ai/english-speaking-tutor.html` | zh-TW | AI 多國語言口說對話導師｜19國情境模擬、發音評分與自訂教材 - GugoPro | AI 多國語言情境口說對話導師（可見（靜態檢查）） | 使用說明與常見問題 | 65 | 11 |
| 工具 | `tools/ai/realtime-translator.html` | zh-TW | 出國旅遊即時語音翻譯機｜180° 面對面雙向翻轉對話免安裝 - GugoPro | 出國旅遊即時語音翻譯機：180° 面對面雙向對話（可見（靜態檢查）） | 一、手機雙向翻譯如何運作？ \| 二、四個為旅途中實際對話設計的優點 \| 三、出國旅遊即時翻譯：五步驟操作指南 | 82 | 7 |
| 工具 | `tools/ai/tarot-master.html` | zh-TW | AI 塔羅大師｜免費線上抽牌、五大牌陣解讀與每日感情工作指引 - GugoPro | AI 塔羅大師：結構化牌陣抽牌與生活決策反思（可見（靜態檢查）） | AI Tarot Master: A Practical Guide to Spreads, Questions, and Reflection \| AI タロットマスター：スプレッドの選び方・質問のコツ・実践ガイド | 63 | 11 |
| 工具 | `tools/ai/ziwei-astrology.html` | zh-TW | AI 紫微斗數大師｜免費線上排盤、十二宮位動態解盤與流年合盤 - GugoPro | AI 紫微斗數大師：線上排盤與十二宮位現代解讀（可見（靜態檢查）） | 排盤輸入輔助 \| 未來三年流年合盤軌跡 \| 年度流年四化與化忌提醒 | 70 | 9 |
| 工具 | `tools/ai-media/ai-video-tracker.html` | zh-TW | YouTube 續集與新季追蹤器｜跨頻道自動找下一集、新季數與短劇連載 - GugoPro | YouTube 續集與新季追蹤器（可見（靜態檢查）） | YouTube 續集與新季 追蹤器 \| 📺 已追蹤影集 0 \| 不再漏看分散在不同頻道的下一季 | 112 | 0 |
| 工具 | `tools/english/l-player-study.html` | zh-TW | YouTube 雙語跟讀播放器｜精聽聽寫、字幕遮罩與影子口說 - GugoPro L-Player | YouTube 雙語精聽、聽寫與影子跟讀學習機（疑似隱藏） | 多語言字幕時間軸 \| 把真實影音變成可重複的聽說訓練閉環 \| 使用播放器時的深度 FAQ | 74 | 7 |
| 工具 | `tools/health/tdee-macros-calculator.html` | zh-TW | TDEE 減脂熱量計算機｜BMR 基礎代謝率與三大營養素配比估算 - GugoPro | TDEE 減脂熱量計算機與三大營養素配比工具（可見（靜態檢查）） |  | 58 | 10 |
| 工具 | `tools/health/weight-loss-planner.html` | zh-TW | AI 科學減重計畫與熱量赤字教練｜突破停滯期與動態減脂目標 - GugoPro | AI 科學減重計畫與熱量赤字教練（可見（靜態檢查）） |  | 52 | 10 |
| 工具 | `tools/pdf/pdf-suite.html` | zh-TW | PDF 全能工作站｜免安裝線上閱讀、合併、分割與轉檔 - GugoPro | PDF 全能工作站：瀏覽器本機隱私處理工具（可見（靜態檢查）） | 拖入文件，立即開始 \| PDF 全能工作站：運作機制與隱私解析 \| PDF 全能工作站: how it works and privacy | 38 | 10 |
| 工具 | `tools/tutorials/how-to-get-gemini-api-key.html` | zh-TW | Gemini API Key 申請教學｜Google AI Studio 免費金鑰取得與安全設定 - GugoPro | Google Gemini API Key 快速申請與安全設定手冊（可見（靜態檢查）） | 更多關於 Gemini API Key 的資訊 \| Gemini API Key 申請教學：運作機制與隱私解析 \| Gemini API Key 申請教學: mechanism and privacy | 61 | 1 |
| 工具 | `tools/tw-market/taiwan-pair-trading.html` | zh-Hant-TW | 台股與期貨配對交易掃描儀｜統計套利與價差策略分析 - GugoPro | 台股與期貨配對交易掃描工作站（可見（靜態檢查）） | 今日精選配對套利雷達榜 \| 配對交易與均值回歸：從統計關係到風險控制 \| Taiwan Pair Trading 線上工具：運作機制與隱私解析 | 64 | 4 |

## 完整欄位檔案

- CSV：`seo_inventory_report.csv`（UTF-8-SIG；含描述、關鍵字、錨點及文章→工具連結明細）
