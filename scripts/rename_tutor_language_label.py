from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]/'i18n'/'tutor-ui-catalog.json'
d=json.loads(p.read_text(encoding='utf-8'))
translations={'zh-TW':'系統語言','zh-CN':'系统语言','en-US':'System language','ja-JP':'システム言語','ko-KR':'시스템 언어','fr-FR':'Langue du système','de-DE':'Systemsprache','es-ES':'Idioma del sistema','th-TH':'ภาษาของระบบ','vi-VN':'Ngôn ngữ hệ thống','id-ID':'Bahasa sistem','pt-BR':'Idioma do sistema','it-IT':'Lingua di sistema','ru-RU':'Язык системы','ar-SA':'لغة النظام','hi-IN':'सिस्टम भाषा','ms-MY':'Bahasa sistem','nl-NL':'Systeemtaal','pl-PL':'Język systemu','tr-TR':'Sistem dili'}
old='介面語言'
old_description='介面語言會套用到導師所有選單、按鈕、設定、教材與學習面板。'
new_description='系統語言會套用到導師所有選單、按鈕、設定、教材與學習面板。'
if '系統語言' not in d['items']: d['items'].append('系統語言')
if new_description not in d['items']: d['items'].append(new_description)
for locale,mapping in d['translations'].items():
    mapping['系統語言']=translations.get(locale, mapping.get(old, 'System language'))
    mapping[new_description]=mapping.get(old_description, mapping.get(new_description, 'This system language applies to all tutor menus, buttons, settings, materials, and learning panels.'))
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
print('system language label added:',len(d['translations']),'locales')
