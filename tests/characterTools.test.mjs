import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCharacterRevision, startingStats, characterEditNote, CARRY_OPTIONS } from '../src/helpers/characterTools.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { RACES, CLASSES } from '../src/constants/classes.js';
import { levelUpsAvailable } from '../src/hooks/character/stats.js';
import { effectiveMaxHp } from '../src/hooks/character/items.js';
import { migrateCharacter } from '../src/hooks/character/migration.js';
import { getDeityByName } from '../src/constants/deities.js';
import { ITEM_DB } from '../src/constants/items.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const race = RACES.find(x=>x.name === 'Human'), cls = CLASSES.find(x=>x.name === 'Fighter');
const fixture = () => ({...structuredClone(EMPTY_CHAR),name:'Cassian',race,cls,stats:{...startingStats(race,cls),str:23},level:5,xp:1400,maxHp:44,hp:22,
  classLevels:{Fighter:3,Wizard:2},subclasses:{Fighter:'Champion'},abilities:{cantrips:['Fire Bolt'],spells:['Shield'],infusions:['Old infusion'],martial:['Old attack']},
  inventory:[{name:'Carried Bag',qty:1},{name:'Iron Ingot',qty:100000}],stash:[{name:'Stored Bag',qty:2}],slots:{...EMPTY_CHAR.slots,mainhand:'Named Sword'},
  coins:12345,bankedCoins:67890,companions:{Luna:{race:'Wolf',slots:{neck:'Moon Collar'}}},npcs:{Jessa:{desc:'Captain'}},towns:{Calimport:{desc:'Port'}},
  items:{'Carried Bag':{type:'bag',contents:{'Inner Bag':1}},'Inner Bag':{type:'bag',contents:{'Rare Bone':300000}},'Rare Bone':{type:'misc',label:'Unique material'},'Iron Ingot':{type:'misc'},'Stored Bag':{type:'bag',contents:{'Stored Gem':2}},'Stored Gem':{type:'misc',label:'Stored magic'},'Named Sword':{type:'weapon',dmg:'1d8',bonuses:{con:2}},'Moon Collar':{type:'misc',label:'Companion equipment'},'Orphan Bag':{type:'bag',contents:{'Lost Loot':10}},'Lost Loot':{type:'misc'}},
  arc:{antagonist:'Old foe'},adventure:{title:'Old quest'},suspendedStoryDriver:{arc:{antagonist:'Suspended foe'}},worldPressures:{siege:{current:'Old siege'}},currentLocation:'Old scene',
  directives:'Campaign rules',bio:'Old bio',appearance:'Old appearance',storyMode:'continuous',fantasyTone:'full-dark',combatFirst:true,pacing:'calm',environment:'hells',
  defeatedAntagonists:['Old foe'],completedAdventures:[{title:'Old quest'}],contextExclusions:{companions:{Luna:true},npcs:{Jessa:true},towns:{Calimport:true}},
});
const options = (s, extra={}) => ({mode:'edit',name:s.name,race:s.race,cls:s.cls,deity:s.deity,...extra});

