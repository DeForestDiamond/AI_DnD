import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURES, DIVINE_POWER_OPTIONS, adventureDeityCount, prepareSituationAdventure, rollSituationAdventure } from '../src/constants/adventures.js';

test('all divine premises expose the right number of deity choices', () => {
  assert.equal(ADVENTURES.filter(a=>adventureDeityCount(a)).length,12);
  assert.equal(adventureDeityCount('Two Gods, One Problem'),2);
  assert.equal(adventureDeityCount('A God Has a Favor'),1);
  assert.equal(adventureDeityCount('The Missing Fey Child'),0);
  assert.equal(adventureDeityCount(null),0);
  assert.equal(new Set(DIVINE_POWER_OPTIONS.map(d=>d.name)).size,DIVINE_POWER_OPTIONS.length);
});

test('chosen deity is stored with its portfolio and made authoritative in every divine premise', () => {
  for (const adventure of ADVENTURES.filter(a=>adventureDeityCount(a))) {
    const prepared=prepareSituationAdventure(adventure.title,{deities:['Bane']});
    assert.equal(prepared.deity.name,'Bane');
    assert.equal(prepared.deity.rank,'greater');
    assert.match(prepared.deity.portfolio,/tyranny/);
    assert.match(prepared.premise,/Bane \(greater; tyranny/);
    assert.match(prepared.premise,/authoritative/);
    assert.ok(adventure.locations.includes(prepared.location));
    assert.ok(!Object.hasOwn(adventure,'deity'));
  }
});

test('both chosen gods survive, and duplicate or unknown choices are rejected', () => {
  const prepared=prepareSituationAdventure('Two Gods, One Problem',{deities:['Bane','Tyr']});
  assert.deepEqual(prepared.deities.map(d=>d.name),['Bane','Tyr']);
  assert.match(prepared.premise,/Bane .* AND Tyr /);
  assert.equal(prepareSituationAdventure('Two Gods, One Problem',{deities:['Bane','Bane']}),null);
  assert.equal(prepareSituationAdventure('A God Has a Favor',{deities:['Unknown']}),null);
});

test('random slots never duplicate an explicitly chosen or randomly rolled god', () => {
  const original=Math.random;
  try {
    for (const roll of [0,0.4,0.75,0.999]) {
      Math.random=()=>roll;
      for (const deities of [['','Asmodeus'],['Asmodeus',''],['','']]) {
        const prepared=prepareSituationAdventure('Two Gods, One Problem',{deities});
        assert.notEqual(prepared.deities[0].name,prepared.deities[1].name);
        deities.forEach((name,i)=>{if(name)assert.equal(prepared.deities[i].name,name);});
      }
    }
  } finally { Math.random=original; }
});

test('existing random and non-divine starts keep working without a deity choice', () => {
  assert.equal(prepareSituationAdventure('A God Has a Favor').deities.length,1);
  assert.equal(prepareSituationAdventure('Two Gods, One Problem').deities.length,2);
  const ordinary=prepareSituationAdventure('The Missing Fey Child',{deities:['Bane']});
  assert.equal(ordinary.deity,undefined);
  assert.equal(ordinary.premise,ADVENTURES.find(a=>a.title===ordinary.title).premise);
  const completed=ADVENTURES.filter(a=>a.title!=='Two Gods, One Problem').map(a=>a.title);
  assert.equal(rollSituationAdventure(completed).deities.length,2);
});
