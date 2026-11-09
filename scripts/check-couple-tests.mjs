// Run: node scripts/check-couple-tests.mjs
// Relationship matching is a conversation starter, not psychometric diagnosis.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const get=path=>fs.readFileSync(path,'utf8');
const coreSrc=get('couple-core.js');
for(const name of ['couple-core.js','daily-couple.js','couple-app.js'])new Function(get(name));
for(const page of ['daily.html','couple.html']){
 const html=get(page),blocks=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 for(const m of blocks)new Function(m[1]);
}
const day1=JSON.parse(get('daily-content/day-9.json'));
assert.equal(day1.title,'Досье на Игоря','First day must remain original');
assert.equal(day1.questions.length,15);
const seen=new Set();
for(let day=10;day<=14;day++){
 const data=JSON.parse(get('daily-content/day-'+day+'.json'));
 assert.equal(data.date,day);
 assert.equal(data.questions.length,15);
 assert.equal(data.kind,'mood');
 for(const q of data.questions){
  assert.equal(q.length,2);assert.equal(q[1].length,3);
  assert.ok(q[0].endsWith('?')||q[0].endsWith('…'));
  assert.ok(!seen.has(q[0]),'Each reflective question should be unique');
  seen.add(q[0]);
 }
}
assert.equal(seen.size,75);
const daily=get('daily.html');
assert.ok(daily.includes('couple-core.js?v=1'));
assert.ok(daily.includes('daily-couple.js?v=1'));
assert.ok(daily.includes("window.DailyCouple.ready(chosen(),state())"));
assert.ok(daily.includes('window.DailyCouple.bind(root,chosen,state);'));
const couple=get('couple.html');
assert.ok(couple.includes('couple-app.js?v=1'));
assert.ok(get('couple-app.js').includes("mode=result?'result':'challenge'"));
assert.ok(get('couple-app.js').includes("const title='Игорь ♡ Лиза — наша любовная проверка'"));

const ctx={};
const C=new Function('window','TextEncoder','TextDecoder','CompressionStream','DecompressionStream','Blob','Response','btoa','atob','location',coreSrc);
C(ctx,TextEncoder,TextDecoder,CompressionStream,DecompressionStream,Blob,Response,btoa,atob,{href:'https://soaringdeath-sduo.github.io/secret-date/daily.html'});
const api=ctx.CoupleTests;
assert.deepEqual([...api.days('sat')],[10,11,12,13]);
assert.deepEqual([...api.days('sun')],[10,11,12,13,14]);
for(const event of ['sat','sun']){
 const lisa={done:{},answers:{}};
 for(const day of api.days(event)){
  const arr=Array.from({length:15},(_,i)=>i%3);
  if(day===10)arr[2]={custom:'Я люблю тебя ♡'};
  lisa.done[day-9]=true;lisa.answers[day-9]=arr;
 }
 assert.throws(()=>api.createChallenge(event,{done:{},answers:{}}));
 const challenge=api.createChallenge(event,lisa);
 assert.equal(challenge.answers[9],undefined);
 const challengeToken=await api.pack(challenge),read=await api.unpack(challengeToken);
 assert.equal(read.type,'challenge');
 assert.equal(read.day,event);
 assert.ok(challengeToken.startsWith('z1.')||challengeToken.startsWith('j1.'));
 assert.equal(read.answers[10][2].custom,'Я люблю тебя ♡');
 const igor={};
 for(const day of api.days(event)){
  igor[day]=read.answers[day].map((x,i)=>i%5===0?2:x);
 }
 const outcome={v:1,type:'result',day:event,answers:read.answers,igor};
 const resultToken=await api.pack(outcome),saved=await api.unpack(resultToken);
 const report=api.compare(saved);
 assert.equal(report.total,api.days(event).length*15);
 assert.ok(report.matched>0&&report.matched<report.total);
 assert.equal(report.chapters.length,api.days(event).length);
 const url=api.urlFor('challenge',challengeToken);
 assert.ok(url.includes('couple.html#challenge='));
 assert.ok(!url.includes('?answers='),'Answers must only appear after # not in a query string');
 const answerSample={...saved,igor:{...saved.igor}};
 answerSample.igor[10]=Array(15).fill({custom:'другое'});
 const mismatch=api.compare(answerSample);
 assert.ok(mismatch.matched<=report.matched);
 console.log('✓ '+event+' event: '+report.total+' questions, fragment share, response comparison');
}
await assert.rejects(()=>api.unpack('bad'),'Invalid link must be rejected');
console.log('✓ 75 subjective questions, day 9 unchanged, sharing and comparisons checked');