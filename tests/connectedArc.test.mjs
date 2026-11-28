import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useCharacter } from '../src/hooks/character/useCharacter.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { migrateCharacter } from '../src/hooks/character/migration.js';
import { changeStoryOptions, hasConnectedArc } from '../src/helpers/storyOptions.js';
import { prepareConnectedOpening } from '../src/prompts/arcOpening.js';
import { CONNECTED_ARCS } from '../src/constants/connectedArcs.js';
import { CONNECTED_ARC_RULES } from '../src/prompts/connectedArc.js';
import { ARC_PACING_BLOCK } from '../src/prompts/arcPacing.js';
import { MODEL_CONFIGS, useGame, buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const builders = { sonnet: buildSystemPromptSonnet, haiku: buildSystemPrompt, gpt: buildSystemPromptSol, terra: buildSystemPromptTerra, grok: buildSystemPromptGrok43, grok46: buildSystemPromptGrok46, grok47: buildSystemPromptGrok46 };
const definition = {
  kind: 'connected', title: 'The Missing Cargo', centralConflict: 'Captured animals are being shipped out of town.',
  members: [{ name: 'Trappers', role: 'Capture live animals.' }, { name: 'The broker', role: 'Pays for the animals and arranges transport.' }],
  relationships: ['The broker pays the trappers on delivery.'], arcLocation: 'Daggerford',
};
const previous = { ...EMPTY_CHAR, name: 'Test', arc: { antagonist: 'Previous foe' }, currentLocation: 'Previous port', adventure: { title: 'Previous adventure' }, worldPressures: { fire: {} } };
let applyEffects;
function Harness() { applyEffects = useCharacter().applyEffects; return null; }
renderToString(React.createElement(Harness));

test('a connected opening sets its active roster before the opening request', () => {
  const { character, prompt } = prepareConnectedOpening(previous, definition, 'terra', 'I am visiting my sister.');
  assert.ok(hasConnectedArc(character));
  assert.equal(character.arc.status, 'active');
  assert.equal(character.currentLocation, 'Daggerford');
  assert.equal(character.adventure, undefined);
  assert.equal(character.worldPressures, undefined);
  assert.match(prompt, /I am visiting my sister\./);
  assert.doesNotMatch(prompt, /trappers|broker/i);
  assert.throws(() => prepareConnectedOpening(previous, { ...definition, members: [] }), /at least two/);
  assert.equal(prepareConnectedOpening(previous, { ...definition, arcLocation: '' }).character.currentLocation, '');
});

test('arc transitions and save loading preserve the roster without assigning a successor', () => {
  const { character } = prepareConnectedOpening(previous, definition);
  const reserved = { ...character, arc: { ...character.arc, status: 'reserved' } };
  assert.deepEqual(applyEffects('[ARC COMPLETE][ARC START]', reserved).arc, reserved.arc);
  assert.deepEqual(applyEffects('[ARC START]', reserved).arc, character.arc);
  const progress = applyEffects('[OBJECTIVE: Trace the shipment]', character);
  assert.deepEqual(progress.arc, { ...character.arc, objectives: [{ text: 'Trace the shipment', done: false }] });
  const resolved = applyEffects('[ARC COMPLETE]', progress);
  assert.deepEqual(resolved.arc, { ...progress.arc, status: 'completed' });
  assert.deepEqual(resolved.defeatedAntagonists, character.defeatedAntagonists);
  assert.deepEqual(applyEffects('[ARC COMPLETE][ARC START]', resolved).arc, resolved.arc);
  assert.deepEqual(migrateCharacter(JSON.parse(JSON.stringify(resolved))).char.arc, resolved.arc);
  const paused = changeStoryOptions(progress, { storyMode: 'continuous' });
  assert.deepEqual(changeStoryOptions(paused, { storyMode: 'arcs' }).arc, progress.arc);
  for (const otherDriver of [{ storyMode: 'continuous' }, { adventure: { title: 'Other adventure' } }]) {
    assert.deepEqual(applyEffects('[ARC START]', { ...reserved, ...otherDriver }).arc, reserved.arc);
    assert.deepEqual(applyEffects('[ARC COMPLETE]', { ...progress, ...otherDriver }).arc, progress.arc);
  }
});

for (const [model, build] of Object.entries(builders)) {
  test(`${model} sends the connected rules and current phase on the actual request path`, async t => {
    let body;
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
      body = options.body;
      return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'Scene.' }], output: [{ type: 'message', content: [{ type: 'output_text', text: 'Scene.' }] }] }) };
    });
    const { character, prompt } = prepareConnectedOpening(previous, definition, model);
    const charRef = { current: previous };
    const { callDM } = useGame({ charRef, apiKey: 'test', openAiApiKey: 'test', xAiApiKey: 'test' });
    for (const fantasyTone of ['standard', 'full-dark']) {
      for (const combatFirst of [false, true]) {
        for (const status of ['active', 'reserved', 'completed']) {
          const current = { ...character, fantasyTone, combatFirst, arc: { ...character.arc, status } };
          const system = build(current);
          assert.ok(system.static.includes(CONNECTED_ARC_RULES));
          assert.ok(!system.static.includes(ARC_PACING_BLOCK));
          assert.doesNotMatch(system.static, /the scene goes quiet|── DON'T ESCALATE ──/i);
          const opening = status === 'active';
          charRef.current = opening ? previous : current;
          await callDM([{ role: 'user', content: opening ? prompt : 'I follow the wagon.' }], system, MODEL_CONFIGS[model], null, null, null, opening ? current : null);
          assert.equal(JSON.parse(body).model, MODEL_CONFIGS[model].model);
          assert.equal(body.split('── CONNECTED ANTAGONIST ARC ──').length - 1, 1);
          assert.doesNotMatch(body, /Previous foe|Previous adventure|Previous port/);
          if (status === 'completed') {
            assert.match(body, /Phase: AFTERMATH/);
            assert.ok(!body.includes(definition.relationships[0]));
          } else {
            assert.ok(body.includes('Phase: ' + status.toUpperCase()));
            assert.equal(body.split(definition.relationships[0]).length - 1, 1);
            assert.ok(body.includes(definition.centralConflict));
            for (const member of definition.members) assert.ok(body.includes(member.name + ': ' + member.role));
          }
        }
      }
    }
    for (const otherDriver of [{ adventure: { title: 'Another Adventure' } }, { storyMode: 'continuous' }, { arc: previous.arc }, { arc: null }]) {
      const system = build({ ...character, ...otherDriver });
      assert.ok(!system.static.includes(CONNECTED_ARC_RULES));
      assert.ok(!system.dynamic.includes(definition.relationships[0]));
    }
  });
}

