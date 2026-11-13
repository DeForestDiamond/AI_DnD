import test from 'node:test';
import assert from 'node:assert/strict';
import { DM_ROLE_BLOCK } from '../src/prompts/dmRole.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const cases=[
  [buildSystemPrompt,'Keep responses focused and appropriately paced.'],
  [buildSystemPromptSonnet,'This is a persistent single-player campaign.'],
  [buildSystemPromptSol,'This is a persistent single-player campaign.'],
  [buildSystemPromptTerra,'This is a persistent single-player campaign.'],
  [buildSystemPromptGrok43,'Run it as an active, immersive world rather than a turn-by-turn command parser.'],
  [buildSystemPromptGrok46,'This is a persistent single-player campaign.'],
];
for(const [build,retained] of cases) test(`${build.name}: impartial referee instruction stays first across story settings`,()=>{
  for(const storyMode of ['arcs','continuous']) for(const fantasyTone of ['standard','full-dark']) for(const combatFirst of [false,true]) {
    for(const driver of [{arc:{antagonist:'Ghouls',status:'active'}},{adventure:{title:'Test',premise:'Test situation'}}]) {
      const char={...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Fighter'},level:3,hp:12,maxHp:12,...driver,storyMode,fantasyTone,combatFirst};
      const prompt=build(char);
      assert.ok(prompt.static.startsWith(DM_ROLE_BLOCK));
      assert.equal(prompt.static.split(DM_ROLE_BLOCK).length-1,1);
      assert.ok(prompt.static.includes(retained));
      assert.ok(!prompt.dynamic.includes(DM_ROLE_BLOCK));
    }
  }
});
