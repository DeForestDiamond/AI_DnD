import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { CONFLICT_RESISTANCE_BLOCK } from '../src/prompts/conflict.js';
import { SETTING_SOCIAL_RULES } from '../src/prompts/socialNorms.js';
import { PLAYER_AGENCY_BLOCK } from '../src/prompts/playerAgency.js';
import { CHARACTER_CHOICES_BLOCK as fullChoices } from '../src/prompts/shared.js';
import { CHARACTER_CHOICES_BLOCK as leanChoices } from '../src/prompts/sharedLow.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const character=()=>({...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Fighter'},level:3,hp:12,maxHp:12});
const copies=(text,block)=>text.split(block).length-1;
const cases=[
  [buildSystemPrompt,leanChoices,58906],
  [buildSystemPromptSonnet,fullChoices,50506],
  [buildSystemPromptSol,fullChoices,61618],
  [buildSystemPromptTerra,leanChoices,55899],
  [buildSystemPromptGrok43,null,37798],
  [buildSystemPromptGrok46,fullChoices,45467],
];

for(const [build,choices,before] of cases) {
  test(`${build.name} includes consolidated safeguards once while retaining its shared variant`,()=>{
    for(const storyMode of ['arcs','continuous']) {
      for(const fantasyTone of ['standard','full-dark']) {
        for(const driver of [{arc:{antagonist:'Ghouls'}},{adventure:{title:'Test',premise:'Test'}}]) {
          const c={...character(),...driver,storyMode,fantasyTone};
          const p=build(c);
          assert.equal(copies(p.static,CONFLICT_RESISTANCE_BLOCK),1);
          assert.equal(copies(p.static,SETTING_SOCIAL_RULES),1);
          assert.equal(copies(p.static,'NPC KNOWLEDGE HAS A SOURCE.'),1);
          assert.equal(copies(p.static,'GENDER BALANCE APPLIES WITHIN ROLES'),1);
          assert.equal(copies(p.static,PLAYER_AGENCY_BLOCK),choices?1:0);
          if(choices) assert.ok(p.static.includes(choices));
          assert.match(p.static,/Half-elves alone do not satisfy/);
          assert.match(p.static,/permission to inspect is not completed inspection/);
          assert.match(p.static,/undead attack/);
          assert.match(p.static,/never by message count/);
          assert.match(p.static,/actually witnessed/);
        }
      }
    }
    // Measure core instructions without an Adventure payload: that payload now
    // lives in the system block rather than on the outgoing user message.
    const p=build({...character(),arc:null});
    assert.ok(Object.values(p).join('').length < before);
  });
}

test('model-specific narration and pacing choices survive consolidation',()=>{
  const c=character();
  const haiku=buildSystemPrompt(c);
  assert.match(haiku.static,/HAIKU REMINDER/);
  assert.match(haiku.static,/TIME & DISTANCE/);
  assert.match(haiku.static,/BIO IS NOT THE PLOT/);
  assert.match(buildSystemPromptSonnet(c).static,/Maximum 3 paragraphs, 200 words/);
  assert.match(buildSystemPromptTerra(c).static,/250–450 words/);
  assert.match(buildSystemPromptSol(c).static,/FORWARD MOTION/);
  assert.match(buildSystemPromptGrok46(c).static,/at least 2 narrative paragraphs/);
  const grok43=buildSystemPromptGrok43(c).static;
  assert.match(grok43,/Freely carry clear intent through ordinary intermediate actions/);
  assert.match(grok43,/NO target paragraph count/);
  assert.ok(!grok43.includes(PLAYER_AGENCY_BLOCK));
});
