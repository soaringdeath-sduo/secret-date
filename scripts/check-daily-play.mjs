// Daily mini-series, hidden bonus cards and the heart-dinosaur are playable and do not break existing daily progress.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const src=p=>fs.readFileSync(p,'utf8');
const page=src('daily.html'),mini=src('daily-play.js'),dino=src('daily-dino.js'),wishes=src('daily-dino-wishes.js'),certificate=src('daily-dino-certificate.js'),css=src('daily-play.css');
new Function(mini);new Function(certificate);new Function(wishes);new Function(dino);
assert.ok(page.includes('daily-play.js?v=1')&&page.includes('daily-dino.js?v=4')&&page.includes('daily-dino-certificate.js?v=1')&&page.includes('daily-dino-wishes.js?v=1')&&page.includes('daily-play.css?v=6'));
assert.ok(page.includes('window.DailyPlay.mountInterlude('),'Interludes must be integrated with quiz resume');
assert.ok(page.includes('window.DailyPlay.mountSecret('),'Episode completion should expose secret');
assert.ok(page.includes('window.DailyDino.mount('),'Arcade must be playable from daily home');
assert.ok(page.includes('window.SDTest.active()||![5,10].includes(step)'),'Isolated full-host walkthrough should not be interrupted');
assert.ok(css.includes('.daily-dino-surface')&&css.includes('.daily-secret-event'));

