// Browser-level 90-question / 14-stage end-to-end audit, in isolated test storage.
// Run on CI: node scripts/check-deep-walkthrough.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const file=p=>fs.readFileSync(p,'utf8');
const source=file('secret_date_game_luga.html');
const daily=file('daily.html');
const poemData=JSON.parse(file('poetry-data.json'));
const tick=ms=>new Promise(r=>setTimeout(r,ms));
function inline(html){return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1])}
function seed(dom,values){
 for(const [k,v] of Object.entries(values))dom.window.localStorage.setItem(k,v);
}
function readStore(dom){
 const storage=dom.window.localStorage, out={};
 for(let i=0;i<storage.length;i++){const key=storage.key(i);out[key]=storage.getItem(key);}
 return out;
}
function browser(html,url,values,options={}){
 const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.CompressionStream=undefined;w.DecompressionStream=undefined;
 w.scrollTo=()=>{};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLMediaElement.prototype.pause=function(){};
 w.HTMLMediaElement.prototype.load=function(){};
 w.HTMLMediaElement.prototype.play=function(){return Promise.resolve()};
 w.URL.createObjectURL=()=> 'blob:https://test.invalid/test';
 w.URL.revokeObjectURL=()=>{};
 w.alert=()=>{};
 w.confirm=()=>true;
 w.requestAnimationFrame=cb=>{cb();return 1;};
 if(options.fastTimers){
  const original=w.setTimeout.bind(w);
  w.setTimeout=(callback,ms,...args)=>original(callback,ms>=2500?3:ms,...args);
 }
 seed(dom,values);
 w.fetch=async (url,opts={})=>{
  const uri=String(url);
  if(uri.includes('daily-content/day-')){const m=uri.match(/day-(\d+)\.json/);return {ok:true,json:async()=>JSON.parse(file('daily-content/day-'+m[1]+'.json'))};}
  if(uri.includes('poetry-data.json'))return {ok:true,json:async()=>poemData};
  if(opts.method==='HEAD')return {ok:true,headers:{get:k=>k==='date'?'Mon, 09 Nov 2026 13:00:00 GMT':'audio/mpeg'}};
  if(opts.method==='GET')return {ok:true,headers:{get:()=> 'audio/mpeg'},body:{cancel:async()=>{}}};
  if(uri.includes('finales-config.json'))return {ok:false,headers:{get:()=>null}};
  if(uri.includes('daily.html?'))return {ok:true,headers:{get:()=> 'Mon, 09 Nov 2026 13:00:00 GMT'}};
  return {ok:false,headers:{get:()=>null}};
 };
 w.eval(file('host-full-test.js'));
 return {dom,w,document:w.document,loadScripts:(names,withInline=html)=>{
  for(const name of names)w.eval(file(name));
  for(const text of inline(withInline))w.eval(text);
 }};
}
function isolatedSeed(day='sun'){
 return {
  'sd2810-host-v3':'1',
  'sd2810-full-host-test-v1':'1',
  'sd2810-full-test-data:sd2810-selected-day-v1':day,
  'sd2810-full-test-data:sd2810-invite-approved-v3':'1'
 };
}
function click(doc,sel,about){
 const el=doc.querySelector(sel);assert.ok(el,about+': missing '+sel);
 assert.ok(!el.disabled,about+': button disabled '+sel);
 el.click();return el;
}
function invitation(day){
 const html=file('index.html');
 const raw={'sd2810-host-v3':'1','sd2810-full-host-test-v1':'1'};
 const d=browser(html,'https://soaringdeath-sduo.github.io/secret-date/index.html?replay=1',raw);
 for(const part of inline(html))d.w.eval(part);
 const c=d.document.getElementById('card');
 click(c,'#start','Open sealed invitation');
 for(let i=1;i<=5;i++){
  assert.ok(c.textContent.includes('Вопрос '+i+' из 5'),'Invitation must ask question '+i);
  click(c,'#yes','Answer invitation');
 }
 const form=c.querySelector('#secret-form');assert.ok(form,'Relationship date password must appear');
 c.querySelector('#secret').value='28.10';
 form.dispatchEvent(new d.w.Event('submit',{bubbles:true,cancelable:true}));
 click(c,day==='sat'?'#choose-sat':'#choose-sun','Choose date');
 assert.equal(d.w.SDTest.storage.getItem('sd2810-selected-day-v1'),day);
 assert.equal(d.w.SDTest.storage.getItem('sd2810-invite-approved-v3'),'1');
 assert.ok(c.querySelector('#final'),'Final invitation should render');
 assert.ok(c.querySelector('#daily-story-link'),'Daily episode link should render');
 assert.ok(c.textContent.includes('11:30'),'Selected invitation time must remain 11:30');
 d.dom.window.close();
 return day;
}
async function quizAll(){
 const d=browser(daily,'https://soaringdeath-sduo.github.io/secret-date/daily.html',isolatedSeed('sun'));
 d.loadScripts(['couple-core.js','daily-couple.js','daily-poetry.js']);
 await tick(35);
 const r=d.document.getElementById('daily-root');
 const rounds=[];
 for(let day=9;day<=14;day++){
  for(let q=1;q<=15;q++){
   assert.ok(r.textContent.includes('Вопрос '+q+' из 15'),'Day '+day+', question '+q+' should render');
   click(r,'[data-answer="0"]','Quiz '+day+' #'+q);
   if(q<15)click(r,'#daily-feedback button.btn','Quiz next '+day);
  }
  await tick(20);
  assert.ok(d.document.querySelector('#poetry-modal'),'Day '+day+' poem should open after answer 15');
  assert.ok(d.document.querySelector('#poetry-modal .poetry-card'),'Day '+day+' poem must be populated');
  assert.ok(d.document.querySelector('#poetry-story-next'),'Next after poem must exist');
  click(d.document,'#poetry-story-next','Poem next');
  assert.ok(r.querySelector('#daily-reopen-poem'),'Poem must be clearly accessible on completion');
  rounds.push({day,answers:15,poem:true,seal:true});
  if(day<14){click(r,'#sd-next-full-test','Host next day');await tick(25);}
 }
 assert.ok(r.querySelector('#sd-next-full-test'),'Final day must link to GPS route');
 const preserved=readStore(d.dom);
 // Final archive route from the GPS game should not force daily day one again.
 d.dom.window.close();
 const archive=browser(daily,'https://soaringdeath-sduo.github.io/secret-date/daily.html#daily-poetry-library',preserved);
 archive.loadScripts(['couple-core.js','daily-couple.js','daily-poetry.js']);
 await tick(30);
 const root=archive.document.getElementById('daily-root');
 assert.ok(root.querySelector('.poetry-library'),'Finale link must open poem archive');
 assert.equal(root.querySelectorAll('[data-poetry-open]').length,6,'All completed poems should be listed');
 assert.equal(root.querySelector('.quiz-question'),null,'Archive must not open first unfinished quiz');
 assert.ok(!root.querySelector('.daily-grid'),'Archive should open directly, not below chapter list');
 archive.dom.window.close();
 const partial=browser(daily,'https://soaringdeath-sduo.github.io/secret-date/daily.html#daily-poetry-library',isolatedSeed('sat'));
 partial.loadScripts(['couple-core.js','daily-couple.js','daily-poetry.js']);
 await tick(30);
 assert.ok(partial.document.querySelector('.poetry-library'),'An unfinished host test should also open archive without jumping to day 1');
 assert.equal(partial.document.querySelectorAll('[data-poetry-open]').length,0,'An unfinished host must not see locked poems');
 partial.dom.window.close();
 console.log('✓ 90 actual button answers, six automatic poem overlays, seals, and final GPS handoff');
 console.log('✓ Finale album link opens six poems and unfinished host test never auto-starts day one');
 return preserved;
}
function pageIndex(w){
 return Number(w.document.querySelector('.story-current')?.getAttribute('data-story-page')??-1);
}
function next(w,expected,reason){
 const prior=pageIndex(w);
 w.StoryFlow.next();
 if(expected!==undefined)assert.equal(pageIndex(w),expected,reason+' (was '+prior+')');
}
async function route(origin,choice='omchino',category='romance'){
 const d=browser(source,'https://soaringdeath-sduo.github.io/secret-date/secret_date_game_luga.html',isolatedSeed('sat'),{fastTimers:true});
 d.loadScripts(['story-flow.js']);
 const w=d.w,doc=d.document;
 w.SecretSoundtrack={
  pause(){},onPageRender(){},clearHostPreview(){},
  revealFirst(){w.StoryFlow.mark('firstSong')},
  revealFinal(){w.StoryFlow.mark('finalSong')},
  previewTrack(){},openLibrary(){w.__memoryAlbumMusicOpens=(w.__memoryAlbumMusicOpens||0)+1}
 };
 for(const text of inline(source))w.eval(text);
 const storage=w.SDTest.storage;
 const state=()=>Number(storage.getItem('sd2810-route-v7')||0);
 const tap=(sel)=>click(doc,sel,'Route '+origin+' stage '+state());
 const unseal=id=>{tap('[data-envelope-reveal="'+id+'"]');tap('[data-envelope-approve="'+id+'"]');};
 assert.equal(state(),0);
 next(w,1,'Start GPS screen');
 click(doc,'#check','mock GPS start');
 click(doc,origin==='zap'?'#start-zap':'#start-luga','choose origin');
 assert.equal(state(),1);
 tap('#radio-play');
 next(w,1,'radio question');
 tap('#radio-yes');
 next(w,2,'radio musical postcard');
 tap('#sc-first-open');
 next(w,3,'driver check');
 tap('[data-prank="driver"]');
 next(w,4,'VIP badge');
 tap('[data-prank="vip"]');
 next(w,5,'first coordinate');
 w.StoryFlow.next();
 assert.equal(state(),2);
 next(w,1,'store GPS');
 tap('#check');
 assert.equal(state(),3);
 next(w,1,'economy ticket');
 assert.equal(state(),3,'Economy chapter stays sealed');
 unseal('chocolate');
 tap('#go');
 assert.equal(state(),4);
 next(w,1,'economy receipt');
 tap('#go');
 assert.equal(state(),5);
 tap('[data-mission-action="premium-request"]');
 tap('[data-mission-action="premium-accept"]');
 tap('#go');assert.equal(state(),6);
 next(w,1,'drive to Zarechny');
 next(w,2,'park arrival');
 tap('#park-gps-arrive');
 assert.equal(pageIndex(w),3,'Arrival must advance automatically to shared time');
 tap('[data-park-action="together"]');
 assert.equal(pageIndex(w),4,'Shared time must advance automatically to coffee');
 if(origin==='zap'){
  tap('[data-park-action="coffee-yes"]');
  assert.equal(pageIndex(w),5,'Coffee YES opens a dedicated destination');
  assert.ok(doc.querySelector('.story-current').textContent.includes('Terrazza'),'Destination name must be unmistakable');
  assert.ok(doc.querySelector('.story-nav-next').disabled,'Cannot skip cafe visit by swiping forward');
  assert.ok(doc.querySelector('.story-current [data-park-action="coffee-finish"]'),'Dedicated cafe completion button exists');
  tap('[data-park-action="coffee-skip"]');
  assert.equal(pageIndex(w),6,'Closed cafe must continue without trapping the couple');
  w.StoryFlow.previous();
  assert.equal(pageIndex(w),5,'Can review a skipped cafe page');
  w.StoryFlow.previous();
  assert.equal(pageIndex(w),4,'Can change previous coffee choice');
  tap('[data-park-action="coffee-yes"]');
  assert.equal(pageIndex(w),5,'Changing mind reopens the dedicated cafe page');
  tap('[data-park-action="coffee-finish"]');
  assert.equal(pageIndex(w),6,'After cafe visit driver check opens automatically');
  assert.equal(JSON.parse(storage.getItem('sd2810-zarechny-visit-v1')).coffeeDone,true,'Cafe visit must be persisted');
 }else{
  tap('[data-park-action="coffee-no"]');
  assert.equal(pageIndex(w),5,'Coffee NO opens a clear no-coffee continuation');
  assert.ok(doc.querySelector('.story-current').textContent.includes('Останемся'),'Skipping coffee has its own understandable page');
  tap('[data-park-action="coffee-finish"]');
  assert.equal(pageIndex(w),6,'Skipping cafe explicitly advances to driver check');
  assert.equal(JSON.parse(storage.getItem('sd2810-zarechny-visit-v1')).coffee,'no');
 }
 tap('[data-prank="suspect"]');
 next(w,7,'photo hunt');
 tap('[data-mission-action="photo-skip"]');
 next(w,8,'continue date');
 unseal('letter');
 tap('#go');assert.equal(state(),7);
 tap('[data-prank="time"]');
 tap('[data-mission-action="letter-open"]');
 tap('[data-mission-action="letter-finish"]');
 tap('#lunch-go');assert.equal(state(),9);
 next(w,1,'lunch check');
 tap('[data-prank="parcel"]');
 unseal('lunch');
 tap('#go');assert.equal(state(),10);
 tap('[data-mission-action="glitch-restore"]');
 tap('[data-mission-action="glitch-finish"]');
 tap('#wheel-spin');
 await tick(25);
 tap('[data-cat="'+category+'"]');assert.equal(state(),11);
 next(w,1,'choose secret ending');
 tap('[data-ending="'+choice+'"]');assert.equal(state(),12);
 if(category==='romance'){
  next(w,1,'arrive final location');
  tap('#check');
  assert.equal(state(),12,'GPS alone cannot unlock finale');
  unseal('final');
  tap('#final-open');
 }else if(choice==='minigame'){
  tap('[data-quest-action="start"]');
  for(let i=0;i<3;i++){
   tap('[data-quest-action="answerL"][data-value="1"]');
   tap('[data-quest-action="handoff"]');
   tap('[data-quest-action="answerI"][data-value="1"]');
   tap('[data-quest-action="nextRound"]');
  }
  tap('[data-quest-action="chooseTruth"][data-value="skip"]');
  tap('[data-quest-action="finishTruth"]');
  tap('[data-quest-action="openEnvelope"][data-value="0"]');
  tap('[data-quest-action="completeEnvelope"]');
  tap('[data-quest-action="finishQuest"]');
  assert.equal(state(),12,'Quest alone cannot unlock finale');
  unseal('final');
  tap('[data-quest-action="openFinal"]');
 }else if(category==='adventure'){
  next(w,1,'manual ending');
  tap('#manual-finish');
 }else if(category==='cinema'){
  next(w,1,'movie details');
  const title=doc.querySelector('#movie-title'),time=doc.querySelector('#movie-time');
  assert.ok(title&&time,'Cinema details form should appear');
  title.value='Тестовый фильм';time.value='17:20';
  tap('#movie-confirm');
  tap('#movie-finish');
 }
 assert.equal(state(),13,'All final ending types should reach romantic finale');
 next(w,1,'real date');
 next(w,2,'final song');
 tap('#sc-finale-open');
 next(w,3,'awards');
 next(w,4,'photo archive');
 const a=doc.querySelector('a[href*="daily-poetry-library"]');
 assert.ok(a,'The finale must have a direct link to the poetry archive');
 assert.ok(doc.querySelector('#certificate-download'),'Final certificate PNG download must remain');
 click(doc,'#album-open-soundtrack','Open album soundtrack from final keepsake');
 assert.equal(w.__memoryAlbumMusicOpens,1,'Final album button should open actual soundtrack library');
 assert.ok(doc.querySelector('#album-download-status'),'Final album must have download feedback');
 assert.ok(doc.querySelector('.album-memory-links'),'Music and poems should be grouped within the final keepsake');
 assert.equal(a.hash,'#daily-poetry-library');
 assert.ok(doc.querySelector('.story-screen-count'),'Finale progress must remain visible');
 next(w,5,'embrace');
 tap('#hug');
 assert.ok(doc.querySelector('#hug-text').textContent.includes('обнимай'));
 const results={origin,stages:14,ending:choice,category,radio:origin==='zap'?'radio-zap-v2.mp3':'radio-luga-v2.mp3',archiveLink:a.href};
 d.dom.window.close();
 return results;
}
console.log('✓ Full invitation and both date choices:',invitation('sat'),invitation('sun'));
await quizAll();
const zap=await route('zap');
const luga=await route('luga');
const arcade=await route('zap','minigame','adventure');
const activity=await route('luga','anticafe','adventure');
const cinema=await route('zap','thriller','cinema');
console.log('✓ Route all the way through three finale types, custom quest, and both origins:',JSON.stringify({zap,luga,arcade,activity,cinema}));
