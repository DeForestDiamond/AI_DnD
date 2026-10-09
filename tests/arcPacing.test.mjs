import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { useCharacter } from '../src/hooks/character/useCharacter.js';
import { migrateCharacter } from '../src/hooks/character/migration.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { rollEncounterDirective } from '../src/constants/encounters/roller.js';
import { ARC_PACING_BLOCK } from '../src/prompts/arcPacing.js';
import { useGame, buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46, cleanDisplayText } from '../src/hooks/useGame.js';

let effects;
function Harness() { effects = useCharacter().applyEffects; return null; }
renderToString(React.createElement(Harness));
const character = () => ({ ...structuredClone(EMPTY_CHAR), name: 'Test', race: { name: 'Human' }, cls: { name: 'Fighter' }, level: 1, hp: 12, maxHp: 12, currentLocation: 'Waterdeep - Dock Ward', arc: { antagonist: 'a pack of ghouls', localArea: 'Waterdeep', arcLocation: null }, worldPressures: { fire: { current: 'A house is burning', next: 'Roof may collapse', trigger: 'Minutes without intervention' } } });

test('completion reserves the next foe while rewards and existing pressure can continue', () => {
  const initial = character();
  const next = effects('[ARC COMPLETE]', initial);
  assert.equal(next.arc.status, 'reserved');
  assert.equal(next.arc.previousAntagonist, initial.arc.antagonist);
  assert.notEqual(next.arc.antagonist, initial.arc.antagonist);
  assert.ok(next.defeatedAntagonists.includes(initial.arc.antagonist));
  assert.deepEqual(next.worldPressures, initial.worldPressures);
  assert.deepEqual(effects('I collect my reward.', next).arc, next.arc);
  assert.deepEqual(migrateCharacter(JSON.parse(JSON.stringify(next))).char.arc, next.arc);
  assert.equal(initial.arc.status, undefined);
});

test('repeated completion cannot skip the reserved foe or activate it in the same response', () => {
  const reserved = effects('[ARC COMPLETE][ARC START]', character());
  assert.equal(reserved.arc.status, 'reserved');
  const repeated = effects('[ARC COMPLETE][ARC START]', reserved);
  assert.deepEqual(repeated.arc, reserved.arc);
  assert.deepEqual(repeated.defeatedAntagonists, reserved.defeatedAntagonists);
});

test('choosing a new opportunity activates the reserved foe without rerolling geography', () => {
  const reserved = effects('[ARC COMPLETE]', character());
  const active = effects('[ARC START]', reserved);
  assert.deepEqual(active.arc, { ...reserved.arc, status: 'active' });
  assert.equal(cleanDisplayText('You accept the contract. [ARC START]'), 'You accept the contract.');
  assert.deepEqual(effects('[ARC START]', active).arc, active.arc);
});

test('random encounters cannot recruit the reserved antagonist, across all encounter types', () => {
  const random = Math.random;
  try {
    for (const first of [0.1, 0.7, 0.9]) {
      let calls = 0;
      Math.random = () => calls++ === 0 ? first : 0;
      const reserved = { ...character(), arc: { ...character().arc, status: 'reserved' } };
      const encounter = rollEncounterDirective(reserved);
      assert.equal(encounter.arcTied, false);
      assert.ok(!encounter.desc.includes(reserved.arc.antagonist));
      calls = 0;
      assert.equal(rollEncounterDirective(character()).arcTied, true);
    }
  } finally { Math.random = random; }
});

for (const build of [buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46]) {
  test(`${build.name} supplies aftermath phase and pacing rules`, () => {
    const c = effects('[ARC COMPLETE]', character());
    const prompt = build(c);
    assert.ok(prompt.static.includes(ARC_PACING_BLOCK));
    assert.match(prompt.dynamic, /NONE — AFTERMATH/);
    assert.match(prompt.dynamic, /RESERVED — not active/);
    assert.match(prompt.dynamic, /\[ARC START\]/);
  });
}

test('OpenAI and xAI compact transport preserve reserve status and activation instructions', async () => {
  const c = effects('[ARC COMPLETE]', character());
  const { callDM } = useGame({ charRef: { current: c }, openAiApiKey: 'test', xAiApiKey: 'test' });
  const originalFetch = globalThis.fetch;
  try {
    for (const provider of ['openai', 'xai']) {
      let body;
      globalThis.fetch = async (_url, options) => { body = options.body; return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Scene.' }] }], usage: {} }) }; };
      await callDM([{ role: 'user', content: 'I collect my reward.' }], buildSystemPromptSol(c), { provider, model: 'test' });
      assert.match(body, /NONE — AFTERMATH/);
      assert.match(body, /RESERVED — not active/);
      assert.match(body, /ARC START/);
    }
  } finally { globalThis.fetch = originalFetch; }
});
