// Regression: the daily mini-series must open to a three-way menu,
 // while old deep links, daily question resume, and host full walkthrough remain intact.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const file=p=>fs.readFileSync(p,'utf8');
const html=file('daily.html'),css=file('daily-play.css');
assert.ok(html.includes('function renderSeriesMenu()'),'Daily page needs a dedicated landing menu');
assert.ok(html.includes('if(menuRequested()&&!window.SDTest.active())'),'Normal entry should display the menu');
assert.ok(html.includes('href="#daily-poetry-library"'),'Poems need a dedicated entry');
assert.ok(html.includes('href="#quests"'),'Quests need a dedicated entry');
assert.ok(html.includes('href="#dino"'),'Game menu choice must always show its own access status, not open quests');
assert.ok(html.includes("const resumeRequested=()=>window.location.hash==='#resume'"),'Existing chapter-resume link must survive');
assert.ok(css.includes('.series-menu-tile')&&html.includes('daily-play.css?v=5'),'Polaroid menu and fresh CSS must load');
assert.ok(file('index.html').includes('id="daily-story-link"'),'Invitation must still lead to the mini-series');

const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const tick=ms=>new Promise(r=>setTimeout(r,ms));
function makeBrowser(hash='',extra={}){
 const dom=new JSDOM(html,{
  url:'https://soaringdeath-sduo.github.io/secret-date/daily.html'+hash,
  runScripts:'outside-only',pretendToBeVisual:true
 });
 const w=dom.window,st=w.localStorage;
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.CompressionStream=undefined;w.DecompressionStream=undefined;
 w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
 w.HTMLMediaElement.prototype.play=function(){return Promise.resolve()};
 w.HTMLMediaElement.prototype.pause=function(){};
 w.HTMLMediaElement.prototype.load=function(){};
 for(const [key,value] of Object.entries({
  'sd2810-selected-day-v1':'sat',
  'sd2810-invite-approved-v3':'1',
  ...extra
 }))st.setItem(key,value);
 w.fetch=async (url,options={})=>{
  const uri=String(url);
  if(uri.includes('daily-content/day-')){
   const day=uri.match(/day-(\d+)\.json/)?.[1];
   return {ok:true,json:async()=>JSON.parse(file('daily-content/day-'+day+'.json'))};
  }
  if(uri.includes('poetry-data.json'))return {ok:true,json:async()=>JSON.parse(file('poetry-data.json'))};
  if(uri.includes('daily.html?'))return {ok:true,headers:{get:k=>k==='date'?'Mon, 09 Nov 2026 14:00:00 GMT':null}};
  if(options.method==='HEAD')return {ok:true,headers:{get:()=> 'Mon, 09 Nov 2026 14:00:00 GMT'}};
  return {ok:false,headers:{get:()=>null}};
 };
 const ctx={
  fillRect(){},beginPath(){},moveTo(){},arc(){},fill(){},save(){},translate(){},scale(){},restore(){},
  bezierCurveTo(){},setTransform(){},stroke(){},fillText(){},lineTo(){},strokeRect(){},roundRect(){},
  createLinearGradient(){return {addColorStop(){}}}
 };
 w.HTMLCanvasElement.prototype.getContext=()=>ctx;
 w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 for(const path of ['host-full-test.js','couple-core.js','daily-couple.js','daily-poetry.js','daily-play.js','daily-dino-certificate.js','daily-dino.js'])
  w.eval(file(path));
 for(const script of inline)w.eval(script);
 return {dom,w,root:w.document.querySelector('#daily-root')};
}
const b=makeBrowser();
await tick(75);
assert.ok(b.root.querySelector('.series-menu'),'Normal mini-series URL must open the menu');
assert.equal(b.root.querySelectorAll('.series-menu-tile').length,3,'Exactly three primary choices');
assert.ok(b.root.textContent.includes('Динолюбик'));
assert.ok(b.root.textContent.includes('Стихи для тебя'));
assert.ok(b.root.textContent.includes('Квесты и главы'));
assert.equal(b.root.querySelector('.daily-grid'),null,'Do not start on the quest list');
assert.ok(b.root.querySelector('a[href="#dino"]'),'Arcade should be accessible during its allowed day');
b.root.querySelector('a[href="#quests"]').click();
await tick(35);
assert.ok(b.root.querySelector('.daily-grid'),'Quest option opens existing daily chapters');
assert.ok(b.root.textContent.includes('Наши квесты'),'Quest area has its own focused heading');
assert.equal(b.root.querySelector('.daily-arcade-home'),null,'Dino must not be duplicated inside the quest list');
assert.equal(b.root.querySelector('#open-dino'),null,'No redundant launch-game button in quests');
assert.equal(b.root.querySelector('#daily-poetry-library'),null,'Poetry archive must not repeat underneath quest cards');
assert.equal(b.root.querySelector('.dino-home-claimed'),null,'The earned gift shelf lives in the main menu only');
assert.ok(b.root.querySelector('a.series-back[href="#menu"]'),'Quest list can return to main menu');
b.root.querySelector('[data-open="0"]').click();
await tick(35);
assert.ok(b.root.textContent.includes('Вопрос 1 из 15'),'Daily quiz still opens in its permitted day');
b.root.querySelector('#back-to-list').click();
await tick(35);
assert.ok(b.root.querySelector('.daily-grid'),'Back-to-chapters returns to day list, not game');
b.root.querySelector('.series-back').click();
await tick(35);
assert.ok(b.root.querySelector('.series-menu'),'Menu is accessible after a chapter');
b.root.querySelector('a[href="#daily-poetry-library"]').click();
await tick(35);
assert.ok(b.root.textContent.includes('Стихи для тебя'),'Poem archive should open');
assert.ok(b.root.querySelector('#daily-poetry-library'),'Poetry archive must live only under its own menu item');
assert.equal(b.root.querySelector('.daily-grid'),null,'Poetry route must not include chapter list');
assert.ok(b.root.querySelector('a[href="#menu"]'),'Poem archive should return to menu');
b.root.querySelector('a[href="#menu"]').click();
await tick(35);
assert.ok(b.root.querySelector('.series-menu'));
b.root.querySelector('a[href="#dino"]').click();
await tick(35);
assert.ok(b.root.querySelector('#dino-canvas'),'Dino choice opens actual arcade');
b.root.querySelector('#dino-exit').click();
await tick(35);
assert.ok(b.root.querySelector('.series-menu'),'Dino exit returns to the three choices');
b.dom.window.close();

// Direct poetry archive link works without first visiting the main menu.
const poem=makeBrowser('#daily-poetry-library');
await tick(45);
assert.ok(poem.root.textContent.includes('Стихи для тебя'));
assert.equal(poem.root.querySelector('.series-menu'),null);
poem.dom.window.close();

// The existing #resume bookmark still opens the first uncompleted question.
const part=makeBrowser('#resume',{
 'sd2810-daily-v1':JSON.stringify({version:2,done:{},answers:{0:[0,1]}})
});
await tick(75);
assert.ok(part.root.textContent.includes('Вопрос 3 из 15'),'Deep-linked saved progress must resume question three');
part.dom.window.close();

console.log('✓ Mini-series starts at 3-choice Polaroid menu; game, poem archive and quests all work; saved quiz resume and back navigation preserved');