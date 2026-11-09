// Smoke test for grouped, swipeable quest screens.
// Run from repository root: node scripts/check-swipe-layout.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const flow=fs.readFileSync('story-flow.js','utf8');
const html=fs.readFileSync('secret_date_game_luga.html','utf8');
const css=fs.readFileSync('story-flow.css','utf8');
const hostCss=fs.readFileSync('host-full-test.css','utf8');
new Function(flow);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new Function(m[1]);

assert.ok(flow.includes("element.classList.contains('story-break')"),'screens must be grouped at explicit semantic markers');
const boundary=flow.slice(flow.indexOf(' function boundary('),flow.indexOf(' function segment('));
for(const cls of ['spacer','scrap-prank','mission-panel','mini','scanner','wheel-frame']){
 assert.ok(!boundary.includes("contains('"+cls+"')"),'layout class must not split a slide: '+cls);
}
const wheel=html.slice(html.indexOf('function wheelPrankHTML(){'),html.indexOf('function spinRomanticWheel(){'));
assert.ok(wheel.includes('id="wheel-disc"')&&wheel.includes('id="wheel-spin"'),'wheel and spin control must both be present');
assert.ok(!wheel.includes('story-break'),'do not separate wheel and spin control');
assert.ok(html.includes('data-story-label="Фотоохота в парке"')&&html.includes('data-story-label="Завершение обеда"'));
assert.ok(html.includes('data-story-label="Последняя песня"')&&html.includes('data-story-label="Наш фотоальбом"'));
assert.ok(html.includes("if(stage===9&&index===1)return prankReady('parcel');"),'meal completion must gate forward button');
assert.ok(html.includes("if(index===7)return parkReady()&&prankReady('suspect')&&missionReady('photos');"),'photo hunt final page must be gated');
assert.ok(css.includes('#app.story-flow-mounted.card')&&css.includes('flex:0 0 auto'),'card must not stretch into empty space');
assert.ok(css.includes('padding-bottom:calc(174px')&&css.includes('.story-slide>.spacer{display:none'),'buttons must remain above audio dock');
assert.ok(hostCss.includes('grid-template-columns:minmax(0,1fr) auto'),'compact host header required');

class El{
 constructor(cls='',tag='DIV'){
  this.nodeType=1;this.className=cls;this.tagName=tag;this.childNodes=[];this.dataset={};this.attributes={};
  this.innerHTML='';this.textContent='';this.style={};this.hidden=false;this.disabled=false;this.events={};
  this.classList={
   contains:c=>this.className.split(/\s+/).includes(c),
   add:c=>{if(!this.classList.contains(c))this.className+=' '+c;},
   remove:c=>{this.className=this.className.split(/\s+/).filter(x=>x!==c).join(' ');},
   toggle:(c,force)=>{if(force)this.classList.add(c);else this.classList.remove(c);}
  };
 }
 appendChild(x){this.childNodes.push(x);return x;}
 prepend(x){this.childNodes.unshift(x);}
 replaceChildren(){this.childNodes=[];}
 setAttribute(k,v){this.attributes[k]=v;}
 getAttribute(k){return this.attributes[k]??null;}
 addEventListener(k,fn){this.events[k]=fn;}
 querySelector(sel){
  const found=this.childNodes.find(n=>n.classList?.contains(sel.replace(/^\./,'')));
  if(found)return found;
  if(this.innerHTML.includes(sel.replace(/^\./,'')))return new El('stub');
  return null;
 }
 get offsetWidth(){return 150;}
}
const native=new Map();
const storage={getItem:k=>native.get(k)??null,setItem:(k,v)=>native.set(k,String(v)),removeItem:k=>native.delete(k)};
const doc={body:{classList:{contains:()=>false}},createElement:tag=>new El('',tag),addEventListener(){}};
const win={SDTest:{storage,active:()=>false},scrollTo(){}};
new Function('window','document',flow)(win,doc);
const marker=label=>{const e=new El('story-break');e.setAttribute('data-story-label',label);return e;};
const el=cl=>new El(cl);
function mount(stage,nodes){
 const root=new El('card');
 nodes.forEach(n=>root.appendChild(n));
 win.StoryFlow.mount(root,{stage,phase:'main',day:'sun',origin:'zap',host:()=>false,allow:()=>true,hasNext:()=>true,advance(){}});
 return root.childNodes.filter(n=>n.classList.contains('story-slide'));
}
const wheelPanels=mount(10,[el('eyebrow'),el('hero'),el('wheel-frame'),el('mini scrap-prank')]);
assert.equal(wheelPanels.length,1,'wheel and spin button must be on the same page');
assert.equal(wheelPanels[0].childNodes.length,4);
const mealPanels=mount(9,[el('eyebrow'),el('desc'),el('coords'),marker('Завершение обеда'),el('mini scrap-prank'),el('spacer'),el('btn')]);
assert.equal(mealPanels.length,2,'meal must have two meaningful pages');
assert.equal(mealPanels[1].childNodes.length,3,'meal action and its buttons must stay together');
const radioPanels=mount(1,[
 el('radio-card'),marker('Вопрос диспетчера'),el('mini'),marker('Музыкальное послание'),el('story-song-hint'),
 marker('Проверка водителя'),el('mini scrap-prank'),marker('VIP-допуск'),el('mini scrap-prank'),
 marker('Первая координата'),el('mini')
]);
assert.equal(radioPanels.length,6,'radio, song and driver checks should each have their own screen');
const park=mount(6,[
 el('hero'),
 marker('Едем в Заречный парк'),el('coords'),el('mini'),
 marker('Мы уже на месте'),el('mini'),
 marker('Время только для нас'),el('mini'),
 marker('Выбор кофейной остановки'),el('mini'),
 marker('Остановка в Terrazza'),el('hero'),el('coords'),el('mini'),
 marker('Проверка Игоря'),el('mini scrap-prank'),
 marker('Фотоохота в парке'),el('mission-panel'),
 marker('Продолжаем свидание'),el('mini'),el('btn')
]);
assert.equal(park.length,9,'Zarechny plus the separate Terrazza cafe stop should have 9 screens');
assert.equal(park[1].childNodes.length,2,'Driving instructions and map stay together');
assert.equal(park[4].childNodes.length,1,'Optional coffee choice is a separate screen');
assert.equal(park[5].childNodes.length,3,'Terrazza destination, map and buttons stay on one page');
assert.equal(park[8].childNodes.length,2,'Final action should stay with its description');
assert.ok(html.includes('Заречный парк, Луга'),'New destination should be in the itinerary');
assert.ok(html.includes('Terrazza'),'Coffee should be grounded in real cafe in the park');
assert.ok(!html.includes('Лужский городской Дом культуры'),'Old House of Culture destination should be removed');
assert.ok(html.includes("if(stage===6)return 'park-v2-terrazza-stop';"),'Old slide state must not skip new park screens');
assert.ok(html.includes("if(index===2)return parkState().arrived;"),'Do not skip arriving at park');
assert.ok(html.includes("if(index===3)return parkState().together;"),'Do not skip spending time together');
assert.ok(html.includes("if(index===4)return parkState().coffee!==null;"),'Both coffee choices should advance');
assert.ok(html.includes("if(index===5)return parkState().coffeeDone;"),'Cannot leave Terrazza without completing or skipping');
assert.ok(html.includes('data-story-label="Остановка в Terrazza"'),'Terrazza must be separate from suspect page');
console.log('✓ Semantic slide grouping: wheel, meal, radio, nine-screen park and Terrazza stop');
console.log('✓ No empty stretched slide or player/button overlap selectors');
console.log('✓ Quest JavaScript syntax and required progression gates');
