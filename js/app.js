// ===== GugoPro Amazon Smart Finder =====
(function() {
    'use strict';

    // ===== Config =====
    const TAG_US = '9908qq-20';
    const TAG_JP = 'gugopro-22';
    const BASE_US = 'https://www.amazon.com/s?k=';
    const BASE_JP = 'https://www.amazon.co.jp/s?k=';

    // ===== Detect Region =====
    let region = 'us';
    (function detectRegion() {
        const lang = (navigator.language || '').toLowerCase();
        if (lang.startsWith('ja')) region = 'jp';
    })();

    // ===== Category Data =====
    const data = {
        featured: {
            icon: '⭐', name: { us: 'Featured', jp: '精選' },
            items: {
                us: ['Best Sellers', 'New Arrivals', 'Deals of the Day', 'Top Rated', 'Gift Ideas', 'Under $25', 'Under $50'],
                jp: ['ベストセラー', '新着商品', '本日のセール', '高評価', 'ギフト', '2500円以下', '5000円以下']
            }
        },
        electronics: {
            icon: '💻', name: { us: 'Electronics', jp: '家電' },
            items: {
                us: ['Headphones', 'Earbuds', 'Bluetooth Speaker', 'Laptop', 'Tablet', 'Smartwatch', 'Keyboard', 'Mouse', 'Monitor', 'Webcam', 'USB Hub', 'Charger', 'Power Bank', 'Phone Case', 'Screen Protector', 'HDMI Cable', 'SSD', 'Memory Card'],
                jp: ['ヘッドホン', 'イヤホン', 'Bluetoothスピーカー', 'ノートPC', 'タブレット', 'スマートウォッチ', 'キーボード', 'マウス', 'モニター', 'ウェブカメラ', 'USBハブ', '充電器', 'モバイルバッテリー', 'スマホケース', '保護フィルム', 'HDMIケーブル', 'SSD', 'メモリーカード']
            },
            materials: { us: ['Wireless', 'Bluetooth 5.0', 'USB-C', 'Noise Cancelling', 'Waterproof'], jp: ['ワイヤレス', 'Bluetooth 5.0', 'USB-C', 'ノイキャン', '防水'] }
        },
        pc: {
            icon: '🖥️', name: { us: 'Computers', jp: 'PC周辺' },
            items: {
                us: ['Gaming Laptop', 'Desktop PC', 'Gaming Monitor', 'Mechanical Keyboard', 'Gaming Mouse', 'Mousepad', 'PC Case', 'Graphics Card', 'RAM', 'CPU Cooler', 'Router', 'Mesh WiFi'],
                jp: ['ゲーミングノートPC', 'デスクトップPC', 'ゲーミングモニター', 'メカニカルキーボード', 'ゲーミングマウス', 'マウスパッド', 'PCケース', 'グラフィックカード', 'メモリ', 'CPUクーラー', 'ルーター', 'メッシュWiFi']
            }
        },
        phone: {
            icon: '📱', name: { us: 'Phones', jp: '通訊' },
            items: {
                us: ['iPhone Case', 'Android Phone', 'Phone Stand', 'Wireless Charger', 'Car Mount', 'Ring Light', 'Selfie Stick', 'Gimbal', 'Lightning Cable', 'USB-C Cable'],
                jp: ['iPhoneケース', 'Androidスマホ', 'スマホスタンド', 'ワイヤレス充電器', '車載ホルダー', 'リングライト', '自撮り棒', 'ジンバル', 'Lightningケーブル', 'USB-Cケーブル']
            }
        },
        appliances: {
            icon: '🏠', name: { us: 'Appliances', jp: '家電' },
            items: {
                us: ['Robot Vacuum', 'Air Purifier', 'Humidifier', 'Dehumidifier', 'Space Heater', 'Fan', 'Iron', 'Sewing Machine', 'Washing Machine', 'Dryer'],
                jp: ['ロボット掃除機', '空気清浄機', '加湿器', '除湿機', 'ヒーター', '扇風機', 'アイロン', 'ミシン', '洗濯機', '乾燥機']
            }
        },
        kitchen: {
            icon: '🍳', name: { us: 'Kitchen', jp: 'キッチン' },
            items: {
                us: ['Air Fryer', 'Coffee Maker', 'Blender', 'Instant Pot', 'Rice Cooker', 'Toaster', 'Knife Set', 'Cutting Board', 'Cookware Set', 'Food Storage', 'Water Filter', 'Electric Kettle'],
                jp: ['エアフライヤー', 'コーヒーメーカー', 'ブレンダー', '電気圧力鍋', '炊飯器', 'トースター', '包丁セット', 'まな板', '鍋セット', '保存容器', '浄水器', '電気ケトル']
            },
            materials: { us: ['Stainless Steel', 'Non-Stick', 'Cast Iron', 'Ceramic', 'BPA Free'], jp: ['ステンレス', 'ノンスティック', '鋳鉄', 'セラミック', 'BPAフリー'] }
        },
        furniture: {
            icon: '🛋️', name: { us: 'Furniture', jp: '家具' },
            items: {
                us: ['Sofa', 'Office Chair', 'Standing Desk', 'Bookshelf', 'Bed Frame', 'Mattress', 'Coffee Table', 'TV Stand', 'Shoe Rack', 'Wardrobe', 'Dining Table', 'Bar Stool'],
                jp: ['ソファ', 'オフィスチェア', 'スタンディングデスク', '本棚', 'ベッドフレーム', 'マットレス', 'コーヒーテーブル', 'テレビ台', 'シューズラック', 'ワードローブ', 'ダイニングテーブル', 'バースツール']
            },
            materials: { us: ['Leather', 'Fabric', 'Velvet', 'Wood', 'Metal', 'Bamboo'], jp: ['本革', 'ファブリック', 'ベルベット', '木製', 'メタル', '竹製'] },
            features: { us: ['Recliner', 'Ergonomic', 'Foldable', 'With Storage', 'Adjustable Height'], jp: ['リクライニング', 'エルゴノミクス', '折りたたみ', '収納付き', '高さ調節'] }
        },
        daily: {
            icon: '🧴', name: { us: 'Daily Use', jp: '日用品' },
            items: {
                us: ['Laundry Detergent', 'Paper Towels', 'Trash Bags', 'Cleaning Spray', 'Sponges', 'Light Bulbs', 'Batteries', 'Extension Cord', 'Storage Bins', 'Hangers'],
                jp: ['洗濯洗剤', 'ペーパータオル', 'ゴミ袋', '掃除スプレー', 'スポンジ', '電球', '電池', '延長コード', '収納ボックス', 'ハンガー']
            }
        },
        baby: {
            icon: '👶', name: { us: 'Baby & Kids', jp: '母嬰' },
            items: {
                us: ['Stroller', 'Car Seat', 'Baby Monitor', 'Diaper Bag', 'High Chair', 'Baby Carrier', 'Crib', 'Diapers', 'Baby Wipes', 'Bottle Warmer', 'Toys 0-3', 'Toys 3-6'],
                jp: ['ベビーカー', 'チャイルドシート', 'ベビーモニター', 'マザーズバッグ', 'ハイチェア', '抱っこ紐', 'ベビーベッド', 'おむつ', 'おしりふき', '哺乳瓶ウォーマー', '知育玩具0-3歳', '知育玩具3-6歳']
            }
        },
        food: {
            icon: '🍱', name: { us: 'Food & Drinks', jp: '食品' },
            items: {
                us: ['Protein Powder', 'Coffee Beans', 'Tea', 'Snacks', 'Nuts', 'Chocolate', 'Energy Bars', 'Vitamins', 'Organic Food', 'Meal Replacement'],
                jp: ['プロテイン', 'コーヒー豆', 'お茶', 'お菓子', 'ナッツ', 'チョコレート', 'エナジーバー', 'ビタミン', 'オーガニック食品', '置き換え食']
            }
        },
        health: {
            icon: '💊', name: { us: 'Health', jp: '保健' },
            items: {
                us: ['Supplements', 'First Aid Kit', 'Blood Pressure Monitor', 'Thermometer', 'Massage Gun', 'Heating Pad', 'Eye Drops', 'Probiotics', 'Melatonin', 'Collagen'],
                jp: ['サプリメント', '救急セット', '血圧計', '体温計', 'マッサージガン', 'ホットパッド', '目薬', 'プロバイオティクス', 'メラトニン', 'コラーゲン']
            }
        },
        beauty: {
            icon: '✨', name: { us: 'Beauty', jp: '美妝' },
            items: {
                us: ['Skincare Set', 'Sunscreen', 'Moisturizer', 'Serum', 'Face Mask', 'Hair Dryer', 'Curling Iron', 'Makeup Brush Set', 'Lipstick', 'Foundation', 'Perfume', 'Nail Polish'],
                jp: ['スキンケアセット', '日焼け止め', '保湿クリーム', '美容液', 'フェイスマスク', 'ヘアドライヤー', 'コテ', 'メイクブラシセット', '口紅', 'ファンデーション', '香水', 'ネイル']
            }
        },
        outdoor: {
            icon: '🏕️', name: { us: 'Outdoor', jp: 'アウトドア' },
            items: {
                us: ['Backpack', 'Tent', 'Sleeping Bag', 'Hiking Boots', 'Water Bottle', 'Sunglasses', 'Camping Chair', 'Flashlight', 'Cooler', 'Bike Lock', 'Fishing Rod', 'Hammock'],
                jp: ['バックパック', 'テント', '寝袋', 'トレッキングシューズ', '水筒', 'サングラス', 'キャンプチェア', '懐中電灯', 'クーラーボックス', '自転車ロック', '釣り竿', 'ハンモック']
            }
        },
        fitness: {
            icon: '🏋️', name: { us: 'Fitness', jp: 'フィットネス' },
            items: {
                us: ['Yoga Mat', 'Dumbbells', 'Resistance Bands', 'Jump Rope', 'Foam Roller', 'Fitness Tracker', 'Running Shoes', 'Gym Bag', 'Workout Gloves', 'Pull-up Bar'],
                jp: ['ヨガマット', 'ダンベル', 'レジスタンスバンド', '縄跳び', 'フォームローラー', 'フィットネストラッカー', 'ランニングシューズ', 'ジムバッグ', 'トレーニンググローブ', '懸垂バー']
            }
        },
        fashion: {
            icon: '👔', name: { us: 'Fashion', jp: 'ファッション' },
            items: {
                us: ['T-Shirt', 'Jeans', 'Sneakers', 'Watch', 'Wallet', 'Backpack', 'Sunglasses', 'Belt', 'Jacket', 'Dress', 'Handbag', 'Jewelry'],
                jp: ['Tシャツ', 'ジーンズ', 'スニーカー', '腕時計', '財布', 'リュック', 'サングラス', 'ベルト', 'ジャケット', 'ワンピース', 'ハンドバッグ', 'アクセサリー']
            }
        },
        books: {
            icon: '📚', name: { us: 'Books', jp: '書籍' },
            items: {
                us: ['Best Sellers Fiction', 'Self-Help Books', 'Business Books', 'Cookbooks', 'Children Books', 'Manga', 'Kindle', 'Audiobooks', 'Textbooks', 'Art Books'],
                jp: ['ベストセラー小説', '自己啓発本', 'ビジネス書', '料理本', '児童書', '漫画', 'Kindle本', 'オーディオブック', '参考書', 'アート本']
            }
        },
        pets: {
            icon: '🐾', name: { us: 'Pets', jp: 'ペット' },
            items: {
                us: ['Dog Food', 'Cat Food', 'Dog Bed', 'Cat Tree', 'Pet Toys', 'Leash', 'Pet Carrier', 'Grooming Kit', 'Aquarium', 'Bird Cage'],
                jp: ['ドッグフード', 'キャットフード', '犬用ベッド', 'キャットタワー', 'ペットおもちゃ', 'リード', 'ペットキャリー', 'グルーミングセット', '水槽', '鳥かご']
            }
        },
        office: {
            icon: '📎', name: { us: 'Office', jp: 'オフィス' },
            items: {
                us: ['Desk Organizer', 'Printer', 'Ink Cartridge', 'Notebook', 'Pens', 'Whiteboard', 'Label Maker', 'Shredder', 'Desk Lamp', 'Ergonomic Chair'],
                jp: ['デスクオーガナイザー', 'プリンター', 'インクカートリッジ', 'ノート', 'ペン', 'ホワイトボード', 'ラベルライター', 'シュレッダー', 'デスクライト', 'エルゴチェア']
            }
        }
    };

    // Popular searches
    const popular = {
        us: ['AirPods Pro', 'Robot Vacuum', 'Air Fryer', 'Standing Desk', 'Kindle', 'Yoga Mat', 'Instant Pot', 'Ring Doorbell', 'Nintendo Switch', 'Protein Powder', 'LED Strip Lights', 'Portable Charger'],
        jp: ['AirPods Pro', 'ロボット掃除機', 'エアフライヤー', 'スタンディングデスク', 'Kindle', 'ヨガマット', '電気圧力鍋', 'スマートロック', 'Nintendo Switch', 'プロテイン', 'LEDテープライト', 'モバイルバッテリー']
    };

    // UI text
    const ui = {
        us: { catTitle: 'Categories', popularTitle: 'Popular Searches', searchPH: 'Search Amazon...', goText: 'Search on Amazon.com', pricePH: ['Min', 'Max'], currency: 'USD', rating: '★4+ only', matLabel: 'Material:', featLabel: 'Features:', priceLabel: 'Price:' },
        jp: { catTitle: 'カテゴリー', popularTitle: '人気の検索', searchPH: 'Amazonで検索...', goText: 'Amazon.co.jpで検索', pricePH: ['最低', '最高'], currency: 'JPY', rating: '★4以上のみ', matLabel: '素材:', featLabel: '特徴:', priceLabel: '価格:' }
    };

    // ===== State =====
    let selectedCategory = null;
    let selectedItem = null;
    let selectedMaterials = [];
    let selectedFeatures = [];

    // ===== DOM =====
    const $ = id => document.getElementById(id);

    function init() {
        renderUI();
        renderCategories();
        renderPopular();
        bindEvents();
    }

    function renderUI() {
        const t = ui[region];
        $('cat-title').textContent = t.catTitle;
        $('popular-title').textContent = t.popularTitle;
        $('search-input').placeholder = t.searchPH;
        $('go-text').textContent = t.goText;
        $('rating-text').textContent = t.rating;
        $('label-material').textContent = t.matLabel;
        $('label-features').textContent = t.featLabel;
        $('label-price').textContent = t.priceLabel;
        $('currency').textContent = t.currency;
        $('price-min').placeholder = t.pricePH[0];
        $('price-max').placeholder = t.pricePH[1];
    }

    function renderCategories() {
        let html = '';
        for (const key in data) {
            const cat = data[key];
            html += '<div class="tag" data-cat="' + key + '"><span class="tag-icon">' + cat.icon + '</span>' + cat.name[region] + '</div>';
        }
        $('main-categories').innerHTML = html;
    }

    function renderPopular() {
        let html = '';
        popular[region].forEach(function(term) {
            html += '<div class="popular-tag" data-term="' + term + '">' + term + '</div>';
        });
        $('popular-grid').innerHTML = html;
    }

    function showSubcategories(catKey) {
        selectedCategory = catKey;
        selectedItem = null;
        const cat = data[catKey];
        $('sub-title').textContent = cat.icon + ' ' + cat.name[region];
        let html = '';
        cat.items[region].forEach(function(item) {
            html += '<div class="tag" data-item="' + item + '">' + item + '</div>';
        });
        $('sub-categories').innerHTML = html;
        $('sub-section').style.display = 'block';

        // Show filters if category has materials/features
        if (cat.materials || cat.features) {
            $('filters-section').style.display = 'block';
            if (cat.materials) {
                $('filter-materials').style.display = 'flex';
                let mhtml = '';
                cat.materials[region].forEach(function(m) {
                    mhtml += '<div class="filter-tag" data-val="' + m + '">' + m + '</div>';
                });
                $('material-tags').innerHTML = mhtml;
            } else {
                $('filter-materials').style.display = 'none';
            }
            if (cat.features) {
                $('filter-features').style.display = 'flex';
                let fhtml = '';
                cat.features[region].forEach(function(f) {
                    fhtml += '<div class="filter-tag" data-val="' + f + '">' + f + '</div>';
                });
                $('feature-tags').innerHTML = fhtml;
            } else {
                $('filter-features').style.display = 'none';
            }
        } else {
            $('filters-section').style.display = 'block';
            $('filter-materials').style.display = 'none';
            $('filter-features').style.display = 'none';
        }

        // Show action
        $('action-section').style.display = 'block';
        updatePreview();

        // Highlight active category
        document.querySelectorAll('#main-categories .tag').forEach(function(el) {
            el.classList.toggle('active', el.getAttribute('data-cat') === catKey);
        });

        // Bind sub events
        document.querySelectorAll('#sub-categories .tag').forEach(function(el) {
            el.addEventListener('click', function() {
                selectedItem = this.getAttribute('data-item');
                document.querySelectorAll('#sub-categories .tag').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                updatePreview();
            });
        });

        // Bind material filter events
        document.querySelectorAll('#material-tags .filter-tag').forEach(function(el) {
            el.addEventListener('click', function() {
                this.classList.toggle('active');
                updateSelectedFilters();
                updatePreview();
            });
        });

        // Bind feature filter events
        document.querySelectorAll('#feature-tags .filter-tag').forEach(function(el) {
            el.addEventListener('click', function() {
                this.classList.toggle('active');
                updateSelectedFilters();
                updatePreview();
            });
        });
    }

    function updateSelectedFilters() {
        selectedMaterials = [];
        document.querySelectorAll('#material-tags .filter-tag.active').forEach(function(el) {
            selectedMaterials.push(el.getAttribute('data-val'));
        });
        selectedFeatures = [];
        document.querySelectorAll('#feature-tags .filter-tag.active').forEach(function(el) {
            selectedFeatures.push(el.getAttribute('data-val'));
        });
    }

    function hideSubcategories() {
        selectedCategory = null;
        selectedItem = null;
        selectedMaterials = [];
        selectedFeatures = [];
        $('sub-section').style.display = 'none';
        $('filters-section').style.display = 'none';
        $('action-section').style.display = 'none';
        document.querySelectorAll('#main-categories .tag').forEach(el => el.classList.remove('active'));
    }

    function buildKeywords() {
        // Free text takes priority
        const freeText = $('search-input').value.trim();
        if (freeText) return freeText;

        // Build from selections
        const parts = [];
        if (selectedItem) {
            parts.push(selectedItem);
        } else if (selectedCategory && data[selectedCategory]) {
            parts.push(data[selectedCategory].name[region]);
        }
        if (selectedMaterials.length > 0) parts.push(selectedMaterials.join(' '));
        if (selectedFeatures.length > 0) parts.push(selectedFeatures.join(' '));
        return parts.join(' ');
    }

    function buildUrl() {
        const kw = buildKeywords();
        if (!kw) return '';
        const base = region === 'us' ? BASE_US : BASE_JP;
        const tag = region === 'us' ? TAG_US : TAG_JP;
        let url = base + encodeURIComponent(kw);
        if (tag) url += '&tag=' + tag;

        // Rating
        if ($('rating-filter').checked) {
            url += '&rh=p_72%3A' + (region === 'us' ? '2661618011' : '2221615051');
        }

        // Price
        const pmin = $('price-min').value;
        const pmax = $('price-max').value;
        if (pmin || pmax) {
            const min = pmin ? (region === 'us' ? pmin + '00' : pmin) : '';
            const max = pmax ? (region === 'us' ? pmax + '00' : pmax) : '';
            url += '&rh=' + encodeURIComponent('p_36:' + min + '-' + max);
        }

        return url;
    }

    function updatePreview() {
        const kw = buildKeywords();
        if (kw) {
            $('preview-text').textContent = kw;
            $('action-section').style.display = 'block';
        } else if (selectedCategory) {
            $('preview-text').textContent = data[selectedCategory].name[region];
            $('action-section').style.display = 'block';
        }
    }

    function goToAmazon() {
        const url = buildUrl();
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }

    function bindEvents() {
        // Category clicks
        $('main-categories').addEventListener('click', function(e) {
            const tag = e.target.closest('.tag');
            if (!tag) return;
            const catKey = tag.getAttribute('data-cat');
            if (catKey === selectedCategory) {
                hideSubcategories();
            } else {
                showSubcategories(catKey);
            }
        });

        // Back button
        $('back-btn').addEventListener('click', hideSubcategories);

        // Search input
        $('search-input').addEventListener('input', function() {
            if (this.value.trim()) {
                $('action-section').style.display = 'block';
                updatePreview();
            }
        });
        $('search-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') goToAmazon();
        });

        // Search button
        $('search-btn').addEventListener('click', goToAmazon);

        // Go button
        $('go-btn').addEventListener('click', goToAmazon);

        // Price & rating changes
        $('price-min').addEventListener('input', updatePreview);
        $('price-max').addEventListener('input', updatePreview);
        $('rating-filter').addEventListener('change', updatePreview);

        // Popular tags
        $('popular-grid').addEventListener('click', function(e) {
            const tag = e.target.closest('.popular-tag');
            if (!tag) return;
            $('search-input').value = tag.getAttribute('data-term');
            $('action-section').style.display = 'block';
            updatePreview();
            goToAmazon();
        });
    }

    // ===== Start =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
