import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWorldPressures, worldPressureContext } from '../src/helpers/worldPressures.js';
import { WORLD_DYNAMICS_BLOCK, WORLD_FIRST_MOVE, WORLD_CAST_AND_KNOWLEDGE, THREAT_TIMING, WORLD_LOSSES, PRESSURE_RULES } from '../src/prompts/worldDynamics.js';
import { ARC_PACING_BLOCK } from '../src/prompts/arcPacing.js';
import { buildSystemPrompt } from '../src/prompts/haiku.js';
import { buildSystemPromptSonnet } from '../src/prompts/sonnet.js';
import { buildSystemPromptSol } from '../src/prompts/sol.js';
import { buildSystemPromptTerra } from '../src/prompts/terra.js';
import { buildSystemPromptGrok43 } from '../src/prompts/grok43.js';
import { buildSystemPromptGrok46 } from '../src/prompts/grok46.js';
import { useGame, cleanDisplayText } from '../src/hooks/useGame.js';
import { migrateCharacter } from '../src/hooks/character/migration.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { useCharacter } from '../src/hooks/character/useCharacter.js';
import React from 'react';
import { renderToString } from 'react-dom/server';

const initial = '[PRESSURE: temple-siege | Undead at the village temple; barricade holding | Attackers try to breach the doors | Within minutes unless reinforced]';
const makeChar = () => ({ ...structuredClone(EMPTY_CHAR), name: 'Test', race: { name: 'Human' }, cls: { name: 'Fighter' }, stats: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 12 }, level: 1, hp: 12, maxHp: 12, currentLocation: 'Cormyr - Village Tavern', worldPressures: applyWorldPressures(initial), disposition: { alignment: 'Evil', cares: 'rare knowledge and apprentices', indifferent: 'strangers', methods: 'bargains and violence', lines: '' } });

test('pressures persist unchanged through unrelated dialogue; planned losses are not completed facts', () => {
  const saved = applyWorldPressures(initial);
  const next = applyWorldPressures('I order another drink.', saved);
  assert.deepEqual(next, saved);
  assert.notEqual(next, saved);
  assert.match(next['temple-siege'].current, /holding/);
  assert.match(next['temple-siege'].next, /try/);
});

test('pressure updates and closure follow tag order without mutating previous saves', () => {
  const saved = applyWorldPressures(initial);
  const next = applyWorldPressures('[PRESSURE: temple-siege | Doors breached; two villagers dead | Survivors attempt escape | Attackers are inside now]', saved);
  assert.match(next['temple-siege'].current, /two villagers dead/);
  assert.match(saved['temple-siege'].current, /holding/);
  assert.deepEqual(applyWorldPressures('[PRESSURE END: temple-siege]', next), {});
  assert.deepEqual(applyWorldPressures(initial + '[PRESSURE END: temple-siege]'), {});
  assert.ok(applyWorldPressures('[PRESSURE END: temple-siege]' + initial)['temple-siege']);
});

test('malformed and reserved ids do not damage pressure records or object prototypes', () => {
  const saved = applyWorldPressures(initial);
  const invalid = '[PRESSURE: bad | only two fields][PRESSURE: __proto__ | x | y | z][PRESSURE END: temple-siege | extra]';
  assert.deepEqual(applyWorldPressures(invalid, saved), saved);
  assert.equal({}.current, undefined);
});

test('effect application and save migration retain pressures and hide their tags in display', () => {
  let applyEffects;
  function Harness() { applyEffects = useCharacter().applyEffects; return null; }
  renderToString(React.createElement(Harness));
  const c = makeChar();
  delete c.worldPressures;
  const updated = applyEffects('The barricade shudders.\n' + initial, c);
  const loaded = migrateCharacter(JSON.parse(JSON.stringify(updated))).char;
  assert.deepEqual(loaded.worldPressures, applyWorldPressures(initial));
  assert.match(worldPressureContext(loaded), /temple-siege/);
  assert.equal(cleanDisplayText('The barricade shudders.\n' + initial), 'The barricade shudders.');
  assert.deepEqual(applyEffects('[PRESSURE END: temple-siege]', loaded).worldPressures, {});
});

const builders = { haiku: buildSystemPrompt, sonnet: buildSystemPromptSonnet, sol: buildSystemPromptSol, terra: buildSystemPromptTerra, grok43: buildSystemPromptGrok43, grok46: buildSystemPromptGrok46 };
for (const [model, build] of Object.entries(builders)) {
  test(`${model} includes shared world behavior and saved pressure in the actual prompt`, () => {
    const prompt = build(makeChar());
    // No antagonist is assigned here: retain world behavior without arc pacing.
    if (model === 'terra') {
      for (const block of [WORLD_FIRST_MOVE, WORLD_CAST_AND_KNOWLEDGE, THREAT_TIMING, WORLD_LOSSES, PRESSURE_RULES]) {
        assert.equal(prompt.static.split(block).length - 1, 1);
      }
    } else {
      assert.ok(prompt.static.includes(WORLD_DYNAMICS_BLOCK.replace(ARC_PACING_BLOCK,'')));
    }
    assert.match(prompt.dynamic, /temple-siege/);
    assert.match(prompt.dynamic, /barricade holding/);
    assert.ok(!prompt.static.includes('Never resolve travel, combat, violence, or significant events without player input first.'));
  });
}

test('OpenAI and xAI transport retain the pressure ledger after compacting dynamic arc instructions', async () => {
  const c = makeChar();
  c.arc = { antagonist: 'a pack of ghouls', localArea: 'Cormyr', arcLocation: null };
  const { callDM } = useGame({ charRef: { current: c }, openAiApiKey: 'test', xAiApiKey: 'test' });
  const originalFetch = globalThis.fetch;
  try {
    for (const provider of ['openai', 'xai']) {
      let body;
      globalThis.fetch = async (_url, options) => { body = options.body; return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'Scene.' }] }], usage: {} }) }; };
      await callDM([{ role: 'user', content: 'I drink.' }], buildSystemPromptSol(c), { provider, model: 'test' });
      assert.match(body, /temple-siege/);
      assert.match(body, /barricade holding/);
      assert.match(body, /WORLD TAKES ITS TURN/);
    }
  } finally { globalThis.fetch = originalFetch; }
});