test('profile edits preserve progression, possessions and story without mutating their source', () => {
  const s=fixture(), original=structuredClone(s);
  const next=buildCharacterRevision(s,options(s,{name:'Raphael',bio:'New bio',appearance:'New appearance'}));
  for(const key of ['classLevels','subclasses','abilities','inventory','stash','items','arc','adventure','worldPressures']) assert.deepEqual(next[key],s[key]);
  assert.equal(next.xp,1400);assert.equal(next.level,5);assert.equal(next.name,'Raphael');
  assert.equal(next.bio,'New bio');assert.deepEqual(s,original);
  next.items['Named Sword'].dmg='9d9';assert.equal(s.items['Named Sword'].dmg,'1d8');
  assert.match(characterEditNote(s,next),/out-of-character edit/);
});
test('level reset clears all selected class choices, recalculates HP and banks retained XP', () => {
  const s=fixture(), next=buildCharacterRevision(s,options(s,{resetLevels:true}));
  assert.equal(next.level,1);assert.deepEqual(next.classLevels,{Fighter:1});
  assert.deepEqual(next.subclasses,{});assert.deepEqual(next.abilities,EMPTY_CHAR.abilities);
  assert.deepEqual(next.stats,startingStats(race,cls));assert.equal(levelUpsAvailable(next),4);
  assert.equal(next.hp,effectiveMaxHp(next));assert.deepEqual(next.inventory,s.inventory);
  assert.equal(buildCharacterRevision(s,options(s,{resetLevels:true,keepXp:false})).xp,0);
});
test('primary class change forces a rebuild, while a race-only edit retains levels and adjusts racial scores', () => {
  const s=fixture(), elf=RACES.find(x=>x.name === 'Elf'), wizard=CLASSES.find(x=>x.name === 'Wizard');
  const changed=buildCharacterRevision(s,options(s,{cls:wizard}));
  assert.deepEqual(changed.classLevels,{Wizard:1});assert.equal(changed.level,1);
  assert.deepEqual(changed.stats,startingStats(race,wizard));
  const raced=buildCharacterRevision(s,options(s,{race:elf}));
  assert.equal(raced.stats.str,s.stats.str-2);assert.equal(raced.stats.dex,s.stats.dex+2);
  assert.equal(raced.stats.con,s.stats.con-1);assert.equal(raced.level,5);
  assert.deepEqual(raced.classLevels,s.classLevels);
});
test('fresh characters inherit no campaign state or custom overrides of starting items', () => {
  const s=fixture();s.items.Shortsword={type:'weapon',dmg:'99d99'};
  const next=buildCharacterRevision(s,options(s,{mode:'fresh',name:'New',startingGear:true}));
  assert.equal(next.level,1);assert.equal(next.xp,0);assert.equal(next.coins,1000);
  for(const key of ['arc','adventure','suspendedStoryDriver','worldPressures']) assert.equal(next[key],undefined);
  for(const key of ['npcs','towns','companions']) assert.deepEqual(next[key],{});
  assert.equal(next.currentLocation,'');assert.deepEqual(next.items.Shortsword,ITEM_DB.Shortsword);
  assert.equal(next.items['Lost Loot'],undefined);assert.deepEqual(next.stash,[]);
});
test('carry-over retains nested bag contents and definitions without expanding large stacks', () => {
  const s=fixture(), next=buildCharacterRevision(s,options(s,{mode:'carry',keep:{inventory:true}}));
  assert.deepEqual(next.inventory,s.inventory);assert.equal(next.inventory.length,2);
  assert.equal(next.items['Inner Bag'].contents['Rare Bone'],300000);
  assert.equal(next.items['Rare Bone'].label,'Unique material');
  for(const name of ['Stored Bag','Stored Gem','Moon Collar','Named Sword','Orphan Bag','Lost Loot']) assert.equal(next.items[name],undefined,name);
  assert.deepEqual(next.stash,[]);assert.deepEqual(next.slots,EMPTY_CHAR.slots);
});
test('each retention checkbox keeps only its own category and dependent definitions', () => {
  const s=fixture();
  for(const [key] of CARRY_OPTIONS) {
    const next=buildCharacterRevision(s,options(s,{mode:'carry',keep:{[key]:true},keepXp:false}));
    if(['inventory','stash','companions','npcs','towns','directives'].includes(key)) assert.deepEqual(next[key],s[key]);
    if(key === 'equipment') assert.deepEqual(next.slots,s.slots);
    if(key === 'money') {assert.equal(next.coins,s.coins);assert.equal(next.bankedCoins,s.bankedCoins);}
    if(key === 'storySettings') {assert.equal(next.storyMode,'continuous');assert.equal(next.fantasyTone,'full-dark');}
    if(key === 'completed') assert.deepEqual(next.completedAdventures,s.completedAdventures);
    assert.equal(next.arc,undefined);assert.equal(next.worldPressures,undefined);
    assert.equal(next.xp,0);assert.equal(next.level,1);
  }
  const companion=buildCharacterRevision(s,options(s,{mode:'carry',keep:{companions:true}}));
  assert.ok(companion.items['Moon Collar']);assert.equal(companion.contextExclusions.companions.Luna,true);
  assert.deepEqual(companion.contextExclusions.npcs,{});
  const stash=buildCharacterRevision(s,options(s,{mode:'carry',keep:{stash:true}}));
  assert.ok(stash.items['Stored Gem']);assert.equal(stash.items['Rare Bone'],undefined);
});
test('complete carry-over keeps records and wealth but never old progression or active story', () => {
  const s=fixture(), next=buildCharacterRevision(s,options(s,{mode:'carry',keep:Object.fromEntries(CARRY_OPTIONS.map(([key])=>[key,true]))}));
  assert.equal(next.hp,effectiveMaxHp(next));assert.equal(next.level,1);assert.equal(next.xp,s.xp);
  assert.deepEqual(next.companions,s.companions);assert.deepEqual(next.npcs,s.npcs);assert.deepEqual(next.towns,s.towns);
  assert.ok(next.items['Named Sword']);assert.ok(next.items['Moon Collar']);assert.equal(next.items['Lost Loot'],undefined);
  const loaded=migrateCharacter(JSON.parse(JSON.stringify(next))).char;
  assert.deepEqual(loaded.inventory,next.inventory);assert.deepEqual(loaded.classLevels,{Fighter:1});
  assert.equal(loaded.items['Rare Bone'].label,'Unique material');assert.equal(levelUpsAvailable(loaded),4);
});
test('invalid drafts cannot apply and deity requirements remain enforced after rebuilding', () => {
  const s=fixture();
  for(const bad of [{name:' '},{race:null},{cls:null},{stats:{str:0}},{mode:'unknown'}]) assert.throws(()=>buildCharacterRevision(s,options(s,bad)));
  const cleric=CLASSES.find(x=>x.name === 'Cleric');
  assert.throws(()=>buildCharacterRevision(s,options(s,{cls:cleric})),/deity/);
  const next=buildCharacterRevision(s,options(s,{cls:cleric,deity:getDeityByName('Bane')}));
  assert.equal(next.deity.name,'Bane');assert.deepEqual(next.classLevels,{Cleric:1});
});
test('editing constitution preserves the damaged HP ratio, including gear contributions', () => {
  const s=fixture(), next=buildCharacterRevision(s,options(s,{stats:{...s.stats,con:s.stats.con+2}}));
  assert.equal(next.maxHp,s.maxHp+s.level);
  assert.equal(next.hp,Math.round(s.hp/effectiveMaxHp(s)*effectiveMaxHp(next)));
});
for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) test(`${build.name}: new character context contains retained records without old story or class abilities`,()=>{
  const s=fixture();s.contextExclusions.npcs={};
  const next=buildCharacterRevision(s,options(s,{mode:'carry',name:'Raphael',cls:CLASSES.find(x=>x.name === 'Cleric'),deity:getDeityByName('Bane'),keep:{inventory:true,npcs:true}}));
  const prompt=build(next), text=Object.values(prompt).join('\n');
  assert.ok(text.includes('Raphael'));assert.ok(text.includes('Bane'));assert.ok(next.npcs.Jessa);assert.ok(text.includes('Carried Bag'));
  for(const old of ['Old siege','Old foe','Old quest','Old attack','Suspended foe']) assert.ok(!text.includes(old),old);
});
