import test from 'node:test';
import assert from 'node:assert/strict';
import { ARC_RULES_BLOCK as fullArc } from '../src/prompts/shared.js';
import { ARC_RULES_BLOCK as leanArc } from '../src/prompts/sharedLow.js';
import { ARC_PACING_BLOCK, arcContext } from '../src/prompts/arcPacing.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

for (const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) {
  test(`${build.name} keeps arc resolution and aftermath policy separate from compact state`,()=>{
    const c={...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Fighter'},level:3,hp:12,maxHp:12,arc:{antagonist:'Black Dragon',arcLocation:'Cormyr - Mere Lair',localArea:'Cormyr'}};
    const before=structuredClone(c);
    const active=build(c);
    const rules=active.static.includes(fullArc)?fullArc:leanArc;
    assert.ok(active.static.includes(rules));
    assert.equal(active.static.split(ARC_PACING_BLOCK).length-1,1);
    assert.match(active.dynamic,/Phase: ACTIVE/);
    assert.match(active.dynamic,/Black Dragon/);
    assert.match(active.dynamic,/Cormyr - Mere Lair/);
    assert.match(rules,/no scene quota|There is no scene quota/i);
    assert.match(rules,/SAME response/);
    assert.match(rules,/deal, truce,.*payment/);
    assert.match(rules,/Ignoring a hook alone/);
    assert.match(rules,/fixed lairs|fixed destination/);
    assert.match(rules,/hidden superior, successor, revenge faction, larger conspiracy/);
    const reserved=build({...c,arc:{...c.arc,status:'reserved',previousAntagonist:'Bandit Lord'}});
    assert.match(reserved.dynamic,/Phase: AFTERMATH/);
    assert.match(reserved.dynamic,/RESERVED — not active/);
    assert.match(reserved.dynamic,/Bandit Lord/);
    assert.match(reserved.dynamic,/\[ARC START\]/);
    assert.match(reserved.static,/Loose ends do not delay completion|loose ends under ARC DEVELOPMENT/);
    assert.match(reserved.static,/Never emit \[ARC START\] in the same response as \[ARC COMPLETE\]/);
    assert.deepEqual(c,before);
  });
}

test('arc state stays compact and carries facts rather than duplicating the policy',()=>{
  const c={arc:{antagonist:'Dragon',localArea:'Cormyr'}};
  assert.ok(arcContext(c).length<400);
  assert.ok(arcContext({...c,arc:{...c.arc,status:'reserved'}}).length<550);
  assert.ok(fullArc.length+ARC_PACING_BLOCK.length<4500);
  assert.ok(leanArc.length+ARC_PACING_BLOCK.length<3300);
});
