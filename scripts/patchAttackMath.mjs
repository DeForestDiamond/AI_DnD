import fs from 'node:fs';

const charPath = 'src/hooks/useCharacter.js';
const gamePath = 'src/hooks/useGame.js';
let c = fs.readFileSync(charPath, 'utf8');
let g = fs.readFileSync(gamePath, 'utf8');
let charChanged = false;
let gameChanged = false;

const replaceOnce = (text, from, to, label, markChanged) => {
  if (text.includes(to)) return text;
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`Attack math patch: expected one ${label} anchor, found ${count}`);
  markChanged();
  return text.replace(from, to);
};

const oldWeapon = `  // Arcane Pistol uses INT, finesse weapons use best of STR/DEX, others use STR\n  let statBonus;\n  if (w.label?.includes('INT-based') || name === 'Arcane Pistol') {\n    statBonus = statMod(effStats.int);\n  } else {\n    const useDex = w.finesse && statMod(effStats.dex) >= statMod(effStats.str);\n    statBonus = useDex ? statMod(effStats.dex) : statMod(effStats.str);\n  }\n  return { name, ...w, statBonus };`;

const newWeapon = `  // Choose the attack ability once, here, for every attack path.\n  // Ranged weapons use Dexterity; finesse melee weapons use the better of\n  // Strength/Dexterity; ordinary melee weapons use Strength. Explicit INT-based\n  // arcane weapons keep their special rule.\n  let attackAbility;\n  if (w.label?.includes('INT-based') || name === 'Arcane Pistol') {\n    attackAbility = 'int';\n  } else if (w.range === 'ranged') {\n    attackAbility = 'dex';\n  } else if (w.finesse && statMod(effStats.dex) >= statMod(effStats.str)) {\n    attackAbility = 'dex';\n  } else {\n    attackAbility = 'str';\n  }\n  const statBonus = statMod(effStats[attackAbility]);\n  return { name, ...w, statBonus, attackAbility };`;

c = replaceOnce(c, oldWeapon, newWeapon, 'getMainWeapon ability selection', () => { charChanged = true; });

const oldAttack = `export const performAttack = (weapon, stats, level) => {\n  const pb       = profBonus(level);\n  const atkRoll  = rollDie(20);\n  const atkBonus = weapon.statBonus + pb + (weapon.bonus || 0);\n  const totalAtk = atkRoll + atkBonus;\n  const dmgRoll  = rollDice(weapon.damage);\n  const dmgBonus = weapon.statBonus + (weapon.bonus || 0);`;

const newAttack = `export const performAttack = (weapon, stats, level) => {\n  const profBonusValue = profBonus(level);\n  const atkRoll         = rollDie(20);\n  const statBonus       = weapon.statBonus || 0;\n  const weaponBonus     = weapon.bonus || 0;\n  const statLabel       = (weapon.attackAbility || 'str').toUpperCase();\n  const atkBonus        = statBonus + profBonusValue + weaponBonus;\n  const totalAtk        = atkRoll + atkBonus;\n  const dmgRoll         = rollDice(weapon.damage);\n  const dmgBonus        = statBonus + weaponBonus;`;

g = replaceOnce(g, oldAttack, newAttack, 'performAttack math', () => { gameChanged = true; });

const oldReturn = `  return { atkRoll, atkBonus, totalAtk, dmgRoll, dmgBonus, extras, extraTotal, totalDmg, crit, fumble };`;
const newReturn = `  return { atkRoll, atkBonus, totalAtk, statBonus, statLabel, profBonus: profBonusValue, weaponBonus, dmgRoll, dmgBonus, extras, extraTotal, totalDmg, crit, fumble };`;
g = replaceOnce(g, oldReturn, newReturn, 'performAttack return', () => { gameChanged = true; });

const oldWeaponLine = "  const weaponLine  = weapon ? `${weapon.name} (${weapon.damage}${weapon.bonus?`+${weapon.bonus}`:''}${(weapon.extras||[]).map(e=>` plus ${e.dice} ${e.type}`).join('')}, Attack bonus +${weapon.statBonus+pb+(weapon.bonus||0)}, ${weapon.finesse?'finesse/Dexterity':'Strength'}${weapon.label?', '+weapon.label:''})` : 'Unarmed (1 damage)';";
const newWeaponLine = "  const weaponLine  = weapon ? `${weapon.name} (${weapon.damage}${weapon.bonus?`+${weapon.bonus}`:''}${(weapon.extras||[]).map(e=>` plus ${e.dice} ${e.type}`).join('')}, Attack bonus +${weapon.statBonus+pb+(weapon.bonus||0)}, ${(weapon.attackAbility || 'str').toUpperCase()}${weapon.finesse && weapon.range !== 'ranged' ? '/finesse' : ''}${weapon.label?', '+weapon.label:''})` : 'Unarmed (1 damage)';";
g = replaceOnce(g, oldWeaponLine, newWeaponLine, 'weapon prompt line', () => { gameChanged = true; });

