import test from 'node:test';
import assert from 'node:assert/strict';
import { useGame, buildSystemPromptSol, buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';
import { WEAPON_ATTACK_RULES } from '../src/prompts/tags.js';
import { getWeaponInSlot, getMainWeapon } from '../src/hooks/character/items.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';

const character=()=>({...structuredClone(EMPTY_CHAR),name:'Test',level:3,stats:{str:18,dex:20,int:12,wis:10,cha:10,con:10},slots:{mainhand:'Broadsword',offhand:'Frost Needle'},items:{Broadsword:{type:'weapon',damage:'1d8',bonus:1},'Frost Needle':{type:'weapon',damage:'1d4+2',bonus:3,finesse:true,extras:[{dice:'1d6',type:'cold'}]}}});
function fixed(fn,value=.5){const previous=Math.random;Math.random=()=>value;try{return fn();}finally{Math.random=previous;}}
const game=c=>useGame({charRef:{current:c},apiKey:'test',openAiApiKey:'test',xAiApiKey:'test'});

test('all six DM prompts teach hand-specific requests without treating automation as an action limit',()=>{
  for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) {
    assert.equal(build(character()).static.split(WEAPON_ATTACK_RULES).length-1,1);
  }
});

test('slot-specific lookup uses each weapon mechanics and keeps mainhand API compatible',()=>{
  const c=character();
  assert.equal(getWeaponInSlot(c.slots,c.stats,c.items,'offhand').attackAbility,'dex');
  assert.equal(getWeaponInSlot(c.slots,c.stats,c.items,'offhand').bonus,3);
  assert.deepEqual(getMainWeapon(c.slots,c.stats,c.items),getWeaponInSlot(c.slots,c.stats,c.items,'mainhand'));
});
test('offhand declaration and exact weapon name roll the offhand instead of the mainhand',()=>{
  const c=character();
  for(const action of ['I attack with my offhand.','I stab with Frost Needle.','I attack with my off-hand weapon.']) {
    const {context,rollResult}=fixed(()=>game(c).buildActionContext(action));
    assert.equal(rollResult.hand,'offhand');
    assert.equal(rollResult.weapon,'Frost Needle');
    assert.equal(rollResult.value,21);
    assert.equal(rollResult.dmg,17);
    assert.match(context,/offhand: Frost Needle attack roll/);
    assert.match(context,/cold/);
  }
});
test('both weapons receive independent rolls, hand labels and serializable display metadata',()=>{
  const c=character();
  for(const action of ['I attack with both weapons.','I strike with Broadsword and Frost Needle.']) {
    const {context,rollResult}=fixed(()=>game(c).buildActionContext(action));
    assert.deepEqual(rollResult.attacks.map(r=>r.hand),['mainhand','offhand']);
    assert.deepEqual(rollResult.attacks.map(r=>r.value),[18,21]);
    assert.deepEqual(rollResult.attacks.map(r=>r.dmg),[10,17]);
    assert.equal((context.match(/attack roll: d20=/g)||[]).length,2);
    assert.doesNotThrow(()=>JSON.stringify(rollResult));
  }
});
test('mainhand defaults do not grant an unrequested offhand attack',()=>{
  const {context,rollResult}=fixed(()=>game(character()).buildActionContext('I attack the bandit.'));
  assert.equal(rollResult.hand,'mainhand');
  assert.ok(!rollResult.attacks);
  assert.match(context,/Missing automated data does NOT prohibit an offhand attack/);
  assert.match(context,/offhand: Frost Needle/);
  assert.ok(!fixed(()=>game(character()).buildActionContext('I attack with my mainhand while dual-wielding.')).rollResult.attacks);
});
test('offhand works without a mainhand; shields and focuses do not become weapon rolls',()=>{
  const c=character();c.slots.mainhand=null;
  assert.equal(fixed(()=>game(c).buildActionContext('I attack with my offhand.')).rollResult.weapon,'Frost Needle');
  c.slots.offhand='Shield';c.items.Shield={type:'shield'};
  assert.equal(game(c).buildActionContext('I attack with my offhand.').rollResult,null);
  const missing=game(c).interceptRollRequest('[ROLL: offhand attack difficulty 15]',c);
  assert.equal(missing.rollResult,null);
  assert.match(missing.resultText,/not a rule/);
});
test('DM-requested attacks use hand-specific weapon bonuses and damage, with old attack syntax retained',()=>{
  const c=character();
  for(const tag of ['[ROLL: offhand attack difficulty 15]','[ROLL: off hand attack DC 15]','[ROLL: off-hand attack difficulty 15]']) {
    const r=fixed(()=>game(c).interceptRollRequest(tag,c));
    assert.equal(r.rollResult.weapon,'Frost Needle');
    assert.equal(r.rollResult.value,21);
    assert.equal(r.rollResult.dmg,17);
    assert.match(r.resultText,/offhand attack with Frost Needle/);
  }
  assert.equal(fixed(()=>game(c).interceptRollRequest('[ROLL: attack difficulty 15]',c)).rollResult.weapon,'Broadsword');
});
test('two-handed sequence does not duplicate Sneak Attack, and each hand retains crit/fumble handling',()=>{
  const c=character();c.classLevels.Rogue=3;
  const both=fixed(()=>game(c).buildActionContext('From behind I attack with both weapons.'));
  assert.equal(both.rollResult.attacks.filter(r=>r.sneak).length,1);
  assert.ok(fixed(()=>game(c).buildActionContext('I attack with both weapons.'),.999).rollResult.attacks.every(r=>r.crit));
  assert.ok(fixed(()=>game(c).buildActionContext('I attack with both weapons.'),0).rollResult.attacks.every(r=>r.fumble));
  assert.equal(game(c).buildActionContext('I say "attack with both weapons".').rollResult,null);
});
test('hand-specific GAME DATA reaches all provider requests',async()=>{
  const c=character(),g=game(c),previous=globalThis.fetch;
  const action='I attack with both weapons.';
  const {context}=fixed(()=>g.buildActionContext(action));
  try {
    for(const provider of ['openai','xai','anthropic']) {
      let body;
      globalThis.fetch=async(url,init)=>{body=init.body;return {ok:true,json:async()=>provider==='anthropic'?{content:[{type:'text',text:'Resolved.'}]}:{output:[{type:'message',content:[{type:'output_text',text:'Resolved.'}]}]}};};
      await g.callDM([{role:'user',content:action+context}],buildSystemPromptSol(c),{provider,model:'test'});
      assert.match(body,/mainhand: Broadsword attack roll/);
      assert.match(body,/offhand: Frost Needle attack roll/);
      assert.match(body,/offhand attack difficulty/);
    }
  } finally {globalThis.fetch=previous;}
});
