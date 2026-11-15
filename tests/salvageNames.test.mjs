import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { prepareSalvageNames, stackSalvageRecoveries } from '../src/helpers/salvageNames.js';
import { createItemManager } from '../src/helpers/items/manager.js';
import { useCharacter } from '../src/hooks/character/useCharacter.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { stackCount } from '../src/utils/itemStacks.js';

let applyEffects;
function Harness(){applyEffects=useCharacter().applyEffects;return null;}
renderToString(React.createElement(Harness));
const recovery=(label='Stores lightning.')=>({recovers:[{name:'Arcane Core',count:3,label}]});
const fixture=()=>({...structuredClone(EMPTY_CHAR),inventory:[{name:'Machine',qty:1},{name:'Arcane Core',qty:2}],items:{Machine:{type:'misc'},'Arcane Core':{type:'misc',label:'Stores fire.'}}});
const managerFor=c=>{const charRef={current:c};return {charRef,manager:createItemManager({charRef,updateChar:n=>charRef.current=n,applyEffects,log:()=>{},MODEL_CONFIGS:{}})};};

test('different labels get unique names without changing original data or proposals',()=>{
  const c=fixture(),before=structuredClone(c),result=recovery(),original=structuredClone(result);
  const prepared=prepareSalvageNames(result,c);
  assert.equal(prepared.recovers[0].name,'Arcane Core (1)');
  assert.equal(prepared.recovers[0].label,'Stores lightning.');
  assert.deepEqual(c,before);assert.deepEqual(result,original);
});
test('identical labels stack, including case-insensitive canonical names and whitespace normalization',()=>{
  const c=fixture();c.items['Arcane Core'].label='Stores lightning.';
  const result=prepareSalvageNames({recovers:[{name:'arcane core',count:2,label:' Stores   lightning. '},{name:'Arcane Core',count:4,label:'Stores lightning.'}]},c);
  assert.equal(result.recovers.length,1);assert.equal(result.recovers[0].name,'Arcane Core');assert.equal(result.recovers[0].count,6);
});
test('blank and nonblank labels are separate variants in either direction',()=>{
  assert.equal(prepareSalvageNames(recovery(null),fixture()).recovers[0].name,'Arcane Core (1)');
  const c=fixture();delete c.items['Arcane Core'].label;
  assert.equal(prepareSalvageNames(recovery(),c).recovers[0].name,'Arcane Core (1)');
  assert.equal(prepareSalvageNames(recovery(null),c).recovers[0].name,'Arcane Core');
});
test('numbering avoids every occupied suffix and reuses matching numbered variants across future salvages',()=>{
  const c=fixture();
  c.items['Arcane Core (1)']={type:'misc',label:'Stores ice.'};
  c.items['ARCANE CORE (2)']={type:'misc',label:'Stores lightning.'};
  assert.equal(prepareSalvageNames(recovery(),c).recovers[0].name,'ARCANE CORE (2)');
  assert.equal(prepareSalvageNames(recovery('Stores thunder.'),c).recovers[0].name,'Arcane Core (3)');
  delete c.items['Arcane Core (1)'];
  assert.equal(prepareSalvageNames(recovery(),c).recovers[0].name,'ARCANE CORE (2)');
  delete c.items['Arcane Core'];c.inventory=[];
  assert.equal(prepareSalvageNames(recovery(),c).recovers[0].name,'ARCANE CORE (2)');
});
test('one batch keeps conflicting properties separate instead of sharing a combined label',()=>{
  const rows=[...recovery('Fire').recovers,...recovery('Ice').recovers,...recovery('Fire').recovers,...recovery(null).recovers];
  const result=prepareSalvageNames({recovers:rows},EMPTY_CHAR);
  assert.deepEqual(result.recovers.map(r=>[r.name,r.count,r.label]),[['Arcane Core',6,'Fire'],['Arcane Core (1)',3,'Ice'],['Arcane Core (2)',3,null]]);
  assert.equal(stackSalvageRecoveries(rows).length,3);
});
test('stash, bag contents, player gear and companion equipment all reserve the global namespace',()=>{
  for(const storage of [
    {stash:[{name:'Arcane Core',qty:1}]},
    {slots:{neck:'Arcane Core'}},
    {companions:{Scout:{slots:{neck:'Arcane Core'}}}},
    {items:{Bag:{type:'bag',contents:{'Arcane Core':1}}}},
  ]) {
    const c={...structuredClone(EMPTY_CHAR),...storage};
    assert.equal(prepareSalvageNames(recovery(),c).recovers[0].name,'Arcane Core (1)');
  }
});
test('recoveries cannot acquire an existing weapon or magical mechanical definition even when labels match',()=>{
  for(const item of [{type:'weapon',damage:'2d8'},{type:'magic',slot:'neck'},{type:'misc',bonuses:{con:2}}]) {
    const c=fixture();c.items['Arcane Core']={...item,label:'Stores lightning.'};
    assert.equal(prepareSalvageNames(recovery(),c).recovers[0].name,'Arcane Core (1)');
  }
});
for(const destination of ['inventory','stash']) test(`${destination}: executing recovery protects originals and stacks repeated matching variants`,()=>{
  const {manager,charRef}=managerFor(fixture());
  manager.executeDismantle(recovery(),[{name:'Machine',count:1}],destination);
  assert.equal(charRef.current.items['Arcane Core'].label,'Stores fire.');
  assert.equal(stackCount(charRef.current.inventory,'Arcane Core'),2);
  assert.equal(stackCount(charRef.current[destination],'Arcane Core (1)'),3);
  charRef.current.inventory.push({name:'Machine',qty:1});charRef.current.items.Machine={type:'misc'};
  manager.executeDismantle(recovery(),[{name:'Machine',count:1}],destination);
  assert.equal(stackCount(charRef.current[destination],'Arcane Core (1)'),6);
  assert.equal(charRef.current.items['Arcane Core (1)'].label,'Stores lightning.');
});
test('execution rechecks the live namespace if an item appeared after preview',()=>{
  const c=fixture(),preview=prepareSalvageNames(recovery(),c);
  c.stash=[{name:'Arcane Core (1)',qty:1}];c.items['Arcane Core (1)']={type:'misc',label:'Important original.'};
  const {manager,charRef}=managerFor(c);
  const summary=manager.executeDismantle(preview,[{name:'Machine',count:1}]);
  assert.match(summary,/Arcane Core \(2\)/);
  assert.equal(charRef.current.items['Arcane Core (1)'].label,'Important original.');
  assert.equal(stackCount(charRef.current.inventory,'Arcane Core (2)'),3);
  assert.equal(preview.recovers[0].name,'Arcane Core (1)');
});
for(const provider of ['openai','xai','anthropic']) test(`${provider}: proposal preserves differently labelled source recoveries in one AI call`,async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{
    calls++;
    const results=provider === 'anthropic' ? [{recovers:[{name:'Arcane Core',count:2,label:'Stores lightning.'},{name:'Arcane Core',count:1,label:'Stores ice.'}],note:'Recovered cores.'}] : [
      {source:'Machine',recovers:[{name:'Arcane Core',count:2,label:'Stores lightning.'}],note:'Recovered cores.'},
      {source:'Machine',recovers:[{name:'Arcane Core',count:1,label:'Stores ice.'}],note:'Recovered core.'},
    ];
    const text=JSON.stringify({results});
    return {ok:true,json:async()=>provider === 'anthropic'?{content:[{text}]}:{output:[{type:'message',content:[{type:'output_text',text}]}]}};
  };
  try {
    const c=fixture(),before=structuredClone(c),charRef={current:c};
    const manager=createItemManager({charRef,updateChar:()=>assert.fail('Proposal mutated inventory'),applyEffects,log:()=>{},logUsage:()=>{},apiKey:'test',openAiApiKey:'test',xAiApiKey:'test',selectedModel:'test',MODEL_CONFIGS:{test:{provider,model:'test'}}});
    const result=await manager.proposeDismantle({items:[{name:'Machine',count:1}]});
    assert.deepEqual(result.recovers.map(r=>[r.name,r.label,r.count]),[['Arcane Core (1)','Stores lightning.',2],['Arcane Core (2)','Stores ice.',1]]);
    assert.equal(calls,1);assert.deepEqual(charRef.current,before);
  } finally {globalThis.fetch=original;}
});
