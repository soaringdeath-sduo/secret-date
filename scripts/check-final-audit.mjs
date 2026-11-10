// Final pre-release check of static assets, chronology, rewards and routes.
// No spoiler text or host codes printed.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const read=p=>fs.readFileSync(p,'utf8');
const exists=p=>fs.existsSync(p)&&fs.statSync(p).isFile();
function walk(dir){
 let out=[];
 for(const x of fs.readdirSync(dir,{withFileTypes:true})){
  if(['node_modules','.git'].includes(x.name))continue;
  const p=path.join(dir,x.name);
  if(x.isDirectory())out.push(...walk(p));else out.push(p.replace(/^\.\//,''));
 }
 return out;
}
const files=walk('.'),known=new Set(files),pages=files.filter(x=>x.endsWith('.html'));
const js=files.filter(x=>x.endsWith('.js')),json=files.filter(x=>x.endsWith('.json'));
let compiled=0;
for(const f of [...js,...pages]){
 const code=read(f);
 if(f.endsWith('.js')){new Function(code);compiled++;}
 else for(const item of code.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  if(item[1].trim()){new Function(item[1]);compiled++;}
 }
}
for(const f of json)JSON.parse(read(f));
console.log('✓ Syntax:',compiled,'JavaScript blocks and',json.length,'JSON documents');
const broken=[];
for(const f of pages)for(const m of read(f).matchAll(/<(?:script|link)\b[^>]*?(?:src|href)=(["'])(.*?)\1/gi)){
 const v=m[2].split('?')[0].split('#')[0];
 if(!v||/^([a-z]+:|\/|#|\$)/i.test(v))continue;
 if(!known.has(v))broken.push({page:f,resource:v});
}
assert.deepEqual(broken,[],'All page-linked CSS and JS files must exist');
for(const f of pages){
 const h=read(f);
 assert.match(h,/<meta[^>]+viewport/i,'Missing mobile viewport: '+f);
 assert.match(h,/<meta[^>]+charset=["']?utf-8/i,'Missing UTF-8: '+f);
}
const invite=read('index.html'),daily=read('daily.html'),route=read('secret_date_game_luga.html');
assert.ok(invite.includes('name="robots" content="noindex'));
assert.ok(!invite.includes('Персональное приглашение для Бекетовой Елизаветы Васильевны'));
console.log('✓ All internal JS/CSS links, page metadata and mobile viewports');
let questions=[];
for(let day=9;day<=14;day++){
 const entry=JSON.parse(read('daily-content/day-'+day+'.json'));
 assert.equal(entry.date,day);
 assert.equal(entry.questions.length,15);
 for(const q of entry.questions){
  assert.ok(q[0]?.trim()&&Array.isArray(q[1])&&q[1].length>=2);
  assert.ok(!questions.includes(q[0]),'Duplicate question: '+day);
  questions.push(q[0]);
 }
}
assert.equal(questions.length,90);
const poems=JSON.parse(read('poetry-data.json'));
assert.deepEqual(poems.map(x=>x.day),[9,10,11,12,13,14]);
function mp3(p){
 assert.ok(exists(p),'Missing audio: '+p);
 const b=fs.readFileSync(p);
 assert.ok(b.length>100000,'Truncated audio: '+p);
 assert.ok(b.subarray(0,3).toString()==='ID3'||b[0]===255&&(b[1]&224)===224,'Bad MP3 header: '+p);
}
for(let d=9;d<=14;d++)mp3('assets/poem-day-'+String(d).padStart(2,'0')+'.mp3');
for(const f of ['assets/poem-day-9.mp3','assets/radio-zap-v2.mp3','assets/radio-luga-v2.mp3','assets/taina-dlya-dvoikh.mp3','assets/ya-by-snova-vybral-tebya.mp3'])mp3(f);
console.log('✓ Six fully populated episodes, 90 unique questions, all MP3 recordings');
for(const d of [14,15]){
 const value='Date.UTC(2026,10,'+d+',8,30,0)';
 assert.ok(invite.includes(value)&&route.includes(value),'Mismatched 11:30 Moscow start: '+d);
}
assert.ok(daily.includes('Date.UTC(2026,10,DAYS[i],6,0,0)'));
assert.ok(daily.includes('Date.UTC(2026,10,DAYS[i],21,0,0)'));
const dino=read('daily-dino.js'),wishes=read('daily-dino-wishes.js'),cert=read('daily-dino-certificate.js');
assert.ok(dino.includes('TURBO_AT=8000,PREMIUM_AT=10000'));
assert.ok(dino.includes('at:2000')&&dino.includes('at:5000'));
assert.ok(!dino.includes('dino-turbo-toast')&&!dino.includes('announceTurbo('));
assert.ok(wishes.includes('PURCHASE_LIMIT=1000'));
assert.ok(wishes.includes('Date.UTC(2026,10,14,21)')&&wishes.includes('Date.UTC(2026,10,15,21)'));
assert.ok(cert.includes('THRESHOLD=10000')&&cert.includes("expires:'31.12.2026'"));
console.log('✓ Dates/timezone, no Dino overlay, 8k/10k difficulty and all gift rules');
const opts=route.match(/const ENDINGS=(\{[\s\S]*?\});\s*const OPT_IDS=/);
assert.ok(opts,'Missing finale options registry');
const ends=new Function('return ('+opts[1]+')')();
const cfg=JSON.parse(read('finales-config.json'));
const fallback=Number(route.match(/const DEFAULT_MASK=(0x[0-9a-f]+|\d+);/i)?.[1]);
assert.equal(Object.keys(ends).length,9);
assert.equal(cfg.mask,511);
assert.equal(fallback,cfg.mask,'Offline fallback must offer same endings as published config');
assert.ok(route.includes("const ENVELOPE_IDS=['prank-end','park','letter','lunch','final']"));
assert.ok(route.includes('!canStart()||!validStep(stage,to,proof)'));
assert.ok(read('story-flow.js').includes('config.allow(position)'));
console.log('✓ Nine finale options, offline configuration and five protected chapter seals');
const secrets=read('daily-secrets.js');
assert.ok(new JSDOM(read('secret-heart-puzzle.svg'),{contentType:'image/svg+xml'}).window.document.querySelector('svg'));
for(const slug of ['#secret-files','#cupid','#puzzle','#future-letter','#scratch'])assert.ok(daily.includes(slug));
assert.ok(secrets.includes('storage=window.SDTest.storage'));
assert.ok(daily.includes('const localStorage=window.SDTest.storage;'));
assert.ok(route.includes('const localStorage=window.SDTest.storage;'));
assert.ok(daily.includes('window.DailyDinoWishes.bind(root'));
assert.ok(daily.includes('window.DailyDinoCertificate.bind(root'));
console.log('✓ Secret dossier, optional image and isolated host storage');
const ci=read('.github/workflows/check-full-host-test.yml');
for(const f of files.filter(x=>/^scripts\/check-[\w-]+\.mjs$/.test(x))){
 assert.ok(ci.includes('node '+f),'Unexecuted regression in CI: '+f);
}
console.log('FINAL PRE-RELEASE AUDIT PASSED');