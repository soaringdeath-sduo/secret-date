/* A private gift from Igor to Lisa, NOT a gift card issued by Magnit Kosmetik.
 * Export as a fully offline-built A4 landscape PDF or PNG; no external libraries. */
(function(){
 'use strict';
 const THRESHOLD=10000;
 const DETAIL={
  shop:'Магнит Косметик',amount:'5 000 ₽',
  recipient:'Лиза',issuer:'Игорь',expires:'31.12.2026'
 };
 function previewHTML(preview=false){
  return '<section class="dino-certificate" aria-label="Личный сертификат на покупки в Магнит Косметик">'+
   '<div class="dino-certificate-top"><span>✦ ОПЕРАЦИЯ 28.10 ✦</span><span>ПОДАРОК ДЛЯ ЛИЗЫ</span></div>'+
   '<div class="dino-certificate-stars" aria-hidden="true">✦ · ♡ · ✦</div>'+
   '<div class="dino-certificate-eyebrow">ЛИЧНЫЙ ПОДАРОЧНЫЙ СЕРТИФИКАТ</div>'+
   '<h3>День красоты</h3>'+
   '<div class="dino-certificate-store">Поход в «Магнит Косметик»</div>'+
   '<div class="dino-certificate-caption">БЮДЖЕТ НА ПОКУПКИ</div>'+
   '<div class="dino-certificate-amount">5 000 <span>₽</span></div>'+
   '<p>Лиза выбирает, Игорь оплачивает покупки — до 5 000 рублей за один совместный поход ♡</p>'+
   '<div class="dino-certificate-bottom"><span>ДЛЯ ЛИЗЫ · ОТ ИГОРЯ</span><span>ДО 31.12.2026</span></div>'+
   '<p class="dino-certificate-disclaimer">Это личный подарок Игоря, а не подарочная карта магазина.</p>'+
   (preview?'<div class="dino-certificate-preview">ОБРАЗЕЦ ДЛЯ ВЕДУЩЕГО</div>':'')+
   '</section>';
 }
 function certificateControls(preview=false){
  return '<div class="dino-certificate-unlocked"><div class="dino-certificate-celebrate">✨ Легендарный подарок открыт! ✨</div>'+
   previewHTML(preview)+
   '<div class="dino-certificate-downloads">'+
   '<button type="button" class="btn dino-download-pdf" data-dino-certificate="pdf">📄 Скачать сертификат PDF</button>'+
   '<button type="button" class="btn alt dino-download-png" data-dino-certificate="png">🖼️ Скачать как картинку</button>'+
   '</div><p class="day-status-note">Действителен до 31 декабря 2026 года включительно. Покажи сертификат Игорю и выберите удобный день. Это личное обещание оплатить покупки, не официальный сертификат торговой сети.</p>'+
   '</div>';
 }
 function makeCanvas(preview=false){
  const canvas=document.createElement('canvas');
  canvas.width=1600;canvas.height=1132;
  const c=canvas.getContext('2d');
  if(!c)throw new Error('Браузер не поддерживает создание сертификата.');
  const W=1600,H=1132;
  const bg=c.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'#fffaf3');bg.addColorStop(.48,'#ffeaf0');bg.addColorStop(1,'#f0dce9');
  c.fillStyle=bg;c.fillRect(0,0,W,H);
  // Paper ornaments and generous foil edging. All content sits inside safe A4 crop.
  c.save();
  c.globalAlpha=.18;
  for(let i=0;i<17;i++){
   const x=125+(i*137)%1350,y=110+(i*211)%900;
   c.beginPath();c.arc(x,y,4+(i%4)*2,0,Math.PI*2);
   c.fillStyle=i%3===0?'#bf6891':'#b69657';c.fill();
  }
  c.globalAlpha=1;c.restore();
  c.strokeStyle='#b99463';c.lineWidth=6;c.strokeRect(35,35,W-70,H-70);
  c.strokeStyle='#e0b8ba';c.lineWidth=2;c.strokeRect(52,52,W-104,H-104);
  // Large soft gradient wash on the upper banner.
  const top=c.createLinearGradient(0,0,W,0);
  top.addColorStop(0,'#783f60');top.addColorStop(.55,'#a4527c');top.addColorStop(1,'#7b3c61');
  c.fillStyle=top;c.fillRect(61,61,W-122,173);
  c.fillStyle='#ffe8cf';c.textAlign='center';c.textBaseline='middle';
  c.font='700 25px Arial,sans-serif';c.fillText('✦   О П Е Р А Ц И Я   2 8 . 1 0   ✦',W/2,116);
  c.font='italic 51px Georgia,serif';c.fillText('Подарок специально для Лизы',W/2,178);
  // Gold star separators.
  c.strokeStyle='#c29b5b';c.lineWidth=2;
  c.beginPath();c.moveTo(200,295);c.lineTo(620,295);c.moveTo(980,295);c.lineTo(1400,295);c.stroke();
  c.fillStyle='#aa7e58';c.font='40px Georgia,serif';c.fillText('✦  ♡  ✦',W/2,297);
  c.fillStyle='#8d5672';c.font='700 27px Arial,sans-serif';c.fillText('Л И Ч Н Ы Й   П О Д А Р О Ч Н Ы Й   С Е Р Т И Ф И К А Т',W/2,365);
  c.fillStyle='#713953';c.font='italic 103px Georgia,serif';c.fillText('День красоты',W/2,475);
  c.font='39px Arial,sans-serif';c.fillStyle='#995c78';c.fillText('Совместный поход в «Магнит Косметик»',W/2,552);
  // Central budget award panel.
  const plaque=c.createLinearGradient(450,601,1140,807);
  plaque.addColorStop(0,'#fff9ed');plaque.addColorStop(.5,'#fff3da');plaque.addColorStop(1,'#e9cba1');
  c.beginPath();c.roundRect(416,602,768,208,28);
  c.fillStyle=plaque;c.fill();c.lineWidth=3;c.strokeStyle='#bf9560';c.stroke();
  c.fillStyle='#875c69';c.font='700 25px Arial,sans-serif';c.fillText('ЛИМИТ ПОКУПОК',W/2,646);
  c.font='bold 113px Georgia,serif';c.fillStyle='#6f324e';c.fillText('5 000 ₽',W/2,732);
  c.font='29px Arial,sans-serif';c.fillStyle='#79516a';
  c.fillText('Лиза выбирает, Игорь оплачивает покупки',W/2,857);
  c.fillText('в пределах 5 000 рублей за один совместный поход ♡',W/2,899);
  c.strokeStyle='#cfacaa';c.lineWidth=2;c.beginPath();c.moveTo(150,945);c.lineTo(1450,945);c.stroke();
  c.textAlign='left';c.fillStyle='#75405e';c.font='bold 25px Arial,sans-serif';c.fillText('ОТ ИГОРЯ · ДЛЯ ЛИЗЫ',150,991);
  c.textAlign='right';c.fillText('ДЕЙСТВУЕТ ДО 31.12.2026',1450,991);
  c.textAlign='center';c.font='20px Arial,sans-serif';c.fillStyle='#8d6579';
  c.fillText('Личное обещание Игоря. Не является подарочной картой или сертификатом сети «Магнит Косметик».',W/2,1036);
  c.font='italic 18px Georgia,serif';c.fillStyle='#b07a86';c.fillText('Разблокировано за 10 000 очков в игре «Динолюбик»',W/2,1076);
  if(preview){
   c.save();c.translate(W/2,H/2);c.rotate(-.28);
   c.globalAlpha=.58;c.fillStyle='#a95474';c.font='bold 65px Arial,sans-serif';
   c.fillText('ТЕСТОВЫЙ ОБРАЗЕЦ · НЕ ЯВЛЯЕТСЯ ПРИЗОМ',0,0);
   c.restore();
  }
  return canvas;
 }
 // Straightforward one-page PDF: canvas artwork is embedded as a high-quality
 // JPEG image. Cyrillic never relies on PDF platform fonts.
 function jpegToPDF(dataURL){
  if(typeof dataURL!=='string'||!dataURL.startsWith('data:image/jpeg;base64,'))throw new Error('Изображение сертификата недоступно.');
  const encoded=dataURL.slice('data:image/jpeg;base64,'.length);
  const binary=atob(encoded),jpeg=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)jpeg[i]=binary.charCodeAt(i);
  const chunks=[];let size=0;const offs=[0],encoder=new TextEncoder();
  const addBytes=bytes=>{chunks.push(bytes);size+=bytes.length;};
  const add=s=>addBytes(encoder.encode(s));
  const begin=n=>{offs[n]=size;add(n+' 0 obj\n');};
  const end=()=>add('\nendobj\n');
  add('%PDF-1.4\n');
  begin(1);add('<< /Type /Catalog /Pages 2 0 R >>');end();
  begin(2);add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');end();
  begin(3);add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Certificate 4 0 R >> >> /Contents 5 0 R >>');end();
  begin(4);add('<< /Type /XObject /Subtype /Image /Width 1600 /Height 1132 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');
  addBytes(jpeg);add('\nendstream');end();
  const contents='q\n842 0 0 595 0 0 cm\n/Certificate Do\nQ\n';
  begin(5);add('<< /Length '+encoder.encode(contents).length+' >>\nstream\n'+contents+'endstream');end();
  const startxref=size;
  add('xref\n0 6\n0000000000 65535 f \n');
  for(let n=1;n<=5;n++)add(String(offs[n]).padStart(10,'0')+' 00000 n \n');
  add('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+startxref+'\n%%EOF');
  const result=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}
  return result;
 }
 function download(format,opts={}){
  if(!opts.preview && (!opts.unlocked||!opts.unlocked()))return false;
  if(format!=='pdf'&&format!=='png')return false;
  let anchor=null,blobUrl=null;
  try{
   const image=makeCanvas(!!opts.preview);
   anchor=document.createElement('a');
   anchor.download='Лиза_Магнит_Косметик_5000_подарок_Игоря.'+format;
   if(format==='pdf'){
    const jpeg=image.toDataURL('image/jpeg',.95);
    const bytes=jpegToPDF(jpeg);
    blobUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
    anchor.href=blobUrl;
   }else{
    anchor.href=image.toDataURL('image/png');
   }
   anchor.style.display='none';document.body.appendChild(anchor);anchor.click();anchor.remove();
   if(blobUrl)setTimeout(()=>URL.revokeObjectURL(blobUrl),4000);
   return true;
  }catch(e){
   if(anchor?.isConnected)anchor.remove();
   if(blobUrl)URL.revokeObjectURL(blobUrl);
   window.alert('Не получилось скачать сертификат. Попробуй другой браузер: '+(e?.message||'ошибка'));
   return false;
  }
 }
 function bind(host,opts={}){
  if(!host)return;
  host.querySelectorAll('[data-dino-certificate]').forEach(button=>button.addEventListener('click',()=>{
   if(!opts.preview&&(!opts.unlocked||!opts.unlocked()))return;
   download(button.dataset.dinoCertificate,opts);
  }));
 }
 window.DailyDinoCertificate={THRESHOLD,DETAIL,previewHTML,certificateControls,makeCanvas,jpegToPDF,download,bind};
})();