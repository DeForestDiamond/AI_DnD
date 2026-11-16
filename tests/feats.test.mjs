import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATS, featsContext } from '../src/constants/feats.js';
import { availableFeatSlots, earnedFeatSlots, chooseFeat, removeFeat, featPrerequisite, normalizeFeatRecords } from '../src/helpers/feats.js';
import { effectiveMaxHp } from '../src/hooks/character/items.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { RACES, CLASSES } from '../src/constants/classes.js';
import { buildCharacterRevision, startingStats } from '../src/helpers/characterTools.js';
import { migrateCharacter } from '../src/hooks/character/migration.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const fixture=(extra={})=>({...structuredClone(EMPTY_CHAR),name:'Test',race:RACES.find(r=>r.name === 'Human'),cls:CLASSES.find(c=>c.name === 'Fighter'),stats:{str:16,dex:14,con:13,int:13,wis:12,cha:14},level:8,xp:3500,maxHp:60,hp:30,classLevels:{Fighter:8},...extra});
test('catalog has unique complete options using 2014 feat features',()=>{
  assert.equal(FEATS.length,35);assert.equal(new Set(FEATS.map(f=>f.name)).size,35);
  for(const feat of FEATS) {assert.ok(feat.category);assert.ok(feat.desc);}
  assert.equal(FEATS.find(f=>f.name === 'War Caster').abilityOptions,undefined);
});
test('feat credits use spent individual class levels, not total XP or character level',()=>{
  assert.deepEqual(earnedFeatSlots(fixture({race:{name:'Aasimar'},level:6,classLevels:{Cleric:3,Fighter:3},xp:999999})),[]);
  assert.deepEqual(earnedFeatSlots(fixture({race:{name:'Aasimar'},classLevels:{Cleric:4,Fighter:6,Rogue:10}})).map(x=>x.id),['Cleric:4','Fighter:4','Fighter:6','Rogue:4','Rogue:8','Rogue:10']);
  assert.equal(availableFeatSlots(fixture()).length,4);
  assert.equal(earnedFeatSlots(fixture({race:{name:'Human'},classLevels:{Fighter:1},level:1}))[0].id,'Human:1');
});
test('taking feats is separate from XP, class advancement and ordinary level stat increases',()=>{
  const c=fixture(), before=structuredClone(c), next=chooseFeat(c,{name:'Sentinel',source:'Fighter:4'});
  assert.equal(next.level,c.level);assert.equal(next.xp,c.xp);assert.deepEqual(next.classLevels,c.classLevels);assert.deepEqual(next.stats,c.stats);
  assert.equal(availableFeatSlots(next).length,3);assert.deepEqual(c,before);
  assert.throws(()=>chooseFeat(next,{name:'Sentinel',source:'Fighter:6'}),/already selected/);
  assert.throws(()=>chooseFeat(next,{name:'Alert',source:'Fighter:4'}),/not available/);
  assert.throws(()=>chooseFeat(next,{name:'Alert',source:'Fighter:10'}),/not available/);
});
test('Tough scales with total level, preserves damage ratio and does not alter stored base HP',()=>{
  const c=fixture(), next=chooseFeat(c,{name:'Tough',source:'Human:1'});
  assert.equal(next.maxHp,c.maxHp);assert.equal(effectiveMaxHp(next),76);assert.equal(next.hp,38);
  assert.equal(effectiveMaxHp({...next,level:9}),78);
  const undone=removeFeat(next,'Tough');assert.equal(effectiveMaxHp(undone),60);assert.equal(undone.hp,30);
  assert.equal(availableFeatSlots(undone).length,4);
});
test('half feats store and reverse exactly their own ability increase, with Constitution HP recalculated',()=>{
  const c=fixture(), next=chooseFeat(c,{name:'Resilient',source:'Fighter:4',ability:'con'});
  assert.equal(next.stats.con,14);assert.equal(next.maxHp,68);assert.equal(next.hp,34);
  assert.equal(next.feats[0].abilityIncrease,1);
  const undone=removeFeat(next,'Resilient');assert.deepEqual(undone.stats,c.stats);assert.equal(undone.maxHp,60);
  const capped=chooseFeat(fixture({stats:{...c.stats,con:24}}),{name:'Durable',source:'Fighter:4',ability:'con'});
  assert.equal(capped.stats.con,24);assert.equal(capped.feats[0].abilityIncrease,0);
  assert.equal(removeFeat(capped,'Durable').stats.con,24);
});
test('prerequisites and required choices are validated before state changes',()=>{
  const c=fixture();
  assert.throws(()=>chooseFeat(c,{name:'War Caster',source:'Human:1'}),/cast at least one spell/);
  assert.throws(()=>chooseFeat(c,{name:'Resilient',source:'Human:1'}),/ability score/);
  assert.throws(()=>chooseFeat(c,{name:'Skilled',source:'Human:1'}),/proficiencies/);
  assert.throws(()=>chooseFeat({...c,stats:{...c.stats,dex:12}},{name:'Defensive Duelist',source:'Human:1'}),/DEX 13/);
  const caster=fixture({classLevels:{Cleric:4},cls:CLASSES.find(x=>x.name === 'Cleric')});
  assert.throws(()=>chooseFeat(caster,{name:'Elemental Adept',source:'Cleric:4',choices:'poison'}),/valid feat option/);
  assert.equal(chooseFeat(caster,{name:'Elemental Adept',source:'Cleric:4',choices:'fire'}).feats[0].choices,'fire');
});
test('recorded spell choices reach the DM and cannot be removed while another feat depends on spellcasting',()=>{
  let c=chooseFeat(fixture(),{name:'Magic Initiate',source:'Human:1',choices:'Wizard; Mage Hand, Fire Bolt; Shield'});
  c=chooseFeat(c,{name:'War Caster',source:'Fighter:4'});
  assert.match(featsContext(c),/Mage Hand, Fire Bolt; Shield/);
  assert.throws(()=>removeFeat(c,'Magic Initiate'),/Remove War Caster first/);
  assert.equal(removeFeat(removeFeat(c,'War Caster'),'Magic Initiate').feats.length,0);
});
test('save migration preserves recorded bonuses, choices and consumed picks without applying them twice',()=>{
  const c=chooseFeat(fixture(),{name:'Resilient',source:'Fighter:4',ability:'con'});
  const migrated=migrateCharacter(JSON.parse(JSON.stringify(c))).char;
  assert.deepEqual(migrated.feats,c.feats);assert.equal(migrated.stats.con,14);assert.equal(migrated.maxHp,68);
  assert.equal(availableFeatSlots(migrated).length,3);
  assert.deepEqual(normalizeFeatRecords(fixture({feats:['Alert','Alert',null,{name:'Lucky'}]})).map(f=>f.name),['Alert','Lucky']);
  assert.equal(availableFeatSlots(migrateCharacter(fixture({feats:undefined})).char).length,4);
});
test('level resets and new characters clear feat selections and their consumed picks',()=>{
  const c=chooseFeat(fixture(),{name:'Tough',source:'Human:1'});
  const fields={name:c.name,race:c.race,cls:c.cls,deity:null};
  const reset=buildCharacterRevision(c,{...fields,mode:'edit',resetLevels:true});
  assert.deepEqual(reset.feats,[]);assert.equal(availableFeatSlots(reset).length,1);assert.equal(reset.xp,c.xp);
  assert.equal(effectiveMaxHp(reset),reset.maxHp);
  const carry=buildCharacterRevision(c,{...fields,mode:'carry',keepXp:true});
  assert.deepEqual(carry.feats,[]);assert.equal(availableFeatSlots(carry).length,1);
});
test('changing away from Human removes only its bonus feat and reverses its granted score',()=>{
  let c=chooseFeat(fixture(),{name:'Resilient',source:'Human:1',ability:'con'});
  c=chooseFeat(c,{name:'Alert',source:'Fighter:4'});
  const race=RACES.find(r=>r.name === 'Elf');
  const next=buildCharacterRevision(c,{mode:'edit',name:c.name,race,cls:c.cls,deity:null});
  assert.deepEqual(next.feats.map(f=>f.name),['Alert']);assert.equal(next.stats.con,c.stats.con-2); // remove feat + Human CON
  assert.equal(next.maxHp,c.maxHp-8);
  assert.equal(availableFeatSlots(next).length,2);
});
for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) test(`${build.name}: selected feats and choices reach DM exactly once`,()=>{
  let c=chooseFeat(fixture(),{name:'Magic Initiate',source:'Human:1',choices:'Wizard; Mage Hand, Fire Bolt; Shield'});
  c=chooseFeat(c,{name:'Tough',source:'Fighter:4'});
  const prompt=build(c), text=Object.values(prompt).join('\n');
  assert.equal(text.split('FEATS (2014-style').length-1,1);
  assert.ok(text.includes('Mage Hand, Fire Bolt; Shield'));assert.ok(text.includes('Already included in the app'));
  assert.ok(Object.values(build(fixture())).join('\n').includes('FEATS: None selected'));
});
