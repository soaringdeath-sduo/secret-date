/* Pixel-heart dinosaur: a small original offline-style endless runner. */
(function(){
 'use strict';
 const storage=window.SDTest.storage;
 const KEY='sd2810-dino-heart-v1';
 const W=720,H=280,FLOOR=226;
 const TURBO_AT=10000,PREMIUM_AT=15000;
 // At 10,000 points the SAME run becomes slightly harder:
 // faster movement, 12% denser obstacles and taller hazards.
 function difficulty(score){
  const turbo=Number(score)>=TURBO_AT;
  return {turbo,speedBonus:turbo?44:0,spawnMultiplier:turbo?.88:1,heightBonus:turbo?4:0};
 }
 const GIFTS=[
  {at:2000,title:'🍫 Шоколадка от Игоря',detail:'Покажи купон Игорю — он должен тебе шоколадку.'},
  {at:5000,title:'💝 24 часа пожеланий ПОСЛЕ свидания',detail:'Заработано навсегда! Активировать сутки можно только после свидания. Разрешены маленькие покупки суммарно до 1 000 ₽ за все 24 часа, а также нематериальные пожелания. Подарок «Магнит Косметик» на 5 000 ₽ — отдельно за 15 000 очков.'},
  {at:15000,title:'🌸 Магнит Косметик — покупки на 5 000 ₽',detail:'Один совместный поход до 31.12.2026 включительно. Лиза выбирает покупки, Игорь оплачивает до 5 000 ₽. Это личный подарок, не сертификат магазина.'}
 ];
 function read(){
  try{const a=JSON.parse(storage.getItem(KEY)||'null');if(a&&Number.isFinite(a.best))return {best:Math.max(0,Math.floor(a.best))};}catch(e){}
  return {best:0};
 }
 function saveHigh(score,preview){
  if(preview)return read();
  const previous=read(),best=Math.max(previous.best,Math.max(0,Math.floor(score)));
  if(best!==previous.best)try{storage.setItem(KEY,JSON.stringify({best}));}catch(e){}
  return {best};
 }
 function rewardStatus(score){return GIFTS.filter(g=>score>=g.at).map(g=>g.at);}
 function gameAvailable(now,selected,invited,testMode=false){
  if(testMode)return true;
  if(!invited||!Number.isFinite(now)||!['sat','sun'].includes(selected))return false;
  const first=Date.UTC(2026,10,9,6);
  const last=Date.UTC(2026,10,selected==='sun'?15:14,21);
  return now>=first&&now<last;
 }
 let active=null;
 function stop(){if(active){active.dispose();active=null;}}
 function mount(host,opts={}){
  stop();
  if(!host)return;
  let frame=null,disposed=false,lastTime=0,state='ready',points=0,heartCount=0,lastHud=-100,
      spawnObstacle=0,spawnHeart=0,obstacles=[],hearts=[],clouds=[
       {x:100,y:49,scale:1},{x:400,y:77,scale:.7},{x:640,y:36,scale:.85}
      ];
  const player={x:98,y:FLOOR-56,w:52,h:56,vy:0};
  const previous=read();
  let best=previous.best;
  host.innerHTML='<div class="kicker">СЕКРЕТНЫЙ АРКАДНЫЙ БОНУС · ОПЕРАЦИЯ 28.10</div>'+
   '<div class="daily-dino-title">🦕 <span>Динолюбик</span> 💗</div>'+
   '<p class="subtitle">Прыгай через препятствия и собирай сердечки! Очки за расстояние и сердца суммируются <b>в одном забеге</b>. За 5 000 очков открываются <b>24 часа пожеланий после свидания</b> с небольшими покупками на общую сумму до <b>1 000 ₽</b> (на самом свидании они не действуют). После <b>10 000</b> включится турбо-режим. За <b>15 000 очков</b> — отдельный подарок на 5 000 ₽ в «Магнит Косметик»! ♡</p>'+
   (opts.preview?'<p class="daily-preview-note">🔧 Тестовый просмотр: награды и рекорд Лизы не сохраняются.</p>':'')+
   '<div class="daily-dino-scores"><span>Очки <b id="dino-score">0</b></span><span>Рекорд <b id="dino-best">'+best+'</b></span><span>Сердечки <b id="dino-hearts">0</b></span></div>'+
   '<div class="daily-dino-difficulty" id="dino-difficulty" aria-live="polite">🌷 Нежный режим · усложнение после 10 000 очков</div>'+
   '<div class="daily-dino-surface"><canvas id="dino-canvas" width="720" height="280" tabindex="0" role="img" aria-label="Игра Динолюбик: нажми кнопку Прыжок или пробел, чтобы перепрыгивать препятствия и собирать сердца"></canvas>'+
   '<div id="dino-overlay" class="daily-dino-overlay" role="status"><strong id="dino-title">Готова играть? ♡</strong><small id="dino-hint">Коснись экрана или нажми «Начать». Затем прыгай касанием, пробелом или ↑.</small></div></div>'+
   '<div class="daily-dino-controls"><button type="button" id="dino-jump" class="btn">▶ Начать игру</button>'+
   '<button type="button" id="dino-pause" class="btn alt" disabled>Пауза</button></div>'+
   '<div class="daily-dino-rewards" id="dino-rewards" aria-live="polite"></div>'+
   '<p class="day-status-note">Приз считается по лучшему забегу на этом телефоне. Сделай скриншот открытого купона и покажи Игорю. Игра не отправляет результаты на сервер.</p>'+
   '<button type="button" class="btn alt" id="dino-exit">← Назад к сериалу</button>';
  const cv=host.querySelector('#dino-canvas'),ctx=cv.getContext('2d');
  const scoreEl=host.querySelector('#dino-score'),bestEl=host.querySelector('#dino-best'),heartEl=host.querySelector('#dino-hearts');
  const overlay=host.querySelector('#dino-overlay'),title=host.querySelector('#dino-title'),hint=host.querySelector('#dino-hint');
  const jumpBtn=host.querySelector('#dino-jump'),pauseBtn=host.querySelector('#dino-pause'),rewardEl=host.querySelector('#dino-rewards');
  const difficultyEl=host.querySelector('#dino-difficulty');
  function refreshDifficulty(){
   if(!difficultyEl)return;
   const turbo=difficulty(points).turbo;
   difficultyEl.classList.toggle('is-turbo',turbo);
   difficultyEl.textContent=turbo?'🔥 ТУРБО-РЕЖИМ · БЫСТРЕЕ И СЛОЖНЕЕ':'🌷 Нежный режим · усложнение после 10 000 очков';
  }
  if(!ctx){host.innerHTML='<p>Эта версия браузера не поддерживает игру. Попробуй другой браузер на телефоне.</p><button class="btn" id="dino-exit">Назад</button>';host.querySelector('#dino-exit').addEventListener('click',()=>opts.onExit?.());return;}
  const pixelRatio=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  cv.width=W*pixelRatio;cv.height=H*pixelRatio;
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
  const circle=(x,y,r,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
  function heart(x,y,scale=1){
   ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
   ctx.fillStyle='#d15487';ctx.beginPath();ctx.moveTo(0,10);
   ctx.bezierCurveTo(-18,-4,-11,-13,0,-4);ctx.bezierCurveTo(11,-13,18,-4,0,10);
   ctx.fill();ctx.restore();
  }
  function dino(){
   const x=player.x,y=player.y;
   rect(x+9,y+20,34,26,'#5f9e9d'); // body
   rect(x+25,y+6,22,28,'#5f9e9d'); // neck
   rect(x+30,y+0,23,18,'#70b5b0'); // head
   rect(x+44,y+12,15,10,'#70b5b0'); // snout
   rect(x+9,y+25,19,12,'#90cfc2'); // tummy
   rect(x-4,y+27,17,12,'#5f9e9d'); // tail
   rect(x-12,y+30,13,6,'#70b5b0');
   rect(x+40,y+5,4,4,'#40334b');rect(x+47,y+18,5,2,'#58304c');
   rect(x+33,y+29,9,6,'#72bbb5');rect(x+35,y+33,5,8,'#72bbb5'); // arm
   if(player.y===FLOOR-player.h){
    if((Math.floor(points/30)%2)===0){rect(x+16,y+44,9,12,'#477f86');rect(x+33,y+46,9,10,'#477f86');}
    else{rect(x+16,y+48,9,8,'#477f86');rect(x+33,y+43,9,13,'#477f86');}
   }else{rect(x+16,y+46,8,9,'#477f86');rect(x+34,y+46,8,9,'#477f86');}
   heart(x+23,y+33,.68); // dinosaur's heart
   heart(x+47,y-12,.42); // floating tiny heart by his face
  }
  function obstacle(o){
   const y=FLOOR-o.h;
   if(o.type===0){ // cactus-like pixel-shaped soft obstacle
    rect(o.x+8,y,20,o.h,'#8d7f9f');
    rect(o.x,y+12,10,11,'#a496b5');
    rect(o.x+26,y+7,10,13,'#a496b5');
    rect(o.x+3,y+6,9,7,'#8d7f9f');
    rect(o.x+26,y+3,9,9,'#8d7f9f');
   }else{
    rect(o.x+2,y+4,o.w-4,o.h-4,'#dca3aa');
    rect(o.x+1,y+1,o.w-4,7,'#b5798e');
    rect(o.x+o.w-11,y+8,6,o.h-13,'#f5d7c4');
    heart(o.x+o.w/2,y+o.h/2,.32);
   }
  }
  function draw(){
   const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#fbe1ec');bg.addColorStop(1,'#fff9ec');
   rect(0,0,W,H,bg);
   rect(0,199,W,27,'#f9dfdb');
   // Clouds, birds, distant plants.
   clouds.forEach(c=>{circle(c.x,c.y,13*c.scale,'#fffaf7');circle(c.x+15*c.scale,c.y-7*c.scale,17*c.scale,'#fffaf7');circle(c.x+32*c.scale,c.y,12*c.scale,'#fffaf7');});
   for(let i=0;i<13;i++){const x=i*68-(points*.15%68);rect(x,210,30,3,'#e5b9ca');}
   rect(0,FLOOR,W,4,'#a37e99');rect(0,FLOOR+4,W,H-FLOOR-4,'#f0ced4');
   for(let i=0;i<18;i++){const x=i*54-(points*.65%54);rect(x,FLOOR+13+(i%3)*5,20,3,'#cca2b1');}
   obstacles.forEach(obstacle);
   hearts.forEach(h=>{heart(h.x,h.y,.9);circle(h.x+5,h.y-4,2,'#fff2f4');});
   dino();
   if(state==='over'){
    rect(0,0,W,H,'#60395112');
   }
  }
  function awards(){
   const shown=Math.max(best,Math.floor(points));
   rewardEl.innerHTML=GIFTS.map(g=>'<div class="daily-dino-gift'+(shown>=g.at?' is-unlocked':'')+'"><strong>'+
    (shown>=g.at?'✅ ':'🔒 ')+g.at+' очков · '+g.title+'</strong><span>'+
    (shown>=g.at?g.detail:'Пока закрыто. Ещё '+Math.max(0,g.at-shown)+' очков до награды.')+'</span></div>').join('')+
    (shown>=5000&&window.DailyDinoWishes?
      '<details class="dino-wish-drawer"><summary>💝 Условия и активация суток пожеланий</summary>'+
        window.DailyDinoWishes.card({score:shown,day:opts.getDay?.(),now:opts.getNow?.(),preview:!!opts.preview})+'</details>':'')+
    (shown>=PREMIUM_AT&&window.DailyDinoCertificate?window.DailyDinoCertificate.certificateControls(opts.preview):'');
   if(shown>=5000&&window.DailyDinoWishes)window.DailyDinoWishes.bind(rewardEl,{
    preview:!!opts.preview,getScore:()=>read().best,getDay:opts.getDay,getNow:opts.getNow,
    onChange:awards
   });
   if(shown>=PREMIUM_AT&&window.DailyDinoCertificate)window.DailyDinoCertificate.bind(rewardEl,{
    preview:opts.preview,unlocked:()=>read().best>=PREMIUM_AT
   });
  }
  function hud(force=false){
   if(!force&&Math.floor(points/25)===lastHud)return;
   lastHud=Math.floor(points/25);scoreEl.textContent=String(Math.floor(points));
   bestEl.textContent=String(Math.max(best,Math.floor(points)));
   heartEl.textContent=String(heartCount);
  }
  function persistBest(){const value=saveHigh(points,opts.preview);best=Math.max(best,Math.floor(points),value.best);awards();hud(true);}
  function setState(next,heading,subtext){
   state=next;
   overlay.hidden=next==='running';
   title.textContent=heading||'';
   hint.textContent=subtext||'';
   jumpBtn.textContent=next==='ready'?'▶ Начать игру':next==='running'?'⬆ Прыжок':next==='paused'?'▶ Продолжить':'↻ Попробовать снова';
   pauseBtn.disabled=next==='ready'||next==='over';
   pauseBtn.textContent=next==='paused'?'Продолжить':'Пауза';
  }
  function reset(){
   points=0;heartCount=0;spawnObstacle=1.5;spawnHeart=1.0;
   player.y=FLOOR-player.h;player.vy=0;obstacles=[];hearts=[];lastTime=0;lastHud=-100;
   hud(true);awards();refreshDifficulty();
  }
  function canPlay(){return opts.canPlay?opts.canPlay():true;}
  function jump(){
   if(disposed||!canPlay()){if(!disposed)setState('paused','Пауза','Доступ к игре на сегодня закрыт.');return;}
   if(state==='ready'||state==='over'){reset();setState('running');lastTime=0;request();}
   if(state==='paused'){setState('running');lastTime=0;request();return;}
   if(state==='running'&&player.y>=FLOOR-player.h-.7){player.vy=-575;}
  }
  function pause(){
   if(state==='running'){setState('paused','Пауза ♡','Игра остановлена. Возвращайся, когда захочешь.');if(frame!==null){cancelAnimationFrame(frame);frame=null;}}
   else if(state==='paused')jump();
  }
  function request(){if(!disposed&&state==='running'&&frame===null)frame=requestAnimationFrame(tick);}
  function collided(a,b){
   return a.x+7<b.x+b.w-4&&a.x+a.w-7>b.x+4&&a.y+9<b.y+b.h-2&&a.y+a.h-3>b.y+3;
  }
  function tick(ms){
   frame=null;
   if(disposed||state!=='running')return;
   if(!canPlay()){pause();return;}
   const delta=lastTime?Math.min((ms-lastTime)/1000,.05):0;
   lastTime=ms;
   if(delta>0){
    const last=points;points+=delta*82;
    const level=difficulty(points);
    const speed=195+Math.min(125,Math.floor(points/800)*10)+level.speedBonus;
    player.vy+=delta*1570;player.y+=player.vy*delta;
    if(player.y>=FLOOR-player.h){player.y=FLOOR-player.h;player.vy=0;}
    spawnObstacle-=delta;spawnHeart-=delta;
    if(spawnObstacle<=0){
     const type=Math.random()<.5?0:1;
     const height=(type===0?37+Math.random()*17:34+Math.random()*18)+level.heightBonus;
     obstacles.push({x:W+10,w:37,h:height,type});
     spawnObstacle=Math.max(.80,Math.max(1.04,1.6+Math.random()*.66-Math.floor(points/1400)*.08)*level.spawnMultiplier);
    }
    if(spawnHeart<=0){
     hearts.push({x:W+15,y:140+Math.random()*29});
     spawnHeart=1.55+Math.random()*1.4;
    }
    obstacles.forEach(o=>o.x-=speed*delta);
    hearts.forEach(h=>h.x-=speed*delta);
    obstacles=obstacles.filter(o=>o.x+o.w>0);
    hearts=hearts.filter(h=>{
     if(Math.abs(h.x-(player.x+29))<31&&Math.abs(h.y-(player.y+25))<35){
      points+=220;heartCount++;return false;
     }
     return h.x>0;
    });
    if(obstacles.some(o=>collided(player,{x:o.x,y:FLOOR-o.h,w:o.w,h:o.h}))){
     persistBest();setState('over','Ой, препятствие! ♡','Собрано '+Math.floor(points)+' очков. Можно попробовать снова — лучшие награды останутся.');
     draw();return;
    }
    if(last<TURBO_AT&&points>=TURBO_AT)refreshDifficulty();
    if([2000,5000,PREMIUM_AT].some(at=>last<at&&points>=at))persistBest();
    if(points>best+250)persistBest();
    clouds.forEach(c=>{c.x-=delta*6*c.scale;if(c.x<-50)c.x=W+40;});
   }
   draw();hud();request();
  }
  const jumpClick=e=>{e.preventDefault();jump();};
  const onKeyboard=e=>{
   if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();jump();}
   else if(e.code==='KeyP'&&state!=='ready'){e.preventDefault();pause();}
  };
  const onVisibility=()=>{if(document.hidden&&state==='running')pause();if(document.hidden&&points>best)persistBest();};
  cv.addEventListener('pointerdown',jumpClick);
  jumpBtn.addEventListener('click',jumpClick);
  pauseBtn.addEventListener('click',pause);
  document.addEventListener('keydown',onKeyboard);
  document.addEventListener('visibilitychange',onVisibility);
  host.querySelector('#dino-exit').addEventListener('click',()=>{persistBest();stop();opts.onExit?.();});
  function dispose(){
   if(disposed)return;
   disposed=true;
   if(frame!==null){cancelAnimationFrame(frame);frame=null;}
   document.removeEventListener('keydown',onKeyboard);
   document.removeEventListener('visibilitychange',onVisibility);
   cv.removeEventListener('pointerdown',jumpClick);
   if(points>best)saveHigh(points,opts.preview);
  }
  active={dispose};
  reset();setState('ready','Готова играть? ♡','Прыгай через препятствия, собирай сердечки и набирай очки.');
  draw();
 }
 window.DailyDino={mount,stop,read,saveHigh,rewardStatus,gameAvailable,difficulty,TURBO_AT,PREMIUM_AT};
})();