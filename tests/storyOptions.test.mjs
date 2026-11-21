import { TERRA_LONG_STORY } from '../src/prompts/terra.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { useCharacter } from '../src/hooks/character/useCharacter.js';
import { migrateCharacter } from '../src/hooks/character/migration.js';
import { changeStoryOptions } from '../src/helpers/storyOptions.js';
import { prepareContinuousOpening } from '../src/helpers/adventure/continuous.js';
import { rollAdventureSeed } from '../src/helpers/adventure/seed.js';
import { rollEncounterDirective } from '../src/constants/encounters/roller.js';
import { CONTINUOUS_STORY_BLOCK, FULL_DARK_FANTASY_BLOCK } from '../src/prompts/storyOptions.js';
import { useGame, buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

const character = () => ({ ...structuredClone(EMPTY_CHAR), name:'Test', race:{name:'Human'}, cls:{name:'Fighter'}, level:1, hp:12, maxHp:12, currentLocation:'Waterdeep - Tavern', arc:{antagonist:'a pack of ghouls',localArea:'Waterdeep',arcLocation:null}, worldPressures:{siege:{current:'Doors holding',next:'Attempt breach',trigger:'Minutes'}} });
let effects;
function Harness() { effects = useCharacter().applyEffects; return null; }
renderToString(React.createElement(Harness));

test('switching to Long Story preserves people, pressure, and a resumable driver without inventing a new arc', () => {
  const c = character();
  const continuous = changeStoryOptions(c, {storyMode:'continuous',fantasyTone:'full-dark'});
  assert.equal(continuous.arc, null);
  assert.deepEqual(continuous.worldPressures, c.worldPressures);
  assert.deepEqual(c.arc, continuous.suspendedStoryDriver.arc);
  const loaded = migrateCharacter(JSON.parse(JSON.stringify(continuous))).char;
  assert.equal(loaded.storyMode,'continuous');
  assert.equal(loaded.fantasyTone,'full-dark');
  assert.deepEqual(changeStoryOptions(loaded, {storyMode:'arcs'}).arc,c.arc);
  assert.equal(c.storyMode,undefined);
});

test('tone changes alone do not discard an existing antagonist or situation', () => {
  const c = character();
  assert.deepEqual(changeStoryOptions(c,{fantasyTone:'full-dark'}).arc,c.arc);
  const adventure = {title:'A strange market',premise:'A festival'};
  const continuous = changeStoryOptions({...c,arc:null,adventure},{storyMode:'continuous'});
  assert.equal(continuous.adventure,undefined);
  assert.deepEqual(changeStoryOptions(continuous,{storyMode:'arcs'}).adventure,adventure);
});

test('continuous openings roll no antagonist and start without previous campaign drivers or timers', () => {
  for(let i=0;i<40;i++) {
    const c = changeStoryOptions(character(),{storyMode:'continuous',fantasyTone:'full-dark'});
    const opening = prepareContinuousOpening(c);
    assert.equal(opening.seed.arc,null);
    assert.equal(opening.seed.antagonist,null);
    assert.equal(opening.character.arc,null);
    assert.deepEqual(opening.character.worldPressures,{});
    assert.equal(opening.character.suspendedStoryDriver,undefined);
    assert.match(opening.prompt,/Full Dark Fantasy/);
    assert.ok(!opening.prompt.includes('a pack of ghouls'));
  }
  const manual = prepareContinuousOpening(character(),'I arrive at my home.');
  assert.match(manual.prompt,/I arrive at my home\./);
  assert.ok(!manual.prompt.includes('GEOGRAPHIC ANCHOR:'));
  const situation = prepareContinuousOpening(character(),'',{location:'Cormyr',premise:'A feast'});
  assert.match(situation.prompt,/STARTING CONTEXT: Cormyr/);
});

test('a stray completion or start tag never rerolls or activates an arc in Long Story', () => {
  const c = {...character(),storyMode:'continuous'}; // defensively handles legacy state
  assert.deepEqual(effects('[ARC COMPLETE][ARC START]',c).arc,c.arc);
  assert.deepEqual(effects('[ARC START]',{...c,arc:{...c.arc,status:'reserved'}}).arc,{...c.arc,status:'reserved'});
  assert.equal(effects('[ARC COMPLETE]',{...c,arc:null}).arc,null);
});

test('Long Story random encounters never use a legacy assigned foe and omit the escalation cap directive', () => {
  const original = Math.random;
  try {
    Math.random = () => 0;
    const encounter = rollEncounterDirective({...character(),storyMode:'continuous'});
    assert.equal(encounter.arcTied,false);
    assert.ok(!encounter.directive.includes('do not escalate it into something bigger'));
    const dark = rollEncounterDirective({...character(),fantasyTone:'full-dark'});
    assert.ok(!dark.directive.includes("Scale any threat to the player's level"));
    const standard = rollEncounterDirective({...character(),arc:null});
    assert.match(standard.directive,/do not escalate it into something bigger/);
  } finally { Math.random = original; }
});

test('dark structured openings retain the assigned foe but remove the low-level story ceiling', () => {
  const seed = rollAdventureSeed(1,{antagonist:'a pack of ghouls',openScale:true});
  assert.equal(seed.antagonist,'a pack of ghouls');
  assert.match(seed.scope,/without a level-based story ceiling/);
});

const builders = [buildSystemPrompt,buildSystemPromptSonnet,buildSystemPromptSol,buildSystemPromptTerra,buildSystemPromptGrok43,buildSystemPromptGrok46];
for(const build of builders) {
  test(`${build.name} applies independent modes without contradictory arc or power rules`, () => {
    const c=character();
    const longRules = build === buildSystemPromptTerra ? TERRA_LONG_STORY : CONTINUOUS_STORY_BLOCK;
    const standard=build(c);
    assert.ok(!standard.static.includes(longRules));
    const continuous=build({...c,storyMode:'continuous'});
    assert.ok(continuous.static.includes(longRules));
    assert.ok(!continuous.static.includes('ONE MAJOR ANTAGONIST:'));
    assert.ok(!continuous.static.includes('ONE ANTAGONIST, AND ONLY ONE.'));
    assert.ok(!continuous.static.includes('RESERVED MEANS NOT ACTIVE.'));
    assert.ok(!continuous.static.includes('Story arc resolved (main antagonist'));
    assert.ok(!continuous.static.includes("── DON'T ESCALATE ──"));
    assert.ok(!continuous.static.includes('── ENCOUNTER SCALE ──'));
    assert.ok(!continuous.dynamic.includes('a pack of ghouls'));
    assert.match(continuous.static,/NPC KNOWLEDGE HAS A SOURCE/);
    const dark=build({...c,fantasyTone:'full-dark'});
    assert.ok(dark.static.includes(FULL_DARK_FANTASY_BLOCK));
    assert.ok(!dark.static.includes('── ENCOUNTER SCALE ──'));
    assert.ok(!dark.static.includes('── ENEMY POWER — DEFAULT LOW ──'));
    assert.match(dark.dynamic,/a pack of ghouls/);
    const both=build({...c,storyMode:'continuous',fantasyTone:'full-dark'});
    assert.ok(both.static.includes(longRules));
    const darkContinuous = FULL_DARK_FANTASY_BLOCK.replace(
      'Apply the selected story structure: dark arc campaigns still honor arc completion and aftermath; Long Story continues organically.',
      'The Long Story continues organically.'
    );
    assert.ok(both.static.includes(darkContinuous));
  });
}

test('OpenAI/xAI transport sends Long Story and darkness without restoring a hidden antagonist', async () => {
  const c={...character(),storyMode:'continuous',fantasyTone:'full-dark'};
  const {callDM}=useGame({charRef:{current:c},openAiApiKey:'test',xAiApiKey:'test'});
  const original=globalThis.fetch;
  try {
    for(const provider of ['openai','xai']) {
      let body;
      globalThis.fetch=async (_url,options)=>{body=options.body;return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'Scene.'}]}],usage:{}})};};
      await callDM([{role:'user',content:'I walk into town.'}],buildSystemPromptSol(c),{provider,model:'test'});
      assert.match(body,/LONG STORY: CONTINUOUS CAMPAIGN/);
      assert.match(body,/FULL DARK FANTASY: UNCOMPROMISING TONE/);
      assert.ok(!body.includes('a pack of ghouls'));
      assert.match(body,/NPC KNOWLEDGE HAS A SOURCE/);
    }
  } finally {globalThis.fetch=original;}
});
