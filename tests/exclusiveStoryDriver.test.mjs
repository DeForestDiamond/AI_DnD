import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { ARC_RULES_BLOCK as fullArc } from '../src/prompts/shared.js';
import { ARC_RULES_BLOCK as leanArc } from '../src/prompts/sharedLow.js';
import { ARC_PACING_BLOCK, arcContext } from '../src/prompts/arcPacing.js';
import { CONTINUOUS_STORY_BLOCK } from '../src/prompts/storyOptions.js';
import { useGame, buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const character=()=>({...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Fighter'},level:3,hp:12,maxHp:12,arc:{antagonist:'HIDDEN_ARC_SENTINEL',localArea:'Waterdeep'}});
const adventure={title:'The Princess Chose You',premise:'ADVENTURE_SENTINEL',location:'a palace garden'};
const noArcRules=p=>{
  assert.ok(!p.static.includes(fullArc));assert.ok(!p.static.includes(leanArc));assert.ok(!p.static.includes(ARC_PACING_BLOCK));
  assert.ok(!p.static.includes('Story arc resolved'));
  assert.ok(!p.dynamic.includes('HIDDEN_ARC_SENTINEL'));
  assert.ok(!p.dynamic.includes('reserved-arc aftermath'));
};

for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) {
  test(`${build.name} selects Adventure, active/reserved arc, and Long Story rules exclusively`,()=>{
    for(const fantasyTone of ['standard','full-dark']) {
      for(const combatFirst of [false,true]) {
        const c={...character(),fantasyTone,combatFirst};
        const active=build(c);
        assert.ok(active.static.includes(fullArc)||active.static.includes(leanArc));
        assert.ok(active.static.includes(ARC_PACING_BLOCK));
        assert.match(active.dynamic,/HIDDEN_ARC_SENTINEL/);
        const reserved=build({...c,arc:{...c.arc,status:'reserved'}});
        assert.ok(reserved.static.includes(ARC_PACING_BLOCK));
        assert.match(reserved.dynamic,/RESERVED/);
        const withAdventure={...c,adventure};
        const before=structuredClone(withAdventure);
        const situation=build(withAdventure);
        noArcRules(situation);
        assert.match(situation.dynamic,/Adventure — background situation/);
        assert.deepEqual(withAdventure,before);
        const continuous=build({...withAdventure,storyMode:'continuous'});
        noArcRules(continuous);
        assert.ok(continuous.static.includes(CONTINUOUS_STORY_BLOCK));
        assert.ok(!situation.static.includes(CONTINUOUS_STORY_BLOCK));
        noArcRules(build({...c,arc:null}));
      }
    }
  });
}

test('provider-specific dynamic rebuilding cannot reintroduce an old antagonist into Adventure requests',async()=>{
  const c={...character(),adventure};
  assert.equal(arcContext(c),'');
  const original=globalThis.fetch;
  try {
    let wire;
    globalThis.fetch=async(_url,init)=>{wire=init.body;return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'Scene.'}]}],usage:{}})};};
    const {callDM}=useGame({charRef:{current:c},openAiApiKey:'test',xAiApiKey:'test'});
    for(const provider of ['openai','xai']) {
      await callDM([{role:'user',content:adventure.premise}],buildSystemPromptTerra(c),{provider,model:'test'});
      assert.ok(wire.includes('ADVENTURE_SENTINEL'));
      assert.ok(!wire.includes('HIDDEN_ARC_SENTINEL'));
      assert.ok(!wire.includes('── ACTIVE ARC'));
      assert.ok(!wire.includes('── ARC DEVELOPMENT AND AFTERMATH'));
    }
  } finally {globalThis.fetch=original;}
});
