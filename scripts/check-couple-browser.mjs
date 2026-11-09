// Run after "npm install --no-save --no-package-lock jsdom@26"
// Simulates Igor answering everything and Lisa opening the result on another browser.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const page=fs.readFileSync('couple.html','utf8');
const coreScript=fs.readFileSync('couple-core.js','utf8');
const appScript=fs.readFileSync('couple-app.js','utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function browser(fragment,seed={}){
 const dom=new JSDOM(page,{url:'https://soaringdeath-sduo.github.io/secret-date/couple.html'+fragment,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.SDTest={storage:w.localStorage,active:()=>false};
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.CompressionStream=undefined;w.DecompressionStream=undefined; // exercise universal JSON fallback
 w.fetch=async url=>{
  const path=String(url).split('?')[0],json=JSON.parse(fs.readFileSync(path,'utf8'));
  return {ok:true,json:async()=>json};
 };
 for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,v);
 let copied=null;
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>{copied=value}},configurable:true});
 w.eval(coreScript);
 return {dom,w,evalApp:()=>w.eval(appScript),copied:()=>copied};
}
const first=browser('');
const a={done:{},answers:{}};
for(const day of [10,11,12,13]){
 a.done[day-9]=true;
 a.answers[day-9]=Array.from({length:15},(_,i)=>i%3);
}
const core=first.w.CoupleTests;
const payload=core.createChallenge('sat',a);
const token=await core.pack(payload);
first.dom.window.close();
const igor=browser('#challenge='+token);
igor.evalApp();await wait(70);
const root=igor.w.document.getElementById('couple-root');
assert.ok(root.querySelector('#start-couple'),'Igor should see his invitation');
assert.ok(!root.querySelector('.result-num'),'Lisa responses must not display early');
root.querySelector('#start-couple').click();
for(let question=0;question<60;question++){
 const option=root.querySelector('[data-a="1"]');
 assert.ok(option,'missing option at question '+(question+1));
 option.click();
 const next=root.querySelector('#next-answer');
 assert.ok(next,'missing next button at question '+(question+1));
 next.click();
 if((question+1)%15===0){
  const nextChapter=root.querySelector('#next-chapter');
  assert.ok(nextChapter,'missing chapter completion at '+(question+1));
  nextChapter.click();
 }
}
assert.ok(root.querySelector('#copy-result'),'final comparison and share should appear');
assert.ok(root.querySelector('.result-num'),'final result should show an index');
root.querySelector('#copy-result').click();
await wait(75);
const shared=igor.copied();
assert.ok(shared?.includes('#result='),'Igor must be able to send a result back to Lisa');
const savedAnswers=Object.fromEntries(Array.from({length:igor.w.localStorage.length},(_,i)=>{
 const key=igor.w.localStorage.key(i);return [key,igor.w.localStorage.getItem(key)];
}));
const report=browser('#'+shared.split('#')[1]);
report.evalApp();await wait(80);
const resultRoot=report.w.document.getElementById('couple-root');
assert.ok(resultRoot.querySelector('.result-num'),'Result must open on Lisa second device');
assert.ok(resultRoot.querySelectorAll('.chapter-result').length===4,'Result must include all four chapters');
assert.ok(!resultRoot.querySelector('#start-couple'),'Result link must not restart Igor quiz');
report.dom.window.close();
// Returning to an unfinished or finished challenge must not erase stored Igor answers.
const reopened=browser('#challenge='+token,savedAnswers);
reopened.evalApp();await wait(80);
assert.ok(reopened.w.document.querySelector('.result-num'),'Igor should resume the already-finished result');
reopened.dom.window.close();igor.dom.window.close();
console.log('✓ Browser test: Igor completes 60 questions, shares results, Lisa opens comparison');
console.log('✓ Second device and resume work; Lisa answers remain hidden until Igor finishes');