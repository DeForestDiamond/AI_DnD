import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { rollAdventureSeed } from '../src/helpers/adventure/seed.js';
import { makeArc, rollArc, resolveArcLocation } from '../src/constants/encounters/arcLocations.js';
import { antagonistsForLevel } from '../src/constants/encounters/antagonists.js';
import { useCharacter } from '../src/hooks/character/useCharacter.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { migrateCharacter } from '../src/hooks/character/migration.js';
import { useGame } from '../src/hooks/useGame.js';

const beast = 'a displacer beast stalking the woods';
const halaster = 'Halaster Blackcloak, the mad archmage of Undermountain';
const szass = 'Szass Tam, lich and Zulkir of Necromancy, ruler of Thay';

let effects;
function Harness() { effects = useCharacter().applyEffects; return null; }
renderToString(React.createElement(Harness));
const character = () => ({ ...structuredClone(EMPTY_CHAR), level: 1, currentLocation: 'Waterdeep - Dock Ward', arc: makeArc(beast, null, 'Waterdeep - Dock Ward') });

test('flexible threats have no destination; required and chosen destinations survive', () => {
  assert.equal(resolveArcLocation(beast), null);
  assert.equal(resolveArcLocation(beast, 'Cormyr'), 'Cormyr');
  assert.equal(resolveArcLocation(halaster, 'Thay'), 'Undermountain');
  assert.equal(resolveArcLocation('a shadar-kai raiding party out of the Shadowfell'), null);
  assert.equal(resolveArcLocation('an archdevil moving pieces through mortal proxies'), null);
  assert.equal(resolveArcLocation('a spelljammer armada blockading the Astral routes between divine realms'), 'Astral Plane');
  assert.equal(resolveArcLocation('a slaad infestation spreading from a hidden portal to Limbo'), null);
});

test('openings share their antagonist and geography with the arc, across repeated rolls', () => {
  for (let i = 0; i < 500; i++) {
    const seed = rollAdventureSeed(10);
    assert.equal(seed.antagonist, seed.arc.antagonist);
    assert.equal(seed.startingArea, seed.arc.localArea);
    if (seed.arc.arcLocation) assert.equal(seed.startingArea, seed.arc.arcLocation);
  }
});

test('antagonist overrides determine the opening before any geography is rolled', () => {
  for (const [antagonist, area] of [[halaster, 'Undermountain'], [szass, 'Thay']]) {
    const seed = rollAdventureSeed(1, { antagonist });
    assert.equal(seed.antagonist, antagonist);
    assert.equal(seed.startingArea, area);
  }
  assert.equal(rollAdventureSeed(1, { antagonist: beast, arcLocation: 'Cormyr' }).startingArea, 'Cormyr');
});

test('opening rolls honor the defeated ledger', () => {
  const remaining = 'a gang of bandits';
  const defeated = antagonistsForLevel(1).filter(a => a !== remaining);
  for (let i = 0; i < 20; i++) assert.equal(rollAdventureSeed(1, { defeated }).antagonist, remaining);
});

test('later flexible arc rolls remain local rather than rolling a continental destination', () => {
  for (let i = 0; i < 100; i++) {
    const arc = rollArc(1, beast, [], 'Waterdeep - Dock Ward');
    assert.equal(arc.arcLocation, null);
    assert.equal(arc.localArea, 'Waterdeep - Dock Ward');
    assert.notEqual(arc.antagonist, beast);
  }
});

test('completion anchors the next arc to the location established in that response', () => {
  const c = effects('[LOCATION: Waterdeep - Yawning Portal]\n[ARC COMPLETE]', character());
  assert.equal(c.arc.arcLocation, null);
  assert.equal(c.arc.localArea, 'Waterdeep - Yawning Portal');
  assert.ok(c.defeatedAntagonists.includes(beast));
});

test('manual openings acquire a local anchor once, and subsequent travel preserves it', () => {
  let c = character();
  c.arc = makeArc(beast);
  c = effects('[LOCATION: Cormyr - Forest Camp]', c);
  assert.equal(c.arc.localArea, 'Cormyr - Forest Camp');
  c = effects('[LOCATION: Waterdeep - Dock Ward]', c);
  assert.equal(c.arc.localArea, 'Cormyr - Forest Camp');
});

test('legacy save loading no longer invents a destination and preserves existing choices', () => {
  const c = character();
  c._v = 17;
  c.arc = { antagonist: beast };
  assert.equal(migrateCharacter(c).char.arc.arcLocation, null);
  c.arc.arcLocation = 'Cormyr';
  assert.equal(migrateCharacter(c).char.arc.arcLocation, 'Cormyr');
  c.arc = { antagonist: halaster };
  assert.equal(migrateCharacter(c).char.arc.arcLocation, 'Undermountain');
});

test('OpenAI and xAI openings use the prepared arc instead of the previous character state', async () => {
  const previous = character();
  const opening = { ...character(), currentLocation: 'Thay', arc: makeArc(szass, null, 'Thay') };
  const { callDM } = useGame({ charRef: { current: previous }, openAiApiKey: 'test', xAiApiKey: 'test' });
  const originalFetch = globalThis.fetch;
  try {
    for (const provider of ['openai', 'xai']) {
      let request;
      globalThis.fetch = async (_url, options) => {
        request = options.body;
        return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Opening.' }] }], usage: {} }) };
      };
      await callDM([{ role: 'user', content: 'Begin.' }], { static: 'DM rules', dynamic: 'CURRENT STATE:\nLocation: Thay\nACTIVE ARC ANTAGONIST: placeholder' }, { provider, model: 'test' }, null, null, null, opening);
      assert.ok(request.includes(szass));
      assert.ok(request.includes('Thay'));
      assert.ok(!request.includes(beast));
      assert.equal(previous.currentLocation, 'Waterdeep - Dock Ward');
    }
  } finally { globalThis.fetch = originalFetch; }
});
