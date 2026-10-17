import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURES, prepareSituationAdventure, rollSituationAdventure, situationLocationDirective } from '../src/constants/adventures.js';
import { prepareContinuousOpening } from '../src/helpers/adventure/continuous.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';

test('chosen country or city is retained separately from the rolled scene and deity choices', () => {
  for (const startingLocation of ['  Cormyr  ','Waterdeep']) {
    const a=prepareSituationAdventure('The Divine Emissary',{startingLocation,deities:['Bane']});
    assert.equal(a.startingLocation,startingLocation.trim());
    assert.equal(a.deity.name,'Bane');
    assert.ok(ADVENTURES.find(x=>x.title===a.title).locations.includes(a.location));
    assert.match(situationLocationDirective(a),new RegExp(`PLAYER-CHOSEN STARTING LOCATION: ${startingLocation.trim()}`));
    assert.match(situationLocationDirective(a),/Adapt the STARTING CONTEXT/);
  }
});

test('blank locations leave existing automatic placement unchanged', () => {
  for (const options of [{},{startingLocation:'   '}]) {
    const a=prepareSituationAdventure('The Princess Chose You',options);
    assert.ok(!Object.hasOwn(a,'startingLocation'));
    assert.equal(situationLocationDirective(a),'');
  }
  assert.equal(situationLocationDirective(null),'');
});

test('random Adventures receive the chosen location while preserving completed filtering', () => {
  const completed=ADVENTURES.filter(a=>a.title!=='The Princess Chose You').map(a=>a.title);
  const a=rollSituationAdventure(completed,{startingLocation:'Suzail'});
  assert.equal(a.title,'The Princess Chose You');
  assert.equal(a.startingLocation,'Suzail');
  assert.equal(rollSituationAdventure(ADVENTURES,{startingLocation:'Suzail'}),null);
});

test('Long Story opening receives the chosen geography without leaking the last campaign location', () => {
  const c={...structuredClone(EMPTY_CHAR),level:3,currentLocation:'Old Campaign City',storyMode:'continuous'};
  const a=prepareSituationAdventure('The Princess Chose You',{startingLocation:'Suzail'});
  const opening=prepareContinuousOpening(c,'',a);
  assert.match(opening.prompt,/PLAYER-CHOSEN STARTING LOCATION: Suzail/);
  assert.match(opening.prompt,/The Princess|adult princess/);
  assert.ok(!opening.prompt.includes('Old Campaign City'));
  assert.equal(opening.character.currentLocation,'');
});
