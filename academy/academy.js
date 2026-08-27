(()=>{
  const root=document.documentElement;
  const themeKey='gugopro_academy_theme';
  const progressKey='gugopro_academy_progress';
  let done=[];
  try{done=JSON.parse(localStorage.getItem(progressKey)||'[]')}catch(e){done=[]}
  if(localStorage.getItem(themeKey)==='dark')root.classList.add('dark');
  window.num=window.num||((id)=>Number(document.getElementById(id)?.value));
  window.money=window.money||((value)=>Number.isFinite(Number(value))?'NT$ '+Math.round(Number(value)).toLocaleString('zh-TW'):'—');
  window.bindCalc=window.bindCalc||((id,callback)=>{
    const button=document.getElementById(id);
    if(!button)return;
    button.addEventListener('click',()=>{
      try{callback()}catch(error){console.error('[GugoPro tool] calculation failed',error);}
    });
  });
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-theme],.theme').forEach(toggle=>toggle.addEventListener('click',()=>{
      root.classList.toggle('dark');
      try{localStorage.setItem(themeKey,root.classList.contains('dark')?'dark':'light')}catch(e){}
    }));
    document.querySelectorAll('[data-lesson]').forEach(el=>{
      const id=el.dataset.lesson;
      if(done.includes(id))el.classList.add('is-done');
      el.addEventListener('click',()=>{
        if(!done.includes(id)){
          done=[...done,id];
          try{localStorage.setItem(progressKey,JSON.stringify(done))}catch(e){}
          el.classList.add('is-done');
        }
      });
    });
    const total=document.querySelectorAll('[data-lesson]').length;
    const finished=done.filter(id=>document.querySelector(`[data-lesson="${id}"]`)).length;
    const text=document.querySelector('[data-progress-text]');
    const bar=document.querySelector('[data-progress-bar]');
    if(text)text.textContent=`學習進度 ${finished} / ${total}`;
    if(bar)bar.style.width=(total?finished/total*100:0)+'%';
  });
})();
