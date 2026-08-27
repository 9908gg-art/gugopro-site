(()=>{
  'use strict';
  const LOCALES={
    'zh-TW':{native:'繁體中文'},'zh-CN':{native:'简体中文'},en:{native:'English'},ja:{native:'日本語'},de:{native:'Deutsch'},fr:{native:'Français'},es:{native:'Español'},pt:{native:'Português'}
  };
  const SUPPORTED=Object.keys(LOCALES), SOURCE='zh-TW', STORAGE_KEY='gugopro_locale';
  let current=SOURCE, textMap=new Map(), fragments=[], catalogRows=[];
  const norm=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const hasCjk=v=>/[\u3400-\u9fff]/.test(String(v||''));
  const excluded=node=>{const p=node&&node.parentElement;return !p||['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','SVG','PATH'].includes(p.tagName)||p.closest('[data-i18n-ignore]');};
  const escaped=v=>String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const preserve=(raw,value)=>{const lead=(String(raw).match(/^\s*/)||[''])[0],trail=(String(raw).match(/\s*$/)||[''])[0];return lead+value+trail;};
  const localeFromLocation=()=>{
    const param=new URLSearchParams(location.search).get('lang');
    if(SUPPORTED.includes(param))return param;
    try{const saved=localStorage.getItem(STORAGE_KEY);if(SUPPORTED.includes(saved))return saved;}catch(e){}
    const html=(document.documentElement.lang||'').toLowerCase();
    if(html==='zh-hant'||html==='zh-tw'||html.startsWith('zh-tw'))return 'zh-TW';
    if(html==='zh-hans'||html==='zh-cn'||html.startsWith('zh-cn'))return 'zh-CN';
    return SUPPORTED.includes(html)?html:SOURCE;
  };
  const resource=name=>new URL('/i18n/'+name,location.origin).toString();
  const addPair=(source,target)=>{
    const s=norm(source),t=norm(target);
    if(!s||!t||s===t)return;
    textMap.set(s,t);
    if(hasCjk(s))fragments.push([s,t]);
  };
  const addDynamicFragments=(source,target)=>{
    const ss=String(source).split(/\$\{.*?\}/s),ts=String(target).split(/\$\{.*?\}/s);
    ss.forEach((part,i)=>{const s=norm(part),t=norm(ts[i]||'');if(s&&t&&s!==t&&hasCjk(s))fragments.push([s,t]);});
  };
  const replaceValue=value=>{
    let output=String(value??'');
    const entries=fragments.slice().sort((a,b)=>b[0].length-a[0].length);
    entries.forEach(([source,target])=>{if(!output.includes(source))return;output=output.split(source).join(target);});
    const exact=textMap.get(norm(output));
    return exact===undefined?output:preserve(output,exact);
  };
  const translateValue=value=>{
    const raw=String(value??''),key=norm(raw);
    if(textMap.has(key))return preserve(raw,textMap.get(key));
    return current===SOURCE?raw:replaceValue(raw);
  };
  const walkAndTranslate=root=>{
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let node;
    while((node=walker.nextNode()))if(!excluded(node)&&norm(node.nodeValue))nodes.push(node);
    nodes.forEach(n=>{const raw=n.nodeValue,out=translateValue(raw);if(out!==raw)n.nodeValue=out;});
  };
  const translateAttributes=()=>{
    document.querySelectorAll('input,textarea,select,option,[title],[aria-label],[alt],[data-label],meta[content]').forEach(el=>{
      ['placeholder','title','aria-label','alt','data-label','content'].forEach(attr=>{if(!el.hasAttribute(attr))return;const raw=el.getAttribute(attr),out=translateValue(raw);if(out!==raw)el.setAttribute(attr,out);});
    });
  };
  const installCanvasBridge=()=>{
    if(window.__gugoI18nCanvasBridge)return;
    window.__gugoI18nCanvasBridge=true;
    const proto=window.CanvasRenderingContext2D&&window.CanvasRenderingContext2D.prototype;
    if(proto){['fillText','strokeText'].forEach(method=>{const original=proto[method];if(typeof original!=='function')return;proto[method]=function(text,...args){return original.call(this,translateValue(text),...args);};});}
  };
  const translateSvg=()=>{
    document.querySelectorAll('svg text,[data-i18n-svg]').forEach(el=>{const raw=el.textContent,out=translateValue(raw);if(out!==raw)el.textContent=out;});
  };
  const updatePageMetadata=()=>{
    document.documentElement.lang=current;
    document.documentElement.dataset.i18nStatus='machine-draft';
    document.documentElement.dataset.i18nLocale=current;
    const title=translateValue(document.title);if(title!==document.title)document.title=title;
    const description=document.querySelector('meta[name="description"]');if(description){const out=translateValue(description.content);if(out!==description.content)description.content=out;}
    const status=document.querySelector('meta[name="i18n-status"]')||document.head.appendChild(Object.assign(document.createElement('meta'),{name:'i18n-status'}));
    status.content='machine-draft';
    const canonical=document.querySelector('link[rel="canonical"]');
    if(canonical){const url=new URL(canonical.href||location.href);url.search='';if(current!==SOURCE)url.searchParams.set('lang',current);canonical.href=url.toString();}
  };
  const translateDom=()=>{walkAndTranslate(document.body);translateAttributes();translateSvg();updatePageMetadata();};
  const observeRuntime=()=>{
    const observer=new MutationObserver(records=>{if(current===SOURCE)return;records.forEach(record=>{
      if(record.type==='characterData'&&!excluded(record.target)){const raw=record.target.nodeValue,out=translateValue(raw);if(out!==raw)record.target.nodeValue=out;}
      record.addedNodes&&record.addedNodes.forEach(added=>{if(added.nodeType===Node.TEXT_NODE){const raw=added.nodeValue,out=translateValue(raw);if(out!==raw)added.nodeValue=out;}else if(added.nodeType===Node.ELEMENT_NODE&&!added.closest('[data-i18n-ignore]'))walkAndTranslate(added);});
    });});
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  };
  const addStyles=()=>{
    if(document.getElementById('gugo-i18n-style'))return;
    const style=document.createElement('style');style.id='gugo-i18n-style';style.textContent=`
      .gugo-locale-select{appearance:none;box-sizing:border-box;min-width:116px;height:36px;padding:0 28px 0 10px;border:1px solid rgba(255,255,255,.28);border-radius:9px;background:#141824;color:#fff;color-scheme:dark;font:inherit;font-size:13px;font-weight:800;line-height:1.2;cursor:pointer;background-image:linear-gradient(45deg,transparent 50%,#fff 50%),linear-gradient(135deg,#fff 50%,transparent 50%);background-position:calc(100% - 15px) 15px,calc(100% - 10px) 15px;background-size:5px 5px,5px 5px;background-repeat:no-repeat}
      .gugo-locale-select:hover,.gugo-locale-select:focus{border-color:#f97316;outline:2px solid rgba(249,115,22,.25);outline-offset:1px}
      .gugo-locale-select option{background:#141824;color:#fff;font-weight:700}
      .lang-selector:has(.gugo-locale-select){display:inline-flex;align-items:center;min-width:0}
      @media(max-width:650px){.gugo-locale-select{min-width:108px;height:34px;font-size:12px}.lang-selector:has(.gugo-locale-select){max-width:112px}}
    `;document.head.appendChild(style);
  };
  const mountSwitcher=()=>{
    addStyles();
    let host=document.querySelector('.lang-selector');
    if(!host)host=document.querySelector('.nav-actions,.navlinks,.navin,.top,.tool-crumb');
    const select=document.createElement('select');select.id='gugo-locale-select';select.className='gugo-locale-select';select.setAttribute('aria-label','Language');
    SUPPORTED.forEach(code=>{const option=document.createElement('option');option.value=code;option.textContent=LOCALES[code].native;select.appendChild(option);});
    select.value=current;
    if(host&&host.classList.contains('lang-selector')){host.querySelectorAll('.lang-btn,.lang-dropdown').forEach(el=>el.remove());host.appendChild(select);}else if(host){host.appendChild(select);}else document.body.insertBefore(select,document.body.firstChild);
    select.addEventListener('change',()=>{current=select.value;try{localStorage.setItem(STORAGE_KEY,current);}catch(e){}const url=new URL(location.href);url.searchParams.set('lang',current);location.assign(url.toString());});
  };
  const load=async()=>{
    current=localeFromLocation();
    mountSwitcher();
    installCanvasBridge();
    try{
      const catalogResponse=await fetch(resource('catalog.json'),{cache:'no-store'});if(!catalogResponse.ok)throw new Error('catalog '+catalogResponse.status);
      const raw=await catalogResponse.json();catalogRows=raw.strings||raw.sourceStrings||[];
      const localeResponse=await fetch(resource(current+'.json'),{cache:'no-store'});if(!localeResponse.ok)throw new Error('locale '+localeResponse.status);
      const locale=await localeResponse.json();const translations=locale.translations||{};
      catalogRows.forEach(row=>addPair(row.text,translations[String(row.id)]||row.text));
      try{const phrasesResponse=await fetch(resource('phrases.json'),{cache:'no-store'});if(phrasesResponse.ok){const phrases=await phrasesResponse.json();Object.entries(phrases.phrases||{}).forEach(([source,map])=>addPair(source,map[current]||source));}}catch(e){}
      try{const dynamicResponse=await fetch(resource(current+'.dynamic.json'),{cache:'no-store'});if(dynamicResponse.ok){const dynamic=await dynamicResponse.json();Object.entries(dynamic.templates||{}).forEach(([id,target])=>{const row=catalogRows.find(item=>String(item.id)===String(id));if(row)addDynamicFragments(row.text,target);});}}catch(e){}
      translateDom();observeRuntime();
      window.GugoProI18n={locale:current,supported:SUPPORTED,status:'machine-draft',catalogKeys:catalogRows.length,missingKeys:catalogRows.filter(row=>!Object.prototype.hasOwnProperty.call(translations,String(row.id))).length};
    }catch(error){document.documentElement.dataset.i18nStatus='machine-draft-resource-error';console.warn('[GugoPro i18n] resource load failed; zh-TW DOM retained.',error);}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
