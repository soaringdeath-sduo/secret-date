// A4 PDF/PNG personalized earned coupon; normal claim needs 15k and preview is watermarked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const js=fs.readFileSync('daily-dino-certificate.js','utf8');
const daily=fs.readFileSync('daily.html','utf8'),arcade=fs.readFileSync('daily-dino.js','utf8');
const styles=fs.readFileSync('daily-play.css','utf8');
new Function(js);new Function(arcade);
assert.ok(daily.includes('daily-dino-certificate.js?v=1'),'Daily page must load the certificate generator');
assert.ok(daily.includes('dinoGiftHomeCard()'),'Already-earned certificate must be accessible after arcade dates');
assert.ok(styles.includes('.dino-certificate-amount')&&styles.includes('.dino-home-claimed'),'Romantic certificate and claimed gift shelf must be styled');
const dom=new JSDOM('<!doctype html><html lang="ru"><body><main id="host"></main></body></html>',{
 url:'https://soaringdeath-sduo.github.io/secret-date/daily.html',runScripts:'outside-only',pretendToBeVisual:true
});
const w=dom.window;
w.alert=message=>{throw Error('Certificate download error: '+message)};
w.eval(js);
const gift=w.DailyDinoCertificate;
assert.equal(gift.THRESHOLD,15000);
assert.equal(gift.DETAIL.expires,'31.12.2026');
assert.equal(gift.DETAIL.amount,'5 000 ₽');
assert.ok(gift.certificateControls().includes('Магнит Косметик'));
assert.ok(gift.certificateControls().includes('Лиза выбирает'));
assert.ok(gift.certificateControls().includes('не официальный сертификат'));
assert.ok(gift.certificateControls(true).includes('ОБРАЗЕЦ ДЛЯ ВЕДУЩЕГО'));

const lines=[],ctx={
 fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},
 roundRect(){},save(){},restore(){},translate(){},rotate(){},fillText(t){lines.push(t)},
 createLinearGradient(){return {addColorStop(){}}}
};
w.HTMLCanvasElement.prototype.getContext=()=>ctx;
const picture=gift.makeCanvas(false);
assert.equal(picture.width,1600);assert.equal(picture.height,1132);
for(const expected of ['День красоты','Магнит Косметик','5 000 ₽','ДЕЙСТВУЕТ ДО 31.12.2026','Не является подарочной картой']){
 assert.ok(lines.some(t=>t.includes(expected)),'Missing crucial certificate text: '+expected);
}
lines.length=0;gift.makeCanvas(true);
assert.ok(lines.some(t=>t.includes('ТЕСТОВЫЙ ОБРАЗЕЦ')),'Host preview download must visibly mark itself as a test');

const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0,0,1,2,3,0xff,0xd9]).toString('base64');
const pdf=gift.jpegToPDF('data:image/jpeg;base64,'+jpeg);
const raw=Buffer.from(pdf).toString('latin1');
assert.ok(raw.startsWith('%PDF-1.4\n'));
assert.ok(raw.includes('/Type /Catalog')&&raw.includes('/Subtype /Image')&&raw.includes('/MediaBox [0 0 842 595]'));
assert.ok(raw.includes('/Length 10'));
assert.ok(raw.endsWith('%%EOF'));
const pos=Number(raw.match(/startxref\n(\d+)\n%%EOF$/)?.[1]);
assert.ok(pos>100&&raw.slice(pos,pos+4)==='xref','PDF cross-reference bytes should be correctly positioned');
const anchorEvents=[];let storedBlob=null;
w.HTMLAnchorElement.prototype.click=function(){anchorEvents.push({href:this.href,download:this.download})};
w.URL.createObjectURL=blob=>{storedBlob=blob;return 'blob:https://example.test/certificate'};
w.URL.revokeObjectURL=()=>{};
w.HTMLCanvasElement.prototype.toDataURL=kind=>kind==='image/png'?'data:image/png;base64,aGVsbG8=':'data:image/jpeg;base64,'+jpeg;
assert.equal(gift.download('pdf',{unlocked:()=>false}),false,'Cannot download a reward before earning it');
assert.equal(anchorEvents.length,0);
assert.equal(gift.download('pdf',{unlocked:()=>true}),true);
assert.ok(anchorEvents[0].download.endsWith('.pdf'));
assert.equal(storedBlob.type,'application/pdf');
assert.equal(gift.download('png',{unlocked:()=>true}),true);
assert.ok(anchorEvents[1].download.endsWith('.png'));
assert.ok(anchorEvents[1].href.startsWith('data:image/png'));
lines.length=0;
assert.equal(gift.download('pdf',{preview:true}),true);
assert.ok(lines.some(t=>t.includes('ТЕСТОВЫЙ ОБРАЗЕЦ')),'Previewed file must be visually watermarked');
const host=w.document.querySelector('#host');
host.innerHTML=gift.certificateControls();
gift.bind(host,{unlocked:()=>false});
host.querySelector('[data-dino-certificate="pdf"]').click();
assert.equal(anchorEvents.length,3,'Claim buttons must not work if not earned');
dom.window.close();
console.log('✓ 15k personal gift: beautiful A4 certificate, exact 2026 expiry, non-store-issuer disclaimer, valid PDF/PNG downloads, secure unlock, preview watermark');