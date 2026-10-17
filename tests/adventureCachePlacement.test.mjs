import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { adventureContext } from '../src/prompts/adventure.js';
import { prepareSituationAdventure } from '../src/constants/adventures.js';
import { useGame, MODEL_CONFIGS, buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const character=()=>({...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Fighter'},level:3,hp:12,maxHp:12,
  adventure:{title:'Test Adventure',premise:'EXACT PREMISE SENTINEL; preserve this wording.',location:'A garden'}});

for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) {
  test(`${build.name} places the full authoritative Adventure only in stable instructions`,()=>{
    const c=character();
    const p=build(c);
    assert.equal(p.static.split(c.adventure.premise).length-1,1);
    assert.ok(!p.dynamic.includes(c.adventure.premise));
    assert.match(p.static,/\[ADVENTURE COMPLETE\]/);
    assert.match(p.static,/Walking away, delaying it, or changing subjects does not itself complete/);
    assert.match(p.static,/not an instruction to reset the scene/);
    const next={...c,hp:7,currentLocation:'A different town',inventory:[{name:'Rope',qty:2}]};
    assert.equal(adventureContext(next),adventureContext(c));
    assert.ok(build(next).static.includes(c.adventure.premise));
    assert.ok(!build({...c,adventure:null}).static.includes(c.adventure.premise));
    assert.ok(!build({...c,storyMode:'continuous'}).static.includes(c.adventure.premise));
    assert.ok(!build({...c,adventure:{...c.adventure,premise:'Replacement'}}).static.includes(c.adventure.premise));
  });
}

test('chosen divine identity and full premise survive relocation without altering saved state',()=>{
  const c={...character(),adventure:prepareSituationAdventure('Two Gods, One Problem',{deities:['Bane','Tyr']})};
  const before=structuredClone(c);
  assert.ok(adventureContext(c).includes(c.adventure.premise));
  assert.match(adventureContext(c),/Bane .* AND Tyr/);
  assert.deepEqual(c,before);
});

test('all six transports put the Adventure in the cacheable prefix and not the final user message',async()=>{
  const original=globalThis.fetch;
  const c=character();
  const {callDM}=useGame({charRef:{current:c},apiKey:'test',openAiApiKey:'test',xAiApiKey:'test'});
  try {
    for(const [key,build] of [['haiku',buildSystemPrompt],['sonnet',buildSystemPromptSonnet],['gpt',buildSystemPromptSol],['terra',buildSystemPromptTerra],['grok',buildSystemPromptGrok43],['grok46',buildSystemPromptGrok46]]) {
      let body;
      globalThis.fetch=async(url,init)=>{
        body=JSON.parse(init.body);
        return {ok:true,json:async()=>url.includes('anthropic')?{content:[{type:'text',text:'Scene.'}],usage:{}}:{output:[{type:'message',content:[{type:'output_text',text:'Scene.'}]}],usage:{}}};
      };
      await callDM([{role:'user',content:'I accept the invitation.'}],build(c),MODEL_CONFIGS[key]);
      const prefix=body.system?.[0] || body.input[0].content[0];
      assert.ok(prefix.text.includes(c.adventure.premise));
      const messages=body.messages || body.input;
      assert.ok(!JSON.stringify(messages.at(-1)).includes(c.adventure.premise));
      assert.equal(JSON.stringify(body).split(c.adventure.premise).length-1,1);
      if(key==='gpt'||key==='terra') assert.ok(prefix.prompt_cache_breakpoint);
      if(key==='haiku'||key==='sonnet') assert.ok(prefix.cache_control);
    }
  } finally {globalThis.fetch=original;}
});
