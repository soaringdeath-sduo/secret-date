// Regression: Zarechny Park visit, optional coffee and full host-state isolation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('secret_date_game_luga.html','utf8');
const start=html.indexOf("const PARK_KEY='sd2810-zarechny-visit-v1';");
const end=html.indexOf('function suspectPrankHTML(){',start);
assert.ok(start>0&&end>start,'Park state implementation must be present');
const region=html.slice(start,end);
new Function('localStorage','DATE_KEY','origin','stage','canStart','render',region+'\nreturn {parkState,parkReady,parkAction,parkArriveHTML,parkTogetherHTML,parkCoffeeHTML};');
const store=new Map([['day','sat']]),storage={
 getItem:k=>store.get(k)??null,
 setItem:(k,v)=>store.set(k,String(v)),
 removeItem:k=>store.delete(k)
};
let renders=0;
const visit=new Function('localStorage','DATE_KEY','origin','stage','canStart','render',
 region+'\nreturn {parkState,parkReady,parkAction,parkArriveHTML,parkTogetherHTML,parkCoffeeHTML};'
)(storage,'day','zap',6,()=>true,()=>renders++);
assert.equal(visit.parkReady(),false,'The park is not automatically completed');
assert.equal(visit.parkState().coffee,null);
visit.parkAction('coffee-yes');
assert.equal(visit.parkState().coffee,null,'Cannot choose coffee before getting to park and spending time');
visit.parkAction('together');
assert.equal(visit.parkState().together,false,'Cannot mark time together before arriving');
visit.parkAction('arrive');
assert.equal(visit.parkState().arrived,true);
visit.parkAction('coffee-yes');
assert.equal(visit.parkState().coffee,null,'Coffee follows time together');
visit.parkAction('together');
assert.equal(visit.parkState().together,true);
visit.parkAction('coffee-no');
assert.equal(visit.parkState().coffee,'no','A no-coffee choice is valid');
assert.equal(visit.parkReady(),true,'Coffee purchase must never be required to proceed');
visit.parkAction('coffee-yes');
assert.equal(visit.parkState().coffee,'yes','Couple can change their mind');
assert.equal(visit.parkReady(),true);
assert.ok(visit.parkCoffeeHTML().includes('Terrazza'));
assert.ok(visit.parkCoffeeHTML().includes('data-park-action="coffee-no"'));
assert.ok(visit.parkCoffeeHTML().includes('data-park-action="coffee-yes"'));
assert.ok(visit.parkTogetherHTML().includes('сосен'),'Park stage should include meaningful time together');
assert.equal(renders,4,'Only four valid actions should rerender park chapter');
store.set('day','sun');
assert.equal(visit.parkReady(),false,'Another date should not inherit earlier answers');
assert.equal(visit.parkState().arrived,false);
assert.ok(html.includes("if(stage===6)return 'park-v1';"),'Park progress must not inherit old House-of-Culture slides');
assert.ok(html.includes("if(from>=3&&from<=6)return to===from+1&&proof==='tap'"));
assert.ok(html.includes("(from!==6||(parkReady()&&missionReady('photos')&&prankReady('suspect')))"),'Route gate must require the couple park visit');
assert.ok(html.includes("case 6:if(parkReady()&&prankReady('suspect')&&missionReady('photos'))save(7,'tap');break;"));
assert.ok(!html.includes('Лужский городской Дом культуры'));
console.log('✓ Park arrival and shared time are sequential and persist by date');
console.log('✓ Coffee is optional; yes/no both work and cannot bypass the park walk');
console.log('✓ Old DК destination removed, subsequent tasks and lunch preserved');