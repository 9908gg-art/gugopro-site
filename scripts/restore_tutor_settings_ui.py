from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'tools' / 'ai' / 'english-speaking-tutor.html'
text = PAGE.read_text(encoding='utf-8')
faq = '<button aria-controls="ai-seo-help-drawer" aria-expanded="false" class="ai-seo-help-toggle" type="button"><span aria-hidden="true">ℹ️</span><span>說明與常見問題</span></button>'
if text.count(faq) != 1:
    raise SystemExit(f'expected one FAQ button, found {text.count(faq)}')
text = text.replace(faq, '', 1)
marker = '<div style="margin-top: auto; padding: 20px 20px 10px; text-align: center;">'
if text.count(marker) != 1:
    raise SystemExit(f'expected one side-menu footer marker, found {text.count(marker)}')
language = '''<div class="menu-section tutor-system-language-section">
<div class="menu-title">🌐 系統語言</div>
<select aria-label="選擇系統語言" class="lang-select" id="system-language-select"></select>
<small class="capsule-speech-mode-description">系統語言偏好會保存在本機，供導師介面使用。</small>
</div>
<div class="menu-section tutor-faq-section">'''
text = text.replace(marker, language + '\n' + faq + '\n</div>\n' + marker, 1)
css_marker = '<link href="/tools/seo-content.css" rel="stylesheet"/>'
css = '''<style>
.side-menu .tutor-faq-section { margin-top: 10px; padding: 0 20px; }
.side-menu .tutor-faq-section .ai-seo-help-toggle { position: static; top: auto; right: auto; z-index: auto; width: 100%; box-sizing: border-box; justify-content: center; }
</style>'''
if css not in text:
    text = text.replace(css_marker, css + css_marker, 1)
js_marker = '    function renderMaterialBannerV2() {'
js = '''    function setupTutorSystemLanguage() {
        const select = document.getElementById('system-language-select');
        if (!select) return;
        const key = 'gugopro_tutor_system_language_v1';
        let saved = 'zh-TW';
        try { saved = localStorage.getItem(key) || saved; } catch (_) {}
        populateLanguageSelect(select, Object.prototype.hasOwnProperty.call(LANG_NAMES, saved) ? saved : 'zh-TW');
        select.addEventListener('change', () => {
            try { localStorage.setItem(key, select.value); } catch (_) {}
            document.documentElement.dataset.tutorSystemLanguage = select.value;
            window.dispatchEvent(new CustomEvent('gugopro:tutor-system-language-change', { detail: { language: select.value } }));
        });
        document.documentElement.dataset.tutorSystemLanguage = select.value;
    }

'''
if js not in text:
    if js_marker not in text:
        raise SystemExit('missing JS insertion marker')
    text = text.replace(js_marker, js + js_marker, 1)
call_marker = '        populateLanguageSelect(document.getElementById(\'word-lookup-lang\'), document.getElementById(\'my-lang\')?.value || \'zh-TW\');'
call = call_marker + '\n        setupTutorSystemLanguage();'
if 'setupTutorSystemLanguage();' not in text:
    if call_marker not in text:
        raise SystemExit('missing bind call marker')
    text = text.replace(call_marker, call, 1)
PAGE.write_text(text, encoding='utf-8')
print('restored settings language selector and moved FAQ button')
