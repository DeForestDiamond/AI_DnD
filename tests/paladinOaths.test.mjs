import test from 'node:test';
import assert from 'node:assert/strict';
import { SUBCLASSES, SUBCLASS_PICK_LEVEL, owedSubclasses, subclassFeaturesAtLevel } from '../src/constants/subclasses.js';
import { ADDITIONAL_PALADIN_OATHS, ADDITIONAL_PALADIN_SPELLS, PALADIN_OATH_TENETS } from '../src/constants/paladinOaths.js';
import { SUBCLASS_BONUS_SPELLS, subclassBonusSpells } from '../src/constants/subclassAbilities.js';
import { getAbilityCounts, grantedSubclassMagic } from '../src/constants/abilities.js';
import { SPELL_INFO } from '../src/constants/spellInfo.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { migrateCharacter } from '../src/hooks/character/migration.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const fixture = (name,level=3)=>({...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Aasimar'},cls:{name:'Paladin'},deity:{name:'Bane',alignment:'Lawful Evil',desc:'God of tyranny'},stats:{str:16,dex:12,con:14,int:10,wis:10,cha:16},level:level+7,hp:30,maxHp:30,classLevels:{Paladin:level,Fighter:7},subclasses:{Paladin:name,Fighter:'Champion'}});
test('all nine paladin paths have backstory vows and preserve the three original names and pick level',()=>{
  assert.equal(Object.keys(SUBCLASSES.Paladin).length,9);assert.equal(SUBCLASS_PICK_LEVEL.Paladin,3);
  for(const name of ['Oath of Devotion','Oath of Vengeance','Oathbreaker',...Object.keys(ADDITIONAL_PALADIN_OATHS)]) {
    assert.ok(SUBCLASSES.Paladin[name].desc);assert.ok(SUBCLASSES.Paladin[name].emoji);assert.ok(SUBCLASSES.Paladin[name].features.length);
    assert.ok(PALADIN_OATH_TENETS[name].length);
    assert.deepEqual(owedSubclasses({...fixture(name),subclasses:{Fighter:'Champion'}}),['Paladin']);
    assert.deepEqual(owedSubclasses(fixture(name)),[]);
    assert.deepEqual(owedSubclasses({...fixture(name,2),subclasses:{Fighter:'Champion'}}),[]);
  }
});
test('new oaths gate channels, auras, later defenses and capstones by paladin class level',()=>{
  for(const [name,data] of Object.entries(ADDITIONAL_PALADIN_OATHS)) {
    assert.deepEqual(subclassFeaturesAtLevel('Paladin',name,2),[]);
    assert.equal(subclassFeaturesAtLevel('Paladin',name,3).length,2);
    assert.equal(subclassFeaturesAtLevel('Paladin',name,4).length,3);
    assert.equal(subclassFeaturesAtLevel('Paladin',name,8).length,4);
    assert.equal(subclassFeaturesAtLevel('Paladin',name,10).length,data.features.length);
    assert.ok(data.features.every(f=>[3,4,8,9,10].includes(f.level)));
    assert.equal(new Set(data.features.map(f=>f.name)).size,data.features.length);
  }
});
test('every oath spell has an info entry and unlocks using existing app tiers without charging known-spell budgets',()=>{
  for(const [name,table] of Object.entries(ADDITIONAL_PALADIN_SPELLS)) {
    assert.deepEqual(Object.keys(table),['3','4','5','7','9']);
    assert.deepEqual(subclassBonusSpells('Paladin',name,2),[]);
    for(const [level,count] of [[3,2],[4,4],[5,6],[7,8],[9,10]]) {
      const granted=grantedSubclassMagic(fixture(name,level));
      assert.equal(granted.length,count);assert.ok(granted.every(spell=>SPELL_INFO[spell.name]));
      assert.deepEqual(getAbilityCounts('Paladin',level,name),getAbilityCounts('Paladin',level,'Oath of Devotion'));
    }
  }
  assert.deepEqual(SUBCLASS_BONUS_SPELLS.Paladin['Oath of Devotion'][3],['Protection from Evil and Good','Sanctuary']);
  assert.deepEqual(SUBCLASS_BONUS_SPELLS.Paladin.Oathbreaker[3],['Hellish Rebuke','Inflict Wounds']);
});
test('published oath identities remain mechanically distinct',()=>{
  assert.ok(ADDITIONAL_PALADIN_OATHS['Oath of Conquest'].features.some(f=>f.name === 'Aura of Conquest' && f.desc.includes('frightened of you')));
  assert.ok(ADDITIONAL_PALADIN_OATHS['Oath of the Ancients'].features.some(f=>f.name === 'Aura of Warding' && f.desc.includes('damage from spells')));
  assert.ok(ADDITIONAL_PALADIN_OATHS['Oath of Redemption'].features.some(f=>f.name === 'Protective Spirit' && f.desc.includes('in combat')));
  assert.ok(ADDITIONAL_PALADIN_OATHS['Oath of the Watchers'].features.some(f=>f.name === 'Vigilant Rebuke' && f.desc.includes('need not have been a spell')));
  assert.deepEqual(ADDITIONAL_PALADIN_SPELLS['Oath of Glory'][9],['Commune','Flame Strike']);
  assert.deepEqual(ADDITIONAL_PALADIN_SPELLS['Oath of the Crown'][5],['Aura of Vitality','Spirit Guardians']);
});
for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) test(`${build.name}: new oath, vows and granted spells survive save/load and reach DM without future powers`,()=>{
  for(const [name,data] of Object.entries(ADDITIONAL_PALADIN_OATHS)) {
    const c=migrateCharacter(JSON.parse(JSON.stringify(fixture(name)))).char;
    assert.equal(c.subclasses.Paladin,name);assert.equal(c.deity.name,'Bane');
    const prompt=Object.values(build(c)).join('\n');
    assert.ok(prompt.includes(name));assert.ok(prompt.includes(PALADIN_OATH_TENETS[name][0]));
    for(const feature of data.features.filter(f=>f.level === 3)) assert.ok(prompt.includes(feature.name));
    for(const feature of data.features.filter(f=>f.level > 3)) assert.ok(!prompt.includes(feature.name),feature.name);
    for(const spell of ADDITIONAL_PALADIN_SPELLS[name][3]) assert.ok(prompt.includes(spell),spell);
    const later=Object.values(build(fixture(name,10))).join('\n');
    for(const feature of data.features) assert.ok(later.includes(feature.name),feature.name);
    for(const spell of Object.values(ADDITIONAL_PALADIN_SPELLS[name]).flat()) assert.ok(later.includes(spell),spell);
  }
});
