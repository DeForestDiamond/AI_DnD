import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { buildCompanionGearSection } from '../src/prompts/state.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const character = () => ({
  ...structuredClone(EMPTY_CHAR), name:'Cassian', race:{name:'Human'}, cls:{name:'Fighter'},
  level:3, hp:12, maxHp:12, inventory:[],
  companions:{
    Avariel:{desc:'A personable erinyes adjutant.', slots:{mainhand:'Frost Sword',armor:'Fire Ward'}},
    Luna:{slots:{neck:'Silver Collar'}},
  },
  items:{
    'Frost Sword':{type:'weapon',damage:'1d8',damageBonus:2,bonus:1,range:'melee',finesse:true,extras:[{dice:'1d6',type:'cold'}],label:'Chills enemies on impact.'},
    'Fire Ward':{type:'armor',ac:14,dexBonus:true,maxDex:2,bonuses:{ac:1,con:2},label:'Grants immunity to fire.'},
    'Silver Collar':{type:'magic',label:'Allows silent communication.'},
  },
});

for (const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) {
  test(`${build.name} sends companion slots, mechanics and effects even with empty inventory`, () => {
    const c=character();
    const before=structuredClone(c);
    const p=build(c);
    const gear=p.gear || p.dynamic;
    assert.match(gear,/Avariel: mainhand: Frost Sword, armor: Fire Ward/);
    assert.match(gear,/Luna: neck: Silver Collar/);
    for (const detail of ['Base damage: 1d8','Damage bonus: 2','Weapon bonus: 1','Extra damage: 1d6 cold','Base AC: 14','maximum 2','ac bonus: 1','con bonus: 2','Grants immunity to fire.','Allows silent communication.']) assert.ok(gear.includes(detail),detail);
    assert.ok(!p.static.includes('Frost Sword'));
    assert.match(p.items || p.dynamic,/INVENTORY: empty/);
    assert.deepEqual(c,before);
  });
}

test('excluded companion gear and definitions are omitted', () => {
  const c=character();
  c.contextExclusions={companions:{Avariel:true}};
  const text=buildCompanionGearSection(c);
  assert.ok(!text.includes('Avariel'));
  assert.ok(!text.includes('Frost Sword'));
  assert.ok(!text.includes('Grants immunity to fire.'));
  assert.match(text,/Luna: neck: Silver Collar/);
});

test('legacy companions, empty slots and missing item definitions are supported', () => {
  assert.equal(buildCompanionGearSection({}), '');
  assert.equal(buildCompanionGearSection({companions:{Luna:{},Rook:{slots:{neck:null}}}}), '');
  assert.match(buildCompanionGearSection({companions:{Luna:{slots:{neck:'Old Collar'}}}}),/neck: Old Collar/);
});

test('equipment changes are reflected without changing the static biography', () => {
  const c=character();
  const before=buildSystemPromptTerra(c);
  c.companions.Avariel.slots.mainhand=null;
  const after=buildSystemPromptTerra(c);
  assert.equal(before.static,after.static);
  assert.ok(!after.gear.includes('Frost Sword'));
  assert.ok(!after.gear.includes('Chills enemies on impact.'));
});

test('a shared item definition is described once within companion gear', () => {
  const c=character();
  c.companions.Rook={slots:{neck:'Silver Collar'}};
  const text=buildCompanionGearSection(c);
  assert.match(text,/Rook: neck: Silver Collar/);
  assert.equal(text.split('Allows silent communication.').length-1,1);
});
