// Run: node scripts/check-memory-album.mjs (Node 22, jsdom@26)
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const read=p=>fs.readFileSync(p,'utf8');
const page=read('our-day.html'),poems=JSON.parse(read('poetry-data.json'));
const wait=()=>new Promise(resolve=>setTimeout(resolve,30));
const K={date:'sd2810-selected-day-v1',origin:'sd2810-route-origin-v7',
 ending:'sd2810-secret-ending-v2',route:'sd2810-route-v7',gate:'sd2810-journey-gate-v1',
 memory:'sd2810-final-memory-v1',invite:'sd2810-invite-approved-v3',daily:'sd2810-daily-v1'};
const done=(day='sat',origin='zap',ending='omchino')=>({
 [K.date]:day,[K.origin]:origin,[K.ending]:ending,[K.route]:'13',[K.invite]:'1',
 [K.gate]:JSON.stringify({day,max:13,finalProof:ending}),
 [K.memory]:JSON.stringify({day,origin,ending,done:true}),
 [K.daily]:JSON.stringify({done:{0:true,1:true,2:true,3:true,4:true,5:true}})
});
function environment(markup,url,seed={},evaluate=true){
 const dom=new JSDOM(markup,{url,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let printed=0;
 w.HTMLMediaElement.prototype.pause=function(){};
 w.print=()=>{printed++;};
 w.scrollTo=()=>{};
 w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 w.fetch=async uri=>{
  if(String(uri).includes('poetry-data.json'))return {ok:true,json:async()=>poems};
  return {ok:false};
 };
 for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,String(v));
 w.eval(read('host-full-test.js'));
 if(evaluate)w.eval(read('our-day.js'));
 return {w,dom,doc:w.document,printed:()=>printed};
}
const pageUrl='https://soaringdeath-sduo.github.io/secret-date/our-day.html';
const locked=environment(page,pageUrl);
assert.ok(locked.doc.getElementById('memory-root').textContent.includes('ещё закрыт'));
assert.equal(locked.doc.querySelectorAll('audio').length,0);
locked.dom.window.close();
const early=environment(page,pageUrl,{...done(),[K.route]:'12'});
assert.ok(early.doc.getElementById('memory-root').textContent.includes('ещё закрыт'));
early.dom.window.close();
const wrong=environment(page,pageUrl,{...done(),[K.gate]:JSON.stringify({day:'sat',max:13,finalProof:'thriller'})});
assert.ok(wrong.doc.getElementById('memory-root').textContent.includes('ещё закрыт'));
wrong.dom.window.close();
const imageData='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==';
const good=environment(page,pageUrl,{...done(),
 'sd2810-local-camera-v1:sat:zap:0':imageData,
 'sd2810-zarechny-visit-v1':JSON.stringify({day:'sat',origin:'zap',coffee:'yes',coffeeDone:true})});
await wait();
const root=good.doc.getElementById('memory-root');
assert.ok(root.textContent.includes('Наш день'));
assert.ok(root.textContent.includes('Terrazza'));
assert.equal(root.querySelectorAll('figure.memory-photo').length,3);
assert.equal(root.querySelectorAll('figure.memory-photo img').length,1);
assert.ok(root.querySelector('a[download="igor-liza-1.jpg"]'));
assert.equal(root.querySelectorAll('details.memory-poem').length,5);
assert.equal(root.querySelectorAll('audio').length,7,'2 songs and 5 poems');
const verse=root.querySelector('details.memory-poem');
assert.ok(!verse.open);
good.w.dispatchEvent(new good.w.Event('beforeprint'));
assert.ok(verse.open,'Print version expands verses');
root.querySelector('#memory-print').click();
assert.equal(good.printed(),1);
good.w.dispatchEvent(new good.w.Event('afterprint'));
assert.ok(!verse.open);
good.dom.window.close();
const sunday=environment(page,pageUrl,done('sun','luga','minigame'));
await wait();
assert.equal(sunday.doc.querySelectorAll('details.memory-poem').length,6);
sunday.dom.window.close();
const active={'sd2810-host-v3':'1','sd2810-full-host-test-v1':'1'};
for(const [k,v] of Object.entries(done()))active['sd2810-full-test-data:'+k]=v;
const host=environment(page,pageUrl,active);await wait();
assert.ok(host.doc.getElementById('memory-root').textContent.includes('Наш день'),'Test mode can open its completed album');
host.dom.window.close();
delete active['sd2810-full-test-data:'+K.memory];
const hostBeforeHug=environment(page,pageUrl,active);
assert.ok(hostBeforeHug.doc.getElementById('memory-root').textContent.includes('ещё закрыт'),'Test mode cannot skip hug');
hostBeforeHug.dom.window.close();
console.log('✓ Permanent album: requires full route+matching final hug, even in isolated host test');
console.log('✓ On-device photos, saved PDF printing, 2 songs, 5/6 earned audio poems');

const invite=read('index.html');
function landing(seed){
 const e=environment(invite,'https://soaringdeath-sduo.github.io/secret-date/index.html',seed,false);
 for(const m of invite.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))e.w.eval(m[1]);
 return e;
}
const before=landing({[K.date]:'sat',[K.invite]:'1'});
assert.equal(before.doc.querySelector('#story-resume-link')?.getAttribute('href'),'daily.html');
assert.ok(before.doc.querySelector('#story-resume-link')?.textContent.includes('Продолжить нашу историю'));

before.dom.window.close();
const during=landing({[K.date]:'sat',[K.invite]:'1',[K.route]:'6','sd2810-host-v3':'1'});
assert.equal(during.doc.querySelector('#story-resume-link')?.getAttribute('href'),'secret_date_game_luga.html');
during.dom.window.close();
const after=landing({...done(),'sd2810-host-v3':'1'});
assert.equal(after.doc.querySelector('#story-resume-link')?.getAttribute('href'),'our-day.html');
after.dom.window.close();
const testSeed={'sd2810-host-v3':'1','sd2810-full-host-test-v1':'1',
 ['sd2810-full-test-data:'+K.date]:'sun',
 ['sd2810-full-test-data:'+K.invite]:'1'};
const hostStart=landing(testSeed);
assert.equal(hostStart.doc.querySelector('#story-resume-link')?.getAttribute('href'),'daily.html');
hostStart.dom.window.close();
const game=read('secret_date_game_luga.html');
assert.ok(game.includes('completeMemory()'));
assert.ok(game.includes('href="our-day.html"'));
console.log('✓ Continue: daily chapters before date, GPS in date, memory album after the hug');
