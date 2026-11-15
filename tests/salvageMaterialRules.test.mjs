import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SALVAGE_MATERIAL_RULES, assertSalvageBreakdown } from '../src/helpers/salvageMaterialRules.js';
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
  assert.equal(stackCount(charRef.current[destination],`${name} (1)`),20);
  assert.ok(!charRef.current.items[`${name} (1)`].label);
  assert.equal(charRef.current.items[`${name} (1)`].type,'misc');
});
test('a new surviving material property receives a separate name from the fully salvaged source',()=>{
  const {charRef,manager}=managerFor();
  manager.executeDismantle({recovers:[{name,count:20,label:'Conducts lightning when inscribed.'}]},[{name,count:20}]);
  assert.equal(charRef.current.items[`${name} (1)`].label,'Conducts lightning when inscribed.');
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

test('screenshotted finished consumables are not valid salvage, even after generic renaming',()=>{
  for(const name of ['Vampiric Draught','Stoneblood Elixir','Cloud Giant Marrow Salve','Sleeping Tincture','Hellfire Fuse Cord','Injury Poison','Generic Healing Potion','Explosive Charge']) {
    assert.throws(()=>assertSalvageBreakdown({recovers:[{name,count:1,label:null}]},[]),/finished items instead of breaking them down/);
  }
  assert.doesNotThrow(()=>assertSalvageBreakdown({recovers:[
    {name:'Bronze Dragon Scale',count:20},
    {name:'Mith Drannor Crystal',count:1},
    {name:'Heavy Uraninite Concentrate',count:119},
    {name:'Spent Elixir Residue',count:1},
    {name:'Alchemical Solvent',count:1},
    {name:'Hellfire Ignition Crystal',count:1},
    {name:'Arcane Actuator',count:1},
  ]},[]));
});

test('same-name finished equipment is rejected before any material consumption',()=>{
  const {charRef,manager}=managerFor();
  charRef.current.inventory=[{name:'Cleaver',qty:1}];
  charRef.current.items={Cleaver:{type:'weapon',damage:'1d8',label:'A heavy cleaver.'}};
  const before=structuredClone(charRef.current);
  assert.throws(()=>manager.executeDismantle({recovers:[{name:'Cleaver',count:1}]},[{name:'Cleaver',count:1}]),/Nothing was consumed/);
  assert.deepEqual(charRef.current,before);
});

for(const provider of ['openai','xai','anthropic']) test(`${provider}: rejects renamed finished output, then accepts actual constituent materials`,async()=>{
  const original=globalThis.fetch;
  const source='Royal Vampiric Draught';
  const initial={...structuredClone(EMPTY_CHAR),inventory:[{name:source,qty:1}],items:{[source]:{type:'consumable',label:'Creates fresh vampirism when consumed.'}}};
  const charRef={current:structuredClone(initial)};
  let calls=0;
  globalThis.fetch=async()=>{
    const recovers=++calls===1?[{name:'Vampiric Draught',count:1,label:'Creates fresh vampirism when consumed.'}]:[{name:'Glass',count:1,label:null},{name:'Spent Arcane Residue',count:1,label:null}];
    const text=JSON.stringify({results:[{source,destroyed:[source],recovers,note:'Breakdown.'}]});
    return {ok:true,json:async()=>provider==='anthropic'?{content:[{text}]}:{output:[{type:'message',content:[{type:'output_text',text}]}]}};
  };
  try {
    const manager=createItemManager({apiKey:'test',openAiApiKey:'test',xAiApiKey:'test',charRef,updateChar:()=>assert.fail('Proposal changed character'),applyEffects,selectedModel:'test',MODEL_CONFIGS:{test:{provider,model:'test'}},log:()=>{},logUsage:()=>{}});
    const items=[{name:source,count:1}];
    await assert.rejects(manager.proposeDismantle({items}),/Nothing was consumed/);
    assert.equal(calls,1); // No automatic extra paid generation.
    assert.deepEqual(charRef.current,initial);
    const result=await manager.proposeDismantle({items});
    assert.deepEqual(result.recovers.map(it=>it.name),['Glass','Spent Arcane Residue']);
    assert.deepEqual(charRef.current,initial);
  } finally {globalThis.fetch=original;}
});
