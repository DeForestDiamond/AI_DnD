import test from 'node:test';
import assert from 'node:assert/strict';
import { useGame, MODEL_CONFIGS } from '../src/hooks/useGame.js';
import { generateAdventureArc } from '../src/helpers/adventure/arc.js';
import { armAnthropicCacheKeepWarm } from '../src/helpers/anthropic/cache.js';
import { normalizeUsage } from '../src/helpers/debug/tokenCostLog.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';

const character = () => ({...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Fighter'},level:1,hp:12,maxHp:12,stats:{str:12,dex:12,con:12,int:12,wis:12,cha:12}});
const game = () => useGame({apiKey:'test',charRef:{current:character()}});
const withResponse = async (data, run) => {
  const original=globalThis.fetch;
  let body;
  globalThis.fetch=async (_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>data};};
  try {await run(()=>body);} finally {globalThis.fetch=original;}
};

test('Haiku narration uses the current ID and low adaptive effort, reading text after thinking blocks', async () => {
  await withResponse({content:[{type:'thinking',thinking:'',signature:'sig'},{type:'text',text:'The raiders advance.'},{type:'text',text:'What do you do?'}],usage:{output_tokens:80}},async body=>{
    const result=await game().callDM([{role:'user',content:'I approach.'}],'DM prompt',MODEL_CONFIGS.haiku);
    assert.equal(body().model,'claude-haiku-5-5');
    assert.deepEqual(body().output_config,{effort:'low'});
    assert.equal(body().max_tokens,4096);
    for(const field of ['temperature','top_p','top_k','thinking'])assert.ok(!(field in body()));
    assert.equal(result.text,'The raiders advance.\nWhat do you do?');
    assert.equal(result.usage.output_tokens,80);
  });
});

test('thinking-only exhaustion and refusals produce errors rather than placeholder narration', async () => {
  for(const [reason,pattern] of [['max_tokens',/output budget/],['refusal',/declined/]]) {
    await withResponse({stop_reason:reason,content:[{type:'thinking',thinking:'',signature:'sig'}]},async ()=>{
      await assert.rejects(game().callDM([{role:'user',content:'Continue.'}],'DM prompt',MODEL_CONFIGS.haiku),pattern);
    });
  }
});

test('arc generation accepts Haiku thinking followed by JSON and carries its effort configuration', async () => {
  await withResponse({content:[{type:'thinking',thinking:'',signature:'sig'},{type:'text',text:'{"goal":"Stop the raids.","objective":"Find their camp."}'}]},async body=>{
    const result=await generateAdventureArc({antagonist:'raiders',character:character(),modelConfig:MODEL_CONFIGS.haiku,anthropicApiKey:'test'});
    assert.equal(body().model,'claude-haiku-5-5');
    assert.deepEqual(body().output_config,{effort:'low'});
    assert.equal(body().max_tokens,2048);
    assert.equal(result.goal,'Stop the raids.');
    assert.deepEqual(result.objectives,[{text:'Find their camp.',done:false}]);
  });
});

test('cache warm-up uses the selected model instead of warming Sonnet for Haiku', async () => {
  await withResponse({usage:{cache_read_input_tokens:5000}},async body=>{
    await game().pingCache({static:'Stable DM prompt'},'haiku');
    assert.equal(body().model,'claude-haiku-5-5');
    assert.deepEqual(body().output_config,{effort:'low'});
    assert.equal(body().max_tokens,1);
    await game().pingCache({static:'Stable DM prompt'},'sonnet');
    assert.equal(body().model,MODEL_CONFIGS.sonnet.model);
    assert.ok(!('output_config' in body()));
  });
});

test('scheduled cache warm-up forwards the selected model', async () => {
  const original=globalThis.setTimeout;
  let callback, received;
  globalThis.setTimeout=fn=>{callback=fn;return 1;};
  try {
    armAnthropicCacheKeepWarm({timerRef:{current:null},selectedModel:'haiku',charRef:{current:character()},pingCache:async (_prompt,key)=>{received=key;return {};}});
    await callback();
    assert.equal(received,'haiku');
  } finally {globalThis.setTimeout=original;}
});

test('Haiku cost estimates use current base and long-context rates including cached input', () => {
  const base=normalizeUsage('haiku',{input_tokens:10000,output_tokens:1000,cache_read_input_tokens:8000,cache_creation_input_tokens:2000});
  assert.ok(Math.abs(base.cost-0.00183)<1e-10);
  const atThreshold=normalizeUsage('haiku',{input_tokens:100000,output_tokens:0});
  assert.ok(Math.abs(atThreshold.cost-0.01)<1e-10);
  const above=normalizeUsage('haiku',{input_tokens:50001,cache_read_input_tokens:50000,output_tokens:1000});
  assert.ok(Math.abs(above.cost-0.0300005)<1e-10);
});
