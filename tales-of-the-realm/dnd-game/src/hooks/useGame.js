import { rollDie, rollDice, getMainWeapon, effectiveStats, calcAC, modStr, profBonus, statMod } from './useCharacter.js';

// Strip game tags from DM text before displaying
export const cleanDisplayText = (text) => text.replace(/\[[^\]]+\]/g, '').trim();

// ── Dice Engine ────────────────────────────────────────────────────────────────
// All dice rolling happens here in the app, never in the DM

export const performSkillCheck = (statValue, difficulty) => {
  const d20    = rollDie(20);
  const mod    = statMod(statValue);
  const total  = d20 + mod;
  const hit    = total >= difficulty;
  return { d20, mod, total, difficulty, hit };
};

export const performAttack = (weapon, stats, level) => {
  const pb       = profBonus(level);
  const atkRoll  = rollDie(20);
  const atkBonus = weapon.statBonus + pb + (weapon.bonus || 0);
  const totalAtk = atkRoll + atkBonus;
  const dmgRoll  = rollDice(weapon.damage);
  const dmgBonus = weapon.statBonus + (weapon.bonus || 0);
  const totalDmg = Math.max(1, dmgRoll + dmgBonus);
  const crit     = atkRoll === 20;
  const fumble   = atkRoll === 1;
  return { atkRoll, atkBonus, totalAtk, dmgRoll, dmgBonus, totalDmg, crit, fumble };
};

export const performEnemyRoll = (notation) => {
  // Parse enemy attack/damage notation like "1d6+3"
  const match = notation.match(/^(\d+d\d+)([+-]\d+)?$/i);
  if (!match) return rollDie(6);
  const base  = rollDice(match[1]);
  const bonus = match[2] ? parseInt(match[2]) : 0;
  return Math.max(1, base + bonus);
};

// ── System Prompt ──────────────────────────────────────────────────────────────
export const buildSystemPrompt = (char) => {
  const effStats     = effectiveStats(char.stats, char.slots, char.customItems || {});
  const ac           = calcAC(char.slots, char.stats, char.customItems || {});
  const pb           = profBonus(char.level);
  const weapon       = getMainWeapon(char.slots, char.stats, char.customItems || {});
  const dexBuild     = char.race?.name === 'Elf' && char.cls?.name === 'Fighter'
    ? '\n- PLAYSTYLE: Dex Fighter — favour finesse weapons, use DEX for attacks and damage.' : '';
  const equippedList = Object.entries(char.slots)
    .filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') || 'nothing';
  const weaponLine   = weapon
    ? `${weapon.name} (${weapon.damage}${weapon.bonus ? `+${weapon.bonus}` : ''}, Attack bonus +${weapon.statBonus + pb + (weapon.bonus||0)}, ${weapon.finesse ? 'finesse/DEX' : 'STR'}${weapon.label ? ', ' + weapon.label : ''})`
    : 'Unarmed (1 damage)';

  // Stack inventory for display in prompt
  const stackedInv = stackInventory(char.inventory);
  const invDisplay = Object.entries(stackedInv)
    .map(([name, count]) => count > 1 ? `${name} x${count}` : name)
    .join(', ') || 'empty';

  return `You are a Dungeon Master running a D&D 5e adventure for a player who is relatively new to the game. Keep it fun, accessible, and immersive.

CHARACTER: ${char.name} | ${char.race?.name} ${char.cls?.name} | Level ${char.level} | ${char.xp||0} XP
STATS: STR ${effStats.str}(${modStr(effStats.str)}) DEX ${effStats.dex}(${modStr(effStats.dex)}) CON ${effStats.con}(${modStr(effStats.con)}) INT ${effStats.int}(${modStr(effStats.int)}) WIS ${effStats.wis}(${modStr(effStats.wis)}) CHA ${effStats.cha}(${modStr(effStats.cha)})
COMBAT: Hit Points ${char.hp}/${char.maxHp} | Armor Class ${ac} | Proficiency Bonus +${pb} | Weapon: ${weaponLine}
EQUIPPED: ${equippedList}
INVENTORY: ${invDisplay} | Gold: ${char.gold}gp${dexBuild}

CRITICAL RULES — follow these exactly:
1. Keep responses to 2-4 paragraphs. Vivid but concise.
2. Always end with 2-4 numbered action choices.
3. NEVER use abbreviations DC, AC, HP, XP, STR, DEX, CON, INT, WIS, CHA in narrative. Write full words always.
4. THE APP HANDLES ALL DICE ROLLS. You never roll dice or invent numbers. Instead:
   - When a skill check is needed: write [ROLL: dexterity difficulty 14] and WAIT — the app rolls and sends you the result.
   - When an enemy attacks: write [ENEMY ATTACK: 1d6+2] — the app rolls damage and applies it.
   - When the player attacks: the app already rolled and sent you the result in the message. Just narrate it.
   - NEVER write things like "you rolled a 15" or "dealing 8 damage" unless the app sent you that number first.
5. Only trigger [ROLL:] checks for meaningful moments, not routine actions.
6. Hit point changes come ONLY from rolls the app sends you. Use [DAMAGE: N] or [HEAL: N] with the exact number from the roll result.
7. Experience awards: [XP: +50] after combat and milestones. Typical: 25-150 per encounter.
8. Gold changes MUST use tags: [GOLD: +10] or [GOLD: -5]. Never narrate gold changing without a tag.
9. Items gained: [ITEM: name]. Give AND equip: [ITEM: name][EQUIP: name | slotid]. Slots: mainhand, offhand, armor, head, neck, cloak, hands, ring1, ring2, feet.
10. Items lost/sold/used: [REMOVE: name]. Quest item transforms: [UPDATE: Old Name | New Name].
11. Custom weapons: [ITEM: Flame Tongue | weapon | 1d8 | finesse | melee]. Custom armor: [ITEM: Mithral Shirt | armor | 15 | true | 2]. Magic items: [ITEM: Ring of Evasion | magic | ring | ac:1 | +1 armor class].
12. Never break character. Plain text only — no markdown, asterisks, or headers. Numbered lists only for player choices.`;
};

