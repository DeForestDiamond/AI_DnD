import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { buildCharBlock } from '../src/prompts/state.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const constructLabel='Unique construct capability: protects allies and retains its original command core.';
const wornLabel='Unique worn capability: grants protection against hostile magic.';
const carriedLabel='Unique carried capability: reveals invisible writing.';
const character=()=>({ ...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Fighter'},level:3,hp:12,maxHp:12,
  slots:{...EMPTY_CHAR.slots,neck:'Ward'},
  inventory:[{name:'Guardian',qty:25},{name:'Lens',qty:1}],
  items:{Guardian:{type:'construct',status:'bound',label:constructLabel},Ward:{type:'magic',slot:'neck',label:wornLabel},Lens:{type:'misc',label:carriedLabel}},
});

for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) {
  test(`${build.name} includes each construct description once, with status, without changing other item details`,()=>{
    const c=character();
    const before=structuredClone(c);
    const p=build(c);
    const text=Object.values(p).join('\n');
    assert.equal(text.split(constructLabel).length-1,1);
    assert.match(text,/Guardian \[BOUND\]/);
    assert.ok(text.includes('Guardian x25'));
    assert.ok(text.includes(wornLabel));
    assert.ok(text.includes(carriedLabel));
    assert.deepEqual(c,before);
  });
}

test('an equipped-only legacy construct retains its description',()=>{
  const c=character();
  c.inventory=[];
  c.slots.mainhand='Guardian';
  const p=buildCharBlock(c);
  assert.equal(p.gearBlock.split(constructLabel).length-1,1);
});
