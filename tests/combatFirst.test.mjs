import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { migrateCharacter } from '../src/hooks/character/migration.js';
import { changeStoryOptions, isCombatFirst } from '../src/helpers/storyOptions.js';
import { COMBAT_FIRST_BLOCK } from '../src/prompts/storyOptions.js';
import { rollEncounterDirective } from '../src/constants/encounters/roller.js';
import { useGame, buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const character = () => ({ ...structuredClone(EMPTY_CHAR), name:'Test', race:{name:'Human'}, cls:{name:'Fighter'}, level:1, hp:12, maxHp:12, currentLocation:'Waterdeep - Tavern', arc:{antagonist:'a pack of ghouls',localArea:'Waterdeep',arcLocation:null} });

test('combat preference defaults off, persists through saving, and toggles independently of story drivers', () => {
  const c=character();
  assert.equal(isCombatFirst(c),false);
  const enabled=changeStoryOptions(c,{combatFirst:true});
  assert.equal(c.combatFirst,undefined);
  assert.deepEqual(enabled.arc,c.arc);
  assert.equal(isCombatFirst(migrateCharacter(JSON.parse(JSON.stringify(enabled))).char),true);
  const combined=changeStoryOptions(enabled,{storyMode:'continuous',fantasyTone:'full-dark'});
  const disabled=changeStoryOptions(combined,{combatFirst:false});
  assert.equal(disabled.storyMode,'continuous');
  assert.equal(disabled.fantasyTone,'full-dark');
  assert.deepEqual(disabled.suspendedStoryDriver,combined.suspendedStoryDriver);
  assert.equal(isCombatFirst(disabled),false);
});

for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) {
  test(`${build.name} receives strict combat rules in every story/tone combination only when enabled`, () => {
    for(const storyMode of ['arcs','continuous']) {
      for(const fantasyTone of ['standard','full-dark']) {
        const c={...character(),storyMode,fantasyTone,combatFirst:true};
        const enabled=build(c);
        assert.ok(enabled.static.includes(COMBAT_FIRST_BLOCK));
        assert.match(enabled.dynamic,/Combat-first encounters/);
        assert.match(enabled.static,/NPC KNOWLEDGE HAS A SOURCE/);
        const disabled=build({...c,combatFirst:false});
        assert.ok(!disabled.static.includes(COMBAT_FIRST_BLOCK));
        assert.ok(!disabled.dynamic.includes('Combat-first encounters'));
      }
    }
  });
}

test('hostile random encounter directives reinforce combat intent without changing social/weird rolls or resolving attacks', () => {
  const original=Math.random;
  try {
    for(const [first,type] of [[0.1,'hostile'],[0.7,'social'],[0.9,'weird']]) {
      let calls=0;
      Math.random=()=>calls++===0?first:0;
      const encounter=rollEncounterDirective({...character(),arc:null,combatFirst:true});
      assert.equal(encounter.type,type);
      assert.equal(encounter.directive.includes('COMBAT-FIRST:'),type==='hostile');
      assert.match(encounter.directive,/Do NOT call any \[ROLL:\]/);
      calls=0;
      const disabled=rollEncounterDirective({...character(),arc:null,combatFirst:false});
      assert.equal(disabled.type,type);
      assert.equal(disabled.desc,encounter.desc);
      assert.ok(!disabled.directive.includes('COMBAT-FIRST:'));
    }
  } finally {Math.random=original;}
});

test('OpenAI/xAI compact transport retains combat preference with standard settings', async () => {
  const c={...character(),combatFirst:true};
  const {callDM}=useGame({charRef:{current:c},openAiApiKey:'test',xAiApiKey:'test'});
  const original=globalThis.fetch;
  try {
    for(const provider of ['openai','xai']) {
      let body;
      globalThis.fetch=async (_url,options)=>{body=options.body;return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'Scene.'}]}],usage:{}})};};
      await callDM([{role:'user',content:'I approach the raiders.'}],buildSystemPromptSol(c),{provider,model:'test'});
      assert.match(body,/COMBAT-FIRST ENCOUNTERS: STRICT PLAY PREFERENCE/);
      assert.match(body,/THE PLAYER MUST TALK THEIR WAY OUT OF A FIGHT, NOT INTO ONE/);
      assert.match(body,/a pack of ghouls/);
    }
  } finally {globalThis.fetch=original;}
});
