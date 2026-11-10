/* Операция 28.10 · Secret dossier.
 * Scripted Cupid conversation, 5-piece art, a 2031 letter and scratch cards.
 * All daily unlocks depend on existing completed chapters; no new date bypass.
 * In host preview, choices and scratch reveals stay in ephemeral memory. */
(function(){
 'use strict';
 const KEY='sd2810-secret-dossier-v1';
 const DAYS=[9,10,11,12,13,14],PIECES=[9,10,11,12,13];
 const storage=window.SDTest.storage;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const CHAT=[
  {day:0,question:'Агент Л-01, связь установлена! Какой жанр у вашей идеальной истории?',choices:[
   ['Непредсказуемое приключение 🚗','Принято. Сценаристу придётся пристегнуть ремень безопасности.'],
   ['Тёплая история вдвоём 🧸','Записал. Секретный отдел заказал дополнительную порцию уюта.'],
   ['Комедия с Игорем в главной роли 😄','В таком случае автору придётся держать себя в руках. Без гарантий!']
  ]},
  {day:9,question:'Первое досье открыто. Что делать, если подозреваемый Игорь снова что-то задумал?',choices:[
   ['Провести романтический допрос 🔍','Агент Купидон готовит лампу и коробку конфет.'],
   ['Притвориться, что ничего не замечаю 😏','Сильный ход! Подозреваемый наверняка выдаст себя сам.'],
   ['Обнять и всё выяснить 🤗','Дело официально признано слишком милым для расследования.']
  ]},
  {day:10,question:'Пришла шифровка: кто обычно побеждает в споре о том, какой фильм смотреть?',choices:[
   ['Лиза, конечно 🎬','Официально: демократия — это когда выбирает Лиза.'],
   ['Игорь пытается, но... 🙃','В протоколе значится: попытка была очень смелой.'],
   ['Договариваемся вместе 💞','Редкая находка: пара, умеющая договориться. Беречь!']
  ]},
  {day:11,question:'Срочное донесение! Машина требует внимания. Как спасти романтическую атмосферу?',choices:[
   ['Включить музыку погромче 🎶','Операция «Поём всю дорогу» успешно запущена.'],
   ['Выдать Игорю разводной ключ 🔧','Механик одобряет. Агент Купидон слегка нервничает.'],
   ['Сказать: «А меня обнимешь?» ♡','Технические работы приостановлены по важной причине.']
  ]},
  {day:12,question:'В вашем идеальном дне освободился один час. Куда его потратить?',choices:[
   ['На прогулку вдвоём 🌿','В календаре отмечено: секретный час счастья.'],
   ['На уютное кино 🍿','Плед официально назначен почётным участником операции.'],
   ['На глупости и смех 😄','Агентство просит не смеяться слишком громко. Безуспешно.']
  ]},
  {day:13,question:'Дело почти раскрыто. Какой приговор вынесем главному подозреваемому?',choices:[
   ['Пожизненные объятия 💗','Приговор принят при условии обоюдного согласия.'],
   ['Ежедневно делать комплименты 💌','Подозреваемый не возражает. Даже рад.'],
   ['Продолжать придумывать сюрпризы ✨','Дело передано в отдел новых романтических приключений.']
  ]},
  {day:14,question:'Последний выпуск. Оставим в личном архиве одно обещание?',choices:[
   ['Чаще смеяться вместе 😄','Архив обновлён: улыбки — обязательный пункт программы.'],
   ['Беречь уют вдвоём 🧸','Архив обновлён: рядом с любимым человеком всегда теплее.'],
   ['Не переставать удивлять 💫','Архив обновлён: продолжение этой истории обязательно будет.']
  ]}
 ];
 const SCRATCH={
  9:['💌','Нелегальная улика','Подозреваемый Игорь слишком часто думает о тебе. Следствие в восторге.'],
  10:['🎶','Особое поручение','Выбери песню для совместной поездки. Пусть она станет вашим маленьким саундтреком.'],
  11:['🧸','Обнимательный пропуск','Обнаружено секретное право попросить лишние объятия. Действует по взаимному желанию.'],
  12:['📸','Фото из будущего','Сделайте однажды смешное совместное фото. Пусть даже неидеальное — зато настоящее.'],
  13:['🌷','Комплимент под грифом «секретно»','Твоя улыбка способна испортить любую серьёзность секретного агента.'],
  14:['✨','Бонусная находка','Выбирай маленькое совместное приключение. Главное — чтобы вам обоим было интересно.']
 };
 let previewData={chat:{},scratch:{}};
 function fresh(){return {chat:{},scratch:{}};}
 function read(){
  const fallback=fresh();
  try{
   const saved=JSON.parse(storage.getItem(KEY)||'null');
   if(saved&&typeof saved==='object'&&saved.chat&&typeof saved.chat==='object'&&saved.scratch&&typeof saved.scratch==='object'){
    for(let i=0;i<CHAT.length;i++){
     const v=saved.chat[i];
     if(!Number.isInteger(v)||v<0||v>=CHAT[i].choices.length)delete saved.chat[i];
    }
    return saved;
   }
  }catch(e){}
  return fallback;
 }
 function data(opts){return opts.preview?previewData:read();}
 function modify(opts,action){
  const draft=JSON.parse(JSON.stringify(data(opts)));
  action(draft);
  if(opts.preview){previewData=draft;return true;}
  try{storage.setItem(KEY,JSON.stringify(draft));return true;}catch(e){return false;}
 }
 function days(opts){return DAYS.filter(d=>Array.isArray(opts.days)&&opts.days.includes(d));}
 function unlocked(opts,day){return opts.preview===true||Array.isArray(opts.earned)&&opts.earned.includes(day);}
 function allDone(opts){const available=days(opts);return available.length>=5&&available.every(d=>unlocked(opts,d));}
 function pieceCount(opts){return PIECES.filter(day=>unlocked(opts,day)).length;}
 function pick(opts,index,option){
  const item=CHAT[index];
  if(!item||!Number.isInteger(option)||option<0||option>=item.choices.length)return false;
  if(item.day&&!unlocked(opts,item.day))return false;
  const saved=data(opts);
  if(Object.prototype.hasOwnProperty.call(saved.chat,index))return false;
  for(let i=0;i<index;i++){
   if(CHAT[i].day&&!days(opts).includes(CHAT[i].day))continue;
   if(saved.chat[i]===undefined)return false;
  }
  return modify(opts,st=>{st.chat[index]=option;});
 }
 function markScratch(opts,day){
  if(!unlocked(opts,day)||!SCRATCH[day]||!days(opts).includes(day))return false;
  return modify(opts,st=>{st.scratch[day]=true;});
 }
 function header(title,subtitle){
  return '<a class="secret-back" href="#secret-files">← В секретное досье</a>'+
   '<div class="kicker">ОПЕРАЦИЯ 28.10 · СЕКРЕТНЫЙ ОТДЕЛ</div><h1>'+title+'</h1>'+
   '<p class="subtitle">'+subtitle+'</p>';
 }
 function hub(host,opts){
  const total=days(opts).length,done=days(opts).filter(d=>unlocked(opts,d)).length;
  const diary=data(opts),scratched=days(opts).filter(d=>diary.scratch[d]===true).length;
  host.innerHTML='<div class="secret-hub">'+
   '<a class="secret-back" href="#menu">← Главное меню</a>'+
   '<div class="kicker">ОПЕРАЦИЯ 28.10 · СЕКРЕТНЫЕ МАТЕРИАЛЫ</div>'+
   '<div class="secret-hub-mark">🗝️</div><h1>Секретное<br><em>досье ♡</em></h1>'+
   '<p class="subtitle">Новые улики открываются за пройденные ежедневные главы. Сложных заданий и дополнительных денежных призов здесь нет.</p>'+
   (opts.preview?'<p class="daily-preview-note">🔧 Просмотр ведущего: новые открытия не изменяют прогресс Лизы.</p>':'')+
   '<div class="secret-hub-grid">'+
   '<a href="#cupid" class="secret-hub-card"><span>💬</span><strong>Чат Купидона</strong><small>Сообщения, выборы и шутливое расследование</small><b>Переписываться →</b></a>'+
   '<a href="#puzzle" class="secret-hub-card"><span>🧩</span><strong>Пять фрагментов</strong><small>Найдено '+pieceCount(opts)+' из 5 частей Polaroid</small><b>Собрать фотографию →</b></a>'+
   '<a href="#future-letter" class="secret-hub-card"><span>💌</span><strong>Письмо из 2031 года</strong><small>'+(allDone(opts)?'Последний конверт готов':'Откроется после всех '+total+' выпусков')+'</small><b>Посмотреть конверт →</b></a>'+
   '<a href="#scratch" class="secret-hub-card"><span>✨</span><strong>Скретч-карты</strong><small>Открыто '+scratched+' из '+done+' доступных</small><b>Стереть защитный слой →</b></a></div>'+
   '<p class="secret-footnote">Уже полученные фрагменты и ответы сохраняются в браузере этого телефона. Доступ к будущим выпускам остаётся закрытым.</p></div>';
 }
 function chat(host,opts){
  const saved=data(opts),limit=days(opts).length;
  let html=header('Секретный чат 💬','Агент Купидон ведёт расследование. Выбирай ответы, и история будет запоминать твой выбор.')+
   '<div class="secret-chat-hint">Сценарный чат: это игровая переписка, сообщения не отправляются Игорю и не обрабатываются ИИ.</div>'+
   '<div class="secret-chat-thread"><div class="secret-chat-bubble agent">💘 Агент Купидон на связи. Игорь снова что-то задумал…</div>';
  let nextIndex=-1;
  for(let i=0;i<CHAT.length;i++){
   const item=CHAT[i];
   if(item.day&&!days(opts).includes(item.day))continue;
   const selected=saved.chat[i];
   if(Number.isInteger(selected)){
    html+='<div class="secret-chat-bubble agent">'+esc(item.question)+'</div>'+
      '<div class="secret-chat-bubble me">'+esc(item.choices[selected][0])+'</div>'+
      '<div class="secret-chat-bubble agent">'+esc(item.choices[selected][1])+'</div>';
   }else{nextIndex=i;break;}
  }
  if(nextIndex>=0){
   const current=CHAT[nextIndex],isOpen=current.day===0||unlocked(opts,current.day);
   if(isOpen){
    html+='<div class="secret-chat-bubble agent">'+esc(current.question)+'</div>'+
      '<div class="secret-chat-choices">'+current.choices.map((c,j)=>
       '<button type="button" class="secret-chat-option" data-secret-choice="'+nextIndex+':'+j+'">'+esc(c[0])+'</button>').join('')+'</div>';
   }else{
    html+='<div class="secret-chat-bubble agent">🔒 Следующее сообщение станет доступно после прохождения главы за '+current.day+' ноября.</div>';
   }
  }else html+='<div class="secret-chat-bubble agent">💗 Досье переписки заполнено. Продолжение истории ждёт в секретном письме!</div>';
  html+='</div><a href="#secret-files" class="secret-return">К другим уликам →</a>';
  host.innerHTML=html;
  host.querySelectorAll('[data-secret-choice]').forEach(b=>b.addEventListener('click',()=>{
   const [i,j]=b.dataset.secretChoice.split(':').map(Number);
   if(pick(opts,i,j))chat(host,opts);
  }));
 }
 function puzzle(host,opts){
  const count=pieceCount(opts);
  let html=header('Собери Polaroid 🧩','За каждую завершённую главу с 9 по 13 ноября появляется один фрагмент загадочной открытки.')+
   '<div class="secret-puzzle-note">'+(count===5?'💗 Все пять частей найдены!':'Найдено '+count+' из 5 частей. Неизвестные фрагменты пока скрыты.')+'</div>'+
   '<div class="secret-puzzle-grid" aria-label="Пять фрагментов открытки">';
  for(let i=0;i<5;i++){
   const unlockedPiece=unlocked(opts,PIECES[i]);
   html+='<div class="secret-puzzle-part'+(unlockedPiece?' is-visible':' is-locked')+'"'+
    (unlockedPiece?' style="background-image:url(secret-heart-puzzle.svg);background-position:'+(i*25)+'% center"':'')+
    ' aria-label="'+(unlockedPiece?'Фрагмент '+(i+1)+' найден':'Фрагмент '+(i+1)+' закрыт')+'">'+
    (unlockedPiece?'':'<span>🔒</span>')+'</div>';
  }
  html+='</div><div class="secret-puzzle-days">'+PIECES.map((d,i)=>'<span class="'+(unlocked(opts,d)?'is-found':'')+'">'+(unlocked(opts,d)?'✓':'🔒')+' '+d+'.11</span>').join('')+'</div>';
  if(count===5){
   html+='<div class="secret-puzzle-finale"><h3>Главная тайна раскрыта ♡</h3>'+
    '<p>У нашей истории ещё впереди много страниц. И каждая становится красивее, когда мы пишем её вдвоём.</p>'+
    '<p><strong>Главный секрет — не место и не маршрут, а то, что мы рядом.</strong></p></div>';
  }else html+='<p class="secret-footnote">Каждая часть появляется автоматически после прохождения соответствующей главы. На этом экране ничего дополнительно зарабатывать не нужно.</p>';
  host.innerHTML=html;
 }
 function letter(host,opts){
  const ready=allDone(opts);
  let html=header('Письмо из 2031 года 💌','В архиве найдено послание с необычной датой. Отправитель уверяет, что знает вас в будущем.')+
   '<div class="secret-letter-card">';
  if(!ready){
   const completed=days(opts).filter(d=>unlocked(opts,d)).length,total=days(opts).length;
   html+='<div class="secret-letter-seal">🔒</div><h2>Конверт запечатан</h2>'+
    '<p>Письмо откроется после заключительной доступной главы мини-сериала. Уже собрано '+completed+' из '+total+' печатей.</p>'+
    '<p>Ни один сюжетный секрет свидания раньше времени не выдаём.</p>';
  }else{
   const style=data(opts).chat[0];
   const middle=style===0?
    'Конечно, ты выбрала приключения. Игорь до сих пор иногда говорит: «Я тут кое-что придумал», а ты уже знаешь — обычного вечера не будет.':
    style===2?
    'В нашем доме до сих пор много смеха. Игорь всё так же шутит, будто это особый вид спорта, а ты умеешь ответить так, что победителей не бывает.':
    'Самые счастливые вечера у нас по-прежнему простые: плед, разговоры, любимая музыка и ощущение, что никуда не нужно спешить.';
   html+='<div class="secret-letter-seal">💌</div><div class="secret-letter-kicker">НАПИСАНО В 2031 ГОДУ · ЛИЧНО ДЛЯ ЛИЗЫ</div>'+
    '<h2>Дорогая Лиза…</h2>'+
    '<p>Пишу тебе из будущего. Нет, это не ошибка календаря, и да — кажется, ВАЗ всё ещё иногда требует внимания. Некоторые вещи не меняются.</p>'+
    '<p>'+middle+'</p>'+
    '<p>Я помню, как всё начиналось: маленькие секреты, смешные переписки, игры, загадки и нашу привычку находить повод улыбнуться даже в самый обычный день.</p>'+
    '<p>Хочу, чтобы ты знала: счастье для меня — не идеальный план и не дорогой подарок. Это ты рядом, твой смех и наши истории, которые хочется вспоминать снова и снова.</p>'+
    '<p>А если однажды мы снова встретим письмо из будущего, пусть оно расскажет, что мы всё ещё любим удивлять друг друга.</p>'+
    '<div class="secret-letter-sign">С любовью, Игорь ♡<small>Письмо — игровая фантазия о нашем будущем.</small></div>';
  }
  host.innerHTML=html+'</div>';
 }
 function scratchList(host,opts){
  const all=days(opts),found=all.filter(d=>unlocked(opts,d)).length,opened=all.filter(d=>data(opts).scratch[d]).length;
  let html=header('Скретч-карты ✨','Сотри защитный слой пальцем, чтобы открыть маленький сюрприз. По одной карточке за пройденную главу.')+
   '<div class="secret-scratch-count">Открыто '+opened+' из '+found+' доступных карточек</div>'+
   '<div class="secret-scratch-list">';
  for(const d of all){
   if(!unlocked(opts,d))html+='<div class="secret-scratch-line is-locked"><span>🔒 '+d+' ноября</span><small>После прохождения главы</small></div>';
   else html+='<a class="secret-scratch-line" href="#scratch-'+d+'"><span>'+(data(opts).scratch[d]?'✅':'🎟️')+' '+d+' ноября</span>'+
     '<small>'+(data(opts).scratch[d]?'Открыта — можно перечитать':'Стереть и узнать секрет →')+'</small></a>';
  }
  host.innerHTML=html+'</div>';
 }
 function scratchSingle(host,opts,day){
  if(!days(opts).includes(day))return scratchList(host,opts);
  const allowed=unlocked(opts,day),prize=SCRATCH[day];
  let html='<a class="secret-back" href="#scratch">← Все скретч-карты</a>'+
   '<div class="kicker">СЕКРЕТНАЯ КАРТА · '+day+' НОЯБРЯ</div><h1>Сотри тайну ✨</h1>';
  if(!allowed){
   host.innerHTML=html+'<div class="locked">🔒 Эта карточка откроется только после прохождения главы за '+day+' ноября.</div>';return;
  }
  const revealed=data(opts).scratch[day]===true;
  html+='<p class="subtitle">'+(revealed?'Тайна уже открыта. Можно перечитывать!':'Проведи пальцем по серебристому слою или используй кнопку ниже.')+'</p>'+
   '<div class="secret-scratch-frame">'+
   '<div class="secret-scratch-answer"><div class="secret-scratch-icon">'+prize[0]+'</div><h3>'+prize[1]+'</h3><p>'+prize[2]+'</p></div>'+
   (revealed?'':'<canvas id="secret-scratch-canvas" width="560" height="280" aria-label="Стираемая карточка; проведи пальцем по покрытию"></canvas>')+'</div>'+
   (revealed?'<p class="secret-scratch-success">✓ Улика сохранена в твоём альбоме</p>':
    '<button type="button" class="btn alt" id="secret-scratch-open">♡ Открыть без стирания</button>'+
    '<p class="secret-footnote" id="secret-scratch-hint">Сотри слой несколькими движениями. Если сенсор не работает, воспользуйся кнопкой.</p>');
  host.innerHTML=html;
  if(revealed)return;
  const unlock=()=>{
   if(!markScratch(opts,day))return;
   scratchSingle(host,opts,day);
  };
  host.querySelector('#secret-scratch-open')?.addEventListener('click',unlock);
  const cv=host.querySelector('#secret-scratch-canvas'),ctx=cv?.getContext?.('2d');
  if(!ctx)return;
  ctx.fillStyle='#b6a1bd';ctx.fillRect(0,0,560,280);
  ctx.fillStyle='#f6e2eb';
  for(let i=0;i<22;i++){ctx.beginPath();ctx.arc(15+(i*79)%530,22+(i*61)%230,4+(i%3),0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#fffaf3';ctx.textAlign='center';ctx.font='bold 27px Georgia,serif';
  ctx.fillText('ПОТРИ, ЧТОБЫ ОТКРЫТЬ ♡',280,132);
  ctx.font='17px Arial,sans-serif';ctx.fillText('секретный сюрприз',280,166);
  let drawing=false,last=null,travelled=0;
  const xy=e=>{
   const rect=cv.getBoundingClientRect();
   return {x:(e.clientX-rect.left)*560/(rect.width||560),y:(e.clientY-rect.top)*280/(rect.height||280)};
  };
  cv.addEventListener('pointerdown',e=>{drawing=true;last=xy(e);cv.setPointerCapture?.(e.pointerId);e.preventDefault();});
  cv.addEventListener('pointermove',e=>{
   if(!drawing||!cv.isConnected)return;
   const next=xy(e);
   ctx.globalCompositeOperation='destination-out';
   ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=55;
   ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(next.x,next.y);ctx.stroke();
   ctx.globalCompositeOperation='source-over';
   travelled+=Math.hypot(next.x-last.x,next.y-last.y);
   last=next;e.preventDefault();
   if(travelled>=900)unlock();
  });
  const stop=()=>{drawing=false;last=null;};
  cv.addEventListener('pointerup',stop);cv.addEventListener('pointercancel',stop);cv.addEventListener('lostpointercapture',stop);
 }
 function render(host,opts={},section='hub',day=null){
  if(!host)return;
  const normalized={days:Array.isArray(opts.days)?opts.days:[],earned:Array.isArray(opts.earned)?opts.earned:[],preview:opts.preview===true};
  if(section==='chat')return chat(host,normalized);
  if(section==='puzzle')return puzzle(host,normalized);
  if(section==='letter')return letter(host,normalized);
  if(section==='scratch')return Number.isInteger(day)?scratchSingle(host,normalized,day):scratchList(host,normalized);
  return hub(host,normalized);
 }
 window.DailySecrets={KEY,DAYS,PIECES,CHAT,SCRATCH,read,pick,markScratch,unlocked,allDone,pieceCount,render};
})();