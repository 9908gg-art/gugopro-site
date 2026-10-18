#!/usr/bin/env python3
"""Normalize mapped SEO title/H1 text while preserving unrelated HTML payloads."""
from pathlib import Path
from bs4 import BeautifulSoup
import html
import re

ROOT = Path(__file__).resolve().parents[1]
SEO_MAPPING = {'index.html': {'title': 'GugoPro 工具箱｜YouTube 雙語學習、AI 對話翻譯與 TDEE 減脂計算器', 'h1': 'GugoPro 生產力與生活決策工具箱'},
 'index_en.html': {'title': 'GugoPro Hub | Client-Side AI, YouTube Study & TDEE Health Tools',
                   'h1': 'GugoPro Browser Tools & Methodology Hub'},
 'index_ja.html': {'title': 'GugoPro ツールボックス｜YouTube 2言語字幕学習・AI対話翻訳・TDEE計算機',
                   'h1': 'GugoPro ブラウザ完結型・生産性ツールボックス'},
 'tools/english/l-player-study.html': {'title': 'YouTube 雙語跟讀播放器｜精聽聽寫、字幕遮罩與影子口說 - GugoPro L-Player',
                                       'h1': 'YouTube 雙語精聽、聽寫與影子跟讀學習機'},
 'tools/ai-media/ai-video-tracker.html': {'title': 'YouTube 續集與新季追蹤器｜跨頻道自動找下一集、新季數與短劇連載 - GugoPro',
                                          'h1': 'YouTube 續集與新季追蹤器'},
 'tools/ai/english-speaking-tutor.html': {'title': 'AI 多國語言口說對話導師｜19國情境模擬、發音評分與自訂教材 - GugoPro',
                                          'h1': 'AI 多國語言情境口說對話導師'},
 'tools/ai/realtime-translator.html': {'title': '出國旅遊即時語音翻譯機｜180° 面對面雙向翻轉對話免安裝 - GugoPro',
                                       'h1': '出國旅遊即時語音翻譯機：180° 面對面雙向對話'},
 'tools/ai/tarot-master.html': {'title': 'AI 塔羅大師｜免費線上抽牌、五大牌陣解讀與每日感情工作指引 - GugoPro',
                                'h1': 'AI 塔羅大師：結構化牌陣抽牌與生活決策反思'},
 'tools/ai/ziwei-astrology.html': {'title': 'AI 紫微斗數大師｜免費線上排盤、十二宮位動態解盤與流年合盤 - GugoPro',
                                   'h1': 'AI 紫微斗數大師：線上排盤與十二宮位現代解讀'},
 'tools/health/tdee-macros-calculator.html': {'title': 'AI 專屬營養師｜TDEE 減脂熱量計算機、BMR 與三大營養素拍餐管理 - GugoPro',
                                              'h1': 'AI 專屬營養師：TDEE 減脂熱量計算機與三大營養素拍餐分析'},
 'tools/health/weight-loss-planner.html': {'title': 'AI 減肥瘦身教練｜科學減重計畫、熱量赤字試算與停滯期動態管理 - GugoPro',
                                           'h1': 'AI 減肥瘦身教練：科學減重計畫與動態熱量赤字管理'},
 'tools/ai/amazon-product-research.html': {'title': 'Amazon AI 智慧選品助手｜競品差評挖掘、規格矩陣與藍海選品分析 - GugoPro',
                                           'h1': 'Amazon AI 智慧選品助手：差評痛點挖掘與規格矩陣分析'},
 'tools/tutorials/how-to-get-gemini-api-key.html': {'title': 'Gemini API Key 申請教學｜Google AI Studio '
                                                             '免費金鑰取得與安全設定 - GugoPro',
                                                    'h1': 'Google Gemini API Key 快速申請與安全設定手冊'},
 'tools/pdf/pdf-suite.html': {'title': 'PDF 全能工作站｜免安裝線上閱讀、合併、分割與轉檔 - GugoPro', 'h1': 'PDF 全能工作站：瀏覽器本機隱私處理工具'},
 'tools/tw-market/taiwan-pair-trading.html': {'title': '台股與期貨配對交易掃描儀｜統計套利與價差策略分析 - GugoPro',
                                              'h1': '台股與期貨配對交易掃描工作站'},
 'articles/youtube-english-listening-and-shadowing-guide.html': {'title': 'YouTube 雙語精聽與影子跟讀全書：L-Player '
                                                                          '操作與神經聽覺重塑｜GugoPro',
                                                                 'h1': 'YouTube 雙語精聽與影子跟讀：L-Player '
                                                                       '零摩擦學習系統操作全書'},
 'articles/youtube-listening-connected-speech-guide.html': {'title': '看 YouTube '
                                                                     '學英文為何聽不懂？音韻知覺與聽寫差量比對全指南｜GugoPro',
                                                            'h1': '破解英語聽力盲區：語流音變、聽寫差量比對與影子跟讀自學指南'},
 'articles/shadowing-with-ai-tutor.html': {'title': '擺脫「啞巴英語」科學自學法：影子跟讀、CEFR 輸出與 AI 導師｜GugoPro',
                                           'h1': '擺脫啞巴英語的科學自學法：影子跟讀、CEFR 輸出與 AI 即時回饋閉環'},
 'articles/tblt-with-ai-tutor.html': {'title': '告別死背單字文法！任務型語言教學 (TBLT) 與 AI 口說實戰手冊｜GugoPro',
                                      'h1': '任務型語言教學 (TBLT) 實戰全指南：用 AI 打造沉浸式口說任務卡'},
 'articles/affective-filter-with-ai-tutor.html': {'title': '克服開口恐懼的心理學：克拉申情意濾網假說與 AI 零壓力口說｜GugoPro',
                                                  'h1': '克服外語開口焦慮 (FLA)：情意濾網假說與 AI 導師的零壓力脫敏閉環'},
 'articles/youtube-sequel-tracker-guide.html': {'title': '2026 YouTube 演算法與連載檢索：NLP 去噪與跨頻道追劇指南｜GugoPro',
                                                'h1': 'YouTube 演算法與連載檢索指南：破解推薦漏片與跨頻道續集追蹤技術'},
 'articles/how-to-master-tarot-guide.html': {'title': '如何成為塔羅牌大師？78張牌古典符號學與直覺流動解牌全指南｜GugoPro',
                                             'h1': '如何成為塔羅牌大師：從死記牌義到直覺流動解牌的刻意練習指南'},
 'articles/tarot-decision-framework.html': {'title': '告別迷信宿命論！榮格原型心理學、共時性與 AI 塔羅決策模型｜GugoPro',
                                            'h1': '榮格原型心理學與結構化塔羅：職涯二選一與感情焦慮的理性決策模型'},
 'articles/how-to-master-ziwei-guide.html': {'title': '如何成為紫微斗數大師？百顆星曜文化符號學與動態格局解盤｜GugoPro',
                                             'h1': '如何成為紫微斗數大師：從死背星曜到動態格局解盤的系統動力學手冊'},
 'articles/modern-ziwei-guide.html': {'title': '告別玄學恐嚇！現代心理學重構紫微斗數：十二宮位與四化反思｜GugoPro',
                                      'h1': '用現代心理學重構紫微斗數：解鎖十二宮位、四化動態與人際合盤反思'},
 'articles/tdee-and-macros-guide.html': {'title': '告別溜溜球效應！TDEE 熱量計算、三大營養素與外食拍餐指南｜GugoPro',
                                         'h1': 'TDEE 與三大營養素精準調控全指南：能量平衡熱力學與外食減脂手冊'},
 'articles/diabetes-and-insulin-resistance-guide.html': {'title': '糖尿病前期與胰島素阻抗怎麼吃？GI/GL 值與碳水計數全指南｜GugoPro',
                                                         'h1': '糖尿病前期與胰島素阻抗飲食指南：從升糖指數 (GI/GL) 到進食順序控糖'},
 'articles/fatty-liver-and-mediterranean-diet-guide.html': {'title': '脂肪肝怎麼逆轉？減醣與改良地中海飲食外食健康實戰手冊｜GugoPro',
                                                            'h1': '逆轉脂肪肝 (MASLD) 全指南：減醣地中海飲食黃金配比與外食避坑手冊'},
 'articles/weight-loss-planner-guide.html': {'title': '告別7700大卡迷思！動態熱量赤字與突破減重停滯期全指南｜GugoPro',
                                             'h1': '告別線性減重迷思：Wishnofsky 法則失真、動態減脂計畫與停滯期突破'},
 'articles/carb-cycling-and-home-workout-guide.html': {'title': '碳水循環法怎麼吃？高低碳日生化機制與居家燃脂課表全攻略｜GugoPro',
                                                       'h1': '碳水循環法 (Carb Cycling) 減脂攻略：高低碳日生化機制與增肌防掉肉課表'},
 'articles/intermittent-fasting-and-calorie-deficit-guide.html': {'title': '168 '
                                                                           '斷食真的比算熱量有效嗎？自噬反應真相與熱量赤字指南｜GugoPro',
                                                                  'h1': '168 斷食與熱量赤字真相對決：揭密自噬反應、皮質醇危機與防復胖課表'},
 'articles/travel-translator-guide.html': {'title': '告別尷尬遞手機！180° 對向翻轉介面與出國即時語音翻譯手冊｜GugoPro',
                                           'h1': '告別尷尬遞手機：180° 面對面翻轉介面設計美學與出國旅遊溝通實戰'},
 'articles/gemini-api-free-tier-and-developer-guide.html': {'title': '2026 Google Gemini 免費 API '
                                                                     '開發手冊：架構設計與429錯誤排查｜GugoPro',
                                                            'h1': 'Google Gemini 官方免費 API 開發者手冊：零成本商用架構與高可用 '
                                                                  'Failover'},
 'articles/amazon-ai-product-research-guide.html': {'title': '2026 Amazon 跨境選品全指南：AI 語意反向工程與差評痛點挖掘｜GugoPro',
                                                    'h1': '跨境電商 Amazon AI 爆款選品指南：利用語意反向工程與差評痛點逆向研發'},
 'en/articles/youtube-english-listening-and-shadowing-guide.html': {'title': 'YouTube Bilingual Listening & '
                                                                             'Shadowing Guide: L-Player '
                                                                             'Mastery | GugoPro',
                                                                    'h1': 'YouTube Bilingual Listening & '
                                                                          'Shadowing: L-Player System '
                                                                          'Blueprint'},
 'en/articles/youtube-listening-connected-speech-guide.html': {'title': 'Why Watching YouTube Fails for '
                                                                        'English: Speech Perception & '
                                                                        'Dictation | GugoPro',
                                                               'h1': 'Overcoming English Listening Plateaus: '
                                                                     'Connected Speech & Dictation Diff'},
 'en/articles/shadowing-with-ai-tutor.html': {'title': 'Overcoming Mute English: Shadowing, CEFR Output & AI '
                                                       'Tutoring | GugoPro',
                                              'h1': 'Science-Backed Autonomous Speaking: Shadowing, CEFR '
                                                    'Output & AI Dialogue'},
 'en/articles/tblt-with-ai-tutor.html': {'title': 'Task-Based Language Teaching (TBLT): High-Impact Speaking '
                                                  'with AI | GugoPro',
                                         'h1': 'Beyond Rote Memorization: Task-Based Language Teaching '
                                               '(TBLT) with AI'},
 'en/articles/affective-filter-with-ai-tutor.html': {'title': "Overcoming Speaking Fear: Krashen's Affective "
                                                              'Filter & AI Tutoring | GugoPro',
                                                     'h1': 'Overcoming Foreign Language Anxiety: Affective '
                                                           'Filter & Zero-Pressure AI'},
 'en/articles/youtube-sequel-tracker-guide.html': {'title': '2026 YouTube Algorithm & Sequel Retrieval: NLP '
                                                            '& Diff Tracking | GugoPro',
                                                   'h1': 'YouTube Recommendation Architecture & Client-Side '
                                                         'Sequel Retrieval'},
 'en/articles/how-to-master-tarot-guide.html': {'title': 'How to Master Tarot: Classical Semiotics & '
                                                         'Intuitive Reading | GugoPro',
                                                'h1': 'Mastering Tarot: From Rote Memorization to Intuitive '
                                                      'Flow Reading with AI'},
 'en/articles/tarot-decision-framework.html': {'title': 'Tarot Decision Framework: Jungian Archetypes & '
                                                        'Synchronicity | GugoPro',
                                               'h1': 'Deconstructing Dilemmas: Jungian Archetypal Psychology '
                                                     '& AI Tarot Decisions'},
 'en/articles/how-to-master-ziwei-guide.html': {'title': 'How to Master Zi Wei Dou Shu: Dynamic Natal Chart '
                                                         'Reading | GugoPro',
                                                'h1': 'Mastering Zi Wei Dou Shu: From 108 Stars to Dynamic '
                                                      'Pattern Chart Reading'},
 'en/articles/modern-ziwei-guide.html': {'title': 'Modernizing Zi Wei Dou Shu: Twelve Palaces & '
                                                  'Psychological Growth | GugoPro',
                                         'h1': 'Reconstructing Zi Wei Dou Shu with Modern Psychology: Twelve '
                                               'Palaces & Si-Hua'},
 'en/articles/tdee-and-macros-guide.html': {'title': 'Defeat Yo-Yo Dieting: The Complete Science Guide to '
                                                     'TDEE & Macros | GugoPro',
                                            'h1': 'Mastering TDEE & Macronutrients: Energy Balance '
                                                  'Thermodynamics & Dining Out'},
 'en/articles/diabetes-and-insulin-resistance-guide.html': {'title': 'Prediabetes & Insulin Resistance Diet '
                                                                     'Guide: GI/GL & Carb Control | GugoPro',
                                                            'h1': 'What to Eat for Prediabetes & Insulin '
                                                                  'Resistance: GI/GL & Carb Counting'},
 'en/articles/fatty-liver-and-mediterranean-diet-guide.html': {'title': 'Reversing Fatty Liver: Low-Carb vs. '
                                                                        'Mediterranean Diet Handbook | '
                                                                        'GugoPro',
                                                               'h1': 'What to Eat to Reverse Fatty Liver '
                                                                     '(MASLD): Mediterranean Diet & Fat '
                                                                     'Loss'},
 'en/articles/weight-loss-planner-guide.html': {'title': 'Beyond 7,700 kcal Myth: Dynamic Caloric Deficit & '
                                                         'Plateau Guide | GugoPro',
                                                'h1': 'Beyond Linear Weight Loss Myths: Kevin Hall Dynamic '
                                                      'Balance & Plateau Buster'},
 'en/articles/carb-cycling-and-home-workout-guide.html': {'title': 'Master Carb Cycling for Fat Loss: '
                                                                   'High/Low Days & Home Workouts | GugoPro',
                                                          'h1': 'How to Master Carb Cycling for Maximum Fat '
                                                                'Loss: Biochemistry & Bodyweight'},
 'en/articles/intermittent-fasting-and-calorie-deficit-guide.html': {'title': 'Is 16:8 Fasting Better Than '
                                                                              'Counting Calories? Autophagy '
                                                                              'Truth | GugoPro',
                                                                     'h1': 'Is 16:8 Intermittent Fasting '
                                                                           'Really Better Than Counting '
                                                                           'Calories? Science Decoded'},
 'en/articles/travel-translator-guide.html': {'title': 'No More Passing Phones: 180° Flipped Screen Travel '
                                                       'Translator | GugoPro',
                                              'h1': 'Say Goodbye to Awkward Phone-Passing! 180° Face-to-Face '
                                                    'Flipped UI Design'},
 'en/articles/gemini-api-free-tier-and-developer-guide.html': {'title': '2026 Google Gemini Free API '
                                                                        'Developer Blueprint & Rate Limits | '
                                                                        'GugoPro',
                                                               'h1': 'Building Zero-Cost Commercial Apps '
                                                                     'with Gemini Free API: Architecture & '
                                                                     'Failover'},
 'en/articles/amazon-ai-product-research-guide.html': {'title': '2026 Amazon AI Product Research: Review '
                                                                'Mining & Listing Guide | GugoPro',
                                                       'h1': 'Amazon AI Product Research Guide: Semantic '
                                                             'Reverse Engineering & Review Mining'},
 'ja/articles/youtube-english-listening-and-shadowing-guide.html': {'title': 'YouTube '
                                                                             '英語精聴＆シャドーイング完全ガイド：L-Player '
                                                                             '学習法｜GugoPro',
                                                                    'h1': 'YouTube 英語精聴・シャドーイング完全手引：L-Player '
                                                                          '操作と聴覚神経回路'},
 'ja/articles/youtube-listening-connected-speech-guide.html': {'title': 'YouTube '
                                                                        '英語学習が挫折する真の理由：音韻知覚とディクテーション｜GugoPro',
                                                               'h1': 'YouTube '
                                                                     '英語リスニング挫折の真相：音声変化の解読とディクテーション差分'},
 'ja/articles/shadowing-with-ai-tutor.html': {'title': '「話せない英語」脱却の科学的自学法：シャドーイングと AI 対話｜GugoPro',
                                              'h1': '「話せない英語」にサヨナラ！シャドーイングと CEFR 文脈出力の AI 閉ループ'},
 'ja/articles/tblt-with-ai-tutor.html': {'title': '丸暗記を脱するタスク型教授法 (TBLT)：AI 英会話実践ハンドブック｜GugoPro',
                                         'h1': '丸暗記にサヨナラ！タスク型教授法 (TBLT) と AI スピーキング実践ガイド'},
 'ja/articles/affective-filter-with-ai-tutor.html': {'title': '英語を話す恐怖を克服する心理学：情意フィルターと AI チューター｜GugoPro',
                                                     'h1': '話す恐怖を克服する心理学：情意フィルター仮説と AI ゼロ圧力スピーキング'},
 'ja/articles/youtube-sequel-tracker-guide.html': {'title': '2026年 YouTube アルゴリズムとシリーズ検索：NLP 差分追跡｜GugoPro',
                                                   'h1': 'YouTube 動画推薦アルゴリズムとシリーズ検索完全ガイド：推薦漏れの解消'},
 'ja/articles/how-to-master-tarot-guide.html': {'title': 'タロットマスターへの道：78枚の記号論と直観的リーディング｜GugoPro',
                                                'h1': 'タロットマスターへの道：78枚の丸暗記を脱し直観的フロー・リーディングへ'},
 'ja/articles/tarot-decision-framework.html': {'title': '迷信からの脱却！ユング元型心理学・共時性と AI タロット決断｜GugoPro',
                                               'h1': '宿命論を打破する！ユング元型心理学と AI タロットによる意思決定モデル'},
 'ja/articles/how-to-master-ziwei-guide.html': {'title': '紫微斗数マスターへの道：文化記号論と動的命盤解読の極意｜GugoPro',
                                                'h1': '紫微斗数マスターへの道：星の丸暗記を脱し動態格局解盤へ至る実践手引'},
 'ja/articles/modern-ziwei-guide.html': {'title': '現代心理学で再構築する紫微斗数：十二宮位と四化の自己対話｜GugoPro',
                                         'h1': '宿命論と恐嚇占いにサヨナラ！現代心理学で再構築する紫微斗数と合盤'},
 'ja/articles/tdee-and-macros-guide.html': {'title': 'リバウンドを完全に卒業！TDEE 計算と PFC バランス管理完全手引｜GugoPro',
                                            'h1': '無駄な食事制限とリバウンドを卒業！TDEE ＆ PFC バランス精密調整バイブル'},
 'ja/articles/diabetes-and-insulin-resistance-guide.html': {'title': '糖尿病予備群・インスリン抵抗性の食事管理：GI/GL値と糖質調整｜GugoPro',
                                                            'h1': '糖尿病予備群・インスリン抵抗性の食事法：血糖値スパイクを防ぐ栄養素管理'},
 'ja/articles/fatty-liver-and-mediterranean-diet-guide.html': {'title': '脂肪肝を逆転する食事法：減糖＆地中海食の外食実践バイブル｜GugoPro',
                                                               'h1': '脂肪肝 (MASLD) を逆転する減糖＆地中海食：内臓脂肪燃焼と PFC '
                                                                     '黄金比率'},
 'ja/articles/weight-loss-planner-guide.html': {'title': '7700kcal 神話の崩壊！動的カロリー赤字と減量停滞期突破手引｜GugoPro',
                                                'h1': '直線的減量神話の崩壊：動的減量計画、筋トレ期分けと停滞期打破の科学'},
 'ja/articles/carb-cycling-and-home-workout-guide.html': {'title': 'カーボサイクル減脂法：高・低炭水化物日と自宅自重筋トレ攻略｜GugoPro',
                                                          'h1': '炭水化物循環法（カーボサイクル）完全減脂ガイド：生化学機序と筋分解防止'},
 'ja/articles/intermittent-fasting-and-calorie-deficit-guide.html': {'title': '168断食はカロリー計算より痩せるか？オートファジーの真実｜GugoPro',
                                                                     'h1': '168断食はカロリー計算より本当に痩せるのか？オートファジーとリバウンドの罠'},
 'ja/articles/travel-translator-guide.html': {'title': 'スマホ手渡しにサヨナラ！180° 対面反転海外旅行音声翻訳手引｜GugoPro',
                                              'h1': 'スマホの気まずい手渡しにサヨナラ！180°対面反転UIのデザイン美学と旅行会話'},
 'ja/articles/gemini-api-free-tier-and-developer-guide.html': {'title': '2026年 Gemini '
                                                                        '無料API開発ハンドブック：429エラー完全対策｜GugoPro',
                                                               'h1': 'Google Gemini '
                                                                     '公式無料API開発者完全攻略：商用アーキテクチャと自動縮退'},
 'ja/articles/amazon-ai-product-research-guide.html': {'title': '2026 越境EC Amazon 商品選定：AI '
                                                                '意味論リサーチと低評価分析｜GugoPro',
                                                       'h1': '2026 越境EC・高精度リサーチ完全攻略：AIセマンティック反向工学とVOC痛点分析'}}