const dom=new JSDOM('<!doctype html><html lang="ru"><body><main id="stage"></main></body></html>',
 {url:'https://soaringdeath-sduo.github.io/secret-date/daily.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.SDTest={storage:w.localStorage,active:()=>false};
w.eval(mini);w.eval(certificate);w.eval(wishes);w.eval(dino);
const host=w.document.getElementById('stage'),game=w.DailyPlay;
for(const day of [9,10,11,12,13,14])for(const slot of [5,10]){
 assert.equal(game.isEligible(day,slot),true);
 assert.ok(game.miniFor(day,slot)?.title,'Every episode requires two unique mini-events');
}
assert.equal(game.isEligible(15,5),false);
let resumed=0;
function mount(day,slot,preview=false){
 host.innerHTML='';
 assert.equal(game.mountInterlude(host,{day,slot,preview,onResume:()=>{resumed++;}}),true);
 assert.ok(host.querySelector('#daily-mini-stage'));
}
function accept(){
 assert.ok(host.querySelector('#mini-resume'),'Mini-game should be finishable');
 host.querySelector('#mini-resume').click();
}
mount(9,5);
assert.equal(game.hasPlayed(9,5),false);
host.querySelectorAll('[data-heart="1"]').forEach(el=>el.click());
accept();
assert.equal(game.hasPlayed(9,5),true);
assert.equal(resumed,1);
mount(10,5);
for(let i=0;i<4;i++)host.querySelector('[data-word="'+i+'"]').click();
accept();assert.equal(game.hasPlayed(10,5),true);
mount(10,10);
for(let i=0;i<3;i++)host.querySelector('[data-decode="'+i+'"]').click();
accept();assert.equal(game.hasPlayed(10,10),true);
mount(11,5);
for(let i=0;i<4;i++){
 host.querySelector('[data-match-left="'+i+'"]').click();
 host.querySelector('[data-match-right="'+i+'"]').click();
}
accept();assert.equal(game.hasPlayed(11,5),true);
mount(12,5);
for(let i=0;i<3;i++)host.querySelector('[data-scene="0"]').click();
accept();assert.equal(game.hasPlayed(12,5),true);
mount(13,5);
host.querySelector('#mini-skip').click();
assert.equal(game.hasPlayed(13,5),true,'Optional game can always be skipped');
assert.equal(resumed,6);
mount(14,10,true);
host.querySelector('#mini-skip').click();
assert.equal(game.hasPlayed(14,10),false,'Organizer preview cannot modify Lisa progress');

// Matching cards can be finished without knowing their randomized layout.
const realTimer=w.setTimeout;
w.setTimeout=(fn)=>{fn();return 1;};
mount(9,10);
const cards=[...host.querySelectorAll('[data-card]')];
outer: for(let i=0;i<cards.length;i++){
 for(let j=i+1;j<cards.length;j++){
  if(host.querySelector('#mini-resume'))break outer;
  if(cards[i].classList.contains('is-matched')||cards[j].classList.contains('is-matched'))continue;
  cards[i].click();cards[j].click();
 }
}
w.setTimeout=realTimer;
accept();
assert.equal(game.hasPlayed(9,10),true,'Memory game has four solvable pairs');

let revealedBefore=game.read().revealed['11'];
assert.notEqual(revealedBefore,true);
host.innerHTML='';
game.mountSecret(host,11,{preview:false,canPlay:()=>true});
assert.ok(host.querySelector('#daily-secret-open'));
const savedId=game.read().event['11'];
host.querySelector('#daily-secret-open').click();
assert.equal(game.read().revealed['11'],true);
game.mountSecret(host,11,{preview:false,canPlay:()=>true});
assert.equal(host.querySelector('#daily-secret-open'),null,'Revealed secret is remembered');
assert.equal(game.read().event['11'],savedId,'Random event must be stable across reloads');
const beforePreview=JSON.stringify(game.read());
game.mountSecret(host,14,{preview:true,canPlay:()=>true});
host.querySelector('#daily-secret-open').click();
assert.equal(JSON.stringify(game.read()),beforePreview,'Preview reveal must not alter real storage');

const runner=w.DailyDino;
assert.equal(runner.gameAvailable(Date.UTC(2026,10,9,6),'sat',true),true);
assert.equal(runner.gameAvailable(Date.UTC(2026,10,9,5,59),'sat',true),false);
assert.equal(runner.gameAvailable(Date.UTC(2026,10,15,12),'sat',true),false);
assert.equal(runner.gameAvailable(Date.UTC(2026,10,15,12),'sun',true),true);
assert.equal(runner.gameAvailable(Date.UTC(2026,10,16,0),'sun',true),false);
assert.equal(runner.gameAvailable(Date.UTC(2026,10,10,12),'sun',false),false);
assert.equal(runner.gameAvailable(null,'sun',true),false);
assert.deepEqual(Array.from(runner.rewardStatus(1999)),[]);
assert.deepEqual(Array.from(runner.rewardStatus(2000)),[2000]);
assert.deepEqual(Array.from(runner.rewardStatus(4999)),[2000]);
assert.deepEqual(Array.from(runner.rewardStatus(5000)),[2000,5000]);
assert.deepEqual(Array.from(runner.rewardStatus(14999)),[2000,5000]);
assert.deepEqual(Array.from(runner.rewardStatus(15000)),[2000,5000,15000]);
assert.deepEqual(Array.from(runner.rewardStatus(20000)),[2000,5000,15000]);
assert.equal(runner.difficulty(9999).turbo,false);
assert.equal(runner.difficulty(10000).turbo,true);
assert.equal(runner.difficulty(10000).speedBonus>runner.difficulty(9999).speedBonus,true);
assert.equal(runner.difficulty(10000).spawnMultiplier<runner.difficulty(9999).spawnMultiplier,true);
assert.equal(runner.difficulty(10000).heightBonus>0,true);
runner.saveHigh(2000,false);
assert.equal(runner.read().best,2000);
runner.saveHigh(100,false);
assert.equal(runner.read().best,2000,'Score is never downgraded');
runner.saveHigh(6000,true);
assert.equal(runner.read().best,2000,'Host preview cannot persist rewards');
runner.saveHigh(5000,false);
assert.equal(runner.read().best,5000);
runner.saveHigh(15000,false);
assert.equal(runner.read().best,15000,'The final gift threshold is saved');

// Browser canvas controls: start, pause, resume and exit without page reload.
const ctx={fillRect(){},beginPath(){},moveTo(){},arc(){},fill(){},save(){},translate(){},scale(){},restore(){},bezierCurveTo(){},setTransform(){},
 createLinearGradient(){return {addColorStop(){}}}};
w.HTMLCanvasElement.prototype.getContext=()=>ctx;
w.requestAnimationFrame=()=>5;w.cancelAnimationFrame=()=>{};
let exits=0;
runner.mount(host,{preview:true,canPlay:()=>true,onExit:()=>{exits++;}});
assert.ok(host.querySelector('#dino-canvas'));
assert.ok(host.querySelector('#dino-rewards').textContent.includes('Шоколадка'));
assert.ok(host.querySelector('#dino-rewards').textContent.includes('24 часа'));
assert.ok(host.querySelector('#dino-rewards').textContent.includes('ПОСЛЕ свидания'));
assert.ok(host.querySelector('.dino-wish-drawer'),'Earned wishes must expose post-date activation rules below the game');
assert.ok(host.querySelector('#dino-rewards').textContent.includes('Магнит Косметик'));
assert.ok(host.querySelector('.dino-certificate'));
assert.ok(host.querySelector('[data-dino-certificate="pdf"]'));
assert.ok(host.querySelector('[data-dino-certificate="png"]'));
assert.ok(host.querySelector('.dino-certificate-preview'),'Host-preview voucher is watermarked');
assert.ok(host.querySelector('#dino-difficulty').textContent.includes('10 000'));
assert.equal(host.querySelector('#dino-turbo-toast'),null,'No interrupting turbo toast inside the active game');
assert.ok(!dino.includes('announceTurbo('),'Switching to turbo must not introduce a popup');
assert.ok(!css.includes('.daily-dino-turbo-toast'),'No z-index turbo overlay can obscure gameplay');
assert.ok(dino.includes("if(last<TURBO_AT&&points>=TURBO_AT)refreshDifficulty();"),'Turbo uses a passive difficulty label only');
host.querySelector('#dino-jump').click();
assert.equal(host.querySelector('#dino-jump').textContent,'⬆ Прыжок');
host.querySelector('#dino-pause').click();
assert.equal(host.querySelector('#dino-jump').textContent,'▶ Продолжить');
host.querySelector('#dino-jump').click();
assert.equal(host.querySelector('#dino-jump').textContent,'⬆ Прыжок');
host.querySelector('#dino-exit').click();
assert.equal(exits,1);
runner.stop();
dom.window.close();
console.log('✓ Six days × two mini-games, memory/hunt/word/pair/story play, surprises, secure preview, 2000/5000/15000 dino gifts and 10000 turbo and mobile controls');