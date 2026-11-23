import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { SCENE_PACING_BLOCK } from '../src/prompts/worldDynamics.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const character=()=>({...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Fighter'},level:3,hp:12,maxHp:12,
  worldPressures:{siege:{current:'A barricade is holding',next:'Raiders attempt to breach it',timing:'Ten minutes of sustained attack'}}});

for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) {
  test(`${build.name} allows quiet scenes in all modes while retaining causal danger and explicit encounters`,()=>{
    for(const storyMode of ['arcs','continuous']) {
      for(const fantasyTone of ['standard','full-dark']) {
        for(const combatFirst of [false,true]) {
          for(const driver of [{arc:{antagonist:'Raiders'}},{adventure:{title:'The Princess Chose You',premise:'Tea and courtship'}}]) {
            const p=build({...character(),...driver,storyMode,fantasyTone,combatFirst});
            assert.ok(!/two dialogue or investigation scenes|Something must force movement|EVERY SCENE NEEDS A HOOK|Every scene needs a hook|Something must always be at stake|ACTION OVER DESCRIPTION/.test(p.static));
            if (build === buildSystemPromptTerra) {
              assert.equal(p.static.split('FOLLOW THE SCENE.').length - 1, 1);
              assert.match(p.static,/the activity the player chose for as long as it is meaningful/);
              assert.match(p.static,/established pressure coming due, or an explicit encounter directive/);
              assert.match(p.static,/compress uneventful time and stop at their next real decision/);
              assert.match(p.static,/never by message count/);
            } else {
              assert.equal(p.static.split(SCENE_PACING_BLOCK).length-1,1);
              assert.match(p.static,/Existing attacks, pursuits, hazards, deadlines/);
              assert.match(p.static,/NPCs still speak, react, and pursue their own motives/);
              assert.match(p.static,/Honor explicit \[ENCOUNTER\] directives/);
              assert.match(p.static,/Never count dialogue turns or scenes/);
            }
            assert.match(p.dynamic,/A barricade is holding/);
            assert.match(p.dynamic,/Ten minutes of sustained attack/);
          }
        }
      }
    }
  });
}
