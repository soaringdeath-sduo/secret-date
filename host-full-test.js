/* Full host walkthrough: isolated from Lizа's real progress, reusable after future updates.
   Keep this script included BEFORE page scripts and both media modules. */
(function () {
  'use strict';
  const real=window.localStorage;
  const HOST='sd2810-host-v3';
  const ACTIVE='sd2810-full-host-test-v1';
  const PREFIX='sd2810-full-test-data:';
  function active(){
    try{return real.getItem(HOST)==='1'&&real.getItem(ACTIVE)==='1';}
    catch(e){return false;}
  }
  function realKey(key){const name=String(key);return active()&&name!==HOST&&name!==ACTIVE?PREFIX+name:name;}
  const storage={
    getItem(k){return real.getItem(realKey(k));},
    setItem(k,v){real.setItem(realKey(k),String(v));},
    removeItem(k){real.removeItem(realKey(k));},
    key(i){return real.key(i);},
    get length(){return real.length;}
  };
  function clearTestData(){
    const found=[];
    for(let i=0;i<real.length;i++){const k=real.key(i);if(k&&k.startsWith(PREFIX))found.push(k);}
    for(const k of found)real.removeItem(k);
  }
  function start(){
    real.setItem(HOST,'1');real.setItem(ACTIVE,'1');
    clearTestData();
    window.location.assign('index.html?replay=1');
  }
  function resume(){if(active())window.location.assign('index.html');}
  function stop(){
    try{real.removeItem(ACTIVE);real.removeItem(HOST);}catch(e){}
    window.location.assign('index.html');
  }
  function navTo(page){
    if(!active())return;
    window.location.assign(page);
  }
  function banner(){
    if(!active()||document.getElementById('sd-full-test-bar'))return;
    const bar=document.createElement('aside');
    bar.id='sd-full-test-bar';
    bar.setAttribute('aria-label','Полное тестовое прохождение ведущего');
    bar.innerHTML='<strong>🔧 ТЕСТ ВЕДУЩЕГО</strong><span>Проходишь как Лиза · даты и GPS отключены · ответы отдельно</span>'+
     '<div><button type="button" id="sdtest-restart">↻ С самого начала</button>'+
     '<button type="button" id="sdtest-end">✕ Выйти</button></div>';
    document.body.prepend(bar);
    document.getElementById('sdtest-restart').addEventListener('click',()=>{
      if(window.confirm('Начать весь тест заново? Тестовые ответы и прогресс будут очищены. Настоящие данные не изменятся.'))start();
    });
    document.getElementById('sdtest-end').addEventListener('click',()=>{
      if(window.confirm('Завершить тест и вернуться к обычной версии?'))stop();
    });
  }
  window.SDTest={active,start,resume,stop,storage,navTo,banner,clearTestData};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',banner);
  else banner();
})();