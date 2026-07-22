// ===== GugoPro Amazon Smart Finder - Core Logic =====

(function() {
    'use strict';

    // ===== Affiliate Tags =====
    const TAG_US = '9908qq-20';
    const TAG_JP = 'gugopro-22';

    // ===== Amazon Base URLs =====
    const BASE_US = 'https://www.amazon.com/s?k=';
    const BASE_JP = 'https://www.amazon.co.jp/s?k=';

    // ===== Current State =====
    let currentRegion = 'us'; // 'us' or 'jp'

    // ===== Category Data =====
    const categories = {
        electronics: {
            icon: '💻',
            name: { us: 'Electronics & Gadgets', jp: '家電・ガジェット' },
            subcategories: {
                us: ['Wireless Headphones', 'Bluetooth Speaker', 'Laptop', 'Tablet', 'Smartwatch', 'Keyboard', 'Mouse', 'Monitor', 'Webcam', 'Charger'],
                jp: ['ワイヤレスヘッドホン', 'Bluetoothスピーカー', 'ノートパソコン', 'タブレット', 'スマートウォッチ', 'キーボード', 'マウス', 'モニター', 'ウェブカメラ', '充電器']
            },
            features: {
                us: ['Noise Cancelling', 'Wireless', 'USB-C', 'Portable', 'Waterproof'],
                jp: ['ノイズキャンセリング', 'ワイヤレス', 'USB-C', 'ポータブル', '防水']
            }
        },
        furniture: {
            icon: '🛋️',
            name: { us: 'Furniture & Home', jp: '家具・インテリア' },
            subcategories: {
                us: ['Sofa', 'Office Chair', 'Desk', 'Bookshelf', 'Bed Frame', 'Coffee Table', 'TV Stand', 'Dining Table'],
                jp: ['ソファ', 'オフィスチェア', 'デスク', '本棚', 'ベッドフレーム', 'コーヒーテーブル', 'テレビ台', 'ダイニングテーブル']
            },
            materials: {
                us: ['Leather', 'Faux Leather', 'Velvet', 'Fabric', 'Wood', 'Metal'],
                jp: ['本革', '合皮', 'ベルベット', 'ファブリック', '木製', 'メタル']
            },
            features: {
                us: ['Recliner', 'Sleeper', 'Mid-Century Modern', 'Minimalist', 'Storage', 'Adjustable'],
                jp: ['リクライニング', 'ソファベッド', '北欧風', 'ミニマリスト', '収納付き', '高さ調節']
            }
        },
        kitchen: {
            icon: '🍳',
            name: { us: 'Kitchen & Dining', jp: 'キッチン・ダイニング' },
            subcategories: {
                us: ['Coffee Maker', 'Air Fryer', 'Blender', 'Knife Set', 'Cookware Set', 'Rice Cooker', 'Toaster Oven', 'Food Processor'],
                jp: ['コーヒーメーカー', 'エアフライヤー', 'ブレンダー', '包丁セット', '鍋セット', '炊飯器', 'トースター', 'フードプロセッサー']
            },
            materials: {
                us: ['Stainless Steel', 'Cast Iron', 'Non-Stick', 'Ceramic', 'Glass'],
                jp: ['ステンレス', '鋳鉄', 'ノンスティック', 'セラミック', 'ガラス']
            },
            features: {
                us: ['Dishwasher Safe', 'BPA Free', 'Programmable', 'Compact', 'Professional Grade'],
                jp: ['食洗機対応', 'BPAフリー', 'プログラム機能', 'コンパクト', 'プロ仕様']
            }
        },
        health: {
            icon: '✨',
            name: { us: 'Health & Beauty', jp: '健康・美容' },
            subcategories: {
                us: ['Skincare', 'Hair Dryer', 'Electric Toothbrush', 'Massage Gun', 'Supplements', 'Yoga Mat', 'Fitness Tracker', 'Essential Oils'],
                jp: ['スキンケア', 'ヘアドライヤー', '電動歯ブラシ', 'マッサージガン', 'サプリメント', 'ヨガマット', 'フィットネストラッカー', 'エッセンシャルオイル']
            },
            features: {
                us: ['Organic', 'Dermatologist Recommended', 'Fragrance Free', 'Vegan', 'Travel Size'],
                jp: ['オーガニック', '皮膚科医推奨', '無香料', 'ヴィーガン', 'トラベルサイズ']
            }
        },
        outdoor: {
            icon: '🏕️',
            name: { us: 'Outdoor & Sports', jp: 'アウトドア・スポーツ' },
            subcategories: {
                us: ['Backpack', 'Tent', 'Sleeping Bag', 'Water Bottle', 'Hiking Shoes', 'Bike Accessories', 'Camping Gear', 'Sunglasses'],
                jp: ['バックパック', 'テント', '寝袋', '水筒', 'トレッキングシューズ', '自転車アクセサリー', 'キャンプ用品', 'サングラス']
            },
            features: {
                us: ['Waterproof', 'Lightweight', 'UV Protection', 'Insulated', 'Foldable'],
                jp: ['防水', '軽量', 'UV保護', '保温', '折りたたみ']
            }
        },
        baby: {
            icon: '👶',
            name: { us: 'Baby & Kids', jp: 'ベビー・キッズ' },
            subcategories: {
                us: ['Stroller', 'Car Seat', 'Baby Monitor', 'Diaper Bag', 'High Chair', 'Toys', 'Baby Carrier', 'Crib'],
                jp: ['ベビーカー', 'チャイルドシート', 'ベビーモニター', 'マザーズバッグ', 'ハイチェア', 'おもちゃ', '抱っこ紐', 'ベビーベッド']
            },
            features: {
                us: ['Safety Certified', 'Lightweight', 'Foldable', 'Washable', 'Organic'],
                jp: ['安全認証', '軽量', '折りたたみ', '洗える', 'オーガニック']
            }
        }
    };

    // ===== UI Text =====
    const uiText = {
        us: {
            heroTitle: 'Find the Perfect Product on Amazon',
            heroSubtitle: 'Choose your market, set your preferences, and we\'ll generate the perfect search for you.',
            filtersTitle: 'Or use smart filters to narrow down',
            labelCategory: 'CATEGORY',
            labelSubcategory: 'TYPE / PRODUCT',
            labelMaterial: 'MATERIAL',
            labelPrice: 'PRICE RANGE',
            labelRating: 'MINIMUM RATING',
            labelFeatures: 'FEATURES',
            ratingAny: 'Any',
            ratingUp: '& up',
            currency: 'USD',
            searchPlaceholder: 'Search anything... (e.g. wireless headphones, sofa, coffee maker)',
            searchBtn: 'Search on Amazon',
            goBtn: 'Search on Amazon.com',
            previewTitle: '🔍 Live Search Preview',
            previewEmpty: 'Your search keywords will appear here...',
            quickTitle: 'Popular Categories',
            selectCategory: '-- Select Category --'
        },
        jp: {
            heroTitle: 'Amazonで最適な商品を見つけよう',
            heroSubtitle: 'マーケットを選び、条件を設定すると、最適な検索を生成します。',
            filtersTitle: 'スマートフィルターで絞り込み',
            labelCategory: 'カテゴリー',
            labelSubcategory: 'タイプ / 商品',
            labelMaterial: '素材',
            labelPrice: '価格帯',
            labelRating: '最低評価',
            labelFeatures: '特徴',
            ratingAny: 'すべて',
            ratingUp: '以上',
            currency: 'JPY',
            searchPlaceholder: '検索... (例: ワイヤレスヘッドホン、ソファ、コーヒーメーカー)',
            searchBtn: 'Amazonで検索',
            goBtn: 'Amazon.co.jpで検索',
            previewTitle: '🔍 検索プレビュー',
            previewEmpty: '検索キーワードがここに表示されます...',
            quickTitle: '人気カテゴリー',
            selectCategory: '-- カテゴリーを選択 --'
        }
    };

    // ===== DOM Elements =====
    const els = {};

    function cacheDom() {
        els.btnUs = document.getElementById('btn-us');
        els.btnJp = document.getElementById('btn-jp');
        els.heroTitle = document.getElementById('hero-title');
        els.heroSubtitle = document.getElementById('hero-subtitle');
        els.filtersTitle = document.getElementById('filters-title');
        els.labelCategory = document.getElementById('label-category');
        els.labelSubcategory = document.getElementById('label-subcategory');
        els.labelMaterial = document.getElementById('label-material');
        els.labelPrice = document.getElementById('label-price');
        els.labelRating = document.getElementById('label-rating');
        els.labelFeatures = document.getElementById('label-features');
        els.ratingAny = document.getElementById('rating-any');
        els.ratingUp = document.getElementById('rating-up');
        els.priceCurrency = document.getElementById('price-currency');
        els.searchInput = document.getElementById('search-input');
        els.searchGoBtn = document.getElementById('search-go-btn');
        els.searchBtnText = document.getElementById('search-btn-text');
        els.filterCategory = document.getElementById('filter-category');
        els.subcategoryGroup = document.getElementById('subcategory-group');
        els.filterSubcategory = document.getElementById('filter-subcategory');
        els.materialGroup = document.getElementById('material-group');
        els.filterMaterial = document.getElementById('filter-material');
        els.featuresGroup = document.getElementById('features-group');
        els.filterFeatures = document.getElementById('filter-features');
        els.priceMin = document.getElementById('price-min');
        els.priceMax = document.getElementById('price-max');
        els.previewTitle = document.getElementById('preview-title');
        els.previewKeywords = document.getElementById('preview-keywords');
        els.previewUrl = document.getElementById('preview-url');
        els.goBtn = document.getElementById('go-btn');
        els.goBtnText = document.getElementById('go-btn-text');
        els.quickTitle = document.getElementById('quick-title');
        els.quickGrid = document.getElementById('quick-grid');
    }

    // ===== Region Switching =====
    function setRegion(region) {
        currentRegion = region;

        // Update buttons
        els.btnUs.classList.toggle('active', region === 'us');
        els.btnJp.classList.toggle('active', region === 'jp');

        // Update UI text
        const text = uiText[region];
        els.heroTitle.textContent = text.heroTitle;
        els.heroSubtitle.textContent = text.heroSubtitle;
        els.filtersTitle.textContent = text.filtersTitle;
        els.labelCategory.textContent = text.labelCategory;
        els.labelSubcategory.textContent = text.labelSubcategory;
        els.labelMaterial.textContent = text.labelMaterial;
        els.labelPrice.textContent = text.labelPrice;
        els.labelRating.textContent = text.labelRating;
        els.labelFeatures.textContent = text.labelFeatures;
        els.ratingAny.textContent = text.ratingAny;
        els.ratingUp.textContent = text.ratingUp;
        els.priceCurrency.textContent = text.currency;
        els.searchInput.placeholder = text.searchPlaceholder;
        els.searchBtnText.textContent = text.searchBtn;
        els.goBtnText.textContent = text.goBtn;
        els.previewTitle.textContent = text.previewTitle;
        els.quickTitle.textContent = text.quickTitle;

        // Rebuild category dropdown
        buildCategoryDropdown();
        // Rebuild quick links
        buildQuickLinks();
        // Reset filters
        resetFilters();
        // Update preview
        updatePreview();
    }

    // ===== Build Category Dropdown =====
    function buildCategoryDropdown() {
        const text = uiText[currentRegion];
        let html = '<option value="">' + text.selectCategory + '</option>';
        for (const key in categories) {
            const cat = categories[key];
            html += '<option value="' + key + '">' + cat.icon + ' ' + cat.name[currentRegion] + '</option>';
        }
        els.filterCategory.innerHTML = html;
    }

    // ===== Build Quick Links =====
    function buildQuickLinks() {
        let html = '';
        for (const key in categories) {
            const cat = categories[key];
            html += '<div class="quick-card" data-category="' + key + '">';
            html += '<span class="quick-card-icon">' + cat.icon + '</span>';
            html += '<span class="quick-card-name">' + cat.name[currentRegion] + '</span>';
            html += '</div>';
        }
        els.quickGrid.innerHTML = html;

        // Add click events
        document.querySelectorAll('.quick-card').forEach(function(card) {
            card.addEventListener('click', function() {
                const catKey = this.getAttribute('data-category');
                els.filterCategory.value = catKey;
                onCategoryChange();
                // Scroll to filters
                document.querySelector('.filters-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    // ===== Build Checkbox Group =====
    function buildCheckboxGroup(container, items) {
        let html = '';
        items.forEach(function(item) {
            html += '<label><input type="checkbox" value="' + item + '"><span>' + item + '</span></label>';
        });
        container.innerHTML = html;

        // Add toggle class on click
        container.querySelectorAll('label').forEach(function(label) {
            label.addEventListener('click', function(e) {
                if (e.target.tagName === 'INPUT') return;
                const checkbox = this.querySelector('input');
                checkbox.checked = !checkbox.checked;
                this.classList.toggle('checked', checkbox.checked);
                updatePreview();
                e.preventDefault();
            });
            label.querySelector('input').addEventListener('change', function() {
                label.classList.toggle('checked', this.checked);
                updatePreview();
            });
        });
    }

    // ===== Category Change =====
    function onCategoryChange() {
        const catKey = els.filterCategory.value;

        if (!catKey || !categories[catKey]) {
            els.subcategoryGroup.style.display = 'none';
            els.materialGroup.style.display = 'none';
            els.featuresGroup.style.display = 'none';
            updatePreview();
            return;
        }

        const cat = categories[catKey];
        const region = currentRegion === 'us' ? 'us' : 'jp';

        // Subcategories
        if (cat.subcategories) {
            els.subcategoryGroup.style.display = 'block';
            buildCheckboxGroup(els.filterSubcategory, cat.subcategories[region]);
        } else {
            els.subcategoryGroup.style.display = 'none';
        }

        // Materials
        if (cat.materials) {
            els.materialGroup.style.display = 'block';
            buildCheckboxGroup(els.filterMaterial, cat.materials[region]);
        } else {
            els.materialGroup.style.display = 'none';
        }

        // Features
        if (cat.features) {
            els.featuresGroup.style.display = 'block';
            buildCheckboxGroup(els.filterFeatures, cat.features[region]);
        } else {
            els.featuresGroup.style.display = 'none';
        }

        updatePreview();
    }

    // ===== Reset Filters =====
    function resetFilters() {
        els.filterCategory.value = '';
        els.subcategoryGroup.style.display = 'none';
        els.materialGroup.style.display = 'none';
        els.featuresGroup.style.display = 'none';
        els.priceMin.value = '';
        els.priceMax.value = '';
        document.querySelectorAll('input[name="rating"]')[0].checked = true;
        els.searchInput.value = '';
    }

    // ===== Build Search Keywords =====
    function buildKeywords() {
        // If free text search is filled, use that
        const freeText = els.searchInput.value.trim();
        if (freeText) {
            return freeText;
        }

        // Otherwise build from filters
        const parts = [];

        // Category name
        const catKey = els.filterCategory.value;
        if (catKey && categories[catKey]) {
            // Get selected subcategories
            const selectedSubs = getCheckedValues(els.filterSubcategory);
            if (selectedSubs.length > 0) {
                parts.push(selectedSubs.join(' '));
            } else {
                parts.push(categories[catKey].name[currentRegion]);
            }

            // Materials
            const selectedMats = getCheckedValues(els.filterMaterial);
            if (selectedMats.length > 0) {
                parts.push(selectedMats.join(' '));
            }

            // Features
            const selectedFeats = getCheckedValues(els.filterFeatures);
            if (selectedFeats.length > 0) {
                parts.push(selectedFeats.join(' '));
            }
        }

        return parts.join(' ');
    }

    // ===== Build Full URL =====
    function buildUrl() {
        const keywords = buildKeywords();
        if (!keywords) return '';

        const base = currentRegion === 'us' ? BASE_US : BASE_JP;
        const tag = currentRegion === 'us' ? TAG_US : TAG_JP;
        let url = base + encodeURIComponent(keywords);

        // Add tag
        if (tag) {
            url += '&tag=' + tag;
        }

        // Add rating filter
        const rating = document.querySelector('input[name="rating"]:checked').value;
        if (rating === '4') {
            url += '&rh=p_72%3A' + (currentRegion === 'us' ? '2661618011' : '2221615051');
        }

        // Add price range
        const priceMin = els.priceMin.value;
        const priceMax = els.priceMax.value;
        if (priceMin || priceMax) {
            const min = priceMin ? (currentRegion === 'us' ? priceMin + '00' : priceMin) : '';
            const max = priceMax ? (currentRegion === 'us' ? priceMax + '00' : priceMax) : '';
            url += '&rh=' + encodeURIComponent('p_36:' + min + '-' + max);
        }

        return url;
    }

    // ===== Update Preview =====
    function updatePreview() {
        const keywords = buildKeywords();
        const url = buildUrl();
        const text = uiText[currentRegion];

        if (keywords) {
            els.previewKeywords.textContent = keywords;
            els.previewKeywords.style.color = 'var(--color-primary)';
            els.previewUrl.textContent = url;
            els.goBtn.style.opacity = '1';
            els.goBtn.style.pointerEvents = 'auto';
        } else {
            els.previewKeywords.textContent = text.previewEmpty;
            els.previewKeywords.style.color = 'var(--color-text-light)';
            els.previewUrl.textContent = '';
            els.goBtn.style.opacity = '0.5';
            els.goBtn.style.pointerEvents = 'none';
        }
    }

    // ===== Get Checked Values =====
    function getCheckedValues(container) {
        const values = [];
        container.querySelectorAll('input:checked').forEach(function(input) {
            values.push(input.value);
        });
        return values;
    }

    // ===== Go to Amazon =====
    function goToAmazon() {
        const url = buildUrl();
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    // ===== Event Listeners =====
    function bindEvents() {
        // Region buttons
        els.btnUs.addEventListener('click', function() { setRegion('us'); });
        els.btnJp.addEventListener('click', function() { setRegion('jp'); });

        // Category change
        els.filterCategory.addEventListener('change', onCategoryChange);

        // Search input
        els.searchInput.addEventListener('input', updatePreview);
        els.searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') goToAmazon();
        });

        // Search button (in search box)
        els.searchGoBtn.addEventListener('click', goToAmazon);

        // Go button
        els.goBtn.addEventListener('click', goToAmazon);

        // Price inputs
        els.priceMin.addEventListener('input', updatePreview);
        els.priceMax.addEventListener('input', updatePreview);

        // Rating
        document.querySelectorAll('input[name="rating"]').forEach(function(radio) {
            radio.addEventListener('change', updatePreview);
        });
    }

    // ===== Auto Detect Language =====
    function detectRegion() {
        const browserLang = navigator.language || navigator.userLanguage || '';
        if (browserLang.toLowerCase().startsWith('ja')) {
            return 'jp';
        }
        return 'us';
    }

    // ===== Initialize =====
    function init() {
        cacheDom();
        bindEvents();
        const region = detectRegion();
        setRegion(region);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
