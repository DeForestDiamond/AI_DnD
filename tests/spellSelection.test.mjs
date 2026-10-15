import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpellSelections, spellChoice, toggleSpellChoice, switchSpellSource } from '../src/helpers/spellSelection.js';

const available={spells:new Set(['Fireball','Shield']),magicalSecrets:new Set(['Fireball','Shield','Spirit Guardians'])};
const totals={spells:1,magicalSecrets:1};
const empty=()=>({spells:[],magicalSecrets:[],martial:['Extra Attack']});

test('shared spells use class picks first and can switch to a Magical Secret without duplication',()=>{
  const initial=empty();
  const normal=toggleSpellChoice(initial,'Fireball',available,totals);
  assert.deepEqual(normal.spells,['Fireball']);assert.deepEqual(normal.magicalSecrets,[]);
  const secret=switchSpellSource(normal,'Fireball',available,totals);
  assert.deepEqual(secret.spells,[]);assert.deepEqual(secret.magicalSecrets,['Fireball']);
  assert.deepEqual(switchSpellSource(secret,'Fireball',available,totals),normal);
  assert.deepEqual(initial,empty());
});

test('a full class allowance uses Secrets for another eligible spell, while both counters remain capped',()=>{
  const normal=toggleSpellChoice(empty(),'Fireball',available,totals);
  const both=toggleSpellChoice(normal,'Shield',available,totals);
  assert.deepEqual(both.spells,['Fireball']);assert.deepEqual(both.magicalSecrets,['Shield']);
  assert.equal(toggleSpellChoice(both,'Spirit Guardians',available,totals),both);
  assert.equal(switchSpellSource(both,'Fireball',available,totals),both);
  assert.equal(switchSpellSource(both,'Shield',available,totals),both);
  assert.deepEqual(toggleSpellChoice(both,'Shield',available,totals).magicalSecrets,[]);
});

test('Secret-only spells always use the Secret allowance and cannot move to a normal class pick',()=>{
  const next=toggleSpellChoice(empty(),'Spirit Guardians',available,totals);
  assert.deepEqual(next.magicalSecrets,['Spirit Guardians']);assert.deepEqual(next.spells,[]);
  assert.equal(switchSpellSource(next,'Spirit Guardians',available,totals),next);
  assert.equal(toggleSpellChoice(empty(),'Unknown',available,totals).spells.length,0);
});

test('no Bard allowance means no new Secret picks; old saved selections can still be removed',()=>{
  const none={spells:1,magicalSecrets:0};
  assert.deepEqual(toggleSpellChoice(empty(),'Spirit Guardians',available,none),empty());
  const legacy={...empty(),magicalSecrets:['Spirit Guardians']};
  assert.deepEqual(toggleSpellChoice(legacy,'Spirit Guardians',available,none).magicalSecrets,[]);
});

test('old duplicate allocations are consolidated without losing spells or unrelated abilities',()=>{
  const legacy={...empty(),spells:['Fireball','Fireball'],magicalSecrets:['Fireball','Spirit Guardians','Spirit Guardians']};
  const next=normalizeSpellSelections(legacy);
  assert.deepEqual(next.spells,['Fireball']);assert.deepEqual(next.magicalSecrets,['Spirit Guardians']);
  assert.deepEqual(next.martial,legacy.martial);assert.equal(legacy.spells.length,2);
  assert.deepEqual(normalizeSpellSelections(JSON.parse(JSON.stringify(next))),next);
});

test('automatically granted spells do not consume the normal selectable allowance',()=>{
  const selected={...empty(),spells:['Shield']};
  const choice=spellChoice(selected,'Fireball',available,totals,new Set(['Shield']));
  assert.equal(choice.canUseClass,true);
  assert.deepEqual(toggleSpellChoice(selected,'Fireball',available,totals,new Set(['Shield'])).spells,['Shield','Fireball']);
});