# Existing prominent guide headings are the right semantic H1 location on these pages.
H2_TO_H1_IDS = {
    'tools/ai/tarot-master.html': 'tarot-guide-title',
    'tools/health/tdee-macros-calculator.html': 'nutrition-guide-title',
    'tools/health/weight-loss-planner.html': 'weight-loss-seo-title',
}


def protected_payload(text):
    scripts = re.findall(r'<script\b[^>]*>.*?</script\s*>', text, re.I | re.S)
    jsonld = re.findall(r'<script\b(?=[^>]*\btype=["\']application/ld\+json["\'])[^>]*>.*?</script\s*>', text, re.I | re.S)
    ads = [line for line in text.splitlines() if re.search(r'pagead2\.googlesyndication\.com|ca-pub-|adsbygoogle', line, re.I)]
    return scripts, jsonld, ads


def clean_text(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)) if node else ''


def locate_tags(text, tag_name):
    """Return source spans for real HTML elements, ignoring comments and script text."""
    from html.parser import HTMLParser
    class Locator(HTMLParser):
        def __init__(self, source):
            super().__init__(convert_charrefs=False)
            self.source = source
            self.spans = []
            self.line_offsets = [0]
            for line in source.splitlines(keepends=True):
                self.line_offsets.append(self.line_offsets[-1] + len(line))
        def handle_starttag(self, tag, attrs):
            if tag.lower() != tag_name.lower():
                return
            line, col = self.getpos()
            start = self.line_offsets[line - 1] + col
            opening = self.get_starttag_text()
            open_end = start + len(opening)
            close_match = re.search(r'</\s*' + re.escape(tag_name) + r'\s*>', self.source[open_end:], re.I)
            if not close_match:
                raise RuntimeError(f'Unclosed <{tag_name}> at line {line}')
            close_start = open_end + close_match.start()
            close_end = open_end + close_match.end()
            self.spans.append((start, open_end, close_start, close_end, opening))
    parser = Locator(text)
    parser.feed(text)
    return parser.spans


