import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { buildSystemPromptTerra, MODEL_CONFIGS, useGame } from '../src/hooks/useGame.js';
import { playerArcOpening, seededArcOpening } from '../src/prompts/arcOpening.js';

const directives = 'Let the crew work.\nPower does not snowball. Keep this exact line.\nSTORY SCOPE: Follow the voyage.';
const character = {
  ...structuredClone(EMPTY_CHAR), name: 'Pilot', level: 3, hp: 12, maxHp: 12,
  directives, disposition: { cares: 'the crew', indifferent: 'court gossip' },
  cls: { name: 'Fighter' }, race: { name: 'Human' },
  worldPressures: { gate: { current: 'The gate holds', next: 'Raiders try the latch', timing: 'At dawn' } },
};

test('Terra sends the five rules and original standing instructions in every story mode', async t => {
  let body;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ output_text: 'Scene.', usage: {} }) };
  });
  const arc = { antagonist: 'Smugglers', localArea: 'Waterdeep' };
  const adventure = { title: 'A voyage', premise: 'A ferry goes missing' };
  for (const driver of [{arc}, {arc:{...arc,status:'reserved'}}, {adventure,arc}, {}, {storyMode:'continuous',arc}]) {
    for (const fantasyTone of ['standard','full-dark']) for (const combatFirst of [false,true]) {
      const char = {...character, ...driver, fantasyTone, combatFirst};
      const { callDM } = useGame({charRef:{current:char}, openAiApiKey:'test'});
      await callDM([{role:'user',content:'I inspect the pin.'}], buildSystemPromptTerra(char), MODEL_CONFIGS.terra);
      const rules = body.input[0].content[0].text;
      const latest = body.input.at(-1).content[0].text;
      for (const heading of ['FOLLOW THE SCENE.', 'GIVE INVESTIGATION A PAYOFF.', 'MAKE AN OPPORTUNITY WORTH CONSIDERING.', 'LET PEOPLE DO THEIR JOBS.', 'OFFER FOUR WAYS TO RESPOND.']) {
        assert.equal(rules.split(heading).length - 1, 1, heading);
      }
      assert.ok(rules.includes(directives));
      assert.match(rules,/CARES ABOUT: the crew/);
      assert.match(rules,/INDIFFERENT TO: court gossip/);
      assert.match(rules,/what it is, what it does, why it matters here and what they can reasonably predict/);
      assert.match(rules,/Once the available evidence answers the question, say so and let that inquiry finish/);
      assert.doesNotMatch(rules,/is ignored, dismissed, or exploited|── THREAD DISCIPLINE|SCENE CLARITY — ESTABLISH/);
      assert.match(latest,/The gate holds/);
      assert.doesNotMatch(latest,/HOOKS:|HOOKS — ARC OR NO ARC|BEFORE YOU WRITE|\[OBJECTIVE:/);
    }
  }
});

test('Terra arc openings preserve geography, player wording and four grounded suggestions', () => {
  const opening = 'I am in the harbour. Power does not snowball. A ferryman approaches.';
  const seed = { antagonist:'Dock smugglers', startingArea:'Waterdeep', wildcard:'A blue sail', hook:'A stranded ferryman' };
  const generated = seededArcOpening(character, seed, 'terra');
  assert.match(generated,/GEOGRAPHIC ANCHOR .*Waterdeep/);
  assert.match(generated,/ANTAGONIST .*Dock smugglers/);
  assert.match(generated,/records its pressure/);
  const written = playerArcOpening(character, opening, 'terra');
  assert.ok(written.includes(opening));
  for (const text of [generated,written]) {
    assert.match(text,/four current-scene suggestions/);
    assert.doesNotMatch(text,/at least one ruthless or self-serving/i);
  }
  for (const model of Object.keys(MODEL_CONFIGS).filter(key => key !== 'terra')) {
    assert.match(playerArcOpening(character, opening, model),/at least one ruthless or self-serving/);
    assert.match(seededArcOpening(character, seed, model),/at least one ruthless or self-serving/);
  }
});
