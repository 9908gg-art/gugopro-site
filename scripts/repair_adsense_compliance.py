#!/usr/bin/env python3
from pathlib import Path
import re, os

ROOT = Path(__file__).resolve().parents[1]
LANGS = {
    'en': {'html':'en','home':'Home','privacy':'Privacy Policy','terms':'Terms of Service','contact':'Contact Us','about':'About GugoPro','disclaimer':'Disclaimer','email_intro':'For privacy requests, technical support and partnerships, contact','cookie':'This site uses cookies for essential operation, Google Analytics 4 for aggregate usage analysis, and Google AdSense or similar third-party advertising technologies when enabled. You can manage or disable cookies in your browser settings; disabling cookies may affect some features. Google may use its own advertising cookies and you can manage personalised advertising at Google Ads Settings.','body':'GugoPro provides browser-first utilities, educational articles and interactive tools. We aim to explain what each tool does, how to use it, and how data is handled. Files processed by browser-local tools are not uploaded to GugoPro unless a page explicitly says otherwise.','updated':'September 21, 2026'},
    'ja': {'html':'ja','home':'ホーム','privacy':'プライバシーポリシー','terms':'利用規約','contact':'お問い合わせ','about':'GugoProについて','disclaimer':'免責事項','email_intro':'プライバシーに関する依頼、技術サポート、提携については、次のメールアドレスへご連絡ください。','cookie':'本サイトは、基本機能のためのCookie、利用状況を集計するGoogle Analytics 4、また有効化された場合はGoogle AdSenseなど第三者広告の技術を使用します。Cookieはブラウザ設定から管理または無効化できます。無効化すると一部機能に影響する場合があります。パーソナライズ広告はGoogle広告設定で管理できます。','body':'GugoProは、ブラウザで利用できる便利なツール、学習記事、インタラクティブな計算機を提供します。各ツールの目的、使い方、データの扱いを明確に説明することを目指しています。ブラウザ内で処理するツールのファイルは、明示がない限りGugoProへアップロードされません。','updated':'2026年9月21日'},
    'de': {'html':'de','home':'Startseite','privacy':'Datenschutzerklärung','terms':'Nutzungsbedingungen','contact':'Kontakt','about':'Über GugoPro','disclaimer':'Haftungsausschluss','email_intro':'Für Datenschutzanfragen, technischen Support und Kooperationen erreichen Sie uns unter','cookie':'Diese Website verwendet Cookies für grundlegende Funktionen, Google Analytics 4 zur zusammengefassten Nutzungsanalyse und – sofern aktiviert – Technologien von Drittanbietern wie Google AdSense. Cookies können Sie in den Browsereinstellungen verwalten oder deaktivieren; dadurch können Funktionen eingeschränkt werden. Personalisierte Werbung lässt sich in den Google-Werbeeinstellungen verwalten.','body':'GugoPro bietet browserbasierte Werkzeuge, Lernartikel und interaktive Rechner. Wir erklären Zweck, Bedienung und Datenverarbeitung jedes Werkzeugs. Dateien, die von browserlokalen Werkzeugen verarbeitet werden, werden nicht an GugoPro hochgeladen, sofern dies nicht ausdrücklich angegeben ist.','updated':'21. September 2026'},
    'es': {'html':'es','home':'Inicio','privacy':'Política de privacidad','terms':'Términos del servicio','contact':'Contacto','about':'Acerca de GugoPro','disclaimer':'Aviso legal','email_intro':'Para solicitudes de privacidad, soporte técnico y colaboraciones, escribe a','cookie':'Este sitio utiliza cookies para funciones esenciales, Google Analytics 4 para analizar el uso de forma agregada y, cuando se habilita, tecnologías publicitarias de terceros como Google AdSense. Puedes gestionar o desactivar las cookies desde la configuración del navegador; algunas funciones podrían verse afectadas. La publicidad personalizada se puede gestionar en la configuración de anuncios de Google.','body':'GugoPro ofrece herramientas para el navegador, artículos educativos y calculadoras interactivas. Explicamos el objetivo, los pasos de uso y el tratamiento de datos de cada herramienta. Los archivos procesados localmente en el navegador no se cargan en GugoPro salvo que se indique expresamente.','updated':'21 de septiembre de 2026'},
    'fr': {'html':'fr','home':'Accueil','privacy':'Politique de confidentialité','terms':'Conditions d’utilisation','contact':'Contact','about':'À propos de GugoPro','disclaimer':'Avertissement','email_intro':'Pour les demandes de confidentialité, le support technique et les partenariats, écrivez à','cookie':'Ce site utilise des cookies pour les fonctions essentielles, Google Analytics 4 pour mesurer l’usage de façon agrégée et, lorsqu’elles sont activées, des technologies publicitaires tierces telles que Google AdSense. Vous pouvez gérer ou désactiver les cookies dans les réglages du navigateur ; certaines fonctions peuvent alors être limitées. La publicité personnalisée se gère dans les paramètres publicitaires de Google.','body':'GugoPro propose des outils utilisables dans le navigateur, des articles pédagogiques et des calculateurs interactifs. Nous expliquons l’objectif, les étapes et le traitement des données de chaque outil. Les fichiers traités localement dans le navigateur ne sont pas envoyés à GugoPro, sauf indication explicite.','updated':'21 septembre 2026'},
    'pt': {'html':'pt','home':'Início','privacy':'Política de privacidade','terms':'Termos de serviço','contact':'Contato','about':'Sobre a GugoPro','disclaimer':'Isenção de responsabilidade','email_intro':'Para solicitações de privacidade, suporte técnico e parcerias, escreva para','cookie':'Este site usa cookies para funções essenciais, o Google Analytics 4 para análise agregada de uso e, quando ativadas, tecnologias de publicidade de terceiros como o Google AdSense. Você pode gerenciar ou desativar cookies nas configurações do navegador; alguns recursos podem ser afetados. A publicidade personalizada pode ser gerenciada nas configurações de anúncios do Google.','body':'A GugoPro oferece ferramentas para navegador, artigos educativos e calculadoras interativas. Explicamos o objetivo, o uso e o tratamento de dados de cada ferramenta. Arquivos processados localmente no navegador não são enviados à GugoPro, salvo indicação expressa.','updated':'21 de setembro de 2026'},
    'zh-CN': {'html':'zh-CN','home':'首页','privacy':'隐私政策','terms':'服务条款','contact':'联系我们','about':'关于 GugoPro','disclaimer':'免责声明','email_intro':'如需提出隐私请求、技术支持或合作咨询，请联系','cookie':'本网站使用必要 Cookie 以提供基本功能，使用 Google Analytics 4 进行汇总使用分析，并在启用时使用 Google AdSense 等第三方广告技术。您可以在浏览器设置中管理或停用 Cookie；停用后部分功能可能受到影响。个性化广告可在 Google 广告设置中管理。','body':'GugoPro 提供浏览器工具、教育文章和互动计算器，并说明每项工具的用途、步骤与数据处理方式。除非页面明确说明，浏览器本地处理工具不会把文件上传到 GugoPro。','updated':'2026年9月21日'},
}

