// Regression: invitation one-tap resume + existing finale keepsake extensions.
// Run: node scripts/check-resume-memory.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
function boot(values={},clock=Date.UTC(2026,10,9,15,0,0),url='https://soaringdeath-sduo.github.io/secret-date/index.html'){
 const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.scrollTo=()=>{};
 w.alert=()=>{};
 w.confirm=()=>true;
 w.requestAnimationFrame=cb=>{cb(0);return 1;};
 w.Date.now=()=>clock;
 for(const [k,v] of Object.entries(values))w.localStorage.setItem(k,String(v));
 w.eval(read('host-full-test.js'));
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))w.eval(match[1]);
 return {dom,w,root:w.document.getElementById('card'),close(){dom.window.close()}};
}
const base={'sd2810-selected-day-v1':'sat','sd2810-invite-approved-v3':'1'};
{
 const x=boot(base);
 const link=x.root.querySelector('#story-resume-link');
 assert.ok(link,'Final invitation must have prominent resume link');
 assert.ok(link.href.endsWith('/daily.html'),'Before the date it must not reveal locked GPS route');
 assert.ok(link.textContent.includes('Продолжить нашу историю'));
 x.close();
}
{
 const state={version:2,done:{0:true},answers:{1:[1,0]}};
 const x=boot({...base,'sd2810-daily-v1':JSON.stringify(state)});
 const link=x.root.querySelector('#story-resume-link');
 assert.ok(link.textContent.includes('Продолжить мой дэйлик'),'Saved unfinished questions should have an understandable CTA');
 assert.ok(link.href.endsWith('/daily.html'));
 x.close();
}
{
 const x=boot({...base,'sd2810-route-v7':'6'},Date.UTC(2026,10,14,9,0,0));
 const link=x.root.querySelector('#story-resume-link');
 assert.ok(link.textContent.includes('Продолжить наше свидание'));
 assert.ok(link.href.endsWith('/secret_date_game_luga.html'),'Stage 6 must resume actual route');
 x.close();
}
{
 const x=boot({...base,'sd2810-route-v7':'13'},Date.UTC(2026,10,14,9,0,0));
 const link=x.root.querySelector('#story-resume-link');
 assert.ok(link.textContent.includes('Вернуться к нашему финалу'));
 assert.ok(link.href.endsWith('/secret_date_game_luga.html'));
 x.close();
}
{
 const x=boot({
  ...base,
  'sd2810-zarechny-visit-v1':JSON.stringify({day:'sat',arrived:true,together:true,coffee:'yes',coffeeDone:true})
 },Date.UTC(2026,10,9,15,0,0),'https://soaringdeath-sduo.github.io/secret-date/index.html?replay=1');
 x.root.querySelector('#start').click();
 for(let i=0;i<5;i++)x.root.querySelector('#yes').click();
 const form=x.root.querySelector('#secret-form');
 assert.ok(form,'Invitation password must render');
 x.root.querySelector('#secret').value='28.10';
 form.dispatchEvent(new x.w.Event('submit',{cancelable:true,bubbles:true}));
 const sun=x.root.querySelector('#choose-sun');
 assert.ok(sun,'A different date must remain selectable');
 sun.click();
 assert.equal(x.w.localStorage.getItem('sd2810-selected-day-v1'),'sun');
 assert.equal(x.w.localStorage.getItem('sd2810-zarechny-visit-v1'),null,
  'Changing date must clear a completed park visit from the previous date');
 x.close();
}
const quest=read('secret_date_game_luga.html');
const a=quest.indexOf('function albumPhotoDownloadHTML(){'),b=quest.indexOf('function photoCertificateHTML(){',a);
assert.ok(a>=0&&b>a,'Individual photo export helper must exist');
const setup=new Function('getPhoto','PHOTO_NAMES','escapeText','document',
 quest.slice(a,b)+'\nreturn {albumPhotoDownloadHTML,saveAlbumPhoto};');
const names=['Красивый кадр','Смешной кадр','Мы вместе'];
{
 const dom=new JSDOM('<!doctype html><body><p id="album-download-status"></p></body>',{url:'https://test.invalid/'});
 const api=setup(()=>null,names,x=>x,dom.window.document);
 assert.ok(api.albumPhotoDownloadHTML().includes('пока не сохранены'),'No-photo final should have helpful explanation');
 dom.window.close();
}
{
 const dom=new JSDOM('<!doctype html><body><p id="album-download-status"></p></body>',{url:'https://test.invalid/'});
 const clicked=[];
 const click=dom.window.HTMLAnchorElement.prototype.click;
 dom.window.HTMLAnchorElement.prototype.click=function(){clicked.push({href:this.href,name:this.download})};
 const getPhoto=i=>i===0||i===2?'data:image/jpeg;base64,AAAA':null;
 const api=setup(getPhoto,names,x=>x,dom.window.document);
 const markup=api.albumPhotoDownloadHTML();
 assert.ok(markup.includes('data-album-save-photo="0"')&&markup.includes('data-album-save-photo="2"'));
 assert.ok(!markup.includes('data-album-save-photo="1"'),'Missing photos must not get dead download buttons');
 api.saveAlbumPhoto(0);
 assert.equal(clicked.length,1);
 assert.equal(clicked[0].name,'Operatsiya_28_10_photo_1.jpg');
 assert.ok(dom.window.document.querySelector('#album-download-status').textContent.includes('готова'));
 dom.window.HTMLAnchorElement.prototype.click=click;
 dom.window.close();
}
assert.ok(quest.includes("href=\"daily.html#daily-poetry-library\""),'Poetry must be linked from final album');
assert.ok(quest.includes('id="album-open-soundtrack"'),'Soundtrack must have actual action button');
assert.ok(quest.includes("window.SecretSoundtrack?.openLibrary()"),'Soundtrack button must open existing player');
assert.ok(quest.includes('id="certificate-download"'),'Old PNG certificate must be preserved');
console.log('✓ Direct resume across unopened, saved daily, in-progress route and finale');
console.log('✓ Date changes reset park visit without losing other progress');
console.log('✓ Final album links poems/music and downloads individual saved photos');
