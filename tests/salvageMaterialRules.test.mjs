import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SALVAGE_MATERIAL_RULES } from '../src/helpers/salvageMaterialRules.js';
import { callGptSalvage } from '../src/helpers/openai/salvage.js';
import { callGrokSalvage } from '../src/helpers/xai/salvage.js';
import { callAnthropicSalvage } from '../src/helpers/anthropic/salvage.js';
import { createItemManager } from '../src/helpers/items/manager.js';
import { useCharacter } from '../src/hooks/character/useCharacter.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { stackCount } from '../src/utils/itemStacks.js';

for(const [provider,call] of [['openai',callGptSalvage],['xai',callGrokSalvage],['anthropic',callAnthropicSalvage]]) {
  test(`${provider}: salvage receives quest/material distinction, keeps independent crafting value and stacks plain scales`,async()=>{
    const original=globalThis.fetch;
    let calls=0;
    const recovers=[{name:'Bronze Dragon Scale',count:20,label:null},{name:'Arcane Actuator',count:2,label:'Operates from an independent arcane cell.'}];
    globalThis.fetch=async(url,init)=>{
      calls++;
      const request=JSON.parse(init.body);
      const rules=provider==='anthropic'?request.system:request.input[0].content[0].text;
      assert.ok(rules.includes(SALVAGE_MATERIAL_RULES));
      const parsed=provider==='anthropic'?{results:[{recovers,destroyed:['Sarthoryx Scale','Nymorath Scale','Mechanical Frame'],note:'Materials recovered; tracking associations lost.'}]}:{results:[
        {source:'Sarthoryx Scale',recovers:[{name:'Bronze Dragon Scale',count:8,label:null}],note:'Material recovered.'},
        {source:'Nymorath Scale',recovers:[{name:'Bronze Dragon Scale',count:12,label:null}],note:'Material recovered.'},
        {source:'Mechanical Frame',recovers:[recovers[1]],note:'Actuators retain an independent power supply.'},
      ]};
      const text=JSON.stringify(parsed);
      return {ok:true,json:async()=>provider==='anthropic'?{content:[{type:'text',text}]}:{output:[{type:'message',content:[{type:'output_text',text}]}]}};
    };
    try {
      const {result}=await call({apiKey:'test',itemsText:'Sarthoryx Scale x8 — Supports sympathetic tracking of Sarthoryx.\nNymorath Scale x12 — Supports sympathetic tracking of Nymorath.\nMechanical Frame — Two removable actuators with independent arcane cells.'});
      assert.equal(calls,1);
      assert.equal(result.recovers[0].name,'Bronze Dragon Scale');
      assert.equal(result.recovers[0].count,20);
      assert.ok(!result.recovers[0].label);
      assert.equal(result.recovers[1].label,recovers[1].label);
    } finally {globalThis.fetch=original;}
  });
}

let applyEffects;
function Harness(){applyEffects=useCharacter().applyEffects;return null;}
renderToString(React.createElement(Harness));
const name='Bronze Dragon Scale';
const questLabel='Supports sympathetic tracking of Sarthoryx. Supports sympathetic tracking of Nymorath.';
function managerFor({held=20,equipped=false}={}) {
  const charRef={current:{...structuredClone(EMPTY_CHAR),inventory:[{name,qty:held}],items:{[name]:{type:'misc',label:questLabel}},...(equipped?{companions:{Scout:{slots:{neck:name}}}}:{})}};
  return {charRef,manager:createItemManager({charRef,updateChar:c=>{charRef.current=c;},applyEffects,log:()=>{},logUsage:()=>{},MODEL_CONFIGS:{}})};
}
for(const destination of ['inventory','stash']) test(`${destination}: fully salvaged same-name material does not inherit quest labels`,()=>{
  const {charRef,manager}=managerFor();
  manager.executeDismantle({recovers:[{name,count:20,label:null}]},[{name,count:20}],destination);
  assert.equal(stackCount(charRef.current[destination],name),20);
  assert.ok(!charRef.current.items[name].label);
  assert.equal(charRef.current.items[name].type,'misc');
});
test('a new surviving material property replaces the fully salvaged source label',()=>{
  const {charRef,manager}=managerFor();
  manager.executeDismantle({recovers:[{name,count:20,label:'Conducts lightning when inscribed.'}]},[{name,count:20}]);
  assert.equal(charRef.current.items[name].label,'Conducts lightning when inscribed.');
});
test('partial salvage does not strip labels from unsubmitted inventory copies',()=>{
  const {charRef,manager}=managerFor();
  manager.executeDismantle({recovers:[{name:'Bronze Scale Powder',count:5,label:null}]},[{name,count:5}]);
  assert.equal(stackCount(charRef.current.inventory,name),15);
  assert.equal(charRef.current.items[name].label,questLabel);
});
test('same-name partial salvage and equipped copies retain their shared existing definition',()=>{
  for(const args of [{held:20,count:5},{held:20,count:20,equipped:true}]) {
    const {charRef,manager}=managerFor(args);
    manager.executeDismantle({recovers:[{name,count:args.count,label:null}]},[{name,count:args.count}]);
    assert.equal(charRef.current.items[name].label,questLabel);
  }
});