LEGAL = {
'privacy': ('Privacy', 'This privacy policy explains what information GugoPro uses, why it is used, and how you can control cookies and third-party advertising.'),
'terms': ('Terms', 'These terms describe acceptable use, service limitations, intellectual property and the responsibilities of people using GugoPro.'),
'contact': ('Contact', 'Contact GugoPro for technical questions, privacy requests, corrections, accessibility feedback or partnership proposals.'),
'about': ('About', 'GugoPro builds practical browser-first tools and explanatory content for learning, research and everyday digital work.'),
'disclaimer': ('Disclaimer', 'Tools and articles are provided for education and general information and do not replace professional financial, medical, legal or tax advice.'),
}

def esc(s): return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')

def page(lang, kind):
    d=LANGS[lang]; title=d[kind] if kind in d else LEGAL[kind][0]
    if kind=='privacy':
        sections=f'''<h2>1. Information and purpose</h2><p>{d['body']}</p><p>We may receive basic technical information such as browser type, device information, approximate usage events and information you choose to send by email. We use it to operate, secure and improve the site and to respond to support requests.</p><h2>2. Cookies, Analytics and advertising</h2><p>{d['cookie']}</p><p>Google Analytics and advertising providers may process information under their own policies. Where required, consent and regional controls should be provided by the site operator before non-essential cookies are enabled.</p><h2>3. Local processing and external services</h2><p>Many tools process files in the current browser tab. External links, embedded services, affiliate links and advertising platforms are governed by their own terms and privacy policies.</p><h2>4. Your choices and requests</h2><p>You can clear or block cookies through browser settings, use available Google advertising controls, and contact us to ask about access, correction or deletion of information associated with your message.</p>'''
    elif kind=='terms':
        sections=f'''<h2>1. Acceptance and permitted use</h2><p>{d['body']} By using the site, you agree to use it lawfully, avoid abusive automation, and respect third-party rights.</p><h2>2. Educational and general information</h2><p>Calculators, AI outputs, market articles and other results are for education, research and general information. They are not financial, medical, legal or tax advice, and you remain responsible for decisions based on them.</p><h2>3. Availability and limitations</h2><p>Features may change, be rate-limited or become unavailable because of maintenance, browser limitations or third-party services. We do not guarantee uninterrupted availability or that every result will be error-free.</p><h2>4. Intellectual property</h2><p>Unless otherwise noted, original GugoPro text, interface design and code are protected by applicable law. Do not copy, resell or misuse the service without permission.</p>'''
    elif kind=='contact':
        sections=f'''<h2>Official contact</h2><p>{d['email_intro']} <a href="mailto:contact@gugopro.com">contact@gugopro.com</a>.</p><p>For a useful report, include the page URL, steps to reproduce, browser and device details, and the expected result. Do not send passwords, private keys or unnecessary personal information.</p><h2>Privacy and correction requests</h2><p>Please identify the relevant page or message date and describe the request. We will review it and reply through the contact address.</p>'''
    elif kind=='about':
        sections=f'''<h2>What GugoPro provides</h2><p>{d['body']}</p><p>Our tools cover file conversion, calculators, study utilities, research workflows and practical guides. Each tool is designed to explain its inputs, output and important limitations.</p><h2>Our quality approach</h2><p>We improve pages through functional checks, link checks, accessibility-minded markup, clear privacy notes and user feedback. If you find an error, please contact us with the page URL and a concise description.</p>'''
    else:
        sections=f'''<h2>General information</h2><p>{d['body']} Results may depend on user inputs, browser capabilities, data freshness and third-party services.</p><h2>Finance, health and other sensitive topics</h2><p>Financial calculators and articles are not investment advice. Health content is not medical advice. Nothing on this site creates a professional-client relationship or guarantees an outcome. Consult a qualified professional for decisions that affect your finances, health, legal rights or taxes.</p><h2>External services</h2><p>Links to Google, YouTube, Amazon, TradingView, Ko-fi or other services lead to sites controlled by third parties. Their content, availability, policies and tracking are outside GugoPro’s control.</p>'''
    links=' '.join(f'<a href="{kind2}.html">{esc(d[kind2])}</a>' for kind2 in ['privacy','terms','contact','about','disclaimer'])
    footer=f'<footer><p>© 2026 GugoPro · <a href="mailto:contact@gugopro.com">contact@gugopro.com</a></p></footer>'
    return f'''<!doctype html><html lang="{d['html']}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} | GugoPro</title><meta name="description" content="{esc(LEGAL[kind][1])}"><meta name="robots" content="index,follow"><link rel="canonical" href="https://gugopro.com/{lang}/legal/{kind}.html"><!-- AdSense verification and ad units may be added here after approval. --><style>body{{margin:0;background:#080b12;color:#dbeafe;font:16px/1.75 system-ui,sans-serif}}main{{max-width:860px;margin:40px auto;padding:28px;background:#111827;border:1px solid #263449;border-radius:18px}}a{{color:#67e8f9}}h1,h2{{color:#7dd3fc}}nav{{display:flex;gap:14px;flex-wrap:wrap;border-bottom:1px solid #263449;padding-bottom:16px;margin-bottom:24px}}small{{color:#94a3b8}}</style></head><body><main><nav><a href="https://gugopro.com/?lang={lang}">{esc(d['home'])}</a>{links}</nav><h1>{esc(title)}</h1><small>Last updated: {esc(d['updated'])}</small>{sections}<p><strong>GugoPro:</strong> <a href="mailto:contact@gugopro.com">contact@gugopro.com</a></p>{footer}</main></body></html>'''