def set_title(text, value, rel):
    spans = locate_tags(text, 'title')
    if not spans:
        raise RuntimeError(f'{rel}: no title tag found')
    escaped = html.escape(value, quote=False)
    # A few legacy pages contain duplicate title elements; normalize each without removing structure.
    for _, open_end, close_start, _, _ in reversed(spans):
        text = text[:open_end] + escaped + text[close_start:]
    return text


def set_existing_h1(text, value, rel):
    spans = locate_tags(text, 'h1')
    if len(spans) != 1:
        raise RuntimeError(f'{rel}: expected exactly one existing h1, found {len(spans)}')
    _, open_end, close_start, _, _ = spans[0]
    return text[:open_end] + html.escape(value, quote=False) + text[close_start:]


def promote_heading(text, rel, heading_id, value):
    spans = locate_tags(text, 'h2')
    matches = []
    for span in spans:
        opening = span[4]
        if re.search(r'\bid\s*=\s*(["\'])' + re.escape(heading_id) + r'\1', opening, re.I):
            matches.append(span)
    if len(matches) != 1:
        raise RuntimeError(f'{rel}: expected one main h2 #{heading_id}, found {len(matches)}')
    start, open_end, close_start, close_end, opening = matches[0]
    new_open = re.sub(r'^<h2\b', '<h1', opening, count=1, flags=re.I)
    if rel == 'tools/ai/tarot-master.html' and not re.search(r'\bstyle\s*=', new_open, re.I):
        new_open = new_open[:-1] + ' style="font-size:1.5em;margin-block-start:0.83em;margin-block-end:0.83em;">'
    replacement = new_open + html.escape(value, quote=False) + '</h1>'
    return text[:start] + replacement + text[close_end:]

