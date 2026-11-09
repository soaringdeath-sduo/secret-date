// Regression: ordinary host respects seals; only story reveals need confirmation and chapter navigation has no duplicates.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const html=fs.readFileSync('secret_date_game_luga.html','utf8');
const flow=fs.readFileSync('story-flow.js','utf8');
const css=fs.readFileSync('story-flow.css','utf8');

assert.ok(html.includes("const ENVELOPE_IDS=['prank-end','park','letter','lunch','final'];"),'New prank-ending envelope must have an independent ID');
assert.ok(!html.includes("envelopeHTML('chocolate'"),'Chocolate ticket must not have the sealed envelope');
const joke=html.slice(html.indexOf(' case 4:return'),html.indexOf(' case 5:if(!missionReady'));
assert.ok(joke.includes("envelopeHTML('prank-end'"),'Seal must be after the fake ending and receipt');
assert.ok(joke.includes("envelopeReady('prank-end')?btn("),'Prank continuation must require the seal');
assert.ok(html.includes("(from!==4||envelopeReady('prank-end'))"),'Route validation must enforce prank seal');
assert.ok(!html.includes("if(window.SDTest.active()||isHost()){parkAction('arrive','gps');"),'Normal host must not fake GPS');
assert.ok(html.includes("if(!canStart()||!validStep(stage,to,proof))return;"),'Host may not skip normal route validation');
assert.ok(!flow.includes("if(config.host()&&!window.SDTest.active())return true"),'Host may not skip swipe gates');
assert.ok(!html.includes("if(isHost()&&!window.SDTest.active())return true;\n if(stage===1)"),'Host may not skip radio and photo checks');
for(const part of [
 "confirmMini(()=>missionAction(", "confirmMini(()=>completePrank(", "confirmMini(()=>questAction(",
 "const importantChapter=[2,3,5,7].includes(stage);",
 "el.addEventListener('click',()=>parkAction(el.dataset.parkAction))",
 "el.addEventListener('click',()=>chooseRadioAnswer('yes'))"
 ]) assert.ok(html.includes(part),'Missing selective confirmation rule: '+part);
assert.ok(flow.includes("last?'Перейти к следующей главе →':'Далее →'"),'Last page must say next chapter');
assert.ok(flow.includes("duplicate.hidden=last&&hasNext"),'The legacy forward button must not duplicate navigation');
assert.ok(css.includes("#lunch-go[hidden]"),'Hidden legacy chapter buttons must not be displayed');
assert.ok(flow.includes('confirmAdvance(')&&css.includes('.story-confirm-overlay'),'Confirmation dialog must be present and styled');

// Exercise the actual envelope helper with an ordinary host context.
const start=html.indexOf("const ENVELOPE_KEY='sd2810-sealed-envelopes-v1';");
const stop=html.indexOf("const invited=()=>",start);
assert.ok(start>0&&stop>start,'Expected envelope helper boundaries');
const fragment=html.slice(start,stop);
const data=new Map([['day','sat'],['ending','omchino']]);
const storage={
 getItem:k=>data.get(k)??null,
 setItem:(k,v)=>data.set(k,String(v)),
 removeItem:k=>data.delete(k)
};
const win={SDTest:{active:()=>false}};
const api=new Function('localStorage','window','origin','DATE_KEY','END_KEY','SETTINGS','canStart',
 fragment+'\nreturn {envelopeReady,approveEnvelope,finalArrived};'
)(storage,win,'zap','day','ending',{helpCode:'2114-2810'},()=>true);
assert.equal(api.envelopeReady('prank-end'),false,'Fresh prank must be locked');
assert.equal(api.approveEnvelope('prank-end',''),false,'Ordinary host must enter a code');
assert.equal(api.approveEnvelope('prank-end','wrong'),false,'Bad code must be rejected');
assert.equal(api.envelopeReady('prank-end'),false,'Denied attempts cannot open seal');
assert.equal(api.approveEnvelope('prank-end','2114-2810'),true,'Correct code unlocks the seal');
assert.equal(api.envelopeReady('prank-end'),true);
assert.equal(api.envelopeReady('final'),false,'Prank code approval must not unlock finale');
assert.equal(api.approveEnvelope('final','2114-2810'),true);
assert.equal(api.envelopeReady('final'),true);
data.set('ending','toloni');
assert.equal(api.envelopeReady('final'),false,'Another finale has a separate seal');
data.set('day','sun');
assert.equal(api.envelopeReady('prank-end'),false,'Another date has a separate seal');

// DOM: a minor intervening page needs no confirmation.
const dom=new JSDOM('<!doctype html><html><body><main id="app"><p>Экран первый</p><div class="story-break" data-story-label="Вторая тайна"></div><p>Экран второй</p></main></body></html>',
 {url:'https://example.test/secret_date_game_luga.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.SDTest={storage:w.localStorage,active:()=>false};
w.scrollTo=()=>{};
w.eval(flow);
let allowed=false;
const app=w.document.getElementById('app');
const current=()=>Number(w.document.querySelector('.story-current')?.dataset.storyPage);
w.StoryFlow.mount(app,{stage:4,phase:'main',day:'sat',origin:'zap',host:()=>true,
 allow:()=>allowed,hasNext:()=>false,advance(){}});
assert.equal(current(),0);
w.StoryFlow.next();
assert.equal(current(),0,'Host cannot bypass a locked slide');
assert.equal(w.document.querySelector('.story-confirm-overlay'),null,'No confirmation for a forbidden advance');
allowed=true;w.StoryFlow.refresh();
w.StoryFlow.next();
assert.equal(current(),1,'A minor receipt screen opens directly');
assert.equal(w.document.querySelector('.story-confirm-overlay'),null,'Minor screen has no redundant confirmation');
w.StoryFlow.previous();
assert.equal(current(),0,'Returning to a completed slide is still free');

// Stage 3 contains an important reveal: cancel, confirm and escape each work.
app.innerHTML='<p>Наш первый момент</p><div class="story-break"></div><p>Тайный эконом-пакет</p><button id="go" type="button">Старая кнопка</button>';
let advanced=0;
w.StoryFlow.mount(app,{stage:3,phase:'main',day:'sat',origin:'zap',host:()=>true,
 allow:()=>true,hasNext:()=>true,advance(){advanced++}});
assert.equal(current(),0);
w.StoryFlow.next();
assert.ok(w.document.querySelector('.story-confirm-overlay'),'Important reveal must ask first');
assert.equal(current(),0,'Reveal remains hidden until confirmed');
w.document.querySelector('.story-confirm-cancel').click();
assert.equal(current(),0,'Cancel does not reveal content');
w.StoryFlow.next();
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(current(),0,'Escape cancels the reveal');
w.StoryFlow.next();
w.document.querySelector('.story-confirm-yes').click();
assert.equal(current(),1,'Approval reveals exactly one screen');
const nav=w.document.querySelector('.story-nav-next');
const legacy=w.document.querySelector('#go');
assert.ok(legacy.hidden,'Old in-chapter next button is hidden');
assert.equal(nav.textContent,'Перейти к следующей главе →','Only the story navigator shows next chapter');
assert.equal(nav.hidden,false);
nav.click();
assert.equal(advanced,1,'Single visible next-chapter action runs once');
assert.equal(w.document.querySelector('.story-confirm-overlay'),null,'Navigator does not add an unnecessary dialog here');

dom.window.close();
console.log('✓ Host seal checks, selective reveal confirmation and one next-chapter control');
