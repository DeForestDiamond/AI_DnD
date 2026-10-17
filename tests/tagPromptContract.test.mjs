import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TAGS_BLOCK } from '../src/prompts/tags.js';
import { parseDMItem } from '../src/constants/items.js';
import { useCharacter } from '../src/hooks/character/useCharacter.js';
import { EMPTY_CHAR } from '../src/hooks/character/defaults.js';
import { stackCount } from '../src/utils/itemStacks.js';

const example = name => {
  const match=[...TAGS_BLOCK.matchAll(/\[ITEM: ([^\]]+)\]/g)].find(m=>m[1].split('|')[0].trim()===name);
  assert.ok(match,`Missing example for ${name}`);
  return match[1];
};
let applyEffects;
function Harness(){applyEffects=useCharacter().applyEffects;return null;}
renderToString(React.createElement(Harness));

test('documented weapon example keeps damage-only and enchantment bonuses separate',()=>{
  const {data}=parseDMItem(example('Emberblade'));
  assert.equal(data.type,'weapon');
  assert.equal(data.damage,'1d8');
  assert.equal(data.damageBonus,3);
  assert.equal(data.bonus,2);
  assert.equal(data.finesse,true);
  assert.equal(data.range,'melee');
  assert.deepEqual(data.extras,[{dice:'2d6',type:'fire'}]);
  assert.deepEqual(data.bonuses,{str:1});
});

test('documented armor, magic, instrument, construct, consumable and misc examples match their parser fields',()=>{
  const armor=parseDMItem(example('Breastplate of Fortitude')).data;
  assert.equal(armor.ac,14);assert.equal(armor.dexBonus,true);assert.equal(armor.maxDex,2);assert.equal(armor.bonuses.con,2);
  const ring=parseDMItem(example('Ring of Protection')).data;
  assert.equal(ring.slot,'ring1');assert.equal(ring.bonuses.ac,1);
  const boots=parseDMItem(example('Boots of the Tundra')).data;
  assert.deepEqual(boots.bonuses,{});assert.equal(boots.label,'walk on ice without tracks');
  const lyre=parseDMItem(example('Silver Lyre')).data;
  assert.equal(lyre.type,'magic');assert.equal(lyre.slot,'mainhand');assert.equal(lyre.bonuses.performance,2);assert.match(lyre.label,/bardic spellcasting focus/);
  for(const name of ['Bone Colossus','Ironbound Trade Wagon']) {
    const construct=parseDMItem(example(name)).data;
    assert.equal(construct.type,'construct');assert.equal(construct.status,'dormant');assert.equal(construct.slot,undefined);assert.match(construct.label,/^CR \d+\./);
  }
  assert.equal(parseDMItem(example('Antitoxin Vial')).data.type,'consumable');
  assert.equal(parseDMItem(example('Brass Token')).data.label,'grants an audience with Lady Saryn');
});

test('quantity-neutral status updates preserve full item labels and all existing copies',()=>{
  const raw=example('Bone Colossus');
  let c=applyEffects(`[ITEM: ${raw} | qty:4]`,structuredClone(EMPTY_CHAR));
  const label=c.items['Bone Colossus'].label;
  c=applyEffects(`[ITEM: ${raw.replace('| dormant |','| active |')} | qty:0]`,c);
  assert.equal(stackCount(c.inventory,'Bone Colossus'),4);
  assert.equal(c.items['Bone Colossus'].status,'active');
  assert.equal(c.items['Bone Colossus'].label,label);
  c=applyEffects('[REMOVE: Bone Colossus]',c);
  assert.equal(stackCount(c.inventory,'Bone Colossus'),3);
  c=applyEffects('[REMOVE: Bone Colossus | qty:2]',c);
  assert.equal(stackCount(c.inventory,'Bone Colossus'),1);
});
