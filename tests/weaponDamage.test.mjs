import assert from 'node:assert/strict';
import { parseWeaponDamage, normalizeWeaponDamage } from '../src/utils/weaponDamage.js';
import { parseDMItem } from '../src/constants/items.js';
import { rollDice } from '../src/hooks/character/stats.js';
import { getMainWeapon } from '../src/hooks/character/items.js';

const soul = '2d6+9, 3d8 necrotic, 3d8 fire';
const pistol = '3d12 + 7, 7d6 fire, 4d6 cold';
assert.deepEqual(parseWeaponDamage(soul), {
  damage:'2d6', damageBonus:9,
  extras:[{dice:'3d8',type:'necrotic'},{dice:'3d8',type:'fire'}],
});
assert.equal(parseWeaponDamage(pistol).damageBonus, 7);
assert.deepEqual(parseWeaponDamage(soul.replaceAll(',', ' plus')), parseWeaponDamage(soul));
assert.equal(parseWeaponDamage('2d6 - 3').damageBonus, -3);
assert.equal(parseWeaponDamage('d8 + 2').damage, '1d8');
const w = normalizeWeaponDamage({damage:soul,bonus:0});
assert.equal(w.bonus, 0);
assert.deepEqual(normalizeWeaponDamage(w), w);
assert.equal(normalizeWeaponDamage({...w,damage:soul}).extras.length, 2);
const parsed = parseDMItem('Sword | weapon | '+soul+' | | melee | soul blade | bonus:2 | str:4,cha:4').data;
assert.equal(parsed.damage, '2d6');
assert.equal(parsed.damageBonus, 9);
assert.equal(parsed.bonus, 2);
assert.deepEqual(parsed.bonuses, {str:4,cha:4});
assert.equal(parsed.extras.length, 2);
const main = getMainWeapon({mainhand:'Soul-Render'}, {str:18,dex:12}, {'Soul-Render':{type:'weapon',damage:soul,bonus:0}});
assert.equal(main.damageBonus, 9);
assert.equal(main.statBonus, 4);
const random = Math.random;
try {
  Math.random = () => 0;
  assert.equal(rollDice(soul), 17);
  assert.equal(rollDice(pistol), 21);
  assert.equal(rollDice('nonsense'), 0);
  assert.equal(rollDice('2d0'), 0);
  assert.equal(rollDice('d8'), 1);
} finally { Math.random = random; }
console.log('Weapon damage regression checks passed');
