/* Операция 28.10: poetry postcards after every completed daily chapter.
 * No fake audio buttons: MP3 playback becomes available only when audio file exists.
 * Public GitHub Pages is not a private vault; date gates are UI gates only. */
(function(global){
 'use strict';
 const ASSETS='assets/poem-day-';
 const RAW_ASSETS='https://raw.githubusercontent.com/soaringdeath-sduo/secret-date/main/assets/';
 const SELECTED='sd2810-selected-day-v1';
 const totalDays=['9','10','11','12','13','14'];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const poemPromise=fetch('poetry-data.json?v=1',{cache:'no-store'})
  .then(async res=>{
   if(!res.ok)throw new Error('Стихи временно недоступны.');
   const list=await res.json();
   if(!Array.isArray(list)||list.length!==6||list.some(x=>!Number.isInteger(x.day)||typeof x.title!=='string'||typeof x.text!=='string'))throw new Error('Не удалось загрузить стихотворения.');
   return new Map(list.map(p=>[p.day,p]));
  });
 const probes=new Map();
 let activeCard=null;
 function daysFor(selected){return selected==='sat'?totalDays.slice(0,5):totalDays;}
 function audioURL(day){return ASSETS+String(day).padStart(2,'0')+'.mp3'}
 function backupURL(day){return RAW_ASSETS+'poem-day-'+String(day).padStart(2,'0')+'.mp3'}
 function goodAudioResponse(response){
  if(!response?.ok)return false;
  const mime=(response.headers?.get('content-type')||'').toLowerCase();
  // Pages may serve a missing-file HTML document with an HTTP 200 status.
  return !mime.includes('text/html');
 }
 function probe(day){
  if(probes.has(day))return probes.get(day);
  // Some Android embedded browsers / caches incorrectly fail HEAD. If it
  // fails, retry with a small ranged GET. Never cache a failed check forever.
  const url=audioURL(day);
  const promise=(async()=>{
   try{
    const head=await fetch(url,{method:'HEAD',cache:'no-store'});
    if(goodAudioResponse(head))return url;
   }catch(e){}
   try{
    const get=await fetch(url,{method:'GET',headers:{Range:'bytes=0-0'},cache:'no-store'});
    const ok=goodAudioResponse(get);
    try{await get.body?.cancel?.()}catch(e){}
    return ok?url:backupURL(day);
   }catch(e){return backupURL(day)}
  })();
  probes.set(day,promise);
  promise.catch(()=>{if(probes.get(day)===promise)probes.delete(day)});
  return promise;
 }
 function isPreview(){
  // In full walk-through we must unlock poems one by one, like for Lisa.
  return localStorage.getItem('sd2810-host-v3')==='1'&&!global.SDTest?.active();
 }
 function hostToolsVisible(){
  return isPreview()||!!global.SDTest?.active();
 }
 function pauseAll(container){
  container?.querySelectorAll('audio').forEach(player=>{try{player.pause();}catch(e){}});
 }
 function verse(text){
  return text.trim().split(/\n\s*\n/).map(stanza=>'<p class="poetry-stanza">'+
   stanza.split('\n').map(line=>'<span>'+esc(line)+'</span>').join('')+'</p>').join('');
 }
 function poemHtml(poem,preview=false){
  const day=poem.day,ii=day-9;
  return '<section class="poetry-card" data-poem="'+day+'">'+
   '<div class="poetry-polaroid"><div class="poetry-illustration"><span class="poetry-kicker">НАША ИСТОРИЯ · ВЫПУСК '+(ii+1)+'</span>'+
   '<span class="poetry-illustration-heart" aria-hidden="true">♡</span>'+
   '<h3>'+esc(poem.title)+'</h3><div class="poetry-tagline">'+esc(poem.tagline)+'</div></div>'+
   '<div class="poetry-paper-caption">С любовью, Игорь ♡</div></div>'+
   '<div class="poetry-intro">Ещё одно признание, которое хочется сохранить для тебя…</div>'+
   '<div class="poetry-verse" aria-label="Стихотворение «'+esc(poem.title)+'»">'+verse(poem.text)+'</div>'+
   '<div class="poetry-audio-slot" data-poetry-audio="'+day+'"></div>'+
   (preview?'<div class="poetry-host-tools"><button type="button" class="btn alt" data-poetry-copy="'+day+'">🔧 Скопировать текст для ИИ-озвучки</button>'+
    '<p class="day-status-note" data-poetry-host-status="'+day+'" role="status">Готовый файл: '+esc(audioURL(day))+'</p></div>':'')+
   '</section>';
 }
 function focusModal(e){
  if(e.key==='Escape')closeModal();
  if(e.key==='Tab'){
   const modal=document.querySelector('#poetry-modal');
   if(!modal)return;
   const controls=[...modal.querySelectorAll('button,a,[controls]')].filter(n=>!n.disabled);
   if(!controls.length)return;
   const index=controls.indexOf(document.activeElement);
   if(e.shiftKey&&index===0){e.preventDefault();controls[controls.length-1].focus();}
   else if(!e.shiftKey&&index===controls.length-1){e.preventDefault();controls[0].focus();}
  }
 }
 function closeModal(){
  const modal=document.getElementById('poetry-modal');
  pauseAll(modal);
  if(modal)modal.remove();
  document.body.classList.remove('poetry-dialog-open');
  document.removeEventListener('keydown',focusModal);
  if(activeCard&&activeCard.isConnected&&typeof activeCard.focus==='function')activeCard.focus();
  activeCard=null;
 }
 async function makeAudio(host,day,preview){
  if(!host?.isConnected)return;
  const source=await probe(day);
  if(!host.isConnected)return;
  if(!source){
   host.innerHTML='<div class="poetry-audio-pending"><p role="status">🎧 Аудиозапись пока недоступна на сайте. Возможно, публикация GitHub Pages ещё обновляется.</p>'+
    '<button type="button" class="poetry-retry">↻ Проверить аудиозапись снова</button>'+
    (preview?'<small>В репозитории ищем: <code>'+esc(audioURL(day))+'</code></small>':'')+'</div>';
   const button=host.querySelector('.poetry-retry');
   button.addEventListener('click',()=>{
    button.disabled=true;button.textContent='Проверяем запись…';
    probes.delete(day);
    makeAudio(host,day,preview);
   });
   return;
  }
  const wrapper=document.createElement('div');
  wrapper.className='poetry-audio-ready';
  wrapper.innerHTML='<span class="poetry-audio-label">🎧 Слушать стихотворение</span>'+
   '<audio controls preload="none" aria-label="Аудиозапись стихотворения"></audio>'+
   '<a class="poetry-save" href="'+esc(audioURL(day))+'" download>↓ Сохранить MP3 на память</a>';
  const player=wrapper.querySelector('audio');
  const download=wrapper.querySelector('.poetry-save');
  player.src=source;
  download.href=source;
  let usingBackup=source===backupURL(day);
  player.addEventListener('error',()=>{
    if(!usingBackup){
      // The Pages file may have disappeared during a deployment: switch
      // automatically to the same committed MP3 on GitHub Raw.
      usingBackup=true;
      player.src=backupURL(day);
      download.href=backupURL(day);
      wrapper.querySelector('.poetry-audio-label').textContent='🎧 Резервная запись готова — нажми воспроизведение';
      return;
    }
    wrapper.querySelector('.poetry-audio-label').textContent='Запись пока недоступна. Попробуй проверить ещё раз.';
    if(!wrapper.querySelector('.poetry-retry')){
     const retry=document.createElement('button');
     retry.className='poetry-retry';retry.type='button';
     retry.textContent='↻ Проверить MP3 ещё раз';
     retry.addEventListener('click',()=>{probes.delete(day);makeAudio(host,day,preview);});
     wrapper.appendChild(retry);
    }
  });
  host.replaceChildren(wrapper);
 }
 async function populate(host,day,preview){
  if(!host?.isConnected)return;
  try{
   const poem=(await poemPromise).get(day);
   if(!poem)throw new Error('Неизвестный выпуск.');
   if(!host.isConnected)return;
   host.innerHTML=poemHtml(poem,preview);
   const slot=host.querySelector('[data-poetry-audio]');
   makeAudio(slot,day,preview);
   const copy=host.querySelector('[data-poetry-copy]');
   if(copy)copy.addEventListener('click',async()=>{
    const text=poem.text;
    const status=host.querySelector('[data-poetry-host-status]');
    try{
     if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
      if(status)status.textContent='Текст скопирован. Вставь в сервис ИИ-озвучки.';
     }else{
      global.prompt('Скопируй стихотворение для озвучки:',text);
      if(status)status.textContent='Готово для копирования.';
     }
    }catch(e){if(status)status.textContent='Не удалось скопировать — выдели текст стихотворения вручную.';}
   });
  }catch(e){if(host?.isConnected)host.innerHTML='<p class="day-status-note">Стихотворение пока не загрузилось. Попробуй обновить страницу.</p>';}
 }
 async function open(day,trigger,canOpen){
  if(!canOpen)return;
  const old=document.getElementById('poetry-modal');pauseAll(old);if(old)old.remove();
  activeCard=trigger;
  const modal=document.createElement('div');
  modal.id='poetry-modal';modal.className='poetry-modal';modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Стихотворение для Лизы');
  modal.innerHTML='<div class="poetry-dialog"><button class="poetry-dialog-close" type="button" aria-label="Закрыть стихотворение">×</button>'+
   '<div class="poetry-dialog-content"><p>Открываем твоё признание… ♡</p></div></div>';
  document.body.appendChild(modal);
  document.body.classList.add('poetry-dialog-open');
  const close=modal.querySelector('.poetry-dialog-close');
  close.addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
  document.addEventListener('keydown',focusModal);
  close.focus();
  const container=modal.querySelector('.poetry-dialog-content');
  await populate(container,day,hostToolsVisible());
 }
 function completion(host,day,asPreview=false){
  if(!host)return;
  populate(host,day,asPreview||hostToolsVisible());
 }
 async function library(host,state,selected,asPreview=false){
  if(!host)return;
  const preview=(asPreview||isPreview())&&!global.SDTest?.active(),days=daysFor(selected);
  const unlocked=days.filter(d=>preview||state?.done?.[Number(d)-9]===true);
  const label=unlocked.length===1?'признание':unlocked.length>=2&&unlocked.length<=4?'признания':'признаний';
  host.innerHTML='<section class="poetry-library"><div class="kicker">АУДИОАЛЬБОМ 28.10</div>'+
   '<h2>Наши признания ♡</h2>'+
   '<p>После каждого выпуска здесь остаются тёплые слова от Игоря. Можно возвращаться к ним сколько захочется.</p>'+
   '<div class="poetry-library-count">'+unlocked.length+' из '+days.length+' '+label+' открыто</div>'+
   '<div class="poetry-library-grid"></div></section>';
  const grid=host.querySelector('.poetry-library-grid');
  try{
   const poems=await poemPromise;
   if(!grid.isConnected)return;
   grid.innerHTML=days.map((key,i)=>{
    const day=Number(key),known=preview||state?.done?.[i]===true;
    const p=poems.get(day);
    if(known)return '<button type="button" class="poetry-library-item" data-poetry-open="'+day+'">'+
     '<span class="poetry-library-icon">♡</span><span><strong>'+esc(p?.title||'Наше признание')+'</strong>'+
     '<small>Выпуск '+(i+1)+' · Прочитать или прослушать</small></span><span aria-hidden="true">›</span></button>';
    return '<div class="poetry-library-item is-locked"><span class="poetry-library-icon">✉</span>'+
     '<span><strong>Секретное признание</strong><small>Откроется после выпуска '+(i+1)+'</small></span><span aria-hidden="true">🔒</span></div>';
   }).join('');
   grid.querySelectorAll('[data-poetry-open]').forEach(b=>b.addEventListener('click',()=>open(Number(b.dataset.poetryOpen),b,true)));
   if(location.hash==='#daily-poetry-library'&&host.isConnected){
    requestAnimationFrame(()=>{if(host.isConnected)host.scrollIntoView({behavior:'smooth',block:'start'});});
   }
  }catch(e){if(grid?.isConnected)grid.innerHTML='<p class="day-status-note">Альбом пока не удалось загрузить.</p>';}
 }
 global.DailyPoetry={completion,library,daysFor,audioURL};
})(window);