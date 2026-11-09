/* Операция 28.10: последовательные экраны квеста.
 * Внутренние страницы не заменяют проверку GPS и обязательные задания.
 * Свайп влево — дальше; вправо — вернуться к предыдущей странице главы. */
(function(){
 'use strict';
 const localStorage=window.SDTest.storage;
 const KEY='sd2810-story-swipe-v1';
 const LABELS={
  0:['Приглашение','Определить точку старта'],
  1:['Радиоперехват','Вопрос диспетчера','Музыкальная открытка','Проверка водителя','VIP-допуск','Первая координата'],
  2:['Первая остановка','Проверка GPS'],
  3:['Начало эконом-свидания','Наш эконом-пакет'],
  4:['Неожиданный финал','Чек свидания'],
  5:['Секретная миссия','Выполнение задания','Продолжение истории'],
  6:['Поездка в Заречный парк','Едем в парк','Мы уже на месте','Время только для нас','Выбор кофе','Остановка: Terrazza','Проверка Игоря','Фотоохота в парке','Продолжаем свидание'],
  7:['Письмо из будущего','Секретное задание','Продолжение свидания'],
  8:['Планы изменились','Продолжить'],
  9:['Приглашение на обед','Ресторан «ВДрова»','Наш обед','Дальше к сюрпризу'],
  10:['Новая тайна','Выполнить задание','Выбрать настроение'],
  11:['Вторая тайна','Варианты на выбор'],
  12:['Наш финал','Поделиться выбором','Проверить прибытие'],
  13:['Признание','Наша особенная дата','Последняя песня','Достижения','Памятный фотоальбом','Обнимемся']
 };
 let config=null, panels=[],position=0,nav=null,header=null,status=null,nextButton=null,prevButton=null;
 let touchStart=null;

 let confirmationDialog=null,confirmationDepth=0;
 function confirmAdvance(action,title='Перейти к следующему этапу?'){
  if(typeof action!=='function')return;
  if(confirmationDepth>0||window.SDTest.active()||!document.body?.appendChild){action();return;}
  if(confirmationDialog?.isConnected)return;
  const overlay=document.createElement('div');
  overlay.className='story-confirm-overlay';
  overlay.innerHTML='<div class="story-confirm-card" role="dialog" aria-modal="true" aria-labelledby="story-confirm-heading" aria-describedby="story-confirm-text">'+
   '<div class="story-confirm-seal" aria-hidden="true">♡</div>'+
   '<div class="story-confirm-kicker">ОПЕРАЦИЯ 28.10 · ПРОВЕРКА ПЕРЕХОДА</div>'+
   '<h3 id="story-confirm-heading"></h3>'+
   '<p id="story-confirm-text">Уже готова узнать, что ждёт дальше? Ничего не потеряется, если решишь остаться на этой странице.</p>'+
   '<div class="story-confirm-actions"><button type="button" class="story-confirm-cancel">Пока остаюсь</button><button type="button" class="story-confirm-yes">Да, продолжить →</button></div></div>';
  overlay.querySelector('#story-confirm-heading').textContent=title;
  confirmationDialog=overlay;
  const close=approved=>{
   if(confirmationDialog!==overlay)return;
   document.removeEventListener('keydown',escape);
   overlay.remove();confirmationDialog=null;
   if(approved){confirmationDepth++;try{action();}finally{confirmationDepth--;}}
  };
  const escape=e=>{if(e.key==='Escape'){e.preventDefault();close(false);}};
  document.addEventListener('keydown',escape);
  overlay.querySelector('.story-confirm-cancel').addEventListener('click',()=>close(false));
  overlay.querySelector('.story-confirm-yes').addEventListener('click',()=>close(true));
  overlay.addEventListener('click',e=>{if(e.target===overlay)close(false)});
  document.body.appendChild(overlay);
  overlay.querySelector('.story-confirm-cancel').focus();
 }

 function store(){
  const data={day:config?.day||null,origin:config?.origin||null,steps:{},flags:{}};
  try{
   const saved=JSON.parse(localStorage.getItem(KEY)||'null');
   if(saved&&saved.day===data.day&&saved.origin===data.origin){
    if(saved.steps&&typeof saved.steps==='object')data.steps=saved.steps;
    if(saved.flags&&typeof saved.flags==='object')data.flags=saved.flags;
   }
  }catch(e){}
  return data;
 }
 function persist(data){
  try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){}
 }
 function mark(flag){
  if(!config)return;
  const data=store();
  data.flags[flag]=true;
  persist(data);
  refresh();
 }
 function marked(flag){return !!config&&!!store().flags[flag];}
 function key(){
  if(!config)return '';
  return config.stage+':'+String(config.phase||'normal');
 }
 function getStep(){
  const v=Number(store().steps[key()]);
  return Number.isInteger(v)&&v>=0?v:0;
 }
 function saveStep(value){
  // A normal host follows the same saved progress as the participant.
  const d=store();d.steps[key()]=value;persist(d);
 }
 function isElement(node){return node&&node.nodeType===1;}
 // Only explicit semantic chapter markers may create a new screen.
 // Never split by layout classes such as .mini, .scrap-prank, .mission-panel,
 // .spacer or .scanner: those are parts of one interactive scene.
 function boundary(element){
  return isElement(element)&&element.classList.contains('story-break');
 }
 function segment(root,stage){
  const nodes=Array.from(root.childNodes),parts=[];let current=[];
  let pendingTitle=null;
  function flush(){
   if(!current.some(isElement)){current=[];return;}
   parts.push({nodes:current,title:pendingTitle});current=[];pendingTitle=null;
  }
  for(const node of nodes){
   if(boundary(node)){
    flush();
    pendingTitle=node.getAttribute('data-story-label')||null;
    continue;
   }
   current.push(node);
  }
  flush();
  if(!parts.length)return [];
  root.replaceChildren();
  const result=[];
  for(let i=0;i<parts.length;i++){
   const panel=document.createElement('section');
   panel.className='story-slide';
   panel.setAttribute('data-story-page',String(i));
   panel.setAttribute('aria-label','Экран '+(i+1)+' из '+parts.length);
   parts[i].nodes.forEach(node=>panel.appendChild(node));
   if(parts[i].title)panel.dataset.storyLabel=parts[i].title;
   root.appendChild(panel);result.push(panel);
  }
  return result;
 }
 function defaultTitle(){
  const panel=panels[position];
  if(panel?.dataset.storyLabel)return panel.dataset.storyLabel;
  // Single-screen missions use their actual heading, never a stale
  // index from a different mission phase (e.g. the spinning wheel).
  if(config.stage===10){
   const title=panel?.querySelector('.hero');
   if(title?.textContent?.trim())return title.textContent.trim().replace(/\s+/g,' ');
  }
  const labels=LABELS[config.stage]||[];
  return labels[Math.min(position,labels.length-1)]||'Наша история';
 }
 function allowed(){
  if(!config)return false;
  return config.allow(position);
 }
 function isLast(){return position>=panels.length-1;}
 // Only genuine story reveals ask for a second, deliberate tap.
 // Every locked story-break and sealed envelope still uses config.allow.
 const IMPORTANT_MINI_REVEALS={
  1:[1,4],  // personal song and the first coordinate
  3:[0],    // economy date ticket
  6:[5],    // suspect surprise after the optional cafe
  11:[0],   // second secret choice
  13:[1]    // final personal song
 };
 function requiresMiniConfirmation(){
  return (IMPORTANT_MINI_REVEALS[config?.stage]||[]).includes(position);
 }
 function statusText(){
  if(!allowed())return '🔒 Следующий конверт пока закрыт. Заверши текущий этап ♡';
  if(!isLast())return 'Свайпни влево или нажми «Далее»';
  if(config.hasNext())return 'Глава пройдена — можно идти дальше';
  return 'Выбери действие на экране, чтобы продолжить';
 }
 function show(step,animated=true){
  position=Math.max(0,Math.min(step,panels.length-1));
  panels.forEach((panel,i)=>{
   panel.hidden=i!==position;
   panel.classList.toggle('story-current',i===position);
   if(i===position&&animated){
    panel.classList.remove('story-swoop');void panel.offsetWidth;panel.classList.add('story-swoop');
   }
  });
  if(header){
   const title=header.querySelector('.story-screen-title');
   const count=header.querySelector('.story-screen-count');
   const bar=header.querySelector('.story-progress-fill');
   if(title)title.textContent=defaultTitle();
   if(count)count.textContent=(position+1)+' / '+panels.length;
   if(bar)bar.style.width=((position+1)/panels.length*100)+'%';
  }
  refresh();
  if(animated){try{window.scrollTo({top:0,behavior:'smooth'});}catch(e){}}
 }
 function refresh(){
  if(!config||!nextButton||!prevButton)return;
  const can=allowed(),hasNext=config.hasNext(),last=isLast();
  prevButton.disabled=position===0;
  // Legacy in-content chapter links remain wired for compatibility,
  // but only one visible action may take the couple to the next chapter.
  for(const selector of ['#go','#lunch-go']){
   const duplicate=panels[position]?.querySelector(selector);
   if(duplicate)duplicate.hidden=last&&hasNext;
  }
  // When a single screen already has its own action (spin, photo, GPS),
  // do not show a second, disabled "Next" control underneath it.
  nextButton.hidden=last&&!hasNext;
  prevButton.hidden=position===0;
  if(nav)nav.hidden=nextButton.hidden&&prevButton.hidden;
  nextButton.disabled=!can||(last&&!hasNext);
  nextButton.textContent=can?(last?'Перейти к следующей главе →':'Далее →'):'🔒 Конверт закрыт';
  if(status)status.textContent=statusText();
 }
 function next(){
  if(!config||!allowed())return;
  if(position<panels.length-1){
   const current=position,chapter=config.stage;
   const advanceSlide=()=>{
    if(!config||config.stage!==chapter||position!==current||!allowed())return;
    saveStep(current+1);
    show(current+1);
   };
   if(requiresMiniConfirmation())confirmAdvance(advanceSlide,'Открыть следующий сюжетный момент?');
   else advanceSlide();
   return;
  }
  if(config.hasNext())config.advance();
 }
 function previous(){
  if(!config||position===0)return;
  saveStep(position-1);show(position-1);
 }
 function makeNav(app){
  header=document.createElement('div');
  header.className='story-flow-head';
  header.innerHTML='<div class="story-flow-meta"><span class="story-screen-title">Наша история</span><b class="story-screen-count">1 / 1</b></div>'+
   '<div class="story-progress"><div class="story-progress-fill"></div></div>';
  const root=config.stage===13?app.querySelector('.over'):app;
  root.prepend(header);
  nav=document.createElement('nav');
  nav.className='story-navigation';
  nav.setAttribute('aria-label','Навигация по главе');
  nav.innerHTML='<div class="story-nav-actions"><button type="button" class="story-nav-previous">← Назад</button>'+
    '<button type="button" class="story-nav-next">Далее →</button></div>'+
    '<p class="story-nav-status" role="status"></p>';
  app.appendChild(nav);
  status=nav.querySelector('.story-nav-status');
  nextButton=nav.querySelector('.story-nav-next');
  prevButton=nav.querySelector('.story-nav-previous');
  nextButton.addEventListener('click',next);
  prevButton.addEventListener('click',previous);
 }
 function mount(app,options){
  config=options;touchStart=null;
  app.classList.add('story-flow-mounted');
  nav=null;header=null;nextButton=null;prevButton=null;status=null;
  const root=options.stage===13?app.querySelector('.over'):app;
  if(!root)return;
  panels=segment(root,options.stage);
  if(!panels.length)return;
  makeNav(app);
  // A previously saved swipe is never authority to jump over a newly locked screen.
  const requested=Math.min(getStep(),panels.length-1);
  let safe=requested;
  for(let i=0;i<requested;i++){if(!options.allow(i)){safe=i;break;}}
  show(safe,false);
 }
 function cancelSwipeTarget(target){
  return !!target.closest('button,a,input,textarea,select,label,[role="slider"],.camera-overlay,.wheel-disc,#sc-music-dock');
 }
 function touchBegin(e){
  if(!config||!panels.length||document.body.classList.contains('sc-modal-open'))return;
  if(e.touches.length!==1||cancelSwipeTarget(e.target)){touchStart=null;return;}
  const p=e.touches[0];touchStart={x:p.clientX,y:p.clientY,time:Date.now()};
 }
 function touchFinish(e){
  if(!touchStart||!config||!panels.length||document.body.classList.contains('sc-modal-open'))return;
  const p=e.changedTouches[0],dx=p.clientX-touchStart.x,dy=p.clientY-touchStart.y;touchStart=null;
  if(Math.abs(dx)<75||Math.abs(dx)<Math.abs(dy)*1.4)return;
  if(dx<0)next();else previous();
 }
 document.addEventListener('touchstart',e=>{
  if(e.target.closest('#app'))touchBegin(e);
 },{passive:true});
 document.addEventListener('touchend',e=>{
  if(e.target.closest('#app'))touchFinish(e);
 },{passive:true});
 window.StoryFlow={mount,mark,marked,refresh,next,previous,confirmAdvance};
})();