// Stack duplicate inventory items for display
export const stackInventory = (inventory) => {
  const stacked = {};
  inventory.forEach(name => {
    stacked[name] = (stacked[name] || 0) + 1;
  });
  return stacked;
};

// ── The Hook ───────────────────────────────────────────────────────────────────
export function useGame({ charRef, apiKey }) {

  const callDM = async (messages, systemPrompt) => {
    const key = apiKey || import.meta.env.VITE_ANTHROPIC_KEY;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || '...';
  };

  // Process player action — handle attacks, intercepted skill rolls etc
  const buildActionContext = (userMsg) => {
    const char   = charRef.current;
    const rolls  = [];
    let context  = '';
    let rollResult = null;

    // Attack detection
    if (/\b(attack|strike|hit|stab|slash|swing|lunge|thrust|smite|bash|cleave)\b/i.test(userMsg)) {
      const weapon = getMainWeapon(char.slots, char.stats, char.customItems || {});
      if (weapon) {
        const result = performAttack(weapon, char.stats, char.level);
        const pb     = profBonus(char.level);
        if (result.crit) {
          const bonusDmg = rollDice(weapon.damage);
          result.totalDmg += bonusDmg;
          context += `\n[CRITICAL HIT with ${weapon.name}! Attack roll: ${result.atkRoll} (nat 20) = ${result.totalAtk} to hit. Damage: ${result.dmgRoll}+${result.dmgBonus}+${bonusDmg} bonus = ${result.totalDmg}]`;
        } else if (result.fumble) {
          context += `\n[FUMBLE with ${weapon.name}! Attack roll: 1 (nat 1) — automatic miss]`;
        } else {
          context += `\n[${weapon.name} attack: d20=${result.atkRoll}+${result.atkBonus}=${result.totalAtk} to hit; damage if hit: ${result.dmgRoll}+${result.dmgBonus}=${result.totalDmg}]`;
        }
        rollResult = {
          label: `${weapon.name} Attack`,
          value: result.totalAtk,
          dc: null,
          dmg: result.totalDmg,
          crit: result.crit,
          fumble: result.fumble,
        };
      }
    }

    return { context, rollResult };
  };

  // When DM requests a skill roll, intercept and roll it
  const interceptRollRequest = (dmText, char) => {
    const rollMatch = dmText.match(/\[ROLL:\s*(\w+)\s+difficulty\s+(\d+)\]/i);
    if (!rollMatch) return { rolledText: null, rollResult: null };

    const statName = rollMatch[1].toLowerCase();
    const diff     = parseInt(rollMatch[2]);
    const statMap  = { strength:'str', dexterity:'dex', constitution:'con', intelligence:'int', wisdom:'wis', charisma:'cha' };
    const statKey  = statMap[statName] || statName;
    const effStats = effectiveStats(char.stats, char.slots, char.customItems || {});
    const statVal  = effStats[statKey] || 10;
    const check    = performSkillCheck(statVal, diff);

    const resultText = `[ROLL RESULT: ${statName} check — rolled ${check.d20} + ${check.mod} modifier = ${check.total} vs difficulty ${diff} — ${check.hit ? 'SUCCESS' : 'FAILURE'}]`;
    const rollResult = {
      label: `${statName.charAt(0).toUpperCase() + statName.slice(1)} Check`,
      value: check.total,
      dc: diff,
    };

    return { resultText, rollResult };
  };

  // Handle enemy attack tags from DM
  const processEnemyAttacks = (dmText) => {
    let totalDamage = 0;
    const matches = [...dmText.matchAll(/\[ENEMY ATTACK:\s*([^\]]+)\]/gi)];
    matches.forEach(m => {
      totalDamage += performEnemyRoll(m[1].trim());
    });
    return totalDamage;
  };

  return { callDM, buildActionContext, interceptRollRequest, processEnemyAttacks };
}
