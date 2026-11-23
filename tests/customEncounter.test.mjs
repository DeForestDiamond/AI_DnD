import assert from 'node:assert/strict';
import test from 'node:test';
import { rollCustomEncounter } from '../src/constants/encounters.js';

const description = 'An apprentice accidentally summons the player.';

test('custom encounters only enter the prompt below their configured percentage', () => {
  const event = { description, chance: 2.5 };
  assert.ok(rollCustomEncounter(event, () => 0.0249).includes(description));
  assert.equal(rollCustomEncounter(event, () => 0.025), '');
  assert.ok(rollCustomEncounter({description, chance:100}, () => 0.99999).includes(description));
});

test('unused or invalid custom encounters do not roll or affect the regular encounter RNG', () => {
  const unexpected = () => assert.fail('an inactive custom encounter rolled');
  for (const chance of [0, -1, 101, null, undefined, NaN]) {
    assert.equal(rollCustomEncounter({description, chance}, unexpected), '');
  }
  assert.equal(rollCustomEncounter(undefined, unexpected), '');
  assert.equal(rollCustomEncounter({description:'  ', chance:100}, unexpected), '');
});
