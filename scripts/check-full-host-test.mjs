// Run with: node scripts/check-full-host-test.mjs
// Regression safety net for the host-only full journey, across future releases.
import fs from 'node:fs';
import assert from 'node:assert/strict';

function text(file){return fs.readFileSync(file,'utf8');}
function has(source,part,label){assert.ok(source.includes(part),label);}
const index=text('index.html'),daily=text('daily.html'),quest=text('secret_date_game_luga.html');
const helper=text('host-full-test.js'),flow=text('story-flow.js'),music=text('soundtrack.js');
for(const [name,code] of [['host-full-test.js',helper],['story-flow.js',flow],['soundtrack.js',music]]){
 new Function(code);console.log('✓ JS:',name);
}
for(const [name,code] of [['index.html',index],['daily.html',daily],['secret_date_game_luga.html',quest]]){
 const scripts=[...code.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0,name+': missing inline scripts');
 for(const m of scripts)new Function(m[1]);
 has(code,'host-full-test.js?v=1',name+': full test loader');
 has(code,'const localStorage=window.SDTest.storage;',name+': storage isolation');
 console.log('✓ Inline scripts and isolation:',name);
}
has(index,"8 — ПОЛНЫЙ ПРОХОД С НУЛЯ",'Invitation must offer full host test');
has(index,"window.SDTest.start();",'Start must clear prior test progress');
has(index,"sd-full-daily-next",'Invitation must link to daily test');
has(daily,"const available=i=>window.SDTest.active()",'Daily chapter clock must not block host test');
has(daily,"const numberOfDays=()=>window.SDTest.active()",'Host must see all 6 days');
has(daily,"openDay(i+1,false)",'Daily test should advance from episode to episode');
has(daily,"window.SDTest.navTo('secret_date_game_luga.html')",'After all questions the test must reach route');
has(quest,"if(!isHost()||window.SDTest.active())",'Real route step validation must apply to full host test');
has(quest,"if(isHost()&&!window.SDTest.active())return true",'Host full test must not bypass gesture/task gates');
has(quest,"🔧 Подтвердить прибытие без GPS",'Mock GPS should be available for host');
has(quest,"revealFirst(isHost()&&!window.SDTest.active())",'First soundtrack unlock should be isolated');
has(quest,"revealFinal(isHost()&&!window.SDTest.active())",'Final soundtrack unlock should be isolated');
has(quest,"window.SDTest.active()||!!(getMask()&(1<<i))",'Hosts should be able to test all final options');
has(flow,"const localStorage=window.SDTest.storage;",'Swipe progress should be isolated');
has(music,"const localStorage=window.SDTest.storage;",'Song unlocks should be isolated');
for(let day=9;day<=14;day++){
 const data=JSON.parse(text('daily-content/day-'+day+'.json'));
 assert.equal(data.questions.length,15,'day '+day+': exactly 15 questions required');
}
console.log('✓ Six daily episodes: 90 questions');
const stored=new Map([
 ['sd2810-daily-v1','REAL-ANSWERS'],
 ['sd2810-route-v7','REAL-STAGE']
]);
const native={
 get length(){return stored.size},
 key(i){return [...stored.keys()][i]??null},
 getItem(key){return stored.get(key)??null},
 setItem(key,val){stored.set(key,String(val))},
 removeItem(key){stored.delete(key)}
};
const doc={readyState:'loading',addEventListener(){}};
const win={localStorage:native,location:{assign(path){this.last=path}},confirm:()=>true};
new Function('window','document',helper)(win,doc);
const t=win.SDTest;
assert.equal(t.active(),false);
t.start();
assert.equal(win.location.last,'index.html?replay=1');
assert.equal(t.active(),true);
assert.equal(t.storage.getItem('sd2810-daily-v1'),null);
t.storage.setItem('sd2810-daily-v1','TEST-ANSWERS');
t.storage.setItem('sd2810-route-v7','TEST-STAGE');
assert.equal(stored.get('sd2810-daily-v1'),'REAL-ANSWERS');
assert.equal(stored.get('sd2810-route-v7'),'REAL-STAGE');
t.start();
assert.equal(t.storage.getItem('sd2810-daily-v1'),null);
t.stop();
assert.equal(t.active(),false);
assert.equal(stored.get('sd2810-daily-v1'),'REAL-ANSWERS');
assert.equal(stored.get('sd2810-route-v7'),'REAL-STAGE');
console.log('✓ Isolated storage; test restart and exit preserve real data');
console.log('All host full walkthrough checks passed.');
