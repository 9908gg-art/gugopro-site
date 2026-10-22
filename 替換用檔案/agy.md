# 給 AGY 的指令：GugoPro「AI 專屬營養師」與「AI 減肥瘦身教練」專欄卡片繁體中文還原與文章連結精確對齊修復任務

## 一、 任務目標

請針對以下兩個健康工具頁面中的**「歡迎卡片推薦專欄區（Recommended Articles）」**進行修復：

1. `public_html/tools/health/tdee-macros-calculator.html`（AI 專屬營養師）
2. `public_html/tools/health/weight-loss-planner.html`（AI 減肥瘦身教練）

---

## 二、 核心問題診斷與修復清單

### 1. 徹底清除繁中頁面內的「日文標題與日文摘要」
* **問題現象**：如截圖 `1_2.png` 與 `2.png` 所示，在繁體中文頁面中，卡片 1 與卡片 2 出現了日文標題（如 `脂肪肝を逆転する...`、`168斷食是カロリー計算より本当に痩せるのか？...`）以及日文假名。
* **修復方案**：將所有日文字樣徹底替換為標準、優雅的**繁體中文正體標題與摘要說明**。

### 2. 精確區分「專屬營養師」與「減肥瘦身教練」各自的 3 篇專屬專欄
* **問題現象**：
  * 在「AI 專屬營養師」（截圖 `1_2.png`）中，混入了減肥瘦身教練的專欄。
  * 在「AI 減肥瘦身教練」（截圖 `2.png`）中，最右側卡片放了營養師的脂肪肝地中海飲食專欄。
* **修復指引**：請 AGY 檢查 `public_html/index.html` 中的專欄文章區（`#featured-articles`）或 `public_html/articles/`，確認各自歸屬的文章檔案，並依照下方「三、推薦文章標準配置表」進行替換。

---

## 三、 兩大工具專屬文章標準配置表（繁體中文正體）

### 檔案一：`public_html/tools/health/tdee-macros-calculator.html`（AI 專屬營養師）
請檢查 `index.html` 中屬於營養學、TDEE、代謝與飲食配比的 3 篇專欄（若首頁有更合適的營養專欄檔案，請以首頁檔案為準）：

#### 卡片 1（臨床營養 · 地中海飲食）：
* **標籤 Badge**：`臨床營養 · 地中海飲食`
* **文章檔名**：`fatty-liver-and-mediterranean-diet-guide.html`（路徑：`https://gugopro.com/articles/fatty-liver-and-mediterranean-diet-guide.html`）
* **中文標題**：`逆轉脂肪肝減醣與地中海飲食完全指南：從內臟脂肪燃燒到 PFC 黃金比例與外食管理——改善代謝的長壽實戰手冊`
* **中文摘要**：`深入解析內臟脂肪生化代謝機轉，運用 PFC 黃金比例、單元不飽和脂肪酸與拍餐熱量管理，實現肝臟脂肪逆轉與胰島素敏感度提升。`
* **按鈕文字**：`閱讀完整專欄 →`

#### 卡片 2（生活實戰 · 控糖飲食）：
* **標籤 Badge**：`生活實戰 · 控糖飲食`
* **文章檔名**：`eating-out-low-carb-high-protein-guide.html`（路徑：`https://gugopro.com/articles/eating-out-low-carb-high-protein-guide.html`）
* **中文標題**：`外食族與上班族減醣高蛋白實戰指南：從超商熱量計算到升糖指數控制`
* **中文摘要**：`破解便當與外食的高油高鈉陷阱，結合低升糖指數（GI）與蛋白質優先原則，讓外食族也能輕鬆維持 TDEE 熱量赤字與營養平衡。`
* **按鈕文字**：`閱讀完整專欄 →`

#### 卡片 3（微量營養素／抗發炎／營養評估）：
* **請 AGY 至 `index.html` 或 `articles/` 查找營養師專屬的第 3 篇專欄**（例如涉及腸道菌群、抗發炎飲食或維生素礦物質評估的文章）：
  * 若首頁配置為蛋白質與微量營養素專欄，請填入該文章之正確 URL、標籤、繁中標題與摘要。

---

### 檔案二：`public_html/tools/health/weight-loss-planner.html`（AI 減肥瘦身教練）
減肥瘦身教練聚焦於「熱量赤字、停滯期、斷食、運動燃脂與體重管理」的 3 篇專欄：

#### 卡片 1（代謝內分泌 · 熱量赤字）：
* **標籤 Badge**：`代謝內分泌 · 熱量赤字`
* **文章檔名**：`intermittent-fasting-and-calorie-deficit-guide.html`（路徑：`https://gugopro.com/articles/intermittent-fasting-and-calorie-deficit-guide.html`）
* **中文標題**：`168斷食真的比算熱量更容易瘦嗎？從細胞自噬、胰島素假說到熱量赤字的真相：打破復胖與肌肉流失陷阱的完全指南`
* **中文摘要**：`解構 168 斷食與細胞自噬迷思，以熱力學能量平衡、NIH 代謝病房實證與皮質醇水腫機轉揭示科學、可持續的健康減脂真相。`
* **按鈕文字**：`閱讀完整專欄 →`

