import test from 'node:test';
import assert from 'node:assert/strict';
import { SUBCLASSES, SUBCLASS_PICK_LEVEL, subclassFeaturesAtLevel, subclassPromptLines } from '../src/constants/subclasses.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

test('Creation registers all four features with the existing Bard gate and compressed progression', () => {
  assert.ok(SUBCLASSES.Bard['College of Creation']);
  assert.equal(SUBCLASS_PICK_LEVEL.Bard,3);
  assert.deepEqual(subclassFeaturesAtLevel('Bard','College of Creation',3).map(f=>f.name),['Mote of Potential','Performance of Creation','Animating Performance']);
  assert.equal(subclassFeaturesAtLevel('Bard','College of Creation',6).length,3);
  assert.equal(subclassFeaturesAtLevel('Bard','College of Creation',7).length,4);
  assert.equal(subclassFeaturesAtLevel('Bard','College of Creation',2).length,0);
});

test('level-aware features preserve subclasses without explicit unlock levels', () => {
  assert.deepEqual(subclassFeaturesAtLevel('Bard','College of Lore',3),SUBCLASSES.Bard['College of Lore'].features);
  assert.deepEqual(subclassFeaturesAtLevel('Bard','Unknown',10),[]);
});

for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) {
  test(`${build.name} includes only unlocked Creation features, using Bard rather than total level`, () => {
    const c={...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Bard'},level:13,hp:12,maxHp:12,classLevels:{Bard:3,Fighter:10},subclasses:{Bard:'College of Creation'}};
    const early=build(c);
    assert.match(early.static+early.dynamic,/Animating Performance/);
    assert.ok(!(early.static+early.dynamic).includes('Creative Crescendo'));
    const late=build({...c,classLevels:{Bard:7,Fighter:10}});
    assert.match(late.static+late.dynamic,/Creative Crescendo/);
    assert.match(subclassPromptLines({...c,classLevels:{Bard:7,Fighter:10}}),/gold-value ceiling/);
  });
}
