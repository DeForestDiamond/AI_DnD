import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSOLIDATE_RULES, describeConsolidationItems, validateConsolidationGroups, normalizeConsolidationName } from '../src/helpers/consolidation.js';
import { createItemManager } from '../src/helpers/items/manager.js';
import { CONSOLIDATE_RULES as gptRules } from '../src/helpers/openai/consolidate.js';
import { CONSOLIDATE_RULES as grokRules } from '../src/helpers/xai/consolidate.js';
import { CONSOLIDATE_RULES as anthropicRules } from '../src/helpers/anthropic/consolidate.js';

const stacks = names => names.map((name, i) => ({name, count:i+1}));
const group = (name, items) => ({name, items, reason:'Compatible material.'});
const validate = (name, items, definitions) => validateConsolidationGroups([group(name, items)], items, definitions);

test('all providers share origin, potency and finished-item preservation rules', () => {
  assert.equal(gptRules, CONSOLIDATE_RULES);
  assert.equal(grokRules, CONSOLIDATE_RULES);
  assert.equal(anthropicRules, CONSOLIDATE_RULES);
  for (const term of ['Tarrasque', 'Baphomet', 'Orcus', 'Infernal Bone', 'Bone Ritual Knife', 'Unknown origin', 'plain named stack']) assert.ok(CONSOLIDATE_RULES.includes(term));
});

test('screenshot regression: mixed exceptional bones and bone objects cannot become Bone', () => {
  const items = stacks(['Tarrasque Bone','Baphomet Bone','Orcus Bone','Archdevil Bone','Devil Bone','Bone Ritual Knife','Bone']);
  assert.deepEqual(validate('Bone', items), []);
  for (const source of items.slice(0,-1)) assert.deepEqual(validate('Bone', [source, items.at(-1)]), []);
});

test('ordinary devil bones can become Infernal Bone; lords and unknown origins cannot', () => {
  const ordinary = stacks(['Devil Bone','Erinyes Bone','Horned Devil Bone']);
  assert.equal(validate('Infernal Bone', ordinary).length, 1);
  for (const name of ['Archdevil Bone','Baphomet Bone','Orcus Bone','Zariel Bone','Tarrasque Bone','Unidentified Bone','Demon Bone']) {
    assert.deepEqual(validate('Infernal Bone', stacks(['Devil Bone',name])), []);
  }
});

test('ordinary humanoid and monster families consolidate without a hardcoded species whitelist', () => {
  assert.equal(validate('Humanoid Bone',stacks(['Human Bone','Dwarf Bone','Elf Bone','Orc Bone','Goblin Bone'])).length,1);
  assert.equal(validate('Monstrous Bone',stacks(['Gnoll Bone','Minotaur Bone','Warhorse Bone'])).length,1);
  assert.equal(validate('Infernal Bones',stacks(['Devil Bone','Erinyes Bone','Bone Devil Bone','Pit Fiend Bone'])).length,1);
  assert.equal(validate('Infernal Skeletal Material',stacks(['Devil Bone','Erinyes Bone'])).length,1);
  assert.equal(validate('Abyssal Bone',stacks(['Demon Bone','Dretch Bone','Vrock Bone','Balor Bone'])).length,1);
  assert.equal(validate('Bone',stacks(['Bone','Bone Fragments','Powdered Bone'])).length,1);
});

test('recorded exceptional provenance and opposed planar families remain protected', () => {
  assert.deepEqual(validate('Infernal Bone',stacks(['Special Bone','Devil Bone']),{'Special Bone':{label:'Harvested from a demon lord.'}}),[]);
  assert.deepEqual(validate('Abyssal Bone',stacks(['Infernal Bone','Devil Bone'])),[]);
  assert.deepEqual(validate('Infernal Bone',stacks(['Abyssal Bone','Demon Bone'])),[]);
});

test('zero or empty placeholder equipment fields do not block ordinary material proposals', () => {
  const items=stacks(['Human Bone','Dwarf Bone']);
  assert.equal(validate('Humanoid Bone',items,{'Human Bone':{type:'misc',ac:0,damage:'none',slot:'none'}}).length,1);
});

test('same exceptional source can simplify raw forms without losing identity', () => {
  for (const name of ['Tarrasque','Baphomet','Orcus','Red Dragon','Divine']) {
    const items = stacks([`${name} Bone`,`${name} Bone Fragments`]);
    assert.equal(validate(`${name} Bone`,items).length,1);
  }
  assert.deepEqual(validate('Dragon Bone', stacks(['Red Dragon Bone','White Dragon Bone'])), []);
  assert.deepEqual(validate('Bone', stacks(['Bone','Infernal Bone'])), []);
  assert.deepEqual(validate('Abyssal Bone', stacks(['Orcus Bone','Demon Bone'])), []);
});

test('ordinary stock still groups; finished equipment is excluded by its definition', () => {
  const items = stacks(['Iron Ingot','Dwarven Iron Ingot']);
  assert.equal(validate('Iron Ingot (average size)',items).length,1);
  const equipment = stacks(['Adamantine Blade','Adamantine Stock']);
  assert.deepEqual(validate('Adamantine',equipment,{'Adamantine Blade':{type:'weapon',damage:'1d8'}}), []);
});

test('invalid quantities, unknown names, duplicate members and reuse are rejected without reserving sources', () => {
  const items=stacks(['Mithral Wire','Mithral Plate']);
  const good=group('Mithral',items);
  for (const invalid of [
    group('Mithral',[items[0],items[0]]),
    group('Mithral',[items[0],{...items[1],count:999}]),
    group('Mithral',[items[0],{...items[1],count:1}]),
    group('Mithral',[items[0],{name:'Invented',count:2}]),
    group('Mithral',[items[0],null]),
    group('',items),
  ]) assert.deepEqual(validateConsolidationGroups([invalid,good,good],items),[good]);
  assert.deepEqual(validateConsolidationGroups(null,items),[]);
});

test('descriptions retain recorded properties without transmitting bag contents or mutating data', () => {
  const items=stacks(['Infernal Bone','Devil Bone']);
  const definitions={'Infernal Bone':{type:'material',label:'Archdevil origin; unique hellfire binding.',rarity:'legendary',contents:{Secret:2}}};
  const before=structuredClone(definitions);
  const text=describeConsolidationItems(items,definitions);
  assert.match(text,/hellfire binding/);
  assert.match(text,/legendary/);
  assert.ok(!text.includes('Secret'));
  assert.deepEqual(definitions,before);
});

test('average-sized result names preserve exceptional bone identity', () => {
  assert.equal(validate('Tarrasque Bone (average-sized portion)',stacks(['Tarrasque Bone','Tarrasque Bone Fragments'])).length,1);
  assert.deepEqual(validate('Bone (average-sized portion)',stacks(['Tarrasque Bone','Baphomet Bone'])),[]);
});

test('bulk units can mix and standardize, but their result cannot be a bare material name', () => {
  const salt=stacks(['Salt Barrel','Salt Crate']);
  assert.equal(validate('Salt',salt)[0].name,'Salt Crate');
  assert.equal(validate('Salt (average-sized bulk lot)',salt).length,1);
  const iron=stacks(['Iron Ingot','Scrap Iron']);
  assert.equal(validate('Iron',iron)[0].name,'Iron Ingot');
  assert.equal(validate('Iron Ingot (average size)',iron).length,1);
});

test('lost bolts and ingots are restored locally in material-first order', () => {
  const silk=stacks(['Red Silk Bolt','Blue Silk Bolt']);
  for(const name of ['Silk','Silk Lot','Silk (average size)','Bolt of Silk','Silk [average size]']) {
    assert.equal(validate(name,silk)[0].name,'Silk Bolt');
  }
  assert.equal(validate('Iron',stacks(['Iron Ingot','Dwarven Iron Ingot']))[0].name,'Iron Ingot');
  assert.equal(normalizeConsolidationName('Bolt of Red Silk',silk),'Red Silk Bolt');
});

test('existing matching stack names win, without brackets or extra size text', () => {
  const items=stacks(['Elven Red Silk Bolt','Calishite Red Silk Bolt']);
  const definitions={'Red Silk Bolt':{type:'misc'}};
  assert.equal(normalizeConsolidationName('Bolt of Red Silk (average size)',items,definitions),'Red Silk Bolt');
  assert.equal(normalizeConsolidationName('Red Silk [Blessed] Bolt',items),'Red Silk Blessed Bolt');
  assert.equal(normalizeConsolidationName('Salt (roughly barrel-sized lot)',stacks(['Salt Barrel','Coarse Salt Barrel','Salt Crate'])),'Salt Barrel');
});

