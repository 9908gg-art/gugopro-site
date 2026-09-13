from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'docs' / 'tutor-ui-source-strings.json'
data = json.loads(path.read_text(encoding='utf-8'))
existing = {item['text'] for item in data['items']}
extras = [
    '歡迎使用 AI 語言導師！',
    '底部輸入列固定在畫面最下方，支援多行文字；Enter 發送、Shift＋Enter 換行',
    '紙夾可導入 TXT、Markdown、PDF 教材，並綁定目前教室',
    '選取歷史對話中的單字，可查意思、重聽發音並加入生詞字典',
    '設定中可建立多本生詞字典，為每個教室選擇教材與字典學習清單',
    '可指定旅遊、點餐、商務等主題，或依教材進行問答、複習與測驗',
    '頂部語言選單可設定對話語言；右上角選單可管理教室、教材與模型',
    '語音可選點擊開始再點擊停止，或自動等待停頓（預設 6 秒，可在設定調整）',
    '一般對話', '未設定學習清單', '管理教材與字典', '重新命名', '刪除教室',
    '按住按鈕，放開送出', '點擊開始，再點擊停止', '自動等待停頓後送出',
    '自動等待秒數', '按下語音時播放啟動提示音',
    '點擊語音按鈕開始，停頓設定秒數後自動送出；重新說話會取消倒數並繼續錄音。',
    '目前使用模型：載入中…', '正在載入站內免費模型清單...', '正在更新站內免費模型清單...',
    '配額重置倒數：計算中…', '📊 今日免費用量上限', '讀取中…', '⚡ 今日已使用量',
    '暫無可用額度', '目前使用模型：', '剩餘', '次',
    '如何安裝對應語音', 'Windows：新增文字轉語音語言', 'Android：安裝語音資料',
    'macOS：下載其他語音', '重新檢查語音', '發送', '朗讀 AI 訊息', '刪除訊息',
    '學習語言發話與發音評分', '母語提問，不進行發音評分',
    '停頓 6 秒自動送出，重新說話會繼續錄音；也可直接打字',
    '設定您的 API Key', '本工具使用 Google Gemini AI。請輸入您的 API Key 以開始對話。',
    '👉 還沒有 API Key？點此觀看教學', '貼上您的 Gemini API Key', '儲存並開始',
]
for text in extras:
    if text not in existing:
        data['items'].append({'kind': 'dynamic-text', 'text': text})
        existing.add(text)
path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'interface strings: {len(data["items"])}')
