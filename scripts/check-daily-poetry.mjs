// Run with Node 22 + jsdom@26: node scripts/check-daily-poetry.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const data=JSON.parse(fs.readFileSync('poetry-data.json','utf8'));
assert.equal(data.length,6,'There should be six original poems');
const texts=new Set(),titles=new Set();
for(const [i,p] of data.entries()){
 assert.equal(p.day,9+i,'Poetry day should be sequential');
 assert.ok(p.title&&p.tagline&&p.mood,'Poetry metadata is required');
 assert.equal(p.text.trim().split(/\n/).filter(Boolean).length,8,'Each poem should have 8 lines');
 assert.equal(p.text.trim().split(/\n\s*\n/).length,2,'Each poem should have 2 stanzas');
 assert.ok(!titles.has(p.title));titles.add(p.title);
 assert.ok(!texts.has(p.text));texts.add(p.text);
}
assert.ok(data[0].text.includes('вскоре'),'First poem should not mistakenly say the date is tomorrow');
const daily=fs.readFileSync('daily.html','utf8');
assert.ok(daily.includes('daily-poetry.css?v=2')&&daily.includes('daily-poetry.js?v=3'));
assert.ok(daily.includes('window.DailyPoetry.completion('),'Daily ending must reveal poem');
assert.ok(daily.includes('window.DailyPoetry.library('),'Daily page must have permanent poem library');
assert.ok(daily.includes("window.DailyPoetry.completion(root.querySelector('#daily-poetry-card'),DAYS[i]"),'Chapter card must match its day');
assert.ok(fs.readFileSync('poems/README.md','utf8').includes('poem-day-9.mp3'));
assert.ok(fs.readFileSync('poems/README.md','utf8').includes('poem-day-14.mp3'));
const js=fs.readFileSync('daily-poetry.js','utf8');
new Function(js);

const dom=new JSDOM('<!doctype html><html lang="ru"><body><div id="library"></div><div id="card"></div><div id="second"></div></body></html>',{
 url:'https://soaringdeath-sduo.github.io/secret-date/daily.html',runScripts:'outside-only',pretendToBeVisual:true
});
const w=dom.window,document=w.document;
w.SDTest={active:()=>false};
w.HTMLMediaElement.prototype.pause=function(){};
let numHead=0,rangeGets=0,retryReady=false;
w.fetch=async (url,options={})=>{
 const src=String(url);
 if(src.includes('poetry-data.json'))return {ok:true,json:async()=>data};
 if(options.method==='HEAD'){
  numHead++;
  const exists=/poem-day-10\.mp3/.test(src);
  if(retryReady&&/poem-day-09\.mp3/.test(src))throw new Error('Embedded Android HEAD request rejected');
  return {ok:exists,headers:{get:()=>exists?'audio/mpeg':'text/html'}};
 }
 if(options.method==='GET'&&options.headers?.Range==='bytes=0-0'){
  rangeGets++;
  const exists=retryReady&&/poem-day-09\.mp3/.test(src);
  return {ok:exists,headers:{get:()=>exists?'audio/mpeg':'text/html'},body:{cancel:async()=>{}}};
 }
 throw new Error('Unexpected fetch '+src);
};
w.eval(js);
const api=w.DailyPoetry;
const tick=()=>new Promise(resolve=>setTimeout(resolve,25));
const state={done:[true,false,false,false,false,false]};
const home=document.getElementById('library');
await api.library(home,state,'sat',false);
assert.equal(home.querySelectorAll('.poetry-library-item').length,5,'Saturday has five poems');
assert.equal(home.querySelectorAll('[data-poetry-open]').length,1,'Only completed poem should unlock');
assert.ok(!home.textContent.includes('Я выбираю нас'),'Day 14 must not be shown for a Saturday date');
assert.ok(!home.textContent.includes('Когда мы молчим'),'Future poem titles should not be spoiled');

const card=document.getElementById('card');
api.completion(card,9,false);await tick();
assert.ok(card.textContent.includes('Пока это секрет'));
assert.ok(card.textContent.includes('Пускай пока останется секрет'));
const guestPlayer=card.querySelector('audio');
assert.ok(guestPlayer,'Uploaded MP3 should have a player even while Pages deployment is still pending');
assert.ok(guestPlayer.src.includes('raw.githubusercontent.com'),'Fallback should use GitHub Raw until Pages publishes');
assert.ok(!card.querySelector('.poetry-missing'),'Guest should not see outdated missing-file warning');
assert.ok(!card.querySelector('[data-poetry-copy]'),'Guest should not see host copy controls');
guestPlayer.dispatchEvent(new w.Event('error'));
const retry=card.querySelector('.poetry-retry');
assert.ok(retry,'If even fallback cannot play, visitor can manually retry');
retryReady=true;
retry.click();await tick();
assert.ok(card.querySelector('audio'),'Retry should find uploaded MP3 after deployment');
assert.ok(card.querySelector('audio').src.endsWith('/assets/poem-day-9.mp3'),'Retry should switch back to Pages when available');
assert.ok(!card.querySelector('audio').src.includes('raw.githubusercontent.com'),'Preferred origin should be own Pages host');
assert.ok(rangeGets>=2,'Android HEAD failures must fall back to ranged GET');

const second=document.getElementById('second');
api.completion(second,10,false);await tick();
assert.ok(second.querySelector('audio'),'When MP3 exists, real audio controls should display');
assert.ok(second.querySelector('audio').getAttribute('src').endsWith('poem-day-10.mp3'));
assert.ok(second.querySelector('.poetry-save'),'Working audio should have download link');

home.querySelector('[data-poetry-open]').click();await tick();
const modal=document.querySelector('#poetry-modal');
assert.ok(modal,'Unlocked poem should open in a Polaroid modal');
assert.ok(modal.querySelector('.poetry-card'));
modal.querySelector('.poetry-dialog-close').click();
assert.ok(!document.querySelector('#poetry-modal'),'Modal should close');
assert.ok(numHead>=2,'Audio availability should be checked before showing a player');
assert.ok(rangeGets>=2,'Fallback retrieval must run after false-negative HEAD');

w.localStorage.setItem('sd2810-host-v3','1');
w.SDTest.active=()=>true;
await api.library(home,state,'sun',false);
assert.equal(home.querySelectorAll('.poetry-library-item').length,6,'Sunday has six poems');
assert.equal(home.querySelectorAll('[data-poetry-open]').length,1,'Full walkthrough should not spoil later poems');
api.completion(card,9,false);await tick();
assert.ok(card.querySelector('[data-poetry-copy]'),'Full host test should offer convenient voice script copy');

w.SDTest.active=()=>false;
await api.library(home,state,'sun',true);
assert.equal(home.querySelectorAll('[data-poetry-open]').length,6,'Organizer preview may inspect all six poems');
dom.window.close();
console.log('✓ Six poems, eight lines each, correct 14/15 November windows');
console.log('✓ Complete-only anthology, host simulation, and previews');
console.log('✓ Audio plays only when MP3 exists; no dead guest controls');
console.log('✓ Accessible modal with real Russian poem and easy close');