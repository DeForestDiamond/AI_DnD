import test from 'node:test';
import assert from 'node:assert/strict';
import { DEITIES, getDeityByName, filterDeities } from '../src/constants/deities.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { migrateCharacter } from '../src/hooks/character/migration.js';
import { buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46 } from '../src/hooks/useGame.js';

test('expanded deity choices retain existing names and complete selectable records', () => {
  assert.equal(DEITIES.length, 51);
  assert.equal(new Set(DEITIES.map(d=>d.name)).size, DEITIES.length);
  for (const name of ['Selûne','Lathander','Tempus','Helm','Tyr','Mystra','Bane','Shar','Kelemvor','Asmodeus','Eilistraee','Lolth','Myrkul','Bhaal','Tymora','Bahamut','Tiamat','Moradin','Gruumsh']) {
    assert.ok(getDeityByName(name), name);
  }
  for (const deity of DEITIES) {
    for (const key of ['name','emoji','alignment','desc','flavor']) assert.ok(deity[key]?.trim(), `${deity.name}: ${key}`);
    assert.ok(deity.domains.length > 0);
  }
  assert.equal(getDeityByName('Mystra').alignment, 'Neutral Good');
  assert.equal(getDeityByName('Shar').alignment, 'Neutral Evil');
});

test('search supports names, accents, alignment, domains and portfolios without mutating options', () => {
  const original = structuredClone(DEITIES);
  assert.deepEqual(filterDeities(DEITIES, '  '), DEITIES);
  assert.deepEqual(filterDeities(DEITIES, 'SELUNE').map(d=>d.name), ['Selûne']);
  assert.deepEqual(filterDeities(DEITIES, 'asmodeus lawful').map(d=>d.name), ['Asmodeus']);
  assert.ok(filterDeities(DEITIES, 'evil trickery').some(d=>d.name === 'Lolth'));
  assert.ok(filterDeities(DEITIES, 'forge').some(d=>d.name === 'Moradin'));
  assert.ok(filterDeities(DEITIES, 'farming').some(d=>d.name === 'Chauntea'));
  assert.deepEqual(filterDeities(DEITIES, 'not-a-deity'), []);
  assert.deepEqual(filterDeities([{name:'The Archfey',alignment:'Chaotic Neutral',desc:'Fey pact'}], 'fey').map(d=>d.name), ['The Archfey']);
  assert.deepEqual(DEITIES, original);
});

for (const build of [buildSystemPrompt, buildSystemPromptSonnet, buildSystemPromptSol, buildSystemPromptTerra, buildSystemPromptGrok43, buildSystemPromptGrok46]) {
  test(`${build.name}: expanded choices survive save migration and reach cleric DM context`, () => {
    for (const deity of DEITIES) {
      const source = {...structuredClone(EMPTY_CHAR), name:'Test', race:{name:'Human'}, cls:{name:'Cleric'}, level:1, deity, disposition:{alignment:'Lawful Evil'}};
      const {char} = migrateCharacter(JSON.parse(JSON.stringify(source)));
      assert.equal(char.deity.name, deity.name);
      assert.equal(char.disposition.alignment, 'Lawful Evil');
      const prompt = build(char);
      const text = prompt.static + prompt.dynamic;
      assert.ok(text.includes(deity.name));
      assert.ok(text.includes(deity.desc));
      assert.ok(text.includes(deity.alignment));
    }
  });
}