#### 卡片 2（生活實戰 · 控糖飲食）：
* **標籤 Badge**：`生活實戰 · 控糖飲食`
* **文章檔名**：`eating-out-low-carb-high-protein-guide.html`（路徑：`https://gugopro.com/articles/eating-out-low-carb-high-protein-guide.html`）
* **中文標題**：`外食族與上班族減醣高蛋白實戰指南：從超商熱量計算到升糖指數控制`
* **中文摘要**：`破解便當與外食的高油高鈉陷阱，結合低升糖指數（GI）與蛋白質優先原則，讓外食族也能輕鬆維持熱量赤字並突破體重停滯期。`
* **按鈕文字**：`閱讀完整專欄 →`

#### 卡片 3（運動生理 · 停滯期突破）：
* **請 AGY 至 `index.html` 查找瘦身教練專屬的第 3 篇專欄**（例如運動燃脂、阻力訓練結合有氧、或破除停滯期之專屬專欄）：
  * 將原本誤放的「地中海飲食與脂肪肝」移除，換成屬於減肥教練的運動／停滯期突破專欄。
  * 填入該文章之正確 URL、標籤、繁中標題與摘要。

---

## 四、 具體 HTML 結構修改範例

請確認卡片容器維持如下標準語意化結構（以 `tdee-macros-calculator.html` 為例）：

```html
<section aria-labelledby="welcome-recommended-articles-title" class="welcome-recommended-articles">
    <p class="welcome-articles-intro">📚 結合臨床代謝內分泌學、生化營養與飲食實戰的專屬專欄推薦：</p>
    <div class="welcome-articles-grid">
        <!-- 卡片 1 -->
        <a href="https://gugopro.com/articles/fatty-liver-and-mediterranean-diet-guide.html" class="welcome-article-card" target="_blank" rel="noopener">
            <div class="welcome-article-header">
                <span class="welcome-article-badge">臨床營養 · 地中海飲食</span>
                <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
            </div>
            <h6 class="welcome-article-title">逆轉脂肪肝減醣與地中海飲食完全指南：從內臟脂肪燃燒到 PFC 黃金比例與外食管理——改善代謝的長壽實戰手冊</h6>
            <p class="welcome-article-desc">深入解析內臟脂肪生化代謝機轉，運用 PFC 黃金比例、單元不飽和脂肪酸與拍餐熱量管理，實現肝臟脂肪逆轉與胰島素敏感度提升。</p>
            <span class="welcome-article-read">閱讀完整專欄 <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></span>
        </a>

        <!-- 卡片 2 -->
        <a href="https://gugopro.com/articles/eating-out-low-carb-high-protein-guide.html" class="welcome-article-card" target="_blank" rel="noopener">
            <div class="welcome-article-header">
                <span class="welcome-article-badge">生活實戰 · 控糖飲食</span>
                <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
            </div>
            <h6 class="welcome-article-title">外食族與上班族減醣高蛋白實戰指南：從超商熱量計算到升糖指數控制</h6>
            <p class="welcome-article-desc">破解便當與外食的高油高鈉陷阱，結合低升糖指數（GI）與蛋白質優先原則，讓外食族也能輕鬆維持 TDEE 熱量赤字與營養平衡。</p>
            <span class="welcome-article-read">閱讀完整專欄 <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></span>
        </a>

        <!-- 卡片 3 (請由 index.html 對齊填入) -->
        <a href="https://gugopro.com/articles/[營養師專屬專欄檔名].html" class="welcome-article-card" target="_blank" rel="noopener">
            <div class="welcome-article-header">
                <span class="welcome-article-badge">[專屬分類標籤]</span>
                <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
            </div>
            <h6 class="welcome-article-title">[文章繁體中文完整標題]</h6>
            <p class="welcome-article-desc">[文章繁體中文核心摘要導言]</p>
            <span class="welcome-article-read">閱讀完整專欄 <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></span>
        </a>
    </div>
</section>
```

---

## 五、 本地 Git 提交與推送指令

```bash
git status
git add public_html/tools/health/tdee-macros-calculator.html public_html/tools/health/weight-loss-planner.html
git commit -m "fix(health-tools): localize article titles to Traditional Chinese, fix cross-linked articles between nutritionist and weight loss coach, and update tags/links"
git push origin main
```

---

## 六、 驗收測試清單（請務必使用瀏覽器「無痕模式」驗證）

* [ ] **日文文字完全消除驗證**：分別開啟「AI 專屬營養師」與「AI 減肥瘦身教練」的繁體中文頁面，檢視歡迎卡片最底部的 3 張專欄卡片，確認**已無任何日文字元（如 `を逆転する`、`本当に痩せるのか` 等）**，100% 為繁體中文正體。
* [ ] **專屬營養師專欄對齊驗證**：進入 `tdee-macros-calculator.html`，3 張卡片的主題均為營養、TDEE、飲食與代謝，且連結點擊後均能正確在新分頁打開對應文章。
* [ ] **減肥瘦身教練專欄對齊驗證**：進入 `weight-loss-planner.html`，最右側卡片已替換為減重／運動相關專欄，不再出現脂肪肝專欄；3 篇文章連結皆能順利開啟用於減脂研究之專欄。
* [ ] **按鈕與跳轉驗證**：每張卡片底部的「閱讀完整專欄 →」按鈕文字一致，點擊跳轉皆正確無誤。