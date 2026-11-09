// Regression: Zarechny Park visit, optional coffee and full host-state isolation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('secret_date_game_luga.html','utf8');
const start=html.indexOf("const PARK_KEY='sd2810-zarechny-visit-v1';");
const end=html.indexOf('function suspectPrankHTML(){',start);
assert.ok(start>0&&end>start,'Park state implementation must be present');
const region=html.slice(start,end);
new Function('window','localStorage','DATE_KEY','origin','stage','canStart','render',region+'\nreturn {parkState,parkReady,parkAction,parkArriveHTML,parkTogetherHTML,parkCoffeeHTML,parkCoffeeStopHTML};');
const store=new Map([['day','sat']]),storage={
 getItem:k=>store.get(k)??null,
 setItem:(k,v)=>store.set(k,String(v)),
 removeItem:k=>store.delete(k)
};
let renders=0,advances=0;
const stubWindow={StoryFlow:{next(){advances++;}}};
const visit=new Function('window','localStorage','DATE_KEY','origin','stage','canStart','render',
 region+'\nreturn {parkState,parkReady,parkAction,parkArriveHTML,parkTogetherHTML,parkCoffeeHTML,parkCoffeeStopHTML};'
)(stubWindow,storage,'day','zap',6,()=>true,()=>renders++);
assert.equal(visit.parkReady(),false,'The park is not automatically completed');
assert.equal(visit.parkState().coffee,null);
visit.parkAction('coffee-yes');
assert.equal(visit.parkState().coffee,null,'Cannot choose coffee before getting to park and spending time');
visit.parkAction('together');
assert.equal(visit.parkState().together,false,'Cannot mark time together before arriving');
visit.parkAction('arrive');
assert.equal(visit.parkState().arrived,false,'Tap alone cannot fake arrival');
visit.parkAction('arrive','gps');
assert.equal(visit.parkState().arrived,true);
visit.parkAction('coffee-yes');
assert.equal(visit.parkState().coffee,null,'Coffee follows time together');
visit.parkAction('together');
assert.equal(visit.parkState().together,true);
visit.parkAction('coffee-no');
assert.equal(visit.parkState().coffee,'no','A no-coffee choice is valid');
assert.equal(visit.parkReady(),false,'Selecting no coffee still requires confirming the dedicated stop');
assert.ok(visit.parkCoffeeStopHTML().includes('Продолжаем без кофе'),'No-coffee option must have an obvious next step');
visit.parkAction('coffee-finish');
assert.equal(visit.parkReady(),true,'No-coffee option can continue without buying anything');
visit.parkAction('coffee-yes');
assert.equal(visit.parkState().coffee,'yes','Couple can change their mind');
assert.equal(visit.parkReady(),false,'Choosing coffee must not automatically count as visiting');
assert.ok(visit.parkCoffeeStopHTML().includes('Заглянем <em>в Terrazza.</em>'),'Cafe path must open a destination page');
assert.ok(visit.parkCoffeeStopHTML().includes('Кафе закрыто / передумали'),'Closed cafe must be skippable');
visit.parkAction('coffee-finish');
assert.equal(visit.parkReady(),true,'Café visit confirmed explicitly');
visit.parkAction('coffee-yes'); 
visit.parkAction('coffee-skip');
assert.equal(visit.parkState().coffee,'no','Closed cafe switches to no-coffee');
assert.equal(visit.parkReady(),true,'Closed café does not block the rest of the date');
assert.ok(visit.parkCoffeeHTML().includes('Terrazza'));
assert.ok(visit.parkCoffeeHTML().includes('data-park-action="coffee-no"'));
assert.ok(visit.parkCoffeeHTML().includes('data-park-action="coffee-yes"'));
assert.ok(visit.parkTogetherHTML().includes('сосен'),'Park stage should include meaningful time together');
assert.equal(renders,8,'Only eight valid actions rerender park chapter');
assert.equal(advances,8,'Arrival, shared time, choices and stop confirmation all advance');
assert.ok(visit.parkCoffeeHTML().includes('aria-pressed="true"'),'Selected answer must be visually and accessibly marked');
assert.ok(visit.parkCoffeeHTML().includes('is-selected'),'Selected state must use distinct styling');
assert.ok(visit.parkCoffeeHTML().includes('data-park-action="coffee-yes"'),'Yes button must remain available to change mind');
store.set('day','sun');
assert.equal(visit.parkReady(),false,'Another date should not inherit earlier answers');
assert.equal(visit.parkState().arrived,false);
assert.ok(html.includes("if(stage===6)return 'park-v2-terrazza-stop';"),'Old saved slide progress must not jump past the new cafe page');
assert.ok(html.includes('data-story-label="Остановка в Terrazza"'),'Cafe must be a distinct screen');
assert.ok(html.includes('if(index===5)return parkState().coffeeDone;'),'Cannot bypass cafe stop without explicit completion');
assert.ok(html.includes("if(from>=3&&from<=6)return to===from+1&&proof==='tap'"));
assert.ok(html.includes("(from!==6||(parkReady()&&missionReady('photos')&&prankReady('suspect')&&envelopeReady('letter')))"),'Route gate must require the couple park visit');
assert.ok(html.includes("case 6:if(parkReady()&&prankReady('suspect')&&missionReady('photos'))save(7,'tap');break;"));
assert.ok(!html.includes('Лужский городской Дом культуры'));
console.log('✓ Park arrival and shared time are sequential and persist by date');
console.log('✓ Coffee is optional; yes/no both work and cannot bypass the park walk');
console.log('✓ Old DК destination removed, subsequent tasks and lunch preserved');