def insert_visible_h1(text, rel, value):
    if rel != 'tools/ai/english-speaking-tutor.html':
        raise RuntimeError(f'{rel}: no explicit visible-H1 insertion rule')
    pattern = re.compile(r'<main\b(?=[^>]*\bid\s*=\s*(["\'])chat-container\1)[^>]*>', re.I)
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise RuntimeError(f'{rel}: expected one chat-container main, found {len(matches)}')
    heading = ('<h1 class="seo-page-title" style="box-sizing:border-box;width:100%;max-width:1200px;'
               'margin:12px auto;padding:0 18px;color:var(--text-main);font-size:1.15rem;'
               'font-weight:700;line-height:1.35;overflow-wrap:anywhere;">' +
               html.escape(value, quote=False) + '</h1>\n')
    pos = matches[0].start()
    return text[:pos] + heading + text[pos:]


def main():
    missing = [rel for rel in SEO_MAPPING if not (ROOT / rel).is_file()]
    if missing:
        raise SystemExit('Missing mapped files: ' + ', '.join(missing))
    updated = []
    for rel, meta in SEO_MAPPING.items():
        path = ROOT / rel
        original = path.read_text(encoding='utf-8')
        soup_before = BeautifulSoup(original, 'html.parser')
        if not soup_before.title:
            raise RuntimeError(f'{rel}: title missing before update')
        if len(soup_before.find_all('h1')) > 1:
            raise RuntimeError(f'{rel}: multiple h1 tags before update')
        before_protected = protected_payload(original)
        content = set_title(original, meta['title'], rel)
        if soup_before.find('h1'):
            content = set_existing_h1(content, meta['h1'], rel)
        elif rel in H2_TO_H1_IDS:
            # Preserve the main visible heading location and existing attributes.
            if rel == 'tools/health/tdee-macros-calculator.html':
                content = content.replace('.nutrition-seo-guide h2 {', '.nutrition-seo-guide h1, .nutrition-seo-guide h2 {')
            elif rel == 'tools/health/weight-loss-planner.html':
                content = content.replace('.weight-loss-seo-guide h2 {', '.weight-loss-seo-guide h1, .weight-loss-seo-guide h2 {')
            content = promote_heading(content, rel, H2_TO_H1_IDS[rel], meta['h1'])
        else:
            content = insert_visible_h1(content, rel, meta['h1'])
        if protected_payload(content) != before_protected:
            raise RuntimeError(f'{rel}: script/JSON-LD/AdSense payload changed unexpectedly')
        soup_after = BeautifulSoup(content, 'html.parser')
        if clean_text(soup_after.title) != meta['title']:
            raise RuntimeError(f'{rel}: title verification failed')
        h1s = soup_after.find_all('h1')
        if len(h1s) != 1 or clean_text(h1s[0]) != meta['h1']:
            raise RuntimeError(f'{rel}: H1 verification failed ({len(h1s)} H1s, {clean_text(h1s[0]) if h1s else "none"})')
        path.write_text(content, encoding='utf-8')
        updated.append(rel)
        print('UPDATED', rel)
    print(f'SUCCESS: updated and verified {len(updated)} / {len(SEO_MAPPING)} mapped files')

if __name__ == '__main__':
    main()
