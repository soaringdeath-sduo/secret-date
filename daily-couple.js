/* Daily chapters: reflective postcard, and share invitation after last accessible test. */
(function(global){
 'use strict';
 const core=global.CoupleTests;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function ready(day,st){
  try{core.createChallenge(day,st);return true;}catch(e){return false;}
 }
 function portrait(data,answers){
  if(!data||data.date===9||!Array.isArray(answers)||answers.length!==15)return '';
  const picks=[0,7,14],parts=picks.map(n=>{
   const q=data.questions[n],v=answers[n],val=typeof v==='number'?q[1][v]:v?.custom||'♡';
   return '<div class="couple-answer-card"><small>'+esc(q[0])+'</small><strong>'+esc(val)+'</strong></div>';
  }).join('');
  return '<section class="couple-portrait"><h3>Твоя маленькая Polaroid-анкета ♡</h3>'+
   '<p>Три штриха к твоему портрету. А какие ответы выбрал бы Игорь? Скоро узнаем!</p>'+parts+'</section>';
 }
 function invitation(){
  return '<section class="couple-invite"><div class="kicker">НОВАЯ СЕКРЕТНАЯ ГЛАВА</div>'+
   '<h2>А теперь — очередь Игоря! 💞</h2>'+
   '<p>Ты прошла тесты про чувства, привычки и мечты. Хочешь узнать, как Игорь ответит на <b>те же самые вопросы</b>?</p>'+
   '<p>Отправь ему личную ссылку. Он ответит на своём телефоне, не видя твои варианты. Потом вы получите открытку с совпадениями и темами для разговора.</p>'+
   '<button type="button" class="btn" id="couple-share">💌 Предложить Игорю пройти тест</button>'+
   '<button type="button" class="btn alt" id="couple-copy">Скопировать ссылку для Игоря</button>'+
   '<p class="day-status-note" id="couple-status" role="status"></p>'+
   '<p class="skip-note">В ссылке находятся твои ответы. Отправляй её только Игорю. Это игра, а не научный психологический тест.</p></section>';
 }
 async function send(root,day,st,share){
  const status=root.querySelector('#couple-status');
  try{
   if(status)status.textContent='Готовим приглашение…';
   const payload=core.createChallenge(day(),st()),token=await core.pack(payload),url=core.urlFor('challenge',token);
   if(url.length>9000&&status)status.textContent='Ссылка длинная из-за свободных ответов. Удобнее скопировать её вручную.';
   if(share&&navigator.share&&url.length<=9000){
    try{await navigator.share({title:'Игорь, твой ход! ♡',text:'Я прошла тесты о нас! Теперь ответь на те же вопросы — узнаем, что совпало 💗',url});if(status)status.textContent='Готово! ♡';return;}
    catch(e){if(e?.name==='AbortError'){if(status)status.textContent='Отправка отменена.';return;}}
   }
   if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(url);
    if(status)status.textContent='Ссылка скопирована. Отправь её Игорю в Telegram! ♡';
   }else{
    window.prompt('Скопируй ссылку для Игоря',url);
    if(status)status.textContent='Ссылка готова.';
   }
  }catch(e){if(status)status.textContent=String(e.message||'Не получилось создать приглашение.');}
 }
 function bind(root,getDay,getState){
  const a=root.querySelector('#couple-share'),b=root.querySelector('#couple-copy');
  if(a)a.addEventListener('click',()=>send(root,getDay,getState,true));
  if(b)b.addEventListener('click',()=>send(root,getDay,getState,false));
 }
 global.DailyCouple={ready,portrait,invitation,bind};
})(window);