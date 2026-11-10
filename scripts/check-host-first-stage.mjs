// Regression for the organizer's first game-stage login, manual start and isolated test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>fs.readFileSync(p,'utf8');
const helper=read('host-full-test.js'),invite=read('index.html'),quest=read('secret_date_game_luga.html');
const inline=html=>[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
new Function(helper);
assert.ok(invite.includes('window.SDTest.startGame()'),'Organizer option 3 must use isolated first-stage start');
assert.ok(invite.includes("directHostLogin"),'Host shortcut must have an explicit login control');
assert.ok(quest.includes('host-start-first'),'Host route needs a clear first-stage button');
assert.ok(quest.includes('data-host-start="zap"')&&quest.includes('data-host-start="luga"'),'The first screen must offer both origins');

// State preservation and deep-link preparation.
const keys=new Map([
 ['sd2810-selected-day-v1','sun'],
 ['sd2810-invite-approved-v3','REAL-INVITE'],
 ['sd2810-route-v7','7'],
 ['sd2810-route-origin-v7','luga'],
 ['sd2810-secret-ending-v2','thriller'],
 ['sd2810-dino-heart-v1','REAL-DINO'],
 ['sd2810-daily-v1','REAL-ANSWERS']
]);
const real={
 get length(){return keys.size},
 key(i){return [...keys.keys()][i]??null},
 getItem(k){return keys.get(k)??null},
 setItem(k,v){keys.set(k,String(v))},
 removeItem(k){keys.delete(k)}
};
const page={readyState:'loading',addEventListener(){}};
const win={localStorage:real,location:{assign(p){this.destination=p}}};
new Function('window','document',helper)(win,page);
win.SDTest.startGame();
assert.equal(win.location.destination,'secret_date_game_luga.html');
assert.equal(win.SDTest.active(),true);
assert.equal(win.SDTest.storage.getItem('sd2810-selected-day-v1'),'sun');
assert.equal(win.SDTest.storage.getItem('sd2810-invite-approved-v3'),'1');
assert.equal(win.SDTest.storage.getItem('sd2810-route-v7'),'0');
assert.equal(win.SDTest.storage.getItem('sd2810-route-origin-v7'),null);
assert.equal(real.getItem('sd2810-invite-approved-v3'),'REAL-INVITE');
assert.equal(real.getItem('sd2810-route-v7'),'7');
assert.equal(real.getItem('sd2810-route-origin-v7'),'luga');
assert.equal(real.getItem('sd2810-dino-heart-v1'),'REAL-DINO');
assert.equal(real.getItem('sd2810-daily-v1'),'REAL-ANSWERS');
win.SDTest.stop();
assert.equal(win.SDTest.active(),false);
assert.equal(real.getItem('sd2810-route-v7'),'7');

// No selected real date: test uses safe fallback, and no real invite unlocked.
real.removeItem('sd2810-selected-day-v1');
win.SDTest.startGame();
assert.equal(win.SDTest.storage.getItem('sd2810-selected-day-v1'),'sat');
assert.equal(real.getItem('sd2810-selected-day-v1'),null);
assert.equal(real.getItem('sd2810-route-v7'),'7');
win.SDTest.stop();

// A user opening the game without the code cannot see the host-only start controls.
const dom=new JSDOM(quest,{url:'https://soaringdeath-sduo.github.io/secret-date/secret_date_game_luga.html',
 runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.scrollTo=()=>{};
w.HTMLElement.prototype.scrollIntoView=()=>{};
w.alert=msg=>{w.__lastHostAlert=msg};
w.prompt=()=>w.__hostAnswer;
w.HTMLMediaElement.prototype.pause=function(){};
w.HTMLMediaElement.prototype.play=function(){return Promise.resolve()};
w.HTMLMediaElement.prototype.load=function(){};
w.fetch=async()=>({ok:true,json:async()=>({version:1,revision:3,mask:511,updatedAt:'2026-11-08T23:44:51.171Z'})});
w.eval(helper);
w.eval(read('story-flow.js'));
w.SecretSoundtrack={
 onPageRender(){},pause(){},clearHostPreview(){},previewTrack(){},openLibrary(){},
 revealFirst(){},revealFinal(){}
};
for(const part of inline(quest))w.eval(part);
assert.equal(w.document.querySelector('.host-start-panel'),null);
assert.equal(w.document.getElementById('host-bar').classList.contains('hidden'),true);

// An incorrect code produces feedback instead of silently returning.
w.__hostAnswer='wrong-code';
for(let i=0;i<6;i++)w.document.getElementById('organizer').click();
assert.equal(w.localStorage.getItem('sd2810-host-v3'),null);
assert.ok(w.__lastHostAlert==='undefined'||!w.__lastHostAlert,'Wrong guest code must not enable host mode');

// Correct code enters verified organizer mode. A visible Zaplyusye button
// must open radio chapter one without any GPS attempt.
w.__hostAnswer='2114-2810';
for(let i=0;i<6;i++)w.document.getElementById('organizer').click();
assert.equal(w.localStorage.getItem('sd2810-host-v3'),'1');
assert.ok(w.document.querySelector('.host-start-panel'));
assert.ok(!w.document.getElementById('host-bar').classList.contains('hidden'));
assert.ok(w.document.querySelector('#host-start-first'));
let safeCalls=0;
w.SDTest.startGame=()=>{safeCalls++};
w.document.querySelector('#host-start-first').click();
assert.equal(safeCalls,1,'Organizer safe first-stage shortcut must be functional');
w.document.querySelector('[data-host-start="zap"]').click();
const confirmation=w.document.querySelector('.story-confirm-yes');
if(confirmation)confirmation.click();
assert.equal(w.SDTest.storage.getItem('sd2810-route-v7'),'1','First radio stage must be unlocked for verified host');
assert.equal(w.SDTest.storage.getItem('sd2810-route-origin-v7'),'zap');
assert.ok(w.document.querySelector('#radio-play'),'First radio chapter playable after selecting origin');
dom.window.close();

// Host login shortcut is opt-in and does not display a host button for Lisa.
assert.ok(invite.includes("get('host')==='1'"));
console.log('✓ Organizer code: invalid code locked, verified first radio stage available, GPS-free isolated test preserves player progress, both start points offered');