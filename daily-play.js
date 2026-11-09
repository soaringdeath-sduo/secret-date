/* Operation 28.10 - six playful daily mini-game genres and secret surprise cards.
 * Uses the existing isolated storage so full host tests never alter Lisa's progress. */
(function(){
 'use strict';
 const storage=window.SDTest.storage;
 const KEY='sd2810-daily-play-v1';
 const DAYS=[9,10,11,12,13,14];
 const PLAY={
  9:[{type:'hunt',title:'Фотоохота за сердечками',note:'Найди пять сердечек среди маленьких полароидов.'},
     {type:'memory',title:'Наши парные воспоминания',note:'Открой четыре пары одинаковых карточек.'}],
  10:[{type:'assemble',title:'Перепутанная записка',note:'Собери нежную фразу по кусочкам.'},
      {type:'decode',title:'Шифр любви',note:'Разгадай три простые подсказки из эмодзи.'}],
  11:[{type:'match',title:'Мы подходим друг другу',note:'Найди пары у четырёх романтических подсказок.'},
      {type:'hunt',title:'Охота за поцелуями',note:'Среди записок спрятаны пять розовых сердечек.'}],
  12:[{type:'story',title:'Наш уютный сценарий',note:'Выбирай, как могла бы продолжиться маленькая история.'},
      {type:'assemble',title:'Фраза из секретного письма',note:'Составь предложение, чтобы письмо стало понятнее.'}],
  13:[{type:'memory',title:'Агент памяти',note:'Восстанови четыре пары спрятанных символов.'},
      {type:'match',title:'Подозреваемый: романтик',note:'Соедини подсказки детектива с их разгадками.'}],
  14:[{type:'decode',title:'Последний любовный шифр',note:'Три загадки — и секретный отдел доволен.'},
      {type:'story',title:'Три маленьких выбора',note:'Твои решения создадут последнюю мини-историю.'}]
 };
 const EVENT=[
  ['💌','Письмо без подписи','«Кому-то невероятно повезло, что у него есть ты. Подписывать не буду — и так догадаешься».'],
  ['🎵','Музыкальная заявка','Секретный бонус: сегодня ты выбираешь одну песню, которую мы послушаем вместе.'],
  ['🧸','Пропуск в обнимашки','Выдан бессрочный пропуск на объятия. Активируется по взаимному желанию.'],
  ['🔍','Загадочная улика','Агент Л-01, найдена улика: Игорь слишком часто улыбается рядом с тобой. Дело почти раскрыто.'],
  ['🌷','Карманный комплимент','Ты делаешь обычные дни ярче. Сохрани это сообщение на случай серого настроения.'],
  ['🎲','Твой смешной приказ','Бонусное задание Игорю: изобразить самого серьёзного секретного агента хотя бы 10 секунд.'],
  ['🍀','Редкая находка','Золотая карточка! Покажи Игорю — получишь персональный комплимент без подготовки.'],
  ['⭐','Следующий выпуск ждёт','Система нашла одну важную деталь: чем ближе встреча, тем больше поводов улыбаться.']
 ];
 function read(){
  const fresh={played:{},event:{},revealed:{}};
  try{
   const data=JSON.parse(storage.getItem(KEY)||'null');
   if(data&&typeof data==='object'){
    for(const key of Object.keys(fresh))if(data[key]&&typeof data[key]==='object')fresh[key]=data[key];
   }
  }catch(e){}
  return fresh;
 }
 function write(data){try{storage.setItem(KEY,JSON.stringify(data));return true;}catch(e){return false;}}
 function key(day,slot){return day+':'+slot;}
 function hasPlayed(day,slot){return read().played[key(day,slot)]===true;}
 function markPlayed(day,slot,preview){if(preview)return;const v=read();v.played[key(day,slot)]=true;write(v);}
 function miniFor(day,slot){const dayModes=PLAY[day];return dayModes&&dayModes[slot===5?0:1]||null;}
 function isEligible(day,slot){return DAYS.includes(day)&&(slot===5||slot===10);}
 function shuffle(data,seed){
  let x=(seed>>>0)||783;
  const arr=data.slice();
  for(let i=arr.length-1;i>0;i--){x=(1664525*x+1013904223)>>>0;const j=x%(i+1);[arr[i],arr[j]]=[arr[j],arr[i]];}
  return arr;
 }
 function escapeHtml(v){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
 function mountInterlude(host,opts){
  if(!host||!isEligible(opts.day,opts.slot))return false;
  const mode=miniFor(opts.day,opts.slot),seed=opts.day*121+(opts.slot||5)*41;
  let finished=false;
  const finish=()=>{
   if(finished)return;
   finished=true;markPlayed(opts.day,opts.slot,opts.preview);
   host.innerHTML='<div class="daily-mini-success"><div class="daily-mini-confetti">💗 ✨ 💗</div><h2>Улика собрана!</h2><p>Никаких оценок и неправильных чувств. Секретная миссия выполнена.</p><button id="mini-resume" type="button" class="btn">Вернуться к вопросам →</button></div>';
   host.querySelector('#mini-resume').addEventListener('click',()=>opts.onResume());
  };
  const skip=()=>{markPlayed(opts.day,opts.slot,opts.preview);opts.onResume();};
  host.innerHTML='<div class="kicker">НЕОЖИДАННОЕ СОБЫТИЕ · ВЫПУСК '+(opts.day-8)+'</div>'+
   '<div class="daily-mini-hero">🎲 <span>МИНИ-МИССИЯ</span> ♡</div>'+
   '<h2>'+escapeHtml(mode.title)+'</h2><p class="subtitle">'+escapeHtml(mode.note)+'</p>'+
   '<div id="daily-mini-stage" class="daily-mini-stage" aria-live="polite"></div>'+
   '<p class="skip-note">Не нужно ничего покупать, торопиться или угадывать с первого раза.</p>'+
   '<button class="btn alt" type="button" id="mini-skip">Пропустить игру и продолжить вопросы →</button>';
  host.querySelector('#mini-skip').addEventListener('click',skip);
  const stage=host.querySelector('#daily-mini-stage');
  const status=(message)=>{const el=stage.querySelector('[data-mini-status]');if(el)el.textContent=message;};
  function button(label,cls,extra=''){return '<button type="button" class="'+cls+'" '+extra+'>'+label+'</button>';}
  if(mode.type==='hunt'){
   const cells=shuffle([1,1,1,1,1,0,0,0,0,0,0,0],seed),decoys=['✉️','🌼','✨','🎀','🍓','🧸','📻'];
   let found=0;
   stage.innerHTML='<p data-mini-status class="daily-mini-counter">Найдено 0 из 5 сердечек</p><div class="daily-hunt-grid">'+cells.map((n,i)=>
    button(n?'💗':decoys[i%decoys.length],'daily-hunt-cell','data-hunt="'+i+'" data-heart="'+n+'" aria-label="Карточка '+(i+1)+'"')).join('')+'</div>';
   stage.querySelectorAll('[data-hunt]').forEach(el=>el.addEventListener('click',()=>{
    if(el.disabled)return;
    el.disabled=true;el.classList.add('daily-mini-picked');
    if(el.dataset.heart==='1'){el.classList.add('daily-mini-found');found++;}
    else el.classList.add('daily-mini-decoy');
    status('Найдено '+found+' из 5 сердечек');
    if(found===5)finish();
   }));
  }else if(mode.type==='memory'){
   const pairs=shuffle(['💗','🚗','🎵','🌷','💗','🚗','🎵','🌷'],seed);
   let open=[],matched=new Set(),locked=false;
   stage.innerHTML='<p data-mini-status class="daily-mini-counter">Собери 4 пары</p><div class="daily-memory-grid">'+pairs.map((_,i)=>button('?', 'daily-memory-cell','data-card="'+i+'" aria-label="Открыть карточку '+(i+1)+'"')).join('')+'</div>';
   const cards=[...stage.querySelectorAll('[data-card]')];
   cards.forEach((el,i)=>el.addEventListener('click',()=>{
    if(locked||matched.has(i)||open.includes(i))return;
    el.textContent=pairs[i];el.classList.add('is-open');open.push(i);
    if(open.length!==2)return;
    const [a,b]=open;
    if(pairs[a]===pairs[b]){
     matched.add(a);matched.add(b);cards[a].classList.add('is-matched');cards[b].classList.add('is-matched');open=[];
     status('Пар найдено: '+(matched.size/2)+' из 4');
     if(matched.size===8)finish();
    }else{
     locked=true;status('Почти! Попробуй другую пару ♡');
     setTimeout(()=>{if(!finished&&cards[a]?.isConnected&&cards[b]?.isConnected){cards[a].textContent='?';cards[b].textContent='?';cards[a].classList.remove('is-open');cards[b].classList.remove('is-open');}open=[];locked=false;},650);
    }
   }));
  }else if(mode.type==='assemble'){
   const phrase=opts.day===12?['Мне','хорошо','рядом','с тобой ♡']:['Ты','мой','любимый','человек ♡'];
   const pieces=shuffle(phrase.map((word,i)=>({word,i})),seed);
   let next=0;
   stage.innerHTML='<p data-mini-status class="daily-mini-counter">Нажимай на слова в правильном порядке</p><div class="daily-assembled" id="daily-phrase-built" aria-live="polite">♡ ...</div><div class="daily-word-grid">'+
    pieces.map(({word,i})=>button(escapeHtml(word),'daily-word-choice','data-word="'+i+'"')).join('')+'</div>';
   stage.querySelectorAll('[data-word]').forEach(el=>el.addEventListener('click',()=>{
    const i=Number(el.dataset.word);
    if(i!==next){status('Подсказка: следующее слово — «'+phrase[next]+'»');return;}
    el.disabled=true;el.classList.add('is-matched');next++;
    stage.querySelector('#daily-phrase-built').textContent=phrase.slice(0,next).join(' ');
    status('Собрано '+next+' из '+phrase.length+' слов');
    if(next===phrase.length)finish();
   }));
  }else if(mode.type==='decode'){
   const riddles=[
    {clue:'🌙 + 💬 + ❤️',options:['Тёплый вечерний разговор','Сломанный телефон','Ночная проверка документов'],answer:0},
    {clue:'🚗 + 🎵 + 😊',options:['Поездка за продуктами','Песни вдвоём в дороге','Автосервис'],answer:1},
    {clue:'☕ + 🤗 + 🌦️',options:['Прогноз погоды','Часовой пояс','Уют даже в дождь'],answer:2}
   ];
   let n=0;
   const draw=()=>{
    const q=riddles[n];
    stage.innerHTML='<p class="daily-mini-counter">Загадка '+(n+1)+' / 3</p><div class="daily-emoji-clue">'+q.clue+'</div><div class="daily-mini-options">'+
     q.options.map((option,i)=>button(escapeHtml(option),'daily-mini-option','data-decode="'+i+'"')).join('')+
     '</div><p data-mini-status class="daily-mini-counter">Найди самую романтическую расшифровку</p>';
    stage.querySelectorAll('[data-decode]').forEach(el=>el.addEventListener('click',()=>{
     if(Number(el.dataset.decode)!==q.answer){status('Попробуй другую расшифровку ♡');return;}
     if(++n===riddles.length)finish();else draw();
    }));
   };draw();
  }else if(mode.type==='match'){
   const pairs=[
    ['Улыбка','Встреча'],['Песня','Воспоминание'],['Объятие','Тепло'],['Шутка','Смех']
   ],left=shuffle(pairs.map((_,i)=>i),seed),right=shuffle(pairs.map((_,i)=>i),seed*7);
   let selected=null,matched=new Set();
   stage.innerHTML='<p data-mini-status class="daily-mini-counter">Выбери карточку слева, затем её пару справа</p><div class="daily-match-columns"><div>'+left.map(i=>button(pairs[i][0],'daily-match-choice','data-match-left="'+i+'"')).join('')+'</div><div>'+
    right.map(i=>button(pairs[i][1],'daily-match-choice','data-match-right="'+i+'"')).join('')+'</div></div>';
   stage.querySelectorAll('[data-match-left]').forEach(el=>el.addEventListener('click',()=>{
    if(matched.has(Number(el.dataset.matchLeft)))return;
    selected=Number(el.dataset.matchLeft);
    stage.querySelectorAll('[data-match-left]').forEach(x=>x.classList.toggle('is-selected',x===el));
   }));
   stage.querySelectorAll('[data-match-right]').forEach(el=>el.addEventListener('click',()=>{
    const i=Number(el.dataset.matchRight);
    if(selected===null){status('Сначала выбери карточку слева ♡');return;}
    if(i!==selected){status('Не совсем та пара. Можно попробовать ещё раз ♡');return;}
    matched.add(i);el.disabled=true;el.classList.add('is-matched');
    stage.querySelector('[data-match-left="'+i+'"]').disabled=true;
    stage.querySelector('[data-match-left="'+i+'"]').classList.add('is-matched');
    selected=null;
    stage.querySelectorAll('[data-match-left]').forEach(x=>x.classList.remove('is-selected'));
    status('Найдено '+matched.size+' из 4 пар');
    if(matched.size===4)finish();
   }));
  }else if(mode.type==='story'){
   const scenes=[
    {text:'Представь: у нас неожиданно свободный вечер. Что выберем?',items:['Обнимемся и поговорим ♡','Пойдём гулять 🌲','Устроим кино 🎬']},
    {text:'Секретный отдел разрешил взять одну вещь в путь:',items:['Смешную фотографию 📸','Любимую песню 🎵','Что-нибудь вкусное 🍓']},
    {text:'Как лучше закончить этот маленький вечер?',items:['Смеяться до слёз 😄','Пожелать друг другу спокойной ночи 🌙','Планировать следующую встречу 💗']}
   ];
   let n=0;
   const draw=()=>{
    const q=scenes[n];
    stage.innerHTML='<p class="daily-mini-counter">Сцена '+(n+1)+' / 3</p><h3>'+q.text+'</h3><div class="daily-mini-options">'+
     q.items.map((item,i)=>button(escapeHtml(item),'daily-mini-option','data-scene="'+i+'"')).join('')+'</div>';
    stage.querySelectorAll('[data-scene]').forEach(el=>el.addEventListener('click',()=>{if(++n===scenes.length)finish();else draw();}));
   };draw();
  }
  return true;
 }
 function surpriseFor(day){
  const data=read(),id=String(day);
  if(Number.isInteger(data.event[id])&&data.event[id]>=0&&data.event[id]<EVENT.length)return data.event[id];
  // Once picked, the event is stable across reloads and reopens.
  const chosen=Math.floor(Math.random()*EVENT.length);
  data.event[id]=chosen;write(data);return chosen;
 }
 function mountSecret(host,day,opts={}){
  if(!host||!DAYS.includes(day))return;
  const id=String(day),data=read(),chosen=surpriseFor(day);
  const render=()=>{
   const revealed=read().revealed[id]===true,ev=EVENT[chosen];
   host.innerHTML='<div class="daily-secret-event"><div class="kicker">НЕОЖИДАННЫЙ БОНУС · СЕКРЕТНАЯ КАРТОЧКА</div>'+
    (revealed?'<div class="daily-secret-icon">'+ev[0]+'</div><h3>'+ev[1]+'</h3><p>'+ev[2]+'</p><span class="daily-secret-stamp">НАЙДЕНО ♡</span>':
      '<div class="daily-secret-icon">💌</div><h3>Сегодня найден загадочный конверт</h3><p>Что внутри? Это случайный маленький сюрприз, который выбирает сама история.</p>'+
      '<button class="btn" type="button" id="daily-secret-open">Открыть тайную карточку ✨</button>')+'</div>';
   const trigger=host.querySelector('#daily-secret-open');
   if(trigger)trigger.addEventListener('click',()=>{
    if(opts.canPlay&&!opts.canPlay())return;
    const st=read();st.revealed[id]=true;
    // Preview/full-test storage are separate; normal host preview is read-only.
    if(!opts.preview)write(st);
    // In preview, display the reveal for this page without writing the real profile.
    if(opts.preview){
      const ev=EVENT[chosen];
      host.innerHTML='<div class="daily-secret-event"><div class="daily-secret-icon">'+ev[0]+'</div><h3>'+ev[1]+'</h3><p>'+ev[2]+'</p><span class="daily-secret-stamp">ТЕСТОВОЕ ОТКРЫТИЕ ♡</span></div>';
    }else render();
   });
  };
  render();
 }
 window.DailyPlay={mountInterlude,mountSecret,hasPlayed,isEligible,miniFor,surpriseFor,read};
})();