# Generate five legal pages for every published language folder.
for lang,d in LANGS.items():
    folder=ROOT/lang/'legal'
    # Use /<lang>/legal/<page>.html to keep the language root clean and unambiguous.
    folder.mkdir(parents=True, exist_ok=True)
    for kind in LEGAL:
        (folder/f'{kind}.html').write_text(page(lang,kind),encoding='utf-8')

# Update legal links in every localized page to the localized legal directory.
legal_names=set(LEGAL)
for p in ROOT.rglob('*.html'):
    if '.git' in p.parts or p.is_relative_to(ROOT/'legal'): continue
    if p.name == 'googled0dfad57039c64f6.html': continue
    rel=p.relative_to(ROOT); parts=rel.parts
    lang=parts[0] if parts[0] in LANGS else None
    if not lang: continue
    target_dir=ROOT/lang/'legal'
    def repl(m):
        href=m.group(2)
        low=href.lower().split('?',1)[0].split('#',1)[0]
        name=Path(low.rstrip('/')).name
        if name in {x+'.html' for x in legal_names}:
            new=os.path.relpath(target_dir/name, p.parent)
            return m.group(1)+new+m.group(3)
        return m.group(0)
    raw=p.read_text(encoding='utf-8',errors='replace')
    raw2=re.sub(r'(<a\b[^>]*?href=["\'])([^"\']+)(["\'])', repl, raw, flags=re.I)
    if raw2 != raw: p.write_text(raw2,encoding='utf-8')

