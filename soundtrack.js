/* Операция 28.10 — два оригинальных музыкальных послания.
   Аудио сохраняется вне #app и продолжает играть при смене экранов. */
(function () {
  'use strict';
  const STORE='sd2810-soundtrack-v1';
  const DATE='sd2810-selected-day-v1';
  const TRACKS=[
    {title:'Тайна для двоих',subtitle:'Песня нашего путешествия',duration:178,
     file:'assets/taina-dlya-dvoikh.mp3',download:'Тайна_для_двоих.mp3',
     message:'Солнышко, я не всегда умею красиво говорить о своих чувствах. Поэтому сегодня я хочу, чтобы за меня немного сказала музыка. Эта песня — для тебя. ❤️'},
    {title:'Я бы снова выбрал тебя',subtitle:'Моё признание тебе',duration:182,
     file:'assets/ya-by-snova-vybral-tebya.mp3',download:'Я_бы_снова_выбрал_тебя.mp3',
     message:'Лиза, наша история не всегда была идеальной. Иногда мы спорили, но всегда находили дорогу друг к другу. Если бы мне снова пришлось прожить всё сначала, я бы всё равно выбрал тебя. ❤️'}
  ];
  const audio=document.createElement('audio');
  audio.id='sc-soundtrack-audio';
  audio.preload='none';
  audio.setAttribute('playsinline','');
  document.body.appendChild(audio);
  const dock=document.createElement('aside');
  dock.id='sc-music-dock';
  dock.setAttribute('aria-label','Наш саундтрек');
  dock.hidden=true;
  document.body.appendChild(dock);
  const overlay=document.createElement('div');
  overlay.id='sc-music-overlay';
  overlay.hidden=true;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Музыкальное послание');
  document.body.appendChild(overlay);
  let track=-1,enabled=false,preview=[false,false],transitionTimer=null,lastFocus=null,stage=-1;
  const fmt=v=>{const x=Math.max(0,Math.floor(Number.isFinite(v)?v:0));return Math.floor(x/60)+':'+String(x%60).padStart(2,'0');};
  const day=()=>localStorage.getItem(DATE);
  function getStore(){
    try{
      const x=JSON.parse(localStorage.getItem(STORE)||'null');
      if(x&&x.day===day()&&typeof x.first==='boolean'&&typeof x.last==='boolean')return x;
    }catch(e){}
    return {day:day(),first:false,last:false};
  }
  function unlocked(i){const s=getStore();return !!(i===0?s.first||preview[0]:s.last||preview[1]);}
  function unlock(i,isPreview){
    if(isPreview){preview[i]=true;return;}
    const s=getStore();
    if(i===0)s.first=true;else s.last=true;
    try{localStorage.setItem(STORE,JSON.stringify(s))}catch(e){}
  }
  function pause(){
    if(!audio.paused)audio.pause();
    syncUI();
  }
  function syncSession(){
    if(!('mediaSession' in navigator))return;
    try{
      navigator.mediaSession.playbackState=audio.paused?'paused':'playing';
      if(track>=0&&'MediaMetadata' in window){
        navigator.mediaSession.metadata=new MediaMetadata({
          title:TRACKS[track].title,artist:'Игорь ♡ Лиза',album:'Операция 28.10 — наш саундтрек'
        });
      }
      if('setPositionState' in navigator.mediaSession&&Number.isFinite(audio.duration)&&audio.duration>0){
        navigator.mediaSession.setPositionState({duration:audio.duration,
          playbackRate:audio.playbackRate,position:Math.min(audio.currentTime,audio.duration)});
      }
    }catch(e){}
  }
  async function play(i){
    if(!enabled||!unlocked(i))return;
    if(track!==i){
      audio.pause();
      track=i;
      audio.src=TRACKS[i].file;
      audio.load();
    }
    try{
      await audio.play();
      const err=overlay.querySelector('[data-sc-error]');
      if(err)err.textContent='';
    }catch(e){
      const err=overlay.querySelector('[data-sc-error]');
      if(err)err.textContent='Не получилось воспроизвести файл. Проверь соединение или сохрани MP3 по ссылке ниже.';
    }
    syncUI();
  }
  function toggle(){
    if(track<0)return;
    if(audio.paused)play(track);else pause();
  }
  function formatCard(i){
    const t=TRACKS[i];
    const klass=i===0?'sc-card-first':'sc-card-final';
    return '<div class="sc-letter '+klass+'">'+
      '<div class="sc-photo"><span class="sc-photo-kicker">ОПЕРАЦИЯ 28.10 · ЛИЧНО ДЛЯ ЛИЗЫ</span>'+
      '<div class="sc-photo-heart" aria-hidden="true">♡</div>'+
      '<h2>'+t.title+'</h2><span>'+t.subtitle+'</span></div>'+
      '<p class="sc-letter-message">'+t.message+'</p>'+
      '<div class="sc-letter-footer">С любовью, Игорь ♡</div></div>';
  }
  function dockHTML(){
    const label=track>=0?TRACKS[track].title:'Наш саундтрек';
    const playing=track>=0&&!audio.paused;
    dock.innerHTML='<div class="sc-dock-main">'+
      '<button type="button" class="sc-dock-album" data-sc="library" aria-label="Открыть музыкальный альбом">♫</button>'+
      '<div class="sc-dock-label"><b>'+label+'</b><small>Игорь ♡ Лиза</small></div>'+
      '<button type="button" class="sc-dock-toggle" data-sc="toggle" aria-label="'+(playing?'Пауза':'Воспроизвести')+'">'+(playing?'❚❚':'▶')+'</button>'+
      '<button type="button" class="sc-dock-expand" data-sc="library" aria-label="Открыть плеер">⌃</button></div>'+
      '<input data-sc-seek type="range" min="0" max="'+(audio.duration||TRACKS[Math.max(track,0)].duration)+
      '" value="'+(audio.currentTime||0)+'" step="1" aria-label="Перемотка песни">';
    dock.querySelectorAll('[data-sc="library"]').forEach(b=>b.addEventListener('click',openLibrary));
    dock.querySelector('[data-sc="toggle"]').addEventListener('click',()=>track<0?openLibrary():toggle());
    dock.querySelector('[data-sc-seek]').addEventListener('input',e=>{
      if(track>=0&&Number.isFinite(audio.duration))audio.currentTime=Math.min(Number(e.target.value),audio.duration);
    });
  }
  function syncUI(){
    const show=enabled&&(unlocked(0)||unlocked(1));
    dock.hidden=!show;
    document.body.classList.toggle('sc-music-available',show);
    const entry=document.getElementById('soundtrack-library');
    if(entry){entry.hidden=!show;entry.disabled=!show;}
    if(show){
      if(!dock.querySelector('[data-sc="toggle"]'))dockHTML();
      const toggle=dock.querySelector('[data-sc="toggle"]');
      if(toggle){
        toggle.textContent=audio.paused?'▶':'❚❚';
        toggle.setAttribute('aria-label',audio.paused?'Воспроизвести':'Пауза');
      }
      const label=dock.querySelector('.sc-dock-label b');if(label)label.textContent=track>=0?TRACKS[track].title:'Наш саундтрек';
      const seek=dock.querySelector('[data-sc-seek]');
      if(seek){seek.max=Number.isFinite(audio.duration)?audio.duration:TRACKS[Math.max(0,track)].duration;seek.value=audio.currentTime||0;}
    }
    const btn=overlay.querySelector('[data-sc="play"]');
    const displayed=btn?Number(btn.dataset.scIndex):Math.max(0,track);
    if(btn)btn.textContent=track===displayed&&!audio.paused?'⏸ Пауза':'▶ Слушать через магнитолу';
    const pos=overlay.querySelector('[data-sc-position]');if(pos)pos.textContent=fmt(track===displayed?audio.currentTime:0);
    const dur=overlay.querySelector('[data-sc-duration]');
    if(dur)dur.textContent=fmt(track===displayed&&Number.isFinite(audio.duration)?audio.duration:TRACKS[displayed].duration);
    const seek=overlay.querySelector('[data-sc-seek]');
    if(seek){seek.max=track===displayed&&Number.isFinite(audio.duration)?audio.duration:TRACKS[displayed].duration;seek.value=track===displayed?(audio.currentTime||0):0;}
    syncSession();
  }
  function hideOverlay(){
    if(transitionTimer!==null){clearTimeout(transitionTimer);transitionTimer=null;}
    overlay.hidden=true;overlay.classList.remove('sc-intercept-active');
    document.body.classList.remove('sc-modal-open');
    if(lastFocus&&typeof lastFocus.focus==='function')lastFocus.focus();
  }
  function bindCommon(){
    overlay.querySelectorAll('[data-sc="close"]').forEach(b=>b.addEventListener('click',hideOverlay));
    overlay.querySelectorAll('[data-sc="library"]').forEach(b=>b.addEventListener('click',openLibrary));
    overlay.querySelectorAll('[data-sc-open-track]').forEach(b=>b.addEventListener('click',()=>openTrack(Number(b.dataset.scOpenTrack),false)));
    const playBtn=overlay.querySelector('[data-sc="play"]');
    if(playBtn)playBtn.addEventListener('click',()=>{const i=Number(playBtn.dataset.scIndex);if(track===i&&!audio.paused)pause();else play(i);});
    const seek=overlay.querySelector('[data-sc-seek]');
    if(seek)seek.addEventListener('input',e=>{
      if(track>=0&&track===Number(overlay.querySelector('[data-sc="play"]')?.dataset.scIndex)&&Number.isFinite(audio.duration))
        audio.currentTime=Math.min(Number(e.target.value),audio.duration);
    });
    syncUI();
  }
  function showOverlay(html){
    lastFocus=document.activeElement;
    overlay.innerHTML='<div class="sc-dialog"><button type="button" class="sc-close" data-sc="close" aria-label="Закрыть музыкальное послание">×</button>'+html+'</div>';
    overlay.hidden=false;document.body.classList.add('sc-modal-open');
    if(overlay.querySelector('.sc-reveal-card')){
      const closeBtn=overlay.querySelector('.sc-close');if(closeBtn)closeBtn.addEventListener('click',hideOverlay);
    }else bindCommon();
    const close=overlay.querySelector('.sc-close');if(close)close.focus();
  }
  function trackControls(i){
    const t=TRACKS[i];
    return '<section class="sc-player"><div class="sc-player-head"><span>♫ НАШ САУНДТРЕК</span><span>ПЕСНЯ '+(i+1)+' / 2</span></div>'+
      '<div class="sc-player-time"><input type="range" min="0" max="'+t.duration+'" value="0" step="1" data-sc-seek aria-label="Позиция воспроизведения">'+
      '<div class="sc-times"><span data-sc-position>0:00</span><span data-sc-duration>'+fmt(t.duration)+'</span></div></div>'+
      '<button type="button" class="sc-play" data-sc="play" data-sc-index="'+i+'">▶ Слушать через магнитолу</button>'+
      '<p class="sc-help">Перед стартом выбери магнитолу как аудиовыход телефона. Музыку можно поставить на паузу и продолжить прохождение квеста.</p>'+
      '<a class="sc-download" href="'+t.file+'" download="'+t.download+'">↓ Сохранить запасной MP3</a>'+
      '<p class="sc-error" role="status" data-sc-error></p>'+
      '<div class="sc-action-row"><button type="button" data-sc="library">Наш музыкальный альбом ♡</button>'+
      '<button type="button" data-sc="close">Продолжить свидание →</button></div></section>';
  }
  function openTrack(i,fromRadio){
    if(!enabled||!unlocked(i))return;
    hideOverlay();
    const t=TRACKS[i];
    const card=formatCard(i)+trackControls(i);
    if(fromRadio){
      showOverlay('<div class="sc-intercept" aria-hidden="true"><div class="sc-static"></div>'+
        '<div class="sc-intercept-logo">◉ СЕКРЕТНЫЙ КАНАЛ</div>'+
        '<div class="sc-intercept-text">Неизвестный сигнал обнаружен…<br>Адресат: Лиза ♡</div></div>'+
        '<div class="sc-reveal-card" hidden>'+card+'</div>');
      overlay.classList.add('sc-intercept-active');
      radioStatic();
      transitionTimer=setTimeout(()=>{
        transitionTimer=null;
        if(overlay.hidden)return;
        overlay.classList.remove('sc-intercept-active');
        const intercept=overlay.querySelector('.sc-intercept');
        const reveal=overlay.querySelector('.sc-reveal-card');
        if(intercept)intercept.remove();
        if(reveal)reveal.hidden=false;
        bindCommon();
      },1250);
    }else{
      showOverlay(card);
    }
  }
  function radioStatic(){
    try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      const context=new C(),n=Math.floor(context.sampleRate*.24);
      const buffer=context.createBuffer(1,n,context.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*.24;
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;gain.gain.value=.035;
      source.connect(gain);gain.connect(context.destination);
      source.start();source.onended=()=>context.close().catch(()=>{});
    }catch(e){}
  }
  function openLibrary(){
    if(!enabled||(!unlocked(0)&&!unlocked(1)))return;
    hideOverlay();
    const cards=TRACKS.map((t,i)=>unlocked(i)?
      '<button class="sc-track-button" type="button" data-sc-open-track="'+i+'">'+
        '<span class="sc-track-num">0'+(i+1)+'</span><span class="sc-track-copy"><b>'+t.title+'</b><small>'+t.subtitle+'</small></span><span>▶</span></button>':
      '<div class="sc-track-locked"><span class="sc-track-num">0'+(i+1)+'</span><span class="sc-track-copy"><b>Закрытая запись</b><small>Откроется в финале свидания</small></span><span>🔒</span></div>').join('');
    showOverlay('<div class="sc-album-head"><span class="sc-photo-kicker">ОПЕРАЦИЯ 28.10</span>'+
      '<h2>Наш саундтрек ♡</h2><p>Музыкальные воспоминания Игоря и Лизы</p></div>'+
      '<div class="sc-tracks">'+cards+'</div><p class="sc-album-note">Песни останутся доступными для повторного прослушивания на этом устройстве.</p>');
  }
  function revealFirst(isHost){
    if(!enabled)return;
    const was=unlocked(0);
    unlock(0,isHost);
    syncUI();
    if(!was)openTrack(0,true);
  }
  function openFirst(isHost){
    if(!enabled)return;
    unlock(0,isHost);
    syncUI();
    openTrack(0,false);
  }
  function revealFinal(isHost){
    if(!enabled||stage!==13)return;
    unlock(1,isHost);
    syncUI();
    openTrack(1,false);
  }
  function onPageRender(currentStage,canAccess){
    stage=currentStage;enabled=!!canAccess;
    if(!enabled)pause();
    syncUI();
  }
  audio.addEventListener('play',syncUI);
  audio.addEventListener('pause',syncUI);
  audio.addEventListener('timeupdate',syncUI);
  audio.addEventListener('durationchange',syncUI);
  audio.addEventListener('ended',syncUI);
  audio.addEventListener('error',()=>{
    const err=overlay.querySelector('[data-sc-error]');
    if(err)err.textContent='Аудиофайл недоступен. Проверь интернет или используй запасной MP3.';
    syncUI();
  });
  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.setActionHandler('play',()=>{if(track>=0)play(track);});
      navigator.mediaSession.setActionHandler('pause',pause);
      navigator.mediaSession.setActionHandler('seekbackward',e=>{audio.currentTime=Math.max(0,audio.currentTime-(e.seekOffset||10));});
      navigator.mediaSession.setActionHandler('seekforward',e=>{audio.currentTime=Math.min(audio.duration||1e9,audio.currentTime+(e.seekOffset||10));});
      navigator.mediaSession.setActionHandler('seekto',e=>{if(e.seekTime!=null)audio.currentTime=e.seekTime;});
    }catch(e){}
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)hideOverlay();});
  const libraryBtn=document.getElementById('soundtrack-library');
  if(libraryBtn)libraryBtn.addEventListener('click',openLibrary);
  window.SecretSoundtrack={revealFirst,openFirst,revealFinal,openLibrary,onPageRender,pause};
})();