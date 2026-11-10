/* The 5,000-point "24 hours of wishes" reward is earned now but can only be
 * activated from 00:00 Moscow time on the day AFTER the selected date.
 * This personal promise permits up to 1000 RUB of small purchases TOTAL over 24h,
 * and cannot be enforced by a static website; the two people honor the budget.
 * Uses trusted HTTP-Date time supplied by daily.html and isolated host storage. */
(function(){
 'use strict';
 const KEY='sd2810-wishes-24h-v1';
 const THRESHOLD=5000,DAY=24*60*60*1000,PURCHASE_LIMIT=1000;
 const store=window.SDTest.storage;
 const dateStart=selected=>selected==='sat'?Date.UTC(2026,10,14,21):
   selected==='sun'?Date.UTC(2026,10,15,21):null; // next day 00:00 MSK
 const dayLabel=selected=>selected==='sat'?'15 ноября 2026':'16 ноября 2026';
 const dateText=timestamp=>{
  const moscow=new Date(timestamp+3*60*60*1000);
  const two=n=>String(n).padStart(2,'0');
  return two(moscow.getUTCDate())+'.'+two(moscow.getUTCMonth()+1)+'.'+moscow.getUTCFullYear()+
   ' в '+two(moscow.getUTCHours())+':'+two(moscow.getUTCMinutes())+' МСК';
 };
 function read(){
  try{
   const data=JSON.parse(store.getItem(KEY)||'null');
   if(data&&['sat','sun'].includes(data.day)&&Number.isFinite(data.start)&&Number.isFinite(data.end)&&
      data.end-data.start===DAY&&data.start>=dateStart(data.day))return data;
  }catch(e){}
  return null;
 }
 function status({score,day,now,preview=false}={}){
  if(!Number.isFinite(score)||score<THRESHOLD)return {kind:'locked'};
  const saved=preview?null:read();
  if(saved){
   if(!Number.isFinite(now))return {kind:'verification',end:saved.end};
   return now<saved.end?{kind:'active',end:saved.end,start:saved.start}:
      {kind:'used',end:saved.end,start:saved.start};
  }
  const start=dateStart(day);
  if(start===null)return {kind:'choose-date'};
  if(!Number.isFinite(now))return {kind:'verification'};
  if(now<start)return {kind:'pending',availableAt:start,day};
  if(preview)return {kind:'preview',day};
  return {kind:'ready',day};
 }
 function redeem({score,day,now,preview=false}={}){
  if(preview)return {ok:false,reason:'preview'};
  const mode=status({score,day,now});
  if(mode.kind!=='ready')return {ok:false,reason:mode.kind};
  const record={day,start:Math.floor(now),end:Math.floor(now)+DAY};
  try{
   store.setItem(KEY,JSON.stringify(record));
   if(!read())return {ok:false,reason:'storage'};
   return {ok:true,...record};
  }catch(e){return {ok:false,reason:'storage'};}
 }
 function card({score=0,day,now,preview=false}={}){
  if(score<THRESHOLD)return '';
  const info=status({score,day,now,preview});
  let message='',button='';
  if(info.kind==='pending')message='🔒 Активация только с <b>'+dayLabel(day)+', 00:00 МСК</b>. На самом свидании эта награда не действует.';
  else if(info.kind==='verification')message='🕒 Проверяем время по серверу. Пока время не подтверждено, активировать награду нельзя.';
  else if(info.kind==='ready'){
   message='💌 Свидание уже прошло! Выбери удобный момент, когда хочешь начать свои 24 часа.';
   button='<button type="button" class="btn" data-wishes-activate>♡ Активировать 24 часа желаний</button>';
  }else if(info.kind==='active')message='💖 Сутки желаний активны! Действуют до <b>'+dateText(info.end)+'</b>.';
  else if(info.kind==='used')message='✓ Сутки желаний уже использованы. Время действия закончилось <b>'+dateText(info.end)+'</b>.';
  else if(info.kind==='preview')message='🔧 Тестовый просмотр: настоящая активация недоступна.';
  else if(info.kind==='choose-date')message='🔒 Для активации сначала выбери день свидания.';
  return '<section class="dino-wish-card" aria-label="Награда 5000 очков: 24 часа пожеланий">'+
   '<div class="dino-wish-kicker">💝 ЛИЧНЫЙ БОНУС · 5 000 ОЧКОВ</div>'+
   '<h3>24 часа твоих пожеланий ♡</h3>'+
   '<p class="dino-wish-description">Награда уже твоя! Просто у неё есть специальное правило: <b>на свидании её использовать нельзя.</b> Она включается отдельно, только после дня встречи.</p>'+
   '<div class="dino-wish-status" role="status">'+message+'</div>'+
   (info.kind==='ready'?'<p class="dino-wish-caution">После активации отсчёт 24 часов начнётся сразу и повторно запустить его нельзя.</p>':'')+
   button+
   '<div class="dino-wish-terms"><strong>Что можно загадать?</strong> Фильм на вечер, завтрак от Игоря, прогулку, объятия, игры, забавные совместные задания, а также <b>небольшие покупки на общую сумму до 1 000 ₽ за все 24 часа</b> — по взаимному согласию.'+
   '<p><strong>Лимит покупок:</strong> Можно выбрать несколько мелочей, включая косметику, но <b>суммарно не больше 1 000 ₽</b>. Это общий бюджет на весь период, не за каждое желание; дробление покупок лимит не увеличивает.</p>'+
   '<p><strong>Что не входит?</strong> День самого свидания, покупки сверх 1 000 ₽, наличные деньги, денежные переводы, подарочные сертификаты и опасные или неприятные просьбы. Поход в «Магнит Косметик» на 5 000 ₽ — <b>отдельная награда за 10 000 очков</b>.</p></div>'+
   '</section>';
 }
 function bind(host,options={}){
  if(!host)return;
  host.querySelectorAll('[data-wishes-activate]').forEach(button=>button.addEventListener('click',()=>{
   const now=options.getNow?.();
   const score=options.getScore?.()||0;
   const selected=options.getDay?.();
   if(status({score,day:selected,now,preview:!!options.preview}).kind!=='ready')return;
   if(!window.confirm('Активировать 24 часа желаний прямо сейчас? Они начнутся после нажатия и закончатся ровно через сутки. Небольшие покупки разрешены на общую сумму до 1 000 ₽ за все 24 часа; переводы и наличные не входят.'))return;
   const result=redeem({score,day:selected,now:options.getNow?.(),preview:!!options.preview});
   if(result.ok&&typeof options.onChange==='function')options.onChange();
   else if(!result.ok)window.alert('Не удалось активировать подарок: проверь время на сайте или свободное место браузера.');
  }));
 }
 window.DailyDinoWishes={KEY,THRESHOLD,DAY,PURCHASE_LIMIT,dateStart,dayLabel,dateText,read,status,redeem,card,bind};
})();