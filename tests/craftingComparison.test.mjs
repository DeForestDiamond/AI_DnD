import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { buildCraftingComparison, itemMetrics } from '../src/helpers/craftingComparison.js';
import { withCraftingComparison, CRAFTING_COMPARISON_SCHEMA, CRAFTING_COMPARISON_RULES } from '../src/helpers/craftingComparisonContract.js';
import { callGptCrafting, craftingSchemaFor as gptSchema } from '../src/helpers/openai/crafting.js';
import { callGrokCrafting, craftingSchemaFor as grokSchema } from '../src/helpers/xai/crafting.js';
import { callAnthropicCrafting } from '../src/helpers/anthropic/crafting.js';
import { createItemManager } from '../src/helpers/items/manager.js';
import { useCharacter } from '../src/hooks/character/useCharacter.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { craftingFixture } from './fixtures/craftingComparison.mjs';

for(const mode of ['single','upgrade','set','construct']) test(`${mode}: comparison leaves all inputs untouched and shows option-level costs`,()=>{
  const f=craftingFixture(mode), before=structuredClone(f);
  const comparison=buildCraftingComparison(f);
  assert.equal(comparison.rows.length,2);
  assert.deepEqual(comparison.rows.map(r=>r.costs.find(c=>c.name==='Divine Bones').count),[180,300]);
  assert.ok(comparison.rows.every(r=>r.analyzed));
  assert.deepEqual(f,before);
  if(mode==='set') {
    assert.ok(comparison.rows.every(r=>r.isSet&&r.pieces.length===2));
    assert.match(comparison.rows[1].metrics.join(' '),/WIS \+3/);
    assert.ok(comparison.rows[1].changes.some(c=>c.ability==='WIS bonus'&&c.kind==='improved'));
  }
});

test('upgrade flags exact AC regression, preserves unchanged groups, and does not choose a universal winner',()=>{
  const c=buildCraftingComparison(craftingFixture());
  assert.ok(c.rows[0].changes.some(c=>c.kind==='weakened'&&c.explanation.includes('Base AC 21 → 20')));
  assert.ok(c.rows[0].changes.some(c=>c.kind==='retained'));
  assert.ok(c.rows[0].unchangedStats>0);
  assert.equal(c.recommendation.index,null);
});

test('omissions and missing numeric fields never become confirmed losses',()=>{
  const f=craftingFixture();f.options[0].ac=null;
  f.analysis.options[0].changes=[{kind:'lost',ability:'Repair',explanation:'Lost repair.',before:[{item:'Ossuary Robe',quote:'Repairs damaged undead.'}],after:[]}];
  const c=buildCraftingComparison(f).rows[0];
  assert.ok(!c.changes.some(c=>c.kind==='lost'||c.kind==='weakened'));
  assert.equal(c.changes.filter(c=>c.kind==='uncertain').length,2);
});

test('affirmative restriction can support a regression; unsupported quotations are rejected',()=>{
  const f=craftingFixture();f.options[0].label+=' Repairs only within the sanctum.';
  f.analysis.options[0].changes=[
    {kind:'weakened',ability:'Repair range',explanation:'Repair now requires the sanctum.',before:[{item:'Ossuary Robe',quote:'Repairs damaged undead.'}],after:[{item:f.options[0].name,quote:'Repairs only within the sanctum.'}]},
    {kind:'added',ability:'Time travel',explanation:'Can travel through time.',before:[],after:[{item:f.options[0].name,quote:'Travels through time.'}]},
  ];
  const c=buildCraftingComparison(f).rows[0];
  assert.ok(c.changes.some(c=>c.ability==='Repair range'&&c.kind==='weakened'));
  assert.ok(!c.changes.some(c=>c.ability==='Time travel'));
  assert.ok(c.incomplete);
});

test('identical quoted functions cannot masquerade as new or stronger abilities',()=>{
  const f=craftingFixture();
  f.analysis.options[0].changes=[{kind:'added',ability:'Soul shielding',explanation:'New shielding.',before:[],after:[{item:f.options[0].name,quote:'Shields souls from hostile necromancy.'}]}];
  assert.equal(buildCraftingComparison(f).rows[0].changes.find(c=>c.ability==='Soul shielding').kind,'redundant');
});

test('unknown or unconsumed bases are ignored and ambiguous ring replacements are not guessed',()=>{
  const f=craftingFixture('set');
  f.materials.push({name:'Unselected Shield',data:{type:'armor',ac:99},count:1});
  f.analysis.options[0].baseNames.push('Unselected Shield','Invented Base');
  f.materials[1].data.type='magic';f.materials[1].data.slot='ring';
  f.options[0].pieces.push({name:'Ring One',type:'magic',slot:'ring',label:'Holds spirits.'},{name:'Ring Two',type:'magic',slot:'ring',label:'Releases spirits.'});
  const c=buildCraftingComparison(f).rows[0];
  assert.ok(!c.bases.includes('Unselected Shield'));
  assert.ok(c.pieces.some(p=>p.base==='Divine Bones'&&p.result===null));
});

test('damage comparisons include separate enchantment and typed extras, without random rolls',()=>{
  const c=buildCraftingComparison({materials:[{name:'Blade',count:1,data:{type:'weapon',damage:'2d6+2',bonus:3,extras:[{dice:'1d6',type:'fire'}]}}],options:[{name:'New Blade',type:'weapon',damage:'2d6+1 plus 1d4 fire',bonus:2,consumes:[{name:'Blade',count:1}]}]});
  assert.equal(c.rows[0].changes.filter(c=>c.kind==='weakened').length,3);
  assert.equal(itemMetrics({type:'armor',ac:null}).length,0);
});

test('legacy results have local comparison without pretending semantic analysis succeeded',()=>{
  const f=craftingFixture();delete f.analysis;
  const c=buildCraftingComparison(f);
  assert.ok(!c.rows[0].analyzed);
  assert.ok(c.rows[0].changes.some(c=>c.ability==='Base AC'));
  assert.equal(c.recommendation,null);
});

test('an unavailable, regressive or incompletely analyzed option cannot be recommended',()=>{
  const f=craftingFixture();f.analysis.recommendation={...f.analysis.recommendation,optionIndex:0,reason:'Highest power.'};
  assert.equal(buildCraftingComparison(f).recommendation,null);
  f.analysis.recommendation.optionIndex=1;f.options[1].unavailable=['Missing bones'];
  assert.equal(buildCraftingComparison(f).recommendation,null);
});

test('a supported purpose-based recommendation can identify a non-regressive fit',()=>{
  const f=craftingFixture();f.analysis.recommendation.optionIndex=1;
  assert.equal(buildCraftingComparison(f).recommendation.index,1);
});

test('armor restriction changes are detected independently of the ability summary',()=>{
  const f=craftingFixture();f.options[0].heavy=true;
  assert.ok(buildCraftingComparison(f).rows[0].changes.some(c=>c.kind==='weakened'&&c.ability==='Dexterity contribution'));
});

for(const [name,call,schema] of [['GPT',callGptCrafting,gptSchema],['Grok',callGrokCrafting,grokSchema],['Anthropic',callAnthropicCrafting,null]]) test(`${name}: all crafting modes request analysis in one call without changing item schemas`,async()=>{
  const original=globalThis.fetch;
  try {
    for(const mode of [{},{asSet:true},{asConstruct:true}]) {
      let count=0,body;
      globalThis.fetch=async(url,init)=>{count++;body=JSON.parse(init.body);const raw=JSON.stringify({options:[],comparison:{options:[],recommendation:{optionIndex:null,reason:''}}});return {ok:true,json:async()=>url.includes('anthropic')?{content:[{text:raw}]}:{output:[{type:'message',content:[{type:'output_text',text:raw}]}]}};};
      await call({apiKey:'test',materialsText:'NAME: Base | HAVE: 1',characterLevel:40,includeComparison:true,...mode});
      assert.equal(count,1);
      assert.ok((body.system||body.input[0].content[0].text).includes(CRAFTING_COMPARISON_RULES));
      if(schema) {
        const old=schema(mode),wire=body.text.format.schema;
        assert.deepEqual(wire.properties.options,old.properties.options);
        assert.deepEqual(wire.properties.comparison,CRAFTING_COMPARISON_SCHEMA);
        assert.deepEqual(withCraftingComparison(old),wire);
        assert.ok(!('comparison' in old.properties));
      }
    }
  } finally {globalThis.fetch=original;}
});

let applyEffects;
function Harness(){applyEffects=useCharacter().applyEffects;return null;}
renderToString(React.createElement(Harness));
test('propose/forge integration: sidecar analysis does not affect costs, item definitions or resulting inventory',async()=>{
  const f=craftingFixture();const original=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({options:f.options,comparison:f.analysis})}]}]})});
  try {
    const initial={...structuredClone(EMPTY_CHAR),level:40,inventory:f.materials.map(m=>({name:m.name,qty:m.count})),items:Object.fromEntries(f.materials.map(m=>[m.name,m.data]))};
    const run=async includeComparison=>{
      const charRef={current:structuredClone(initial)};
      let updates=0;
      const manager=createItemManager({apiKey:'test',openAiApiKey:'test',charRef,updateChar:c=>{updates++;charRef.current=c;},applyEffects,selectedModel:'test',MODEL_CONFIGS:{test:{provider:'openai',model:'test'}},log:()=>{},logUsage:()=>{}});
      const proposal=await manager.proposeCrafting({...f,qty:1,includeComparison});
      assert.equal(updates,0);assert.deepEqual(charRef.current,initial);
      const options=includeComparison?proposal.options:proposal;
      assert.equal(options[1].label,f.options[1].label);
      assert.ok(!('comparison' in options[1]));
      manager.executeCrafting(options[1]);
      return charRef.current;
    };
    const without=await run(false),withAnalysis=await run(true);
    assert.deepEqual(withAnalysis,without);
    assert.equal(withAnalysis.inventory.find(m=>m.name==='Divine Bones').qty,200);
    assert.equal(withAnalysis.items['Sepulchral Apotheosis'].label,f.options[1].label);
    assert.ok(!JSON.stringify(withAnalysis).includes('recommendation'));
  } finally {globalThis.fetch=original;}
});
