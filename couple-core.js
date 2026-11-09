/* Операция 28.10 — оригинальные парные тесты (не психологическая диагностика).
   Ответы передаются только в URL-фрагменте: на сервер GitHub Pages он не отправляется.
   Внимание: любой человек с ссылкой может их прочитать. */
(function(global){
 'use strict';
 const VERSION=1;
 const DAY_SETS={sat:[10,11,12,13],sun:[10,11,12,13,14]};
 const SHORT={10:'Как мы говорим «люблю»',11:'Услышать друг друга',12:'Наш идеальный день',13:'Мы — одна команда',14:'Мечты на двоих'};
 const limit=180;
 function days(day){return DAY_SETS[day]?.slice()||[]}
 function clean(x){
  if(Number.isInteger(x)&&x>=0&&x<=2)return x;
  if(x&&typeof x==='object'&&!Array.isArray(x)&&typeof x.custom==='string'){
   const value=x.custom.trim().replace(/\s+/g,' ');
   if(value.length>=1&&value.length<=limit)return {custom:value};
  }
  return null;
 }
 function validAnswers(array){
  return Array.isArray(array)&&array.length===15&&array.every(x=>clean(x)!==null);
 }
 function createChallenge(day,st){
  const list=days(day);if(!list.length||!st||!st.answers||!st.done)throw new Error('Сначала выбери дату и пройди все главы о совместимости.');
  const answers={};
  for(const date of list){
   const i=date-9;
   if(st.done[i]!==true||!validAnswers(st.answers[i]))throw new Error('Пройди все доступные тесты с 10 ноября, чтобы открыть парное испытание.');
   answers[date]=st.answers[i].map(clean);
  }
  return {v:VERSION,type:'challenge',day,answers};
 }
 function validate(x,type){
  if(!x||typeof x!=='object'||x.v!==VERSION||x.type!==type||!days(x.day).length||!x.answers||typeof x.answers!=='object')return false;
  if(!days(x.day).every(d=>validAnswers(x.answers[d])))return false;
  if(type==='result'){
   if(!x.igor||typeof x.igor!=='object'||!days(x.day).every(d=>validAnswers(x.igor[d])))return false;
  }
  return true;
 }
 const encoder=new TextEncoder();
 const decoder=new TextDecoder('utf-8',{fatal:true});
 function toUrl(bytes){
  let binary='';for(let i=0;i<bytes.length;i+=4096)binary+=String.fromCharCode(...bytes.subarray(i,i+4096));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 }
 function fromUrl(str){
  if(!/^[a-zA-Z0-9_-]+$/.test(str)||str.length>45000)throw new Error('Ссылка повреждена или слишком длинная.');
  const text=str.replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(text+'='.repeat((4-text.length%4)%4));
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
 }
 async function pack(x){
  if(!validate(x,x?.type))throw new Error('Некорректные данные парного теста.');
  const raw=encoder.encode(JSON.stringify(x));
  if(typeof CompressionStream!=='undefined'){
   try{
    const stream=new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
    const compact=new Uint8Array(await new Response(stream).arrayBuffer());
    if(compact.length<raw.length)return 'z1.'+toUrl(compact);
   }catch(e){}
  }
  return 'j1.'+toUrl(raw);
 }
 async function unpack(token){
  if(typeof token!=='string'||token.length>45000)throw new Error('Неверная ссылка на тест.');
  let bytes,code=token.slice(0,3);
  if(code!=='z1.'&&code!=='j1.')throw new Error('Неизвестный формат ссылки.');
  bytes=fromUrl(token.slice(3));
  if(code==='z1.'){
   if(typeof DecompressionStream==='undefined')throw new Error('Браузер не поддерживает эту ссылку. Открой её в новом Chrome.');
   const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
   bytes=new Uint8Array(await new Response(stream).arrayBuffer());
  }
  if(bytes.length>120000)throw new Error('Данные слишком большие.');
  let obj;try{obj=JSON.parse(decoder.decode(bytes));}catch(e){throw new Error('Ссылка с ответами повреждена.');}
  if(!validate(obj,obj?.type))throw new Error('Данные ответов не проходят проверку.');
  return obj;
 }
 function normalize(s){return String(s).trim().toLocaleLowerCase('ru').replace(/\s+/g,' ')}
 function equal(a,b){
  if(typeof a==='number'&&typeof b==='number')return a===b;
  if(a?.custom&&b?.custom)return normalize(a.custom)===normalize(b.custom);
  return false;
 }
 function compare(result){
  if(!validate(result,'result'))throw new Error('Результаты неполные.');
  let total=0,matched=0,custom=0;
  const chapters=days(result.day).map(date=>{
   let hits=0,customCount=0;
   const pairs=result.answers[date].map((l,i)=>{
    const r=result.igor[date][i],ok=equal(l,r),free=typeof l==='object'||typeof r==='object';
    if(ok)hits++;
    if(free)customCount++;
    return {l,r,match:ok,free,index:i};
   });
   total+=pairs.length;matched+=hits;custom+=customCount;
   return {date,title:SHORT[date],hits,total:pairs.length,pairs};
  });
  return {total,matched,custom,percent:Math.round(matched/total*100),chapters};
 }
 function urlFor(type,token){
  const base=new URL('couple.html',location.href);
  base.hash=type+'='+token;
  return base.href;
 }
 global.CoupleTests={days,SHORT,validAnswers,createChallenge,validate,pack,unpack,compare,urlFor};
})(window);