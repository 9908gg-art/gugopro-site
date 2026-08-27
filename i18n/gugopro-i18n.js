(()=>{
  'use strict';
  const LOCALES={
    'zh-TW':{label:'繁體中文',native:'繁體中文'},
    'zh-CN':{label:'简体中文',native:'简体中文'},
    en:{label:'English',native:'English'},
    ja:{label:'日本語',native:'日本語'},
    de:{label:'Deutsch',native:'Deutsch'},
    fr:{label:'Français',native:'Français'},
    es:{label:'Español',native:'Español'},
    pt:{label:'Português',native:'Português'}
  };
  const LOCALE_KEY='gugopro_locale';
  const SOURCE_KEY='zh-TW';
  const pageRoot=new URL('.',document.baseURI);
  const supported=Object.keys(LOCALES);
  let catalog=null;
  let dynamicCatalog=null;
  let phraseCatalog=null;
  let currentLocale=SOURCE_KEY;
  let textMap=new Map();
  let fragmentMap=[];
  let dynamicMap=[];

  const normalize=value=>String(value||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const isExcluded=node=>{const parent=node&&node.parentElement;return !parent||['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','SVG','PATH'].includes(parent.tagName)||parent.closest('[data-i18n-ignore]');};
  const sourceLocale=()=>{
    const param=new URLSearchParams(location.search).get('lang');
    if(supported.includes(param)) return param;
    try{const saved=localStorage.getItem(LOCALE_KEY);if(supported.includes(saved))return saved;}catch(e){}
    const lang=(document.documentElement.lang||'').toLowerCase();
    if(lang==='zh-hant'||lang==='zh-tw'||lang.startsWith('zh-tw'))return 'zh-TW';
    if(lang==='zh-hans'||lang==='zh-cn'||lang.startsWith('zh-cn'))return 'zh-CN';
    if(supported.includes(lang))return lang;
    return SOURCE_KEY;
  };
  const asset=filename=>new URL('/i18n/'+filename,location.origin).toString();
  const preserveWhitespace=(original,replacement)=>{
    const lead=(original.match(/^\s*/)||[''])[0];
    const trail=(original.match(/\s*$/)||[''])[0];
    return lead+replacement+trail;
  };
  const escapedRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const addMap=(source,target)=>{
    const s=normalize(source); const t=normalize(target);
    if(!s||s===t||(s.length<2&&!/[\u3400-\u9fff]/.test(s)))return;
    textMap.set(s,t);
    if(/[\u3400-\u9fff]/.test(s))fragmentMap.push([s,t]);
  };
  const buildDynamicFragments=(source,target)=>{
    const segments=source.split(/\$\{.*?\}/s);
    const targetSegments=target.split(/\$\{.*?\}/s);
    segments.forEach((segment,index)=>{
      const s=normalize(segment); const t=normalize(targetSegments[index]||'');
      if(s&&t&&s!==t&&/[\u3400-\u9fff]/.test(s))fragmentMap.push([s,t]);
    });
  };
  const replaceFragments=value=>{
    let output=value;
    const entries=fragmentMap.sort((a,b)=>b[0].length-a[0].length);
    entries.forEach(([source,target])=>{
      if(!output.includes(source))return;
      if(source.length===1){
        const boundary='[\\d\\s.,:%+\\-–—=()/<>|·•]';
        const pattern=new RegExp('(^|'+boundary+')'+escapedRegex(source)+'(?=$|'+boundary+')','g');
        output=output.replace(pattern,(match,prefix)=>prefix+target);
      }else output=output.split(source).join(target);
    });
    return output;
  };
  const translateDom=()=>{
    if(!catalog)return;
    textMap=new Map(); fragmentMap=[];
    const translations=catalog.translations||{};
    catalog.sourceStrings.forEach(item=>addMap(item.text,translations[String(item.id)]||item.text));
    if(phraseCatalog&&phraseCatalog.phrases){
      Object.entries(phraseCatalog.phrases).forEach(([source,localeMap])=>addMap(source,localeMap[currentLocale]||source));
    }
    if(dynamicCatalog){
      dynamicMap=[];
      const dTrans=dynamicCatalog.templates||{};
      dynamicCatalog.sourceStrings.forEach(item=>{
        const target=dTrans[String(item.id)]||item.text;
        buildDynamicFragments(item.text,target);
        dynamicMap.push([item.text,target]);
      });
    }
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];let node;
    while((node=walker.nextNode()))if(!isExcluded(node)&&normalize(node.nodeValue))nodes.push(node);
    nodes.forEach(textNode=>{
      const raw=textNode.nodeValue;const key=normalize(raw);
      if(textMap.has(key))textNode.nodeValue=preserveWhitespace(raw,textMap.get(key));
      else if(currentLocale!==SOURCE_KEY){
        const replaced=replaceFragments(raw);
        if(replaced!==raw)textNode.nodeValue=replaced;
      }
    });
    document.querySelectorAll('input,textarea,select,option,[title],[aria-label],[alt],[data-label],meta[content]').forEach(el=>{
      ['placeholder','title','aria-label','alt','data-label','content'].forEach(attr=>{
        if(!el.hasAttribute(attr))return;
        const raw=el.getAttribute(attr);const key=normalize(raw);
        if(textMap.has(key))el.setAttribute(attr,preserveWhitespace(raw,textMap.get(key)));
        else if(currentLocale!==SOURCE_KEY){const replaced=replaceFragments(raw);if(replaced!==raw)el.setAttribute(attr,replaced);}
      });
    });
    document.documentElement.lang=currentLocale;
    const title=normalize(document.title);
    if(textMap.has(title))document.title=textMap.get(title);
    const description=document.querySelector('meta[name="description"]');
    if(description){const value=normalize(description.content);if(textMap.has(value))description.content=textMap.get(value);else if(currentLocale!==SOURCE_KEY)description.content=replaceFragments(description.content);}
    updateCanonical();
  };
  const observeRuntime=()=>{
    const observer=new MutationObserver(records=>{
      if(currentLocale===SOURCE_KEY)return;
      records.forEach(record=>{
        if(record.type==='characterData'&&record.target.nodeValue&&!isExcluded(record.target)){
          const raw=record.target.nodeValue;const key=normalize(raw);
          if(textMap.has(key))record.target.nodeValue=preserveWhitespace(raw,textMap.get(key));
          else{const replaced=replaceFragments(raw);if(replaced!==raw)record.target.nodeValue=replaced;}
        }
        record.addedNodes&&record.addedNodes.forEach(added=>{
          if(added.nodeType!==Node.ELEMENT_NODE&&added.nodeType!==Node.TEXT_NODE)return;
          const walker=document.createTreeWalker(added.nodeType===Node.TEXT_NODE?added:added,NodeFilter.SHOW_TEXT);
          const nodes=[];let n;
          while((n=walker.nextNode()))if(!isExcluded(n)&&normalize(n.nodeValue))nodes.push(n);
          nodes.forEach(textNode=>{
            const raw=textNode.nodeValue;const key=normalize(raw);
            if(textMap.has(key))textNode.nodeValue=preserveWhitespace(raw,textMap.get(key));
            else{const replaced=replaceFragments(raw);if(replaced!==raw)textNode.nodeValue=replaced;}
          });
        });
      });
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  };
  const updateCanonical=()=>{
    const canonical=document.querySelector('link[rel="canonical"]');
    if(!canonical)return;
    const url=new URL(canonical.href||location.href);
    url.search='';
    if(currentLocale!==SOURCE_KEY)url.searchParams.set('lang',currentLocale);
    canonical.href=url.toString();
  };
  const addStyles=()=>{
    if(document.getElementById('gugo-i18n-style'))return;
    const style=document.createElement('style');style.id='gugo-i18n-style';style.textContent=`
      .gugo-locale-wrap{display:inline-flex;align-items:center;gap:6px;position:relative;z-index:30;margin-left:8px}
      .gugo-locale-label{font-size:12px;font-weight:800;color:inherit;white-space:nowrap;opacity:.82}
      .gugo-locale-select{appearance:none;min-width:118px;border:1px solid rgba(255,255,255,.3);border-radius:9px;background:#141824;color:#fff;padding:7px 28px 7px 10px;font:inherit;font-size:13px;font-weight:800;line-height:1.2;cursor:pointer;color-scheme:dark}
      .gugo-locale-select:hover,.gugo-locale-select:focus{border-color:#f97316;outline:2px solid rgba(249,115,22,.25);outline-offset:1px}
      .gugo-locale-select option{background:#141824;color:#fff;font-weight:700}
      .navin .gugo-locale-wrap,.top .gugo-locale-wrap,.tool-crumb .gugo-locale-wrap{margin-left:auto}
      @media(max-width:650px){.gugo-locale-label{display:none}.gugo-locale-select{min-width:110px}.top,.tool-crumb{flex-wrap:wrap}.top .gugo-locale-wrap,.tool-crumb .gugo-locale-wrap{margin-left:0}}
    `;document.head.appendChild(style);
  };
  const mountSwitcher=()=>{
    addStyles();
    const select=document.createElement('select');select.className='gugo-locale-select';select.id='gugo-locale-select';select.setAttribute('aria-label','Language');
    supported.forEach(locale=>{const option=document.createElement('option');option.value=locale;option.textContent=LOCALES[locale].native;select.appendChild(option);});
    select.value=currentLocale;
    const wrap=document.createElement('span');wrap.className='gugo-locale-wrap';wrap.innerHTML='<span class="gugo-locale-label">Language</span>';wrap.appendChild(select);
    const host=document.querySelector('.navlinks,.navin,.top,.tool-crumb');
    if(host)host.appendChild(wrap);else document.body.insertBefore(wrap,document.body.firstChild);
    select.addEventListener('change',()=>{
      currentLocale=select.value;
      try{localStorage.setItem(LOCALE_KEY,currentLocale);}catch(e){}
      const url=new URL(location.href);url.searchParams.set('lang',currentLocale);history.replaceState({},'',url);
      location.reload();
    });
  };
  const load=async()=>{
    currentLocale=sourceLocale();
    mountSwitcher();
    try{
      const catalogResponse=await fetch(asset('catalog.json'),{cache:'no-store'});
      if(!catalogResponse.ok)throw new Error('catalog '+catalogResponse.status);
      const raw=await catalogResponse.json();
      const localeResponse=await fetch(asset(currentLocale+'.json'),{cache:'no-store'});
      if(!localeResponse.ok)throw new Error('locale '+localeResponse.status);
      const locale=await localeResponse.json();
      catalog={sourceStrings:raw.strings,translations:locale.translations};
      try{const phraseResponse=await fetch(asset('phrases.json'),{cache:'no-store'});if(phraseResponse.ok)phraseCatalog=await phraseResponse.json();}catch(e){}
      try{const dynamicResponse=await fetch(asset(currentLocale+'.dynamic.json'),{cache:'no-store'});if(dynamicResponse.ok){const d=await dynamicResponse.json();dynamicCatalog={sourceStrings:raw.strings.filter(item=>d.templates&&Object.prototype.hasOwnProperty.call(d.templates,String(item.id))),templates:d.templates};}}catch(e){}
      translateDom();
      observeRuntime();
    }catch(error){
      console.warn('[GugoPro i18n] resource load failed; zh-TW DOM retained.',error);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