test('Empty Cages commissions survive shortcuts, completion and reload, and pay only once', () => {
  const definition = CONNECTED_ARCS.find(arc => arc.title === 'Empty Cages');
  const { character, prompt } = prepareConnectedOpening({ ...previous, level: 20, coins: 100 }, definition, 'gpt');
  assert.match(prompt, /offering 250 gp/);
  assert.match(prompt, /sealed stacks/);
  assert.deepEqual(character.arc.commissions.map(c => c.gp), [250, 500, 1000, 2000]);
  assert.equal(applyEffects('The patron offers 250 gp.', character).coins, 100);
  const partial = applyEffects('[COMMISSION PAID: 3][COMMISSION PAID: 1][COMMISSION PAID: 1][ARC COMPLETE]', character);
  assert.equal(partial.coins, 125100);
  const loaded = migrateCharacter(JSON.parse(JSON.stringify(partial))).char;
  assert.equal(loaded.arc.status, 'completed');
  const context = buildSystemPromptTerra(loaded).dynamic;
  assert.match(context, /250 gp \(paid\)/);
  assert.match(context, /2000 gp \(unpaid\)/);
  assert.match(context, /royal favor/);
  const paid = applyEffects('[COMMISSION PAID: 1][COMMISSION PAID: 2][COMMISSION PAID: 4][COMMISSION PAID: 5]', loaded);
  assert.equal(paid.coins, 375100);
  assert.ok(paid.arc.commissions.every(c => c.paid));
  assert.equal(applyEffects('[COMMISSION PAID: 4]', paid).coins, paid.coins);
  assert.equal(applyEffects('[COMMISSION PAID: 4]', { ...character, storyMode: 'continuous' }).coins, character.coins);
});
