// The earned 5k wish reward is retained but cannot be activated on the date
// itself. The separate 15k shopping prize remains the only cosmetic-shop reward.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const file=p=>fs.readFileSync(p,'utf8');
const code=file('daily-dino-wishes.js');
const game=file('daily-dino.js');
const daily=file('daily.html');
const css=file('daily-play.css');
new Function(code);new Function(game);
assert.ok(daily.includes('daily-dino-wishes.js?v=1'),'Daily page must load wish-activation module');
assert.ok(daily.includes('daily-dino.js?v=4'),'Dino code must refresh on mobile browsers');
assert.ok(daily.includes('daily-play.css?v=6'),'Wish card CSS must bust mobile cache');
assert.ok(daily.includes('dinoWishesHomeCard()'),'Earned wishes must be accessible after arcade closes');
assert.ok(daily.includes('getNow:nowTrusted,getDay:chosen'),'Dino must use trusted time and chosen date');
assert.ok(css.includes('.dino-wish-card')&&!css.includes('.dino-wish-toast'),'Activation status must not obscure gameplay');
assert.ok(game.includes("5000,title:'💝 24 часа пожеланий ПОСЛЕ свидания'"));
assert.ok(game.includes('Покупки на 5 000 ₽')===false || game.includes('ПОСЛЕ свидания'));

const dom=new JSDOM('<!doctype html><body><div id="test"></div></body>',{
 url:'https://soaringdeath-sduo.github.io/secret-date/daily.html',runScripts:'outside-only'
});
const w=dom.window;
w.SDTest={storage:w.localStorage,active:()=>false};
w.confirm=()=>true;
w.alert=message=>{throw new Error(message)};
w.eval(code);
const wishes=w.DailyDinoWishes;
const beforeSat=Date.UTC(2026,10,14,20,59,59); // 14 Nov, 23:59 MSK
const satStart=Date.UTC(2026,10,14,21,0,0);  // 15 Nov, 00:00 MSK
const beforeSun=Date.UTC(2026,10,15,20,59,59); // 15 Nov, 23:59 MSK
const sunStart=Date.UTC(2026,10,15,21,0,0); // 16 Nov, 00:00 MSK
assert.equal(wishes.dateStart('sat'),satStart);
assert.equal(wishes.dateStart('sun'),sunStart);
assert.equal(wishes.dateStart('other'),null);
assert.equal(wishes.status({score:4999,day:'sat',now:satStart}).kind,'locked');
assert.equal(wishes.status({score:5000,day:'sat',now:beforeSat}).kind,'pending');
assert.equal(wishes.status({score:5000,day:'sun',now:beforeSun}).kind,'pending');
assert.equal(wishes.status({score:5000,day:'sat',now:null}).kind,'verification');
assert.equal(wishes.status({score:5000,day:'sun',now:null}).kind,'verification');
assert.equal(wishes.status({score:5000,day:'none',now:sunStart}).kind,'choose-date');
assert.equal(wishes.redeem({score:5000,day:'sat',now:beforeSat}).ok,false);
assert.equal(wishes.redeem({score:5000,day:'sun',now:beforeSun}).ok,false);
assert.equal(wishes.read(),null,'Date-day wishes cannot be claimed early');
assert.equal(wishes.status({score:5000,day:'sat',now:satStart}).kind,'ready');
assert.equal(wishes.status({score:5000,day:'sun',now:sunStart}).kind,'ready');
assert.ok(wishes.card({score:5000,day:'sat',now:beforeSat}).includes('15 ноября 2026'));
assert.ok(wishes.card({score:5000,day:'sun',now:beforeSun}).includes('16 ноября 2026'));
const cardBefore=wishes.card({score:5000,day:'sat',now:beforeSat});
for(const text of ['на свидании её использовать нельзя','день встречи','15 000 очков','покупки','деньги','косметика','Магнит Косметик'])
 assert.ok(cardBefore.includes(text),'Clear gift rule missing: '+text);
assert.ok(!cardBefore.includes('data-wishes-activate'),'Do not expose claim button before date');
assert.equal(wishes.redeem({score:5000,day:'sat',now:satStart,preview:true}).ok,false,'Preview must never activate');
assert.equal(wishes.read(),null);
let rerenders=0;
const root=w.document.getElementById('test');
root.innerHTML=wishes.card({score:5000,day:'sat',now:satStart});
wishes.bind(root,{getNow:()=>satStart,getDay:()=> 'sat',getScore:()=>5000,onChange:()=>rerenders++});
const button=root.querySelector('[data-wishes-activate]');
assert.ok(button,'Activation button appears only after the meeting');
button.click();
assert.equal(rerenders,1);
const record=wishes.read();
assert.ok(record,'Earned prize state must be saved');
assert.equal(record.start,satStart);
assert.equal(record.end,satStart+86_400_000);
assert.equal(wishes.status({score:5000,day:'sat',now:satStart+3600_000}).kind,'active');
assert.equal(wishes.status({score:5000,day:'sat',now:satStart+86_400_000}).kind,'used');
assert.equal(wishes.status({score:5000,day:'sat',now:satStart+86_400_001}).kind,'used');
assert.equal(wishes.redeem({score:5000,day:'sat',now:satStart+86_400_001}).ok,false,'The 24h gift cannot be restarted repeatedly');
assert.deepEqual(JSON.parse(w.localStorage.getItem(wishes.KEY)),record,'State remains saved across route changes');
assert.equal(wishes.status({score:5000,day:'sat',now:satStart,preview:true}).kind,'preview','Host preview must remain read-only');
assert.ok(!wishes.card({score:5000,day:'sun',now:sunStart,preview:true}).includes('data-wishes-activate'));
assert.ok(wishes.card({score:5000,day:'sat',now:satStart+1}).includes('Действуют до'));
w.localStorage.setItem('sd2810-dino-heart-v1',JSON.stringify({best:8076}));
assert.equal(JSON.parse(w.localStorage.getItem('sd2810-dino-heart-v1')).best,8076,'Existing 5k+ high score not altered');
dom.window.close();

console.log('✓ 5000 wishes: activated only after 14/15 Nov date, 24h one-time window, no money/purchases, preview isolated, 15000 separate reward retained');