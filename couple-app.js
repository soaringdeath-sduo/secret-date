/* Couple challenge: Igor answers the same 15 questions per day.
   Never show Lisa's choices before Igor has answered; no network/database. */
(function(){
 'use strict';
 const root=document.getElementById('couple-root');
 const core=window.CoupleTests;
 const STORAGE='sd2810-couple-igor-v1';
 let packet=null,dayData={},igor={},days=[],token='',mode='',ready=false;
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const message=(head,body)=>{root.innerHTML='<div class="kicker">НАШЕ ПАРНОЕ ПРИКЛЮЧЕНИЕ</div><h1>'+safe(head)+'</h1><p>'+safe(body)+'</p><a class="btn alt" href="index.html" style="text-decoration:none">Вернуться к приглашению</a>'};
 const hashKey=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36)};
 const stateKey=()=>STORAGE+':'+hashKey(token);
 function save(){
  try{localStorage.setItem(stateKey(),JSON.stringify({v:1,igor}));return true;}catch(e){return false;}
 }
 function restore(){
  try{
   const x=JSON.parse(localStorage.getItem(stateKey())||'null');
   if(!x||x.v!==1||!x.igor)return;
   for(const day of days){
    if(Array.isArray(x.igor[day])){
     const arr=[];
     for(const value of x.igor[day].slice(0,15)){
      const cleaned=typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=2?value:
         value&&typeof value==='object'&&typeof value.custom==='string'&&value.custom.trim().length<=180?{custom:value.custom.trim()}:null;
      if(cleaned===null)break;
      arr.push(cleaned);
     }
     igor[day]=arr;
    }
   }
  }catch(e){}
 }
 async function load(){
  const params=new URLSearchParams(location.hash.replace(/^#/,''));
  const challenge=params.get('challenge'),result=params.get('result');
  if(!challenge&&!result){message('Парный тест пока закрыт ♡','Чтобы начать, попроси Лизу прислать личное приглашение после завершения её мини-тестов.');return;}
  if(challenge&&result)throw Error('В ссылке два несовместимых режима.');
  mode=result?'result':'challenge';token=result||challenge;
  packet=await core.unpack(token);
  if(packet.type!==mode)throw Error('Тип приглашения в ссылке не совпадает.');
  days=core.days(packet.day);
  const loaded=await Promise.all(days.map(async date=>{
   const r=await fetch('daily-content/day-'+date+'.json?v=3',{cache:'no-store'});
   if(!r.ok)throw Error('Не удалось загрузить вопросы '+date+' ноября.');
   const j=await r.json();
   if(j.date!==date||!Array.isArray(j.questions)||j.questions.length!==15)throw Error('Некорректный выпуск '+date+'.');
   return j;
  }));
  loaded.forEach((j,i)=>dayData[days[i]]=j);
  ready=true;
  if(mode==='result'){renderResult(packet);return;}
  restore();
  if(isFinished())return showResultForIgor();
  renderWelcome();
 }
 function isFinished(){return days.every(d=>core.validAnswers(igor[d]))}
 function completed(){return days.reduce((n,d)=>n+(igor[d]?.length||0),0)}
 function firstIncomplete(){
  for(let i=0;i<days.length;i++)if((igor[days[i]]||[]).length<15)return i;
  return days.length-1;
 }
 function actualAnswer(answer,q){
  return typeof answer==='number'?(q[1]?.[answer]??'—'):(answer&&typeof answer.custom==='string'?answer.custom:'—');
 }
 function renderWelcome(){
  const total=days.length*15,started=completed();
  root.innerHTML='<div class="kicker">СЕКРЕТНОЕ ПОСЛАНИЕ ДЛЯ ИГОРЯ</div>'
   +'<h1>Теперь твой<br><em>ход, Игорь ♡</em></h1>'
   +'<div class="frame"><div class="frame-art">♡ ♡</div><div class="frame-caption">Одна история · два взгляда</div></div>'
   +'<p>Лиза уже прошла <b>'+days.length+' мини-тест'+(days.length===4?'а':'ов')+'</b> про чувства и мечты. Теперь тебе предстоит ответить на <b>те же '+total+' вопросов</b>, не видя её ответов.</p>'
   +'<p>Когда закончишь, сайт покажет, где вы выбрали одинаковое, а что станет поводом лучше узнать друг друга.</p>'
   +'<div class="notice">Это романтическая игра, не научная проверка совместимости. Разные ответы не означают, что вы не подходите друг другу.</div>'
   +'<button type="button" class="btn" id="start-couple">'+(started?'Продолжить с '+(started+1)+'-го ответа →':'Начать нашу проверку ♡')+'</button>'
   +'<p class="tiny">Ответы сохраняются в этом браузере. Ссылка содержит ответы Лизы — не пересылай её другим людям.</p>';
  document.getElementById('start-couple').addEventListener('click',()=>{
   const idx=firstIncomplete(),d=days[idx];
   renderQuestion(d,(igor[d]||[]).length);
  });
 }
 function renderQuestion(date,step){
  if(!ready||!days.includes(date))return;
  const q=dayData[date].questions[step],dayIdx=days.indexOf(date),total=days.length*15;
  if(!q){renderChapterDone(date);return;}
  const progress=days.slice(0,dayIdx).length*15+step;
  root.innerHTML='<div class="kicker">ИГОРЬ · ГЛАВА '+(dayIdx+1)+' ИЗ '+days.length+'</div>'
   +'<h2>'+safe(dayData[date].title)+'</h2>'
   +'<div class="meta"><span>Вопрос '+(step+1)+' из 15</span><span>'+progress+' / '+total+'</span></div>'
   +'<div class="progress"><span style="width:'+Math.round(progress/total*100)+'%"></span></div>'
   +'<p class="question">'+safe(q[0])+'</p>'
   +q[1].map((ans,i)=>'<button type="button" class="answer" data-a="'+i+'">'+safe(ans)+'</button>').join('')
   +'<button type="button" class="answer" id="custom-button">✍️ Свой вариант ответа</button>'
   +'<form class="form" id="custom-form" hidden><label for="custom-text">Расскажи своими словами</label>'
   +'<textarea id="custom-text" maxlength="180" placeholder="Твой ответ…" required></textarea>'
   +'<p class="tiny">До 180 символов.</p><button type="submit" class="btn">Сохранить ответ ♡</button></form>'
   +'<div id="feedback" role="status"></div>'
   +'<p class="tiny">Ответы Лизы откроются после твоего последнего ответа — чтобы вы не подстраивались друг под друга.</p>'
   +'<button class="btn alt" id="back-one" type="button">'+(progress?'← Изменить предыдущий ответ':'← К началу')+'</button>';
  root.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('click',()=>record(date,step,Number(b.dataset.a))));
  root.querySelector('#custom-button').addEventListener('click',()=>{
   const form=root.querySelector('#custom-form');form.hidden=!form.hidden;if(!form.hidden)form.querySelector('textarea').focus();
  });
  root.querySelector('#custom-form').addEventListener('submit',e=>{
   e.preventDefault();const val=root.querySelector('#custom-text').value.trim().replace(/\s+/g,' ');
   if(val)record(date,step,{custom:val.slice(0,180)});
  });
  root.querySelector('#back-one').addEventListener('click',()=>{
   if(progress===0){renderWelcome();return;}
   const prev=step?date:days[dayIdx-1],previous=step?step-1:14;
   igor[prev]=igor[prev]||[];igor[prev].length=previous;save();
   renderQuestion(prev,previous);
  });
 }
 function record(date,step,value){
  if(!ready||!days.includes(date))return;
  if(typeof value!=='number'&&(!value||!value.custom||value.custom.length>180))return;
  igor[date]=igor[date]||[];
  if(igor[date].length!==step)return;
  igor[date].push(value);
  const stored=save();
  root.querySelectorAll('.answer').forEach(b=>b.disabled=true);
  const form=root.querySelector('#custom-form');if(form)form.hidden=true;
  const dayIdx=days.indexOf(date),last=step===14;
  const feedback=root.querySelector('#feedback');
  feedback.innerHTML='<div class="notice">Ответ записан. ♡ '+(stored?'':'Не удалось сохранить в браузере — не закрывай страницу.')+'</div>'
   +'<button type="button" class="btn" id="next-answer">'+(last?'Завершить главу →':'Следующий вопрос →')+'</button>';
  root.querySelector('#next-answer').addEventListener('click',()=>{
   if(last)renderChapterDone(date);else renderQuestion(date,step+1);
  });
 }
 function renderChapterDone(date){
  if(!core.validAnswers(igor[date]))return renderQuestion(date,(igor[date]||[]).length);
  const idx=days.indexOf(date),last=idx===days.length-1;
  const data=dayData[date],picks=[0,7,14];
  root.innerHTML='<div class="kicker">ЕЩЁ ОДНА СТРАНИЦА НАШЕЙ ИСТОРИИ</div>'
   +'<h1>Глава<br><em>пройдена ♡</em></h1>'
   +'<div class="frame"><div class="frame-art">'+safe(data.icon||'♡')+'</div><div class="frame-caption">'+safe(data.title)+'</div></div>'
   +'<h3>Немного твоих ответов</h3>'
   +picks.map(i=>'<div class="subcard"><p class="tiny">'+safe(data.questions[i][0])+'</p><b>'+safe(actualAnswer(igor[date][i],data.questions[i]))+'</b></div>').join('')
   +'<div class="notice">Лизины ответы по-прежнему скрыты. Скоро узнаем, какие у вас совпадения.</div>'
   +'<button type="button" class="btn" id="next-chapter">'+(last?'💞 Открыть нашу совместимость':'Следующая глава →')+'</button>';
  root.querySelector('#next-chapter').addEventListener('click',()=>{
   if(last)showResultForIgor();else renderQuestion(days[idx+1],(igor[days[idx+1]]||[]).length);
  });
 }
 function showResultForIgor(){
  if(!isFinished())return renderWelcome();
  renderResult({v:1,type:'result',day:packet.day,answers:packet.answers,igor});
 }
 function renderResult(result){
  const report=core.compare(result);
  const first=report.chapters[0];
  root.innerHTML='<div class="kicker">ОПЕРАЦИЯ 28.10 · ЛЮБОВНАЯ ПРОВЕРКА</div>'
   +'<h1>Мы с тобой<br><em>на одной волне ♡</em></h1>'
   +'<div class="result-num">'+report.percent+'%</div>'
   +'<div class="result-legend">Одинаковых ответов: <b>'+report.matched+' из '+report.total+'</b></div>'
   +'<div class="progress"><span style="width:'+report.percent+'%"></span></div>'
   +'<p>Но самое интересное — не цифра. Посмотрите, в чём вы похожи, а где можно рассказать друг другу что-то новое.</p>'
   +'<div class="notice">Этот процент — только доля одинаковых ответов в нашей игре, а не психологический прогноз отношений. «Свой ответ» сравнивается буквально.</div>'
   +'<h3>Ваши общие главы</h3>'
   +report.chapters.map((ch,index)=>{
    const questions=dayData[ch.date].questions;
    return '<details class="chapter-result"'+(index===0?' open':'')+'><summary>'+safe(ch.title)+'<small>Совпало '+ch.hits+' из '+ch.total+'</small></summary>'
     +ch.pairs.map((pair,i)=>'<div class="compare-row"><p class="q">'+safe(questions[i][0])+'</p>'
       +'<p class="who">💗 Лиза: '+safe(actualAnswer(pair.l,questions[i]))+'</p>'
       +'<p class="who">💙 Игорь: '+safe(actualAnswer(pair.r,questions[i]))+'</p>'
       +'<div class="match '+(pair.match?'same':'')+'">'+(pair.match?'♥ Совпало':'✦ Есть о чём поговорить')+'</div></div>').join('')
     +'</details>';
   }).join('')
   +(mode==='challenge'?'<h3>Поделись вашим результатом с Лизой</h3><p>Лиза увидит такую же красивую открытку со всеми ответами.</p><div class="actions"><button class="btn" id="share-result">💌 Отправить Лизе результат</button><button class="btn alt" id="copy-result">Скопировать ссылку ♡</button></div><div id="share-status" role="status" class="tiny"></div>':'<div class="notice">Вы оба ответили на вопросы. Пусть различия станут началом интересного разговора, а совпадения — поводом улыбнуться. ❤️</div>')
   +'<p class="tiny">Ссылка с результатом содержит личные ответы обоих. Делитесь ей только друг с другом.</p>';
  if(mode==='challenge'){
   root.querySelector('#share-result').addEventListener('click',()=>shareResult(result,true));
   root.querySelector('#copy-result').addEventListener('click',()=>shareResult(result,false));
  }
 }
 async function shareResult(result,wantShare){
  const status=root.querySelector('#share-status');
  try{
   if(status)status.textContent='Готовим ссылку…';
   const code=await core.pack(result),url=core.urlFor('result',code);
   if(url.length>9000&&status)status.textContent='Из-за длинных собственных ответов ссылка получилась большой. Лучше скопировать её вручную.';
   const title='Игорь ♡ Лиза — наша любовная проверка';
   if(wantShare&&navigator.share&&url.length<9000){
    try{await navigator.share({title,text:'Я прошёл те же тесты! Посмотри, что у нас совпало ♡',url});if(status)status.textContent='Ссылка готова к отправке ❤️';return;}
    catch(e){if(e?.name==='AbortError'){if(status)status.textContent='Отправка отменена.';return;}}
   }
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);if(status)status.textContent='Ссылка скопирована! Отправь её Лизе в Telegram. ♡';}
   else {window.prompt('Скопируй ссылку с результатами',url);if(status)status.textContent='Ссылка готова.';}
  }catch(e){if(status)status.textContent='Не удалось подготовить ссылку: '+String(e.message||e);}
 }
 load().catch(e=>message('Ссылка не открылась',e.message||'Попробуйте попросить новую ссылку с вопросами.'));
})();