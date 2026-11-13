import test from 'node:test';
import assert from 'node:assert/strict';
import { antagonistsForLevel, rollAntagonist, NAMED_ANTAGONISTS } from '../src/constants/encounters/antagonists.js';
import { makeArc, fixedArcLocationFor } from '../src/constants/encounters/arcLocations.js';
import { rollAdventureSeed } from '../src/helpers/adventure/seed.js';

const matching=(level,term)=>antagonistsForLevel(level).filter(x=>x.includes(term));
test('classic threats and village assaults are available without high-level illithids at level one',()=>{
  for(const term of ['ankheg','rust monster','mimic infestation','gricks','darkmantles','gargoyles','ettercap','gelatinous cube','village palisade','skeleton warband']) assert.ok(matching(1,term).length,term);
  for(const term of ['mind flayer','elder brain','ulitharid','tarrasque']) assert.equal(matching(1,term).length,0,term);
});
test('regional illithids and monster sieges enter at level five, advanced threats at nine, tarrasque at ten',()=>{
  for(const term of ['renegade mind flayer','mind flayer arcanist','nautiloid crew','ulitharid','intellect devourer','mindwitness','aboleth','ropers','hundred-strong hobgoblin siege']) {
    assert.equal(matching(4,term).length,0,term);
    assert.ok(matching(5,term).length,term);
  }
  for(const term of ['elder brain','alhoon','illithilich','neothelid','death tyrant','mummy lord','dragon turtle','iron golem army']) {
    assert.equal(matching(8,term).length,0,term);
    assert.ok(matching(9,term).length,term);
  }
  assert.equal(matching(9,'tarrasque').length,0);
  const [tarrasque]=matching(10,'tarrasque');
  assert.ok(tarrasque);
  assert.ok(NAMED_ANTAGONISTS.includes(tarrasque));
});
test('each eligible entry remains independently drawable and tier pools contain no duplicate strings',()=>{
  const original=Math.random;
  try {
    for(const level of [1,5,9,10,50]) {
      const pool=antagonistsForLevel(level);
      assert.equal(pool.length,new Set(pool).size);
      for(let i=0;i<pool.length;i++) {
        Math.random=()=>(i+.5)/pool.length;
        assert.equal(rollAntagonist(level),pool[i]);
      }
    }
  } finally {Math.random=original;}
});
test('new illithid and tarrasque threats obey completed-arc and immediate reroll exclusions',()=>{
  const original=Math.random;
  try {
    const [tarrasque]=matching(10,'tarrasque'),[elder]=matching(10,'an elder brain directing');
    const available=antagonistsForLevel(10).filter(x=>x!==tarrasque&&x!==elder);
    for(let i=0;i<available.length;i++) {
      Math.random=()=>(i+.5)/available.length;
      assert.equal(rollAntagonist(10,elder,[tarrasque.toUpperCase()]),available[i]);
    }
  } finally {Math.random=original;}
});
test('village siege and illithid premises keep local anchors and player-selected geography',()=>{
  for(const term of ['hundred-strong hobgoblin siege','an elder brain directing','tarrasque']) {
    const [antagonist]=matching(10,term);
    assert.equal(fixedArcLocationFor(antagonist),null);
    const arc=makeArc(antagonist,null,'Daggerford');
    assert.equal(arc.arcLocation,null);
    assert.equal(arc.localArea,'Daggerford');
    const seed=rollAdventureSeed(10,{antagonist,arcLocation:'Cormyr'});
    assert.equal(seed.antagonist,antagonist);
    assert.equal(seed.arc.antagonist,antagonist);
    assert.equal(seed.startingArea,'Cormyr');
    assert.equal(seed.arc.localArea,'Cormyr');
  }
});
