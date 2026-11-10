import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ARC_TERMINATION_BLOCK } from '../src/prompts/arcTermination.js';
import { ARC_RULES_BLOCK as full } from '../src/prompts/shared.js';
import { ARC_RULES_BLOCK as lean } from '../src/prompts/sharedLow.js';
import { TAGS_BLOCK } from '../src/prompts/tags.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { useCharacter } from '../src/hooks/character/useCharacter.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const copies=(text,block)=>text.split(block).length-1;
const char=()=>({...structuredClone(EMPTY_CHAR),name:'Test',race:{name:'Human'},cls:{name:'Fighter'},level:3,hp:12,maxHp:12,arc:{antagonist:'Ghouls',status:'active'},storyMode:'arcs'});

test('both shared arc blocks include the same failure policy without removing ordinary completion rules',()=>{
  for(const block of [full,lean]) {
    assert.equal(copies(block,ARC_TERMINATION_BLOCK),1);
    assert.match(block,/Ignoring a hook alone/);
    assert.match(block,/deal, truce/);
    assert.match(block,/SAME response/);
  }
  assert.match(TAGS_BLOCK,/success, settlement, or irreversible failure/);
});

for(const build of [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46]) {
  test(`${build.name}: failure policy applies to arcs and is removed for Long Story and Adventures`,()=>{
    for(const fantasyTone of ['standard','full-dark']) for(const combatFirst of [false,true]) {
      const c={...char(),fantasyTone,combatFirst};
      const active=build(c).static;
      assert.equal(copies(active,ARC_TERMINATION_BLOCK),1);
      assert.match(active,/Never emit \[ARC START\] in the same response as \[ARC COMPLETE\]/);
      for(const other of [{...c,storyMode:'continuous'},{...c,adventure:{title:'Test',premise:'A situation'}},{...c,arc:null}]) {
        const prompt=build(other).static;
        assert.equal(copies(prompt,ARC_TERMINATION_BLOCK),0);
        assert.ok(!prompt.includes('Story arc resolved (success, settlement, or irreversible failure'));
      }
    }
  });
}

let applyEffects;
function Harness(){applyEffects=useCharacter().applyEffects;return null;}
renderToString(React.createElement(Harness));
test('failure uses the existing tag to close the arc and reserve the next foe without awarding success rewards',()=>{
  const before=char();
  const after=applyEffects('The caravan and its cargo are destroyed. Its delivery objective has irreversibly failed. [ARC COMPLETE]',before);
  assert.equal(after.arc.status,'reserved');
  assert.equal(after.arc.previousAntagonist,'Ghouls');
  assert.ok(after.defeatedAntagonists.includes('Ghouls'));
  assert.equal(after.xp,before.xp);
  assert.equal(after.coins,before.coins);
  const twice=applyEffects('[ARC COMPLETE]',after);
  assert.deepEqual(twice.arc,after.arc);
});