for (const provider of ['openai','xai','anthropic']) test(`${provider}: sized bulk proposals survive approval with summed counts and visible per-unit sizes`, async () => {
  const original=globalThis.fetch;
  const salt=[{name:'Salt Sack',count:2},{name:'Coarse Salt Crate',count:1}];
  const iron=[{name:'Iron Ingot',count:10},{name:'Dwarven Iron Ingot',count:2}];
  const mixed=[{name:'Salt Barrel',count:1},{name:'Coarse Salt Barrel',count:1},{name:'Salt Crate',count:1}];
  const silk=[{name:'Red Silk Bolt',count:6},{name:'Blue Silk Bolt',count:3}];
  const cases=[group('Salt Sack',salt),group('Iron Ingot',iron),group('Salt Barrel',mixed),group('Silk Bolt',silk)];
  globalThis.fetch=async (url,init)=>{
    const request=JSON.parse(init.body);
    const rules=provider==='anthropic'?request.system:request.input[0].content[0].text;
    assert.match(rules,/taking their counts into account/);
    assert.match(rules,/Do not keep separate barrel\/crate groups/);
    const text=JSON.stringify({groups:cases.map((g,i)=>({...g,name:i===1?'Iron':i===3?'Bolt of Silk (average size)':g.name}))});
    return {ok:true,json:async()=>provider==='anthropic'?{content:[{type:'text',text}]}:{output:[{type:'message',content:[{type:'output_text',text}]}]}};
  };
  try {
    const items=cases.flatMap(g=>g.items);
    const charRef={current:{inventory:[{name:'Silk Bolt',qty:4}],stash:items.map(it=>({name:it.name,qty:it.count})),items:{'Silk Bolt':{type:'misc'}}}};
    const manager=createItemManager({apiKey:'test',openAiApiKey:'test',xAiApiKey:'test',charRef,updateChar:c=>{charRef.current=c;},applyEffects:(tags,c)=>{assert.equal(tags,'');return c;},selectedModel:'test',MODEL_CONFIGS:{test:{provider,model:'test'}},log:()=>{},logUsage:()=>{}});
    const proposed=await manager.proposeConsolidation({items});
    assert.deepEqual(proposed,cases);
    for(const g of proposed) manager.executeConsolidation({...g,destination:'inventory'});
    assert.deepEqual(Object.fromEntries(charRef.current.inventory.map(it=>[it.name,it.qty])),Object.fromEntries(cases.map(g=>[g.name,g.items.reduce((n,it)=>n+it.count,0)+(g.name==='Silk Bolt'?4:0)])));
    assert.deepEqual(charRef.current.stash,[]);
  } finally {globalThis.fetch=original;}
});

for (const provider of ['openai','xai','anthropic']) test(`${provider}: real proposal path sends descriptions and filters unsafe groups without changing inventory`, async () => {
  const original=globalThis.fetch;
  const items=stacks(['Tarrasque Bone','Baphomet Bone','Devil Bone','Erinyes Bone','Human Bone','Dwarf Bone']);
  const groups=[group('Bone',items.slice(0,2)),group('Infernal Bones',items.slice(2,4)),group('Humanoid Bone',items.slice(4))];
  const charRef={current:{items:{'Tarrasque Bone':{label:'Legendary regenerative bone.'}},inventory:items.map(it=>({name:it.name,qty:it.count}))}};
  const before=structuredClone(charRef.current);
  let calls=0, request;
  globalThis.fetch=async (url,init) => {
    calls++; request=JSON.parse(init.body);
    const text=JSON.stringify({groups});
    return {ok:true,json:async()=>provider==='anthropic' ? {content:[{type:'text',text}]} : {output:[{type:'message',content:[{type:'output_text',text}]}]}};
  };
  try {
    const manager=createItemManager({apiKey:'test',openAiApiKey:'test',xAiApiKey:'test',charRef,updateChar:()=>assert.fail('Proposal mutated inventory'),selectedModel:'test',MODEL_CONFIGS:{test:{provider,model:'test'}},log:()=>{},logUsage:()=>{}});
    assert.deepEqual(await manager.proposeConsolidation({items}),groups.slice(1));
    assert.equal(calls,1);
    assert.match(JSON.stringify(request),/Legendary regenerative bone/);
    assert.deepEqual(charRef.current,before);
    await assert.rejects(manager.proposeConsolidation({items:[items[0]]}),/two stacks/);
    assert.equal(calls,1);
  } finally {globalThis.fetch=original;}
});
