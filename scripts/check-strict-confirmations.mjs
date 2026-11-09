// Regression: ordinary host must obey seals and every mini-page needs a confirmation.
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
 "confirmMini(()=>missionAction(", "confirmMini(()=>parkAction(", "confirmMini(()=>completePrank(",
 "confirmMini(()=>questAction(", "confirmMini(()=>chooseRadioAnswer(", "window.StoryFlow.confirmAdvance(apply,'Открыть следующую главу?')"
 ]) assert.ok(html.includes(part),'Missing mini-step confirmation: '+part);
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

// Real DOM: host cannot move a locked slide; cancel must preserve position.
const dom=new JSDOM('<!doctype html><html><body><main id="app"><p>Экран первый</p><div class="story-break" data-story-label="Вторая тайна"></div><p>Экран второй</p></main></body></html>',
 {url:'https://example.test/secret_date_game_luga.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.SDTest={storage:w.localStorage,active:()=>false};
w.scrollTo=()=>{};
w.eval(flow);
let allowed=false;
const app=w.document.getElementById('app');
w.StoryFlow.mount(app,{stage:4,phase:'main',day:'sat',origin:'zap',host:()=>true,
 allow:()=>allowed,hasNext:()=>false,advance(){}});
const current=()=>Number(w.document.querySelector('.story-current')?.dataset.storyPage);
assert.equal(current(),0);
w.StoryFlow.next();
assert.equal(current(),0,'Host cannot bypass a locked slide');
assert.equal(w.document.querySelector('.story-confirm-overlay'),null,'No confirmation for a forbidden advance');
allowed=true;w.StoryFlow.refresh();
w.StoryFlow.next();
assert.ok(w.document.querySelector('.story-confirm-overlay'),'Allowed transition opens a dialog');
assert.equal(current(),0,'No navigation before confirming');
w.document.querySelector('.story-confirm-cancel').click();
assert.equal(current(),0,'Cancel must leave the player where they were');
w.StoryFlow.next();
w.document.querySelector('.story-confirm-yes').click();
assert.equal(current(),1,'Approve advances exactly one screen');
w.StoryFlow.previous();
assert.equal(current(),0,'Back navigation remains available');
assert.equal(w.document.querySelector('.story-confirm-overlay'),null);
w.StoryFlow.next();
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(current(),0,'Escape dismisses confirmation without advancing');
dom.window.close();
console.log('✓ Host code, prank placement, cancelled and approved mini-page confirmations');