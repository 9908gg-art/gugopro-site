(()=>{
  'use strict';
  const LOCALES={
    'zh-TW':{native:'繁體中文'},'zh-CN':{native:'简体中文'},en:{native:'English'},ja:{native:'日本語'},de:{native:'Deutsch'},fr:{native:'Français'},es:{native:'Español'},pt:{native:'Português'}
  };
  const NON_AI_LOCALES=['zh-TW','en','ja'];
  const IS_AI=/\/tools\/ai(?:\/|-)|\/tools\/ai-media\/|\/tools\/health\/(?:tdee-macros-calculator|weight-loss-planner)(?:\.html)?/i.test(location.pathname);
  const SUPPORTED=IS_AI?Object.keys(LOCALES):NON_AI_LOCALES, SOURCE='zh-TW', STORAGE_KEY='gugopro_locale';
  let current=SOURCE, textMap=new Map(), fragments=[], fragmentIndex=new Map(), catalogRows=[], isChangingLanguage=false, replacementCache=new Map();
  const norm=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const hasCjk=v=>/[\u3400-\u9fff]/.test(String(v||''));
  const excluded=node=>{const p=node&&node.parentElement;return !p||['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','SVG','PATH'].includes(p.tagName)||p.closest('[data-i18n-ignore]');};
  const preserve=(raw,value)=>{const lead=(String(raw).match(/^\s*/)||[''])[0],trail=(String(raw).match(/\s*$/)||[''])[0];return lead+value+trail;};
  const localeFromLocation=()=>{
    const param=new URLSearchParams(location.search).get('lang');
    if(SUPPORTED.includes(param))return param;
    if(!IS_AI&&param){try{const clean=new URL(location.href);clean.searchParams.delete('lang');history.replaceState({},'',clean.pathname+(clean.search?clean.search:'')+clean.hash);}catch(e){}}
    try{const saved=localStorage.getItem(STORAGE_KEY);if(SUPPORTED.includes(saved))return saved;}catch(e){}
    let device='en';
    try{
      const nav=String(navigator.language||'').toLowerCase();
      if(nav.startsWith('zh'))device='zh-TW';
      else if(nav.startsWith('ja'))device='ja';
    }catch(e){}
    return SUPPORTED.includes(device)?device:SOURCE;
  };
  const resource=name=>new URL('/i18n/'+name,location.origin).toString();
  const fetchResource=(url,options={})=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),2500);return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));};
  const addPair=(source,target)=>{
    const s=norm(source),t=norm(target);
    if(!s||!t||s===t)return;
    textMap.set(s,t);
    if(hasCjk(s))fragments.push([s,t]);
  };
  const addPairsInChunks=async map=>{
    let processed=0;
    for(const source in map){
      if(!Object.prototype.hasOwnProperty.call(map,source))continue;
      addPair(source,map[source]);
      if(++processed%500===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
  };
  const addDynamicFragments=(source,target)=>{
    const ss=String(source).split(/\$\{.*?\}/s),ts=String(target).split(/\$\{.*?\}/s);
    ss.forEach((part,i)=>{const s=norm(part),t=norm(ts[i]||'');if(s&&t&&s!==t&&hasCjk(s))fragments.push([s,t]);});
  };
  const heapPush=(heap,item)=>{
    heap.push(item);let i=heap.length-1;
    while(i>0){const parent=(i-1)>>1;if(heap[parent].entry.rank<=item.entry.rank)break;heap[i]=heap[parent];i=parent;}
    heap[i]=item;
  };
  const heapPop=heap=>{
    if(!heap.length)return null;
    const first=heap[0],last=heap.pop();
    if(heap.length){let i=0;while(true){const left=i*2+1,right=left+1;let smallest=i;if(left<heap.length&&heap[left].entry.rank<heap[smallest].entry.rank)smallest=left;if(right<heap.length&&heap[right].entry.rank<heap[smallest].entry.rank)smallest=right;if(smallest===i)break;heap[i]=heap[smallest];i=smallest;}heap[i]=last;}
    return first;
  };
  const replaceValue=value=>{
    let output=String(value??'');
    if(replacementCache.has(output))return replacementCache.get(output);
    if(!hasCjk(output)){replacementCache.set(output,output);return output;}
    const heap=[],queuedCharacters=new Set();
    const enqueueCharacter=(character,afterRank=-1)=>{
      if(queuedCharacters.has(character))return;
      queuedCharacters.add(character);
      const bucket=fragmentIndex.get(character);if(!bucket||!bucket.length)return;
      let low=0,high=bucket.length;
      while(low<high){const middle=(low+high)>>1;if(bucket[middle].rank<=afterRank)low=middle+1;else high=middle;}
      if(low<bucket.length)heapPush(heap,{bucket,index:low,entry:bucket[low]});
    };
    for(const character of output)enqueueCharacter(character);
    while(heap.length){
      const item=heapPop(heap),nextIndex=item.index+1;
      if(nextIndex<item.bucket.length)heapPush(heap,{bucket:item.bucket,index:nextIndex,entry:item.bucket[nextIndex]});
      const {source,target,rank}=item.entry;
      if(!output.includes(source))continue;
      output=output.split(source).join(target);
      for(const character of target)enqueueCharacter(character,rank);
    }
    const exact=textMap.get(norm(output));
    const result=exact===undefined?output:preserve(output,exact);
    replacementCache.set(String(value??''),result);
    return result;
  };
  const translateValue=value=>{
    const raw=String(value??''),key=norm(raw);
    if(textMap.has(key))return preserve(raw,textMap.get(key));
    return current===SOURCE?raw:replaceValue(raw);
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
  const selectLocaleBlocks=()=>{
    document.querySelectorAll('[data-locale-content]').forEach(el=>{
      const locale=el.getAttribute('data-locale-content');
      el.hidden=locale!==current;
      el.setAttribute('aria-hidden',locale===current?'false':'true');
    });
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
  const translateDom=async()=>{
    selectLocaleBlocks();
    if(current!==SOURCE){
      const nodes=[];
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      let node;
      while((node=walker.nextNode()))if(!excluded(node)&&norm(node.nodeValue))nodes.push(node);
      for(let i=0;i<nodes.length;i++){
        const currentNode=nodes[i];
        if(!currentNode.isConnected||excluded(currentNode))continue;
        const raw=currentNode.nodeValue,out=translateValue(raw);
        if(out!==raw)currentNode.nodeValue=out;
        if((i+1)%25===0&&i+1<nodes.length)await new Promise(resolve=>setTimeout(resolve,0));
      }
      translateAttributes();
      translateSvg();
    }
    updatePageMetadata();
  };
  const addStyles=()=>{
    if(document.getElementById('gugo-i18n-style'))return;
    const style=document.createElement('style');style.id='gugo-i18n-style';style.textContent=`
      .gugo-locale-select{appearance:none;box-sizing:border-box;min-width:116px;height:36px;padding:0 28px 0 10px;border:1px solid rgba(255,255,255,.28);border-radius:9px;background:#141824;color:#fff;color-scheme:dark;font:inherit;font-size:13px;font-weight:800;line-height:1.2;cursor:pointer;background-image:linear-gradient(45deg,transparent 50%,#fff 50%),linear-gradient(135deg,#fff 50%,transparent 50%);background-position:calc(100% - 15px) 15px,calc(100% - 10px) 15px;background-size:5px 5px,5px 5px;background-repeat:no-repeat
      }
      .gugo-locale-select:hover,.gugo-locale-select:focus{border-color:#f97316;outline:2px solid rgba(249,115,22,.25);outline-offset:1px}
      .gugo-locale-select option{background:#141824;color:#fff;font-weight:700}
      .gugo-locale-host{display:inline-flex;align-items:center;flex:0 0 auto;min-width:0}
      @media(max-width:760px){.gugo-locale-select{width:100px;min-width:100px;height:34px;padding-left:8px;padding-right:22px;font-size:11px}.gugo-locale-host{max-width:100px}}
      @media(max-width:420px){.gugo-locale-select{width:92px;min-width:92px;font-size:10px}.gugo-locale-host{max-width:92px}}
    `;document.head.appendChild(style);
  };
  const removeLegacyControls=()=>{
    document.querySelectorAll('.converter-language-link,.lang-selector,.gugo-static-locale-select').forEach(el=>el.remove());
  };
  const findHost=()=>{
    const actionHost=document.querySelector('header .nav-actions,header .header-actions,header .nav-right');
    if(actionHost)return {host:actionHost,before:null};
    const nav=document.querySelector('header .nav-container,header .header-container,header .site-header .container,header .container');
    if(nav){
      const before=nav.querySelector(':scope > .nav-actions,:scope > .header-actions,:scope > .nav-right,:scope > .nav-links');
      return {host:nav,before};
    }
    return {host:document.querySelector('.navlinks,.navin,.top,.tool-crumb,header')||document.body,before:null};
  };
  const mountSwitcher=()=>{
    addStyles();
    removeLegacyControls();
    let select=document.querySelector('.gugo-locale-host .gugo-locale-select');
    if(!select){
      const {host,before}=findHost();
      const wrapper=document.createElement('span');
      wrapper.className='gugo-locale-host';
      wrapper.setAttribute('data-i18n-ignore','');
      select=document.createElement('select');
      select.id='gugo-locale-select';
      select.className='gugo-locale-select';
      select.setAttribute('aria-label','Language');
      wrapper.appendChild(select);
      if(before)host.insertBefore(wrapper,before);else host.appendChild(wrapper);
      select.addEventListener('change',()=>{const next=select.value;if(isChangingLanguage||!SUPPORTED.includes(next)||next===current)return;isChangingLanguage=true;current=next;try{localStorage.setItem(STORAGE_KEY,current);}catch(e){}const url=new URL(location.href);url.searchParams.set('lang',current);location.assign(url.toString());});
    }else{
      const {host,before}=findHost();
      const wrapper=select.closest('.gugo-locale-host');
      if(wrapper){wrapper.setAttribute('data-i18n-ignore','');if(wrapper.parentElement!==host){if(before)host.insertBefore(wrapper,before);else host.appendChild(wrapper);}}
    }
    const optionsMatch=select.options.length===SUPPORTED.length&&SUPPORTED.every((code,index)=>select.options[index].value===code);
    if(!optionsMatch){select.replaceChildren();SUPPORTED.forEach(code=>{const option=document.createElement('option');option.value=code;option.textContent=LOCALES[code].native;select.appendChild(option);});}
    select.value=SUPPORTED.includes(current)?current:SOURCE;
    document.querySelectorAll('.gugo-locale-host .gugo-locale-select').forEach(other=>{if(other!==select)other.closest('.gugo-locale-host')?.remove();});
  };
  const observeRuntime=()=>{
    let reconcileQueued=false,processingTranslations=false,queueCursor=0;
    const translationQueue=[],queuedTextNodes=new Set();
    const observeOptions={subtree:true,childList:true,characterData:true};
    const legacyControlSelector='.converter-language-link,.lang-selector,.gugo-static-locale-select';
    const enqueueText=node=>{if(node&&node.nodeType===Node.TEXT_NODE&&!excluded(node)&&norm(node.nodeValue)&&!queuedTextNodes.has(node)){queuedTextNodes.add(node);translationQueue.push(node);}};
    const collectTextNodes=root=>{if(root.nodeType===Node.TEXT_NODE){enqueueText(root);return;}const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))enqueueText(node);};
    let observer;
    const processTranslationQueue=()=>{
      const batch=[];
      while(queueCursor<translationQueue.length&&batch.length<50){const node=translationQueue[queueCursor++];queuedTextNodes.delete(node);if(!excluded(node)&&norm(node.nodeValue))batch.push(node);}
      observer.disconnect();
      try{batch.forEach(node=>{const raw=node.nodeValue,out=translateValue(raw);if(out!==raw)node.nodeValue=out;});}finally{observer.observe(document.body,observeOptions);}
      if(queueCursor<translationQueue.length){setTimeout(processTranslationQueue,0);}else{translationQueue.length=0;queueCursor=0;processingTranslations=false;}
    };
    const scheduleTranslations=()=>{if(processingTranslations||!translationQueue.length)return;processingTranslations=true;setTimeout(processTranslationQueue,0);};
    observer=new MutationObserver(records=>{
      let controlsChanged=false;
      const addedElements=new Set(),directTextNodes=new Set();
      records.forEach(record=>{
        if(current!==SOURCE&&record.type==='characterData'&&!excluded(record.target))directTextNodes.add(record.target);
        record.addedNodes&&record.addedNodes.forEach(added=>{
          if(added.nodeType===Node.ELEMENT_NODE){
            if(added.matches(legacyControlSelector)||added.querySelector(legacyControlSelector))controlsChanged=true;
            if(current!==SOURCE&&!added.closest('[data-i18n-ignore]'))addedElements.add(added);
          }else if(current!==SOURCE&&added.nodeType===Node.TEXT_NODE&&!excluded(added))directTextNodes.add(added);
        });
      });
      if(current!==SOURCE){
        const roots=[];
        addedElements.forEach(node=>{let parent=node.parentElement;while(parent&&!addedElements.has(parent))parent=parent.parentElement;if(!parent)roots.push(node);});
        roots.forEach(collectTextNodes);
        directTextNodes.forEach(node=>{let parent=node.parentElement;while(parent&&!addedElements.has(parent))parent=parent.parentElement;if(!parent)enqueueText(node);});
        scheduleTranslations();
      }
      if(controlsChanged&&!reconcileQueued){
        reconcileQueued=true;
        queueMicrotask(()=>{reconcileQueued=false;mountSwitcher();});
      }
    });
    observer.observe(document.body,observeOptions);
  };
  const load=async()=>{
    if(IS_AI){document.documentElement.removeAttribute('data-gugo-i18n-pending');return;}
    current=localeFromLocation();
    mountSwitcher();
    installCanvasBridge();
    try{
      const catalogResponse=await fetchResource(resource('catalog.json'),{cache:'no-store'});if(!catalogResponse.ok)throw new Error('catalog '+catalogResponse.status);
      const raw=await catalogResponse.json();catalogRows=raw.strings||raw.sourceStrings||[];
      const localeResponse=await fetchResource(resource(current+'.json'),{cache:'no-store'});if(!localeResponse.ok)throw new Error('locale '+localeResponse.status);
      const locale=await localeResponse.json();const translations=locale.translations||{};
      catalogRows.forEach(row=>addPair(row.text,translations[String(row.id)]||row.text));
      if(!IS_AI){try{const pageResponse=await fetchResource(resource('nonai-visible-translations.json'),{cache:'no-store'});if(pageResponse.ok){const pageMap=await pageResponse.json();const map=pageMap[current]||{};await addPairsInChunks(map);}}catch(e){} }
      try{const phrasesResponse=await fetchResource(resource('phrases.json'),{cache:'no-store'});if(phrasesResponse.ok){const phrases=await phrasesResponse.json();Object.entries(phrases.phrases||{}).forEach(([source,map])=>addPair(source,map[current]||source));}}catch(e){}
      try{const dynamicResponse=await fetchResource(resource(current+'.dynamic.json'),{cache:'no-store'});if(dynamicResponse.ok){const dynamic=await dynamicResponse.json();Object.entries(dynamic.templates||{}).forEach(([id,target])=>{const row=catalogRows.find(item=>String(item.id)===String(id));if(row)addDynamicFragments(row.text,target);});}}catch(e){}
      fragments.sort((a,b)=>b[0].length-a[0].length);
      fragmentIndex=new Map();
      fragments.forEach(([source,target],rank)=>{const key=source[0];if(!fragmentIndex.has(key))fragmentIndex.set(key,[]);fragmentIndex.get(key).push({source,target,rank});});
      await translateDom();observeRuntime();mountSwitcher();
      document.documentElement.removeAttribute('data-gugo-i18n-pending');
      window.GugoProI18n={locale:current,supported:SUPPORTED,status:'machine-draft',catalogKeys:catalogRows.length,missingKeys:catalogRows.filter(row=>!Object.prototype.hasOwnProperty.call(translations,String(row.id))).length};
    }catch(error){document.documentElement.dataset.i18nStatus='machine-draft-resource-error';document.documentElement.removeAttribute('data-gugo-i18n-pending');mountSwitcher();console.warn('[GugoPro i18n] resource load failed; zh-TW DOM retained.',error);}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
