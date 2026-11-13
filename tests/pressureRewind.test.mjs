import test from 'node:test';
import assert from 'node:assert/strict';
import { applyWorldPressures, restoreWorldPressuresForHistory, worldPressureContext } from '../src/helpers/worldPressures.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46, useGame } from '../src/hooks/useGame.js';

const message=(role,text,id)=>({role,text,id});
const opening='[PRESSURE: siege | Raiders are outside the gate | They will attempt a breach | After ten minutes]';
const updated='[PRESSURE: siege | Raiders have breached the gate | They will reach the square | In five minutes]';
const later='[PRESSURE: pursuit | A witness reported the theft | Guards will search the inn | At dawn]';
const history=[
  message('dm',opening,1),
  message('user','I wait.',2),
  message('dm',updated+'\n'+later+'[GOLD: +100]',3),
  message('user','I stop the raiders.',4),
  message('dm','[PRESSURE END: siege]',5),
];
const character=()=>({...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Fighter'},stats:{str:16,dex:12,con:14,int:10,wis:10,cha:10},level:3,hp:12,maxHp:12,coins:1234,worldPressures:applyWorldPressures(later)});

test('editing before a pressure update restores its earlier state and drops pressures from discarded events',()=>{
  const char=character(),before=structuredClone(char);
  const restored=restoreWorldPressuresForHistory(char,history.slice(0,1));
  assert.deepEqual(restored.worldPressures,applyWorldPressures(opening));
  assert.ok(!restored.worldPressures.pursuit);
  assert.deepEqual(char,before);
  const {worldPressures:old,...rest}=char;
  const {worldPressures:current,...after}=restored;
  assert.deepEqual(after,rest);
});
test('regenerating a response that ended a pressure reopens the last retained pressure state',()=>{
  const restored=restoreWorldPressuresForHistory(character(),history.slice(0,3));
  assert.deepEqual(restored.worldPressures,applyWorldPressures(updated+'\n'+later));
  assert.equal(restored.coins,1234); // GOLD in retained text is not applied again.
});
test('retained END tags remain ended, rewinding before all events clears the ledger, and player tags are not executed',()=>{
  const restored=restoreWorldPressuresForHistory(character(),history);
  assert.ok(!restored.worldPressures.siege);
  assert.deepEqual(restoreWorldPressuresForHistory(character(),[]).worldPressures,{});
  assert.deepEqual(restoreWorldPressuresForHistory(character(),[message('user',later,9)]).worldPressures,{});
});
test('roll setup and follow-up pressures replay chronologically after a save/load round trip',()=>{
  const messages=JSON.parse(JSON.stringify([message('dm',opening+'[ROLL: dexterity difficulty 15]',1),message('dm',updated,2)]));
  assert.deepEqual(restoreWorldPressuresForHistory(character(),messages).worldPressures,applyWorldPressures(updated));
});
for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) test(`${build.name}: next prompt gets retained pressure state, never the abandoned branch`,()=>{
  const restored=restoreWorldPressuresForHistory(character(),history.slice(0,1));
  const prompt=Object.values(build(restored)).join('\n');
  assert.match(prompt,/Raiders are outside the gate/);
  assert.ok(!prompt.includes('Raiders have breached the gate'));
  assert.ok(!prompt.includes('A witness reported the theft'));
  assert.match(worldPressureContext(restored),/After ten minutes/);
});
test('all provider request bodies use restored pressure before sending the edited action',async()=>{
  const charRef={current:restoreWorldPressuresForHistory(character(),history.slice(0,1))};
  const game=useGame({charRef,apiKey:'test',openAiApiKey:'test',xAiApiKey:'test'}),original=globalThis.fetch;
  try {
    for(const provider of ['anthropic','openai','xai']) {
      let body;
      globalThis.fetch=async(url,init)=>{body=init.body;return {ok:true,json:async()=>provider==='anthropic'?{content:[{type:'text',text:'The gate still holds.'}]}:{output:[{type:'message',content:[{type:'output_text',text:'The gate still holds.'}]}]}};};
      await game.callDM([{role:'user',content:'I reinforce the gate instead.'}],buildSystemPromptSol(charRef.current),{provider,model:'test'});
      assert.match(body,/Raiders are outside the gate/);
      assert.ok(!body.includes('Raiders have breached the gate'));
      assert.ok(!body.includes('A witness reported the theft'));
    }
  } finally {globalThis.fetch=original;}
});
