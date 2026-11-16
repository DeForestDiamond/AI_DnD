import test from 'node:test';
import assert from 'node:assert/strict';
import { useGame, MODEL_CONFIGS } from '../src/hooks/useGame.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { normalizeUsage } from '../src/helpers/debug/tokenCostLog.js';

test('Grok 4.6 and 4.7 selections route narration and caching to their own models', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'The gates open.' }] }] }) };
  };
  try {
    for (const key of ['grok46', 'grok47']) {
    const config = MODEL_CONFIGS[key];
    const game = useGame({ charRef: { current: { ...structuredClone(EMPTY_CHAR), name: 'Cassian' } }, xAiApiKey: 'test' });
    const result = await game.callDM([{ role: 'user', content: 'Open the gate.' }], 'DM rules', config);
    assert.equal(request.url, 'https://api.x.ai/v1/responses');
    assert.equal(request.body.model, key === 'grok46' ? 'grok-4.6' : 'grok-4.7');
    assert.equal(request.body.prompt_cache_key, `ai-dnd:${config.model}:Cassian`);
    assert.deepEqual(request.body.reasoning, { effort: 'low' });
    assert.equal(config.label, key === 'grok46' ? 'Grok 4.6' : 'Grok 4.7');
    assert.equal(result.text, 'The gates open.');
    }
    assert.equal(MODEL_CONFIGS.grok.model, 'grok-4.3');
  } finally { globalThis.fetch = originalFetch; }
});

test('Grok 4.7 estimates retain verified standard input, cached input and output rates', () => {
  const usage = normalizeUsage('grok47', { input_tokens: 10000, input_tokens_details: { cached_tokens: 8000 }, output_tokens: 1000 });
  assert.ok(Math.abs(usage.cost - 0.014) < 1e-10);
});
