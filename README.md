# GugoPro - 購物推薦網站

專業的亞馬遜聯盟行銷購物推薦網站，支援英文/日文雙語自動切換。

## 功能特色

- **雙語支援**：自動偵測瀏覽器語言，日文使用者看日文版，其他使用者看英文版
- **聯盟連結自動切換**：英文版導向 Amazon.com (tag=9908qq-20)，日文版導向 Amazon.co.jp (tag=gugopro-22)
- **5 大商品分類**：科技3C、居家生活、健康美容、戶外運動、廚房美食
- **響應式設計**：手機、平板、桌面都能完美顯示
- **溫暖生活風設計**：米白、暖棕、淺橘配色

## 部署到 GitHub Pages

### 步驟 1：建立 GitHub Repository

1. 登入 GitHub
2. 點擊右上角 "+" → "New repository"
3. Repository name 填入 `gugopro-site`（或你想要的名稱）
4. 設為 Public
5. 點擊 "Create repository"

### 步驟 2：上傳檔案

```bash
cd gugopro-site
git init
git add .
git commit -m "Initial commit - GugoPro website"
git branch -M main
git remote add origin https://github.com/你的帳號/gugopro-site.git
git push -u origin main
```

### 步驟 3：啟用 GitHub Pages

1. 進入 Repository → Settings → Pages
2. Source 選擇 "Deploy from a branch"
3. Branch 選擇 "main"，資料夾選 "/ (root)"
4. 點擊 Save

### 步驟 4：連結自訂網域 (gugopro.com)

1. 在 GitHub Pages 設定中，Custom domain 填入 `gugopro.com`
2. 在 Porkbun DNS 設定中新增：
   - A Record: `@` → `185.199.108.153`
   - A Record: `@` → `185.199.109.153`
   - A Record: `@` → `185.199.110.153`
   - A Record: `@` → `185.199.111.153`
   - CNAME Record: `www` → `你的帳號.github.io`
3. 等待 DNS 生效（通常 10-30 分鐘）
4. 勾選 "Enforce HTTPS"

## 目錄結構

```
gugopro-site/
├── index.html          # 首頁
├── css/
│   └── style.css       # 樣式表
├── js/
│   └── main.js         # 語言切換 & 聯盟連結邏輯
├── categories/
│   ├── tech.html       # 科技3C
│   ├── home.html       # 居家生活
│   ├── health.html     # 健康美容
│   ├── outdoor.html    # 戶外運動
│   └── kitchen.html    # 廚房美食
├── CNAME               # 自訂網域設定
└── README.md           # 本文件
```

## 新增商品

在對應的分類 HTML 檔案中，複製一個 `product-card` 區塊並修改內容：

```html
<div class="product-card">
    <div class="product-image" style="background-image: url('圖片網址')"></div>
    <div class="product-info">
        <span class="product-category" data-en="英文分類" data-ja="日文分類">英文分類</span>
        <h3 data-en="英文商品名" data-ja="日文商品名">英文商品名</h3>
        <p data-en="英文描述" data-ja="日文描述">英文描述</p>
        <a href="#" class="product-link" data-asin="商品ASIN碼" data-en="View on Amazon →" data-ja="Amazonで見る →">View on Amazon →</a>
    </div>
</div>
```

## 授權

© 2026 GugoPro. All rights reserved.
