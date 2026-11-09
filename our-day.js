/* Our Day: a local-only keepsake after the real finale.
 * Never send private photographs, relationship answers or GPS to any server. */
(function(){
 'use strict';
 const storage=window.SDTest?.storage||window.localStorage;
 const root=document.getElementById('memory-root');
 const DATE='sd2810-selected-day-v1', INVITE='sd2810-invite-approved-v3',
  MEMORY='sd2810-final-memory-v1', ROUTE='sd2810-route-v7', ORIGIN='sd2810-route-origin-v7',
  END='sd2810-secret-ending-v2',GATE='sd2810-journey-gate-v1',DAILY='sd2810-daily-v1',
  HOST='sd2810-host-v3',PHOTO='sd2810-local-camera-v1';
 const dates={sat:'14 ноября 2026',sun:'15 ноября 2026'};
 const finales={
  omchino:'озеро Омчино',toloni:'озеро Большие Толони',zarechny:'Заречный парк',
  bowling:'боулинг «Аврора»',anticafe:'настольные игры в Луге',minigame:'романтический мини-квест',
  thriller:'кинотеатр «Смена»',comedy:'кинотеатр «Смена»',lovefilm:'кинотеатр «Смена»'
 };
 const names=['Красивый кадр','Смешной кадр','Мы вместе'];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const get=k=>{try{return storage.getItem(k)}catch(e){return null}};
 const json=k=>{try{return JSON.parse(get(k)||'null')}catch(e){return null}};
 const day=get(DATE),origin=get(ORIGIN),ending=get(END);
 const fullHost=!!window.SDTest?.active();
 const preview=get(HOST)==='1'&&!fullHost;
 const saved=json(MEMORY),gate=json(GATE);
 const localProof=!!(saved?.done&&saved.day===day&&saved.origin===origin&&saved.ending===ending);
 const allowed=preview||!!(
  ['sat','sun'].includes(day)&&['zap','luga'].includes(origin)&&
  get(INVITE)==='1'&&get(ROUTE)==='13'&&
  gate?.day===day&&gate?.max===13&&gate?.finalProof===ending&&localProof
 );
 function safePhoto(index){
  const data=get(PHOTO+':'+(day||'test')+':'+(origin||'zap')+':'+index);
  return typeof data==='string'&&data.length<1300000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data)?data:null;
 }
 function archiveDays(){return day==='sat'?[9,10,11,12,13]:[9,10,11,12,13,14]}
 function openedPoems(){
  const done=json(DAILY)?.done;
  return archiveDays().filter(d=>done?.[d-9]===true);
 }
 function coffeeStop(){
  const c=json('sd2810-zarechny-visit-v1');
  if(c?.day!==day||c?.origin!==origin||!c.coffeeDone)return 'Время вдвоём в Заречном парке';
  return c.coffee==='yes'?'Время вдвоём и кофейная пауза в Terrazza':'Время вдвоём в Заречном парке';
 }
 function stat(value,label){return '<div class="memory-stat"><strong>'+esc(value)+'</strong><small>'+esc(label)+'</small></div>'}
 function photoHTML(){
  return names.map((name,i)=>{
   const img=safePhoto(i);
   return '<figure class="memory-photo">'+(img?'<img src="'+img+'" alt="'+esc(name)+'">':'<div class="memory-photo-empty" aria-label="Фото не сохранено">♡</div>')+
    '<figcaption>'+esc(name)+'</figcaption>'+(img?'<a href="'+img+'" download="igor-liza-'+(i+1)+'.jpg">↓ Сохранить фото</a>':'')+'</figure>';
  }).join('');
 }
 function poemHTML(p){
  const day=p.day,path='assets/poem-day-'+(day===9?'9':String(day).padStart(2,'0'))+'.mp3';
  const stanzas=p.text.trim().split(/\n\s*\n/).map(st=>'<p>'+esc(st)+'</p>').join('');
  return '<details class="memory-card memory-poem"><summary>♡ '+esc(p.title)+'<small>'+day+' ноября · твой голос, Игорь</small></summary>'+
   '<div class="memory-stanzas">'+stanzas+'</div><audio controls preload="none" src="'+path+'" aria-label="Слушать стихотворение '+esc(p.title)+'"></audio>'+
   '<p class="memory-media-anchor"><a href="'+path+'" download>↓ Сохранить озвучку MP3</a></p></details>';
 }
 function songHTML(file,name,label){
  return '<div class="memory-card"><span class="memory-kicker">'+esc(label)+'</span><h3 class="memory-song-title">'+esc(name)+'</h3>'+
   '<p>Наша песня — на любой день, когда хочется вспомнить этот момент.</p>'+
   '<audio controls preload="none" src="assets/'+file+'" aria-label="Песня '+esc(name)+'"></audio>'+
   '<p class="memory-media-anchor"><a download href="assets/'+file+'">↓ Сохранить MP3</a></p></div>';
 }
 function renderLocked(){
  root.innerHTML='<section class="memory-paper memory-lock"><span class="memory-kicker">АРХИВ НАШЕГО ДНЯ</span>'+
   '<h1>Этот альбом ещё закрыт ♡</h1>'+
   '<p>Он откроется после последнего сюрприза и ваших объятий в финале свидания.</p>'+
   '<div class="memory-note">Если вы уже закончили свидание, открой этот сайт в том же браузере, где проходили квест. Фотографии и отметка о завершении хранятся только на устройстве.</div>'+
   '<a class="memory-btn" href="index.html">Вернуться к нашей истории 💌</a></section>';
 }
 function setMessage(text){
  const status=document.getElementById('memory-status');if(status)status.textContent=text;
 }
 function render(){
  if(!allowed){renderLocked();return;}
  const date=dates[day]||'Наш особенный день',photos=names.filter((_,i)=>!!safePhoto(i)).length,
   poems=openedPoems(),end=finales[ending]||'Наш общий сюрприз';
  root.innerHTML='<section class="memory-paper"><span class="memory-kicker">НАШИ ВОСПОМИНАНИЯ · ОПЕРАЦИЯ 28.10</span>'+
   '<h1>Наш день ♡</h1>'+
   '<p class="memory-subtitle">«Самое важное было не в том, куда мы ехали, а в том, что мы были рядом».</p>'+
   (preview?'<span class="memory-badge">🔧 Предварительный просмотр ведущего</span>':'<span class="memory-badge">♡ Наше приключение завершено</span>')+
   '<div class="memory-stats">'+stat(date.replace(' ноября 2026',''),'Наша дата')+stat(photos+'/3','Наши фото')+stat(poems.length+'/'+archiveDays().length,'Стихи')+'</div>'+
   '<div class="memory-signature">Игорь ♡ Лиза</div></section>'+
   '<section class="memory-paper"><span class="memory-kicker">СОХРАНЁННЫЕ МОМЕНТЫ</span><h2>Наши Polaroid-снимки</h2>'+
   '<p class="memory-subtitle">Три маленьких кадра, которые однажды станут большими воспоминаниями.</p>'+
   '<div class="memory-photos">'+photoHTML()+'</div>'+
   '<div class="memory-warning">📷 Фотографии остаются только на этом устройстве. Они не загружаются в GitHub и не появятся на другом телефоне автоматически. Сохрани снимки или PDF-альбом до очистки браузера.</div></section>'+
   '<section class="memory-paper"><span class="memory-kicker">МАРШРУТ ДВУХ СЕРДЕЦ</span><h2>Как прошёл наш день</h2>'+
   '<ol class="memory-timeline">'+[
      origin==='zap'?'Мы отправились из Заплюсья':'Наше приключение началось в Луге',
      'Секретная радиопередача и первая песня',
      'Шуточное экономсвидание и первые испытания',
      coffeeStop(),
      'Полноценный обед во «ВДрова»',
      'Наш выбор: '+end,
      'Финальное признание и объятия'
   ].map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+
   '<div class="memory-quote">«Планы могли меняться. Но главное всегда оставалось неизменным — мы вместе».</div></section>'+
   '<section class="memory-paper"><span class="memory-kicker">ДВА ГОЛОСА · ОДНА ИСТОРИЯ</span><h2>Наш саундтрек ♫</h2>'+
   songHTML('taina-dlya-dvoikh.mp3','Тайна для двоих','Первая песня')+
   songHTML('ya-by-snova-vybral-tebya.mp3','Я бы снова выбрал тебя','Финальная песня')+'</section>'+
   '<section class="memory-paper"><span class="memory-kicker">ПИСЬМА ИГОРЯ ДЛЯ ЛИЗЫ</span><h2>Наши признания ♡</h2>'+
   '<p class="memory-subtitle">Каждый стих — маленькая часть истории, рассказанная моим настоящим голосом.</p>'+
   '<div id="memory-poems"><p class="memory-small">Открываем ежедневные стихи…</p></div>'+
   '<p class="memory-media-anchor"><a href="daily.html#daily-poetry-library">Открыть полный альбом ежедневных глав ♡</a></p></section>'+
   '<section class="memory-paper"><span class="memory-kicker">ЭТОТ ДЕНЬ МОЖНО СОХРАНИТЬ</span><h2>Для нас навсегда</h2>'+
   '<p>Сохрани печатную версию вместе с фотографиями и стихами. Песни и аудиозаписи можно скачать отдельно по кнопкам выше.</p>'+
   '<div class="memory-actions"><button type="button" class="memory-btn" id="memory-print">💾 Сохранить альбом как PDF</button>'+
   '<a class="memory-btn alt" href="secret_date_game_luga.html">📸 Вернуться к фото-сертификату PNG</a>'+
   '<a class="memory-btn alt" href="index.html">♥ Вернуться к нашей истории</a></div>'+
   '<p id="memory-status" class="memory-small" role="status">На Android после нажатия выбери «Сохранить в PDF» в окне печати. Если окно печати недоступно, сохрани фотографии и записи отдельно.</p>'+
   '<div class="memory-warning">Это личный альбом. Если отправить только ссылку другому человеку, фото с твоего телефона туда не перенесутся.</div>'+
   '<div class="memory-signature">Игорь + Лиза ♡</div></section>';
  const print=root.querySelector('#memory-print');
  print?.addEventListener('click',()=>{
   try{window.print();}catch(e){setMessage('Не удалось открыть печать из браузера. Попробуй открыть ссылку в Chrome и сохранить страницу как PDF.');}
  });
  root.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>root.querySelectorAll('audio').forEach(other=>{if(other!==a)other.pause()})));
  loadPoems(poems);
 }
 async function loadPoems(days){
  const host=document.getElementById('memory-poems');if(!host)return;
  if(!days.length){host.innerHTML='<div class="memory-note">Ежедневные стихи ещё не открыты на этом устройстве. Если они были пройдены в другом браузере, перенести ответы автоматически нельзя.</div>';return}
  try{
   const resp=await fetch('poetry-data.json?v=1',{cache:'no-store'});
   if(!resp.ok)throw new Error('Список стихотворений недоступен');
   const data=await resp.json();
   if(!Array.isArray(data))throw new Error('Неправильный формат стихотворений');
   if(!host.isConnected)return;
   const list=data.filter(p=>days.includes(p.day)&&typeof p.title==='string'&&typeof p.text==='string');
   host.innerHTML=list.map(poemHTML).join('')||'<p class="memory-note">Стихи сейчас не удалось загрузить.</p>';
   host.querySelectorAll('audio').forEach(audio=>audio.addEventListener('play',()=>{
    root.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause()});
   }));
  }catch(e){if(host.isConnected)host.innerHTML='<p class="memory-note">Не удалось открыть список стихов. <a href="daily.html#daily-poetry-library">Попробуй открыть их в ежедневном альбоме</a>.</p>'}
 }
 render();
})();
