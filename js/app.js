// ===== GugoPro Amazon Smart Finder v3 =====
(function() {
    'use strict';

    // ===== Config =====
    const TAG_US = '9908qq-20';
    const TAG_JP = 'gugopro-22';
    const BASE_US = 'https://www.amazon.com/s?k=';
    const BASE_JP = 'https://www.amazon.co.jp/s?k=';

    // ===== Detect Region =====
    let region = 'us';
    (function() {
        const lang = (navigator.language || '').toLowerCase();
        if (lang.startsWith('ja')) region = 'jp';
    })();

    // ===== Category Data with Brands =====
    const data = {
        featured: {
            icon: '⭐', name: { us: 'Featured', jp: 'おすすめ' },
            items: { us: ['Best Sellers', 'New Arrivals', 'Deals', 'Top Rated', 'Gift Ideas', 'Under $25', 'Under $50', 'Under $100'], jp: ['ベストセラー', '新着', 'セール', '高評価', 'ギフト', '2500円以下', '5000円以下', '10000円以下'] }
        },
        laptops: {
            icon: '💻', name: { us: 'Laptops & PCs', jp: 'パソコン' },
            items: { us: ['Laptop', 'Gaming Laptop', 'Chromebook', 'Desktop PC', 'Mini PC', 'All-in-One PC', '2-in-1 Laptop'], jp: ['ノートPC', 'ゲーミングPC', 'Chromebook', 'デスクトップPC', 'ミニPC', '一体型PC', '2in1 PC'] },
            brands: { us: ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MSI', 'Microsoft'], jp: ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MSI', 'Microsoft'] },
            priceMax: { us: 3000, jp: 300000 }
        },
        phones: {
            icon: '📱', name: { us: 'Phones & Tablets', jp: 'スマホ・タブレット' },
            items: { us: ['Smartphone', 'Tablet', 'E-Reader', 'Phone Case', 'Screen Protector', 'Wireless Charger', 'Car Mount', 'Phone Stand'], jp: ['スマートフォン', 'タブレット', '電子書籍リーダー', 'スマホケース', '保護フィルム', 'ワイヤレス充電器', '車載ホルダー', 'スマホスタンド'] },
            brands: { us: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Motorola', 'Sony'], jp: ['Apple', 'Samsung', 'Google', 'Sony', 'OPPO', 'Xiaomi'] },
            priceMax: { us: 1500, jp: 150000 }
        },
        audio: {
            icon: '🎧', name: { us: 'Audio', jp: 'オーディオ' },
            items: { us: ['Wireless Headphones', 'Earbuds', 'Bluetooth Speaker', 'Soundbar', 'Turntable', 'Microphone', 'DAC', 'Wired Headphones'], jp: ['ワイヤレスヘッドホン', 'イヤホン', 'Bluetoothスピーカー', 'サウンドバー', 'レコードプレーヤー', 'マイク', 'DAC', '有線ヘッドホン'] },
            brands: { us: ['Sony', 'Bose', 'Apple', 'JBL', 'Sennheiser', 'Audio-Technica', 'Beats', 'Anker'], jp: ['Sony', 'Bose', 'Apple', 'JBL', 'ゼンハイザー', 'オーディオテクニカ', 'Beats', 'Anker'] },
            features: { us: ['Noise Cancelling', 'Wireless', 'Waterproof', 'Hi-Res', 'Bass Boost'], jp: ['ノイズキャンセリング', 'ワイヤレス', '防水', 'ハイレゾ', '重低音'] },
            priceMax: { us: 500, jp: 50000 }
        },
        peripherals: {
            icon: '⌨️', name: { us: 'PC Accessories', jp: 'PC周辺機器' },
            items: { us: ['Monitor', 'Keyboard', 'Mouse', 'Webcam', 'USB Hub', 'External SSD', 'Mousepad', 'Monitor Arm', 'Docking Station', 'Graphics Card'], jp: ['モニター', 'キーボード', 'マウス', 'ウェブカメラ', 'USBハブ', '外付けSSD', 'マウスパッド', 'モニターアーム', 'ドッキングステーション', 'グラフィックカード'] },
            brands: { us: ['Logitech', 'Razer', 'Corsair', 'Samsung', 'LG', 'BenQ', 'Keychron', 'Elgato'], jp: ['Logicool', 'Razer', 'Corsair', 'Samsung', 'LG', 'BenQ', 'Keychron', 'Elgato'] },
            priceMax: { us: 1000, jp: 100000 }
        },
        smarthome: {
            icon: '🏠', name: { us: 'Smart Home', jp: 'スマートホーム' },
            items: { us: ['Smart Speaker', 'Robot Vacuum', 'Smart Light', 'Smart Lock', 'Security Camera', 'Smart Plug', 'Smart Display', 'Video Doorbell', 'Air Purifier', 'Thermostat'], jp: ['スマートスピーカー', 'ロボット掃除機', 'スマートライト', 'スマートロック', '防犯カメラ', 'スマートプラグ', 'スマートディスプレイ', 'ドアベル', '空気清浄機', 'スマート温度計'] },
            brands: { us: ['Amazon Echo', 'Google Nest', 'iRobot', 'Ring', 'Philips Hue', 'TP-Link', 'Dyson', 'Ecovacs'], jp: ['Amazon Echo', 'Google Nest', 'iRobot', 'Ring', 'Philips Hue', 'TP-Link', 'Dyson', 'Ecovacs'] },
            priceMax: { us: 800, jp: 80000 }
        },
        kitchen: {
            icon: '🍳', name: { us: 'Kitchen', jp: 'キッチン' },
            items: { us: ['Air Fryer', 'Coffee Maker', 'Espresso Machine', 'Blender', 'Instant Pot', 'Rice Cooker', 'Toaster Oven', 'Knife Set', 'Cookware Set', 'Food Processor', 'Electric Kettle', 'Sous Vide'], jp: ['エアフライヤー', 'コーヒーメーカー', 'エスプレッソマシン', 'ブレンダー', '電気圧力鍋', '炊飯器', 'トースター', '包丁セット', '鍋セット', 'フードプロセッサー', '電気ケトル', '低温調理器'] },
            brands: { us: ['Ninja', 'KitchenAid', 'Breville', 'Cuisinart', 'Instant Pot', 'Vitamix', 'Zojirushi', 'Le Creuset'], jp: ['Ninja', 'デロンギ', 'Breville', 'パナソニック', '象印', 'タイガー', 'バーミキュラ', 'ル・クルーゼ'] },
            materials: { us: ['Stainless Steel', 'Non-Stick', 'Cast Iron', 'Ceramic', 'Glass'], jp: ['ステンレス', 'フッ素加工', '鋳鉄', 'セラミック', 'ガラス'] },
            priceMax: { us: 500, jp: 50000 }
        },
        furniture: {
            icon: '🛋️', name: { us: 'Furniture', jp: '家具' },
            items: { us: ['Sofa', 'Office Chair', 'Standing Desk', 'Bed Frame', 'Mattress', 'Bookshelf', 'TV Stand', 'Coffee Table', 'Dining Set', 'Shoe Rack', 'Wardrobe', 'Bar Stool'], jp: ['ソファ', 'オフィスチェア', 'スタンディングデスク', 'ベッドフレーム', 'マットレス', '本棚', 'テレビ台', 'コーヒーテーブル', 'ダイニングセット', 'シューズラック', 'ワードローブ', 'バースツール'] },
            brands: { us: ['Herman Miller', 'IKEA', 'Secretlab', 'Zinus', 'Walker Edison', 'Flash Furniture', 'Modway'], jp: ['Herman Miller', 'ニトリ', 'Secretlab', 'LOWYA', 'タンスのゲン', 'アイリスオーヤマ', '無印良品'] },
            materials: { us: ['Leather', 'Fabric', 'Velvet', 'Wood', 'Metal', 'Mesh'], jp: ['本革', 'ファブリック', 'ベルベット', '木製', 'メタル', 'メッシュ'] },
            features: { us: ['Ergonomic', 'Recliner', 'Foldable', 'Storage', 'Adjustable', 'Memory Foam'], jp: ['エルゴノミクス', 'リクライニング', '折りたたみ', '収納付き', '高さ調節', '低反発'] },
            priceMax: { us: 2000, jp: 200000 }
        },
        beauty: {
            icon: '✨', name: { us: 'Beauty', jp: '美容' },
            items: { us: ['Skincare Set', 'Sunscreen', 'Moisturizer', 'Serum', 'Face Mask', 'Hair Dryer', 'Curling Iron', 'Makeup Brush', 'Lipstick', 'Foundation', 'Perfume', 'Electric Shaver'], jp: ['スキンケアセット', '日焼け止め', '保湿クリーム', '美容液', 'フェイスマスク', 'ヘアドライヤー', 'コテ', 'メイクブラシ', '口紅', 'ファンデーション', '香水', '電気シェーバー'] },
            brands: { us: ['Dyson', 'CeraVe', 'La Roche-Posay', 'Neutrogena', 'Olaplex', 'The Ordinary', 'SK-II', 'Revlon'], jp: ['Dyson', 'SK-II', '資生堂', 'コスメデコルテ', 'パナソニック', 'SHIRO', 'イプサ', 'ReFa'] },
            priceMax: { us: 300, jp: 30000 }
        },
        health: {
            icon: '💊', name: { us: 'Health & Wellness', jp: '健康' },
            items: { us: ['Supplements', 'Massage Gun', 'Blood Pressure Monitor', 'Electric Toothbrush', 'Water Flosser', 'Heating Pad', 'Probiotics', 'Protein Powder', 'Collagen', 'Vitamins'], jp: ['サプリメント', 'マッサージガン', '血圧計', '電動歯ブラシ', '口腔洗浄器', 'ホットパッド', 'プロバイオティクス', 'プロテイン', 'コラーゲン', 'ビタミン'] },
            brands: { us: ['Theragun', 'Oral-B', 'Philips', 'Waterpik', 'Optimum Nutrition', 'Garden of Life', 'NOW Foods'], jp: ['Theragun', 'オーラルB', 'フィリップス', 'パナソニック', 'ザバス', 'DHC', 'ファンケル'] },
            priceMax: { us: 400, jp: 40000 }
        },
        outdoor: {
            icon: '🏕️', name: { us: 'Outdoor & Sports', jp: 'アウトドア' },
            items: { us: ['Backpack', 'Tent', 'Sleeping Bag', 'Hiking Boots', 'Water Bottle', 'Camping Chair', 'Flashlight', 'Cooler', 'Bike', 'Fishing Rod', 'Hammock', 'GPS Watch'], jp: ['バックパック', 'テント', '寝袋', 'トレッキングシューズ', '水筒', 'キャンプチェア', '懐中電灯', 'クーラーボックス', '自転車', '釣り竿', 'ハンモック', 'GPSウォッチ'] },
            brands: { us: ['The North Face', 'Osprey', 'YETI', 'Columbia', 'Patagonia', 'Garmin', 'REI', 'Coleman'], jp: ['ノースフェイス', 'Osprey', 'YETI', 'コロンビア', 'モンベル', 'Garmin', 'スノーピーク', 'コールマン'] },
            priceMax: { us: 500, jp: 50000 }
        },
        fitness: {
            icon: '🏋️', name: { us: 'Fitness', jp: 'フィットネス' },
            items: { us: ['Yoga Mat', 'Dumbbells', 'Resistance Bands', 'Treadmill', 'Exercise Bike', 'Pull-up Bar', 'Foam Roller', 'Jump Rope', 'Kettlebell', 'Fitness Tracker'], jp: ['ヨガマット', 'ダンベル', 'レジスタンスバンド', 'ランニングマシン', 'エアロバイク', '懸垂バー', 'フォームローラー', '縄跳び', 'ケトルベル', 'フィットネストラッカー'] },
            brands: { us: ['Peloton', 'Bowflex', 'NordicTrack', 'Fitbit', 'Garmin', 'Apple', 'Manduka', 'TRX'], jp: ['Peloton', 'ALINCO', 'Fitbit', 'Garmin', 'Apple', 'STEADY', 'Manduka', 'アディダス'] },
            priceMax: { us: 2000, jp: 200000 }
        },
        baby: {
            icon: '👶', name: { us: 'Baby & Kids', jp: 'ベビー・キッズ' },
            items: { us: ['Stroller', 'Car Seat', 'Baby Monitor', 'High Chair', 'Crib', 'Diaper Bag', 'Baby Carrier', 'Toys 0-3yr', 'Toys 3-6yr', 'Kids Tablet'], jp: ['ベビーカー', 'チャイルドシート', 'ベビーモニター', 'ハイチェア', 'ベビーベッド', 'マザーズバッグ', '抱っこ紐', '知育玩具0-3歳', '知育玩具3-6歳', 'キッズタブレット'] },
            brands: { us: ['Graco', 'UPPAbaby', 'Baby Bjorn', 'Fisher-Price', 'LEGO', 'Chicco', 'Halo'], jp: ['コンビ', 'アップリカ', 'ベビービョルン', 'フィッシャープライス', 'LEGO', 'ピジョン', 'エルゴベビー'] },
            priceMax: { us: 800, jp: 80000 }
        },
        fashion: {
            icon: '👔', name: { us: 'Fashion', jp: 'ファッション' },
            items: { us: ['Sneakers', 'Watch', 'Sunglasses', 'Wallet', 'Backpack', 'Jacket', 'Dress', 'Jeans', 'Handbag', 'Jewelry', 'Belt', 'Scarf'], jp: ['スニーカー', '腕時計', 'サングラス', '財布', 'リュック', 'ジャケット', 'ワンピース', 'ジーンズ', 'ハンドバッグ', 'アクセサリー', 'ベルト', 'マフラー'] },
            brands: { us: ['Nike', 'Adidas', 'Levi\'s', 'Ray-Ban', 'Coach', 'Michael Kors', 'Fossil', 'Calvin Klein'], jp: ['Nike', 'Adidas', 'ユニクロ', 'Ray-Ban', 'Coach', 'SEIKO', 'CASIO', 'ポールスミス'] },
            priceMax: { us: 500, jp: 50000 }
        },
        books: {
            icon: '📚', name: { us: 'Books & Media', jp: '本・メディア' },
            items: { us: ['Fiction', 'Non-Fiction', 'Self-Help', 'Business', 'Cookbook', 'Children', 'Manga', 'Textbook', 'Audiobook', 'Kindle'], jp: ['小説', 'ノンフィクション', '自己啓発', 'ビジネス書', '料理本', '児童書', '漫画', '参考書', 'オーディオブック', 'Kindle本'] },
            priceMax: { us: 50, jp: 5000 }
        },
        pets: {
            icon: '🐾', name: { us: 'Pets', jp: 'ペット' },
            items: { us: ['Dog Food', 'Cat Food', 'Dog Bed', 'Cat Tree', 'Pet Toys', 'Leash', 'Pet Carrier', 'Aquarium', 'Grooming Kit', 'Pet Camera'], jp: ['ドッグフード', 'キャットフード', '犬用ベッド', 'キャットタワー', 'ペットおもちゃ', 'リード', 'ペットキャリー', '水槽', 'グルーミング', 'ペットカメラ'] },
            brands: { us: ['Blue Buffalo', 'Royal Canin', 'Kong', 'Purina', 'Furminator', 'PetSafe'], jp: ['ロイヤルカナン', 'ヒルズ', 'Kong', 'ピュリナ', 'ユニチャーム', 'アイリスオーヤマ'] },
            priceMax: { us: 200, jp: 20000 }
        },
        office: {
            icon: '📎', name: { us: 'Office', jp: 'オフィス' },
            items: { us: ['Desk Lamp', 'Printer', 'Shredder', 'Whiteboard', 'Desk Organizer', 'Label Maker', 'Notebook', 'Pens', 'Ergonomic Chair', 'Standing Desk Mat'], jp: ['デスクライト', 'プリンター', 'シュレッダー', 'ホワイトボード', 'デスク収納', 'ラベルライター', 'ノート', 'ペン', 'エルゴチェア', 'スタンディングマット'] },
            priceMax: { us: 500, jp: 50000 }
        },
        gaming: {
            icon: '🎮', name: { us: 'Gaming', jp: 'ゲーム' },
            items: { us: ['Gaming Headset', 'Controller', 'Gaming Chair', 'Capture Card', 'Stream Deck', 'VR Headset', 'Nintendo Switch', 'PS5 Accessories', 'Gaming Monitor', 'RGB Lights'], jp: ['ゲーミングヘッドセット', 'コントローラー', 'ゲーミングチェア', 'キャプチャーボード', 'Stream Deck', 'VRヘッドセット', 'Nintendo Switch', 'PS5周辺機器', 'ゲーミングモニター', 'RGBライト'] },
            brands: { us: ['SteelSeries', 'HyperX', 'Razer', 'Elgato', 'Secretlab', 'Meta', 'Nintendo', 'Sony'], jp: ['SteelSeries', 'HyperX', 'Razer', 'Elgato', 'Secretlab', 'Meta', '任天堂', 'Sony'] },
            priceMax: { us: 1000, jp: 100000 }
        }
    };

    // Popular
    const popular = {
        us: ['AirPods Pro', 'Robot Vacuum', 'Air Fryer', 'Standing Desk', 'Kindle Paperwhite', 'Yoga Mat', 'Instant Pot', 'Ring Doorbell', 'Nintendo Switch', 'Protein Powder', 'LED Strip Lights', 'Portable Charger', 'Noise Cancelling Headphones', 'Electric Toothbrush'],
        jp: ['AirPods Pro', 'ロボット掃除機', 'エアフライヤー', 'スタンディングデスク', 'Kindle Paperwhite', 'ヨガマット', '電気圧力鍋', 'スマートロック', 'Nintendo Switch', 'プロテイン', 'LEDテープライト', 'モバイルバッテリー', 'ノイキャンヘッドホン', '電動歯ブラシ']
    };

    // UI
    const ui = {
        us: { catTitle: 'CATEGORIES', popularTitle: 'TRENDING NOW', searchPH: 'Search anything on Amazon...', goText: 'Search on Amazon.com', priceLabel: 'Price Range', matLabel: 'MATERIAL', featLabel: 'FEATURES', brandTitle: 'BRAND', ratingText: '4 stars & above' },
        jp: { catTitle: 'カテゴリー', popularTitle: '人気の検索', searchPH: 'Amazonで何でも検索...', goText: 'Amazon.co.jpで検索', priceLabel: '価格帯', matLabel: '素材', featLabel: '特徴', brandTitle: 'ブランド', ratingText: '星4つ以上' }
    };

    // ===== State =====
    let selectedCat = null;
    let selectedItem = null;
    let selectedBrand = null;
    let selectedMaterials = [];
    let selectedFeatures = [];

    const $ = id => document.getElementById(id);

    // ===== Init =====
    function init() {
        renderUI();
        renderCategories();
        renderPopular();
        initSlider();
        bindEvents();
    }

    function renderUI() {
        const t = ui[region];
        $('cat-title').textContent = t.catTitle;
        $('popular-title').textContent = t.popularTitle;
        $('search-input').placeholder = t.searchPH;
        $('go-text').textContent = t.goText;
        $('price-label').textContent = t.priceLabel;
        $('material-label').textContent = t.matLabel;
        $('feature-label').textContent = t.featLabel;
        $('brand-title').textContent = t.brandTitle;
        $('rating-text').textContent = t.ratingText;
    }

    function renderCategories() {
        let html = '';
        for (const key in data) {
            html += '<div class="tag" data-cat="' + key + '"><span class="tag-icon">' + data[key].icon + '</span>' + data[key].name[region] + '</div>';
        }
        $('main-categories').innerHTML = html;
    }

    function renderPopular() {
        let html = '';
        popular[region].forEach(t => { html += '<div class="popular-tag" data-term="' + t + '">' + t + '</div>'; });
        $('popular-grid').innerHTML = html;
    }

    // ===== Price Slider =====
    function initSlider() {
        updateSliderUI(0, 1000);
    }

    function updateSliderRange(max) {
        $('price-slider-min').max = max;
        $('price-slider-max').max = max;
        $('price-slider-min').value = 0;
        $('price-slider-max').value = max;
        updateSliderUI(0, max);
    }

    function updateSliderUI(min, max) {
        const sliderMax = parseInt($('price-slider-max').max) || 1000;
        const leftPct = (min / sliderMax) * 100;
        const rightPct = 100 - (max / sliderMax) * 100;
        $('slider-track').style.setProperty('--left', leftPct + '%');
        $('slider-track').style.setProperty('--right', rightPct + '%');

        const currency = region === 'us' ? '$' : '¥';
        const maxLabel = region === 'us' ? '$' + sliderMax : '¥' + sliderMax.toLocaleString();
        $('slider-min-label').textContent = currency + (region === 'us' ? min : min.toLocaleString());
        $('slider-max-label').textContent = maxLabel;
        $('price-display').textContent = currency + (region === 'us' ? min : min.toLocaleString()) + ' - ' + currency + (region === 'us' ? max : max.toLocaleString());
    }

    // ===== Show Subcategories =====
    function showSub(catKey) {
        selectedCat = catKey;
        selectedItem = null;
        selectedBrand = null;
        selectedMaterials = [];
        selectedFeatures = [];

        const cat = data[catKey];
        $('sub-title').textContent = cat.icon + ' ' + cat.name[region];

        // Items
        let html = '';
        cat.items[region].forEach(item => { html += '<div class="tag" data-item="' + item + '">' + item + '</div>'; });
        $('sub-categories').innerHTML = html;
        $('sub-section').style.display = 'block';

        // Brands
        if (cat.brands) {
            let bhtml = '';
            cat.brands[region].forEach(b => { bhtml += '<div class="tag" data-brand="' + b + '">' + b + '</div>'; });
            $('brand-tags').innerHTML = bhtml;
            $('brand-section').style.display = 'block';
        } else {
            $('brand-section').style.display = 'none';
        }

        // Filters panel
        $('filters-panel').style.display = 'block';

        // Price slider range
        const pmax = cat.priceMax ? cat.priceMax[region] : (region === 'us' ? 500 : 50000);
        updateSliderRange(pmax);

        // Materials
        if (cat.materials) {
            let mhtml = '';
            cat.materials[region].forEach(m => { mhtml += '<div class="tag" data-val="' + m + '">' + m + '</div>'; });
            $('material-tags').innerHTML = mhtml;
            $('material-block').style.display = 'block';
        } else {
            $('material-block').style.display = 'none';
        }

        // Features
        if (cat.features) {
            let fhtml = '';
            cat.features[region].forEach(f => { fhtml += '<div class="tag" data-val="' + f + '">' + f + '</div>'; });
            $('feature-tags').innerHTML = fhtml;
            $('feature-block').style.display = 'block';
        } else {
            $('feature-block').style.display = 'none';
        }

        // Action
        $('action-bar').style.display = 'block';
        updatePreview();

        // Highlight
        document.querySelectorAll('#main-categories .tag').forEach(el => el.classList.toggle('active', el.dataset.cat === catKey));

        // Bind sub events
        bindSubEvents();
    }

    function bindSubEvents() {
        document.querySelectorAll('#sub-categories .tag').forEach(el => {
            el.addEventListener('click', function() {
                document.querySelectorAll('#sub-categories .tag').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                selectedItem = this.dataset.item;
                updatePreview();
            });
        });
        document.querySelectorAll('#brand-tags .tag').forEach(el => {
            el.addEventListener('click', function() {
                if (this.classList.contains('active')) {
                    this.classList.remove('active');
                    selectedBrand = null;
                } else {
                    document.querySelectorAll('#brand-tags .tag').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    selectedBrand = this.dataset.brand;
                }
                updatePreview();
            });
        });
        document.querySelectorAll('#material-tags .tag').forEach(el => {
            el.addEventListener('click', function() {
                this.classList.toggle('active');
                selectedMaterials = Array.from(document.querySelectorAll('#material-tags .tag.active')).map(t => t.dataset.val);
                updatePreview();
            });
        });
        document.querySelectorAll('#feature-tags .tag').forEach(el => {
            el.addEventListener('click', function() {
                this.classList.toggle('active');
                selectedFeatures = Array.from(document.querySelectorAll('#feature-tags .tag.active')).map(t => t.dataset.val);
                updatePreview();
            });
        });
    }

    function hideSub() {
        selectedCat = null; selectedItem = null; selectedBrand = null;
        selectedMaterials = []; selectedFeatures = [];
        $('sub-section').style.display = 'none';
        $('brand-section').style.display = 'none';
        $('filters-panel').style.display = 'none';
        $('action-bar').style.display = 'none';
        document.querySelectorAll('#main-categories .tag').forEach(el => el.classList.remove('active'));
    }

    // ===== Build =====
    function buildKeywords() {
        const free = $('search-input').value.trim();
        if (free) return free;

        const parts = [];
        if (selectedBrand) parts.push(selectedBrand);
        if (selectedItem) parts.push(selectedItem);
        else if (selectedCat && data[selectedCat]) parts.push(data[selectedCat].name[region]);
        if (selectedMaterials.length) parts.push(selectedMaterials.join(' '));
        if (selectedFeatures.length) parts.push(selectedFeatures.join(' '));
        return parts.join(' ');
    }

    function buildUrl() {
        const kw = buildKeywords();
        if (!kw) return '';
        const base = region === 'us' ? BASE_US : BASE_JP;
        const tag = region === 'us' ? TAG_US : TAG_JP;
        let url = base + encodeURIComponent(kw);
        if (tag) url += '&tag=' + tag;

        if ($('rating-filter').checked) {
            url += '&rh=p_72%3A' + (region === 'us' ? '2661618011' : '2221615051');
        }

        // Price from slider
        const pmin = parseInt($('price-slider-min').value);
        const pmax = parseInt($('price-slider-max').value);
        const sliderMax = parseInt($('price-slider-max').max);
        if (pmin > 0 || pmax < sliderMax) {
            const min = region === 'us' ? pmin * 100 : pmin;
            const max = region === 'us' ? pmax * 100 : pmax;
            url += '&rh=' + encodeURIComponent('p_36:' + min + '-' + max);
        }

        return url;
    }

    function updatePreview() {
        const kw = buildKeywords();
        $('preview-text').textContent = kw || '...';
    }

    function go() {
        const url = buildUrl();
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }

    // ===== Events =====
    function bindEvents() {
        $('main-categories').addEventListener('click', function(e) {
            const tag = e.target.closest('.tag');
            if (!tag) return;
            const key = tag.dataset.cat;
            if (key === selectedCat) hideSub();
            else showSub(key);
        });

        $('back-btn').addEventListener('click', hideSub);

        $('search-input').addEventListener('input', function() {
            if (this.value.trim()) {
                $('action-bar').style.display = 'block';
                updatePreview();
            }
        });
        $('search-input').addEventListener('keypress', function(e) { if (e.key === 'Enter') go(); });
        $('search-btn').addEventListener('click', go);
        $('go-btn').addEventListener('click', go);

        // Sliders
        $('price-slider-min').addEventListener('input', function() {
            let min = parseInt(this.value);
            let max = parseInt($('price-slider-max').value);
            if (min > max) { this.value = max; min = max; }
            updateSliderUI(min, max);
        });
        $('price-slider-max').addEventListener('input', function() {
            let max = parseInt(this.value);
            let min = parseInt($('price-slider-min').value);
            if (max < min) { this.value = min; max = min; }
            updateSliderUI(min, max);
        });

        $('rating-filter').addEventListener('change', updatePreview);

        $('popular-grid').addEventListener('click', function(e) {
            const tag = e.target.closest('.popular-tag');
            if (!tag) return;
            $('search-input').value = tag.dataset.term;
            $('action-bar').style.display = 'block';
            updatePreview();
            go();
        });
    }

    // Start
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