# Add a consistent footer to pages that have no footer, except Google's verification file.
labels={k:{'privacy':v['privacy'],'terms':v['terms'],'contact':v['contact'],'about':v['about'],'disclaimer':v['disclaimer']} for k,v in LANGS.items()}
for p in ROOT.rglob('*.html'):
    if '.git' in p.parts or p.name == 'googled0dfad57039c64f6.html': continue
    raw=p.read_text(encoding='utf-8',errors='replace')
    if re.search(r'<footer\b',raw,re.I): continue
    rel=p.relative_to(ROOT); lang=rel.parts[0] if rel.parts[0] in LANGS else 'en'
    links=[]
    for kind in ['privacy','terms','contact','about','disclaimer']:
        href=os.path.relpath(ROOT/lang/'legal'/f'{kind}.html', p.parent)
        links.append(f'<a href="{href}">{esc(labels[lang][kind])}</a>')
    footer=f'<footer class="site-compliance-footer"><nav>{" · ".join(links)}</nav><p>© 2026 GugoPro · <a href="mailto:contact@gugopro.com">contact@gugopro.com</a></p></footer>'
    raw=raw.replace('</body>',footer+'</body>',1) if '</body>' in raw.lower() else raw+'\n'+footer
    p.write_text(raw,encoding='utf-8')

# Add the one missing editorial description without touching Google's verification file.
p=ROOT/'quant/pine-script-basics.html'
if p.exists():
    raw=p.read_text(encoding='utf-8',errors='replace')
    if not re.search(r'<meta\s+[^>]*name=["\']description',raw,re.I):
        raw=raw.replace('</head>','<meta name="description" content="Pine Script 基礎教學：從指標、策略到回測的實作導讀。">\n</head>',1)
        p.write_text(raw,encoding='utf-8')
print('generated localized legal pages and repaired localized links/footers')