const oldActionLog = "          log?.(`[ATTACK] ${weapon.name}: d20=${result.atkRoll}+${result.atkBonus}=${result.totalAtk} to hit → dmg ${result.dmgRoll}+${result.dmgBonus}${extraDesc2}${sneakDesc}=${result.totalDmg}`);";
const newActionLog = "          log?.(`[ATTACK] ${weapon.name}: d20=${result.atkRoll} + ${result.statLabel}(${result.statBonus}) + prof(${result.profBonus})${result.weaponBonus ? ` + weapon(${result.weaponBonus})` : ''} = ${result.totalAtk} to hit → dmg ${result.dmgRoll}+${result.dmgBonus}${extraDesc2}${sneakDesc}=${result.totalDmg}`);";
g = replaceOnce(g, oldActionLog, newActionLog, 'player attack debug log', () => { gameChanged = true; });

// Older main never actually received the attempted unified-attack workflow patch,
// so the DM-requested [ROLL: attack ...] path still has its own hand-written math.
// Replace that whole legacy calculation with performAttack() in one exact edit.
const oldRequested = `      const atkBonus = abilityMod + pb2 + enchant;\n      const d20 = rollDie(20);\n      const total = d20 + atkBonus;\n      const hit = total >= diff;\n      log?.(\`[ROLL] ${'${statLabel}'} with ${'${label}'}: d20=${'${d20}'}+${'${abilityMod}'}+${'${pb2}'}${'${enchant?`+${enchant}`:\'\'}'}=${'${total}'} vs DC${'${diff}'} — ${'${hit?\'HIT\':\'MISS\'}'}\`);\n      return {\n        resultText: \`[ROLL RESULT: attack roll with ${'${label}'} — d20 rolled ${'${d20}'} + ${'${abilityMod}'} ability + ${'${pb2}'} proficiency${'${enchant ? ` + ${enchant} enchantment` : \'\'}'} = ${'${total}'} vs difficulty ${'${diff}'} — ${'${hit ? \'HIT\' : \'MISS\'}'}]\`,\n        rollResult: {\n          label: \`${'${label}'} Attack\`,\n          value: total,\n          dc: diff,\n          crit: d20 === 20,\n          fumble: d20 === 1,\n        },\n      };`;

const newRequested = `      const attackWeapon = weapon || {\n        name: label,\n        damage: '1d1',\n        statBonus: abilityMod,\n        attackAbility: statMod(effAtk.dex) >= statMod(effAtk.str) ? 'dex' : 'str',\n        bonus: enchant,\n        extras: [],\n      };\n      const result = performAttack(attackWeapon, char.stats, char.level);\n      const hit = result.crit || (!result.fumble && result.totalAtk >= diff);\n      log?.(\`[ROLL] ${'${statLabel}'} with ${'${label}'}: d20=${'${result.atkRoll}'} + ${'${result.statLabel}'}(${'${result.statBonus}'}) + prof(${'${result.profBonus}'})${'${result.weaponBonus ? ` + weapon(${result.weaponBonus})` : \'\'}'} = ${'${result.totalAtk}'} vs DC${'${diff}'} — ${'${hit?\'HIT\':\'MISS\'}'}\`);\n      return {\n        resultText: \`[ROLL RESULT: attack roll with ${'${label}'} — d20 ${'${result.atkRoll}'} + ${'${result.statLabel}'} ${'${result.statBonus}'} + proficiency ${'${result.profBonus}'}${'${result.weaponBonus ? ` + weapon ${result.weaponBonus}` : \'\'}'} = ${'${result.totalAtk}'} vs difficulty ${'${diff}'} — ${'${hit ? \'HIT\' : \'MISS\'}'}${'${hit ? `; damage ${result.totalDmg}` : \'\'}'}]\`,\n        rollResult: {\n          label: \`${'${label}'} Attack\`,\n          value: result.totalAtk,\n          dc: diff,\n          dmg: hit ? result.totalDmg : null,\n          crit: result.crit,\n          fumble: result.fumble,\n        },\n      };`;

g = replaceOnce(g, oldRequested, newRequested, 'DM-requested attack calculation', () => { gameChanged = true; });

if (charChanged) fs.writeFileSync(charPath, c);
if (gameChanged) fs.writeFileSync(gamePath, g);

if (charChanged || gameChanged) {
  console.log('Attack math patch applied: ranged=DEX, shared modifiers, labeled debug arithmetic.');
} else {
  console.log('Attack math patch already applied.');
}
