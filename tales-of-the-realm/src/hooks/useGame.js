import { rollDie, rollDice, getMainWeapon, effectiveStats, calcAC, modStr, profBonus } from './useCharacter.js';

// Strip game tags from DM text before displaying
export const cleanDisplayText = (text) => text.replace(/\[[^\]]+\]/g, '').trim();

// Build the system prompt sent to the DM on every message
export const buildSystemPrompt = (char, apiKey) => {
  const effStats  = effectiveStats(char.stats, char.slots, char.customItems || {});
  const ac        = calcAC(char.slots, char.stats, char.customItems || {});
  const pb        = profBonus(char.level);
  const weapon    = getMainWeapon(char.slots, char.stats, char.customItems || {});
  const dexBuild  = char.race?.name === 'Elf' && char.cls?.name === 'Fighter'
    ? '\n- PLAYSTYLE: Dex Fighter — favour finesse weapons, use DEX for attacks and damage.' : '';
  const equippedList = Object.entries(char.slots)
    .filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') || 'nothing';
  const weaponLine = weapon
    ? `${weapon.name} (${weapon.damage}${weapon.bonus ? `+${weapon.bonus}` : ''}, Attack bonus +${weapon.statBonus + pb + (weapon.bonus||0)}, ${weapon.finesse ? 'finesse/DEX' : 'STR'})`
    : 'Unarmed (1 damage)';

  return `You are a Dungeon Master running a D&D 5e adventure for a player who is relatively new to the game. Keep it fun, accessible, and immersive.

CHARACTER: ${char.name} | ${char.race?.name} ${char.cls?.name} | Level ${char.level} | ${char.xp||0} XP
STATS: STR ${effStats.str}(${modStr(effStats.str)}) DEX ${effStats.dex}(${modStr(effStats.dex)}) CON ${effStats.con}(${modStr(effStats.con)}) INT ${effStats.int}(${modStr(effStats.int)}) WIS ${effStats.wis}(${modStr(effStats.wis)}) CHA ${effStats.cha}(${modStr(effStats.cha)})
COMBAT: Hit Points ${char.hp}/${char.maxHp} | Armor Class ${ac} | Proficiency Bonus +${pb} | Weapon: ${weaponLine}
EQUIPPED: ${equippedList}
INVENTORY: ${char.inventory.join(', ') || 'empty'} | Gold: ${char.gold}gp${dexBuild}

CRITICAL RULES — follow these exactly:
1. Keep responses to 2-4 paragraphs. Vivid but concise.
2. Always end with 2-4 numbered action choices.
3. NEVER use the abbreviations DC, AC, HP, XP, STR, DEX, CON, INT, WIS, CHA in your narrative text. Always write the full words: "difficulty", "armor class", "hit points", "experience", "strength", "dexterity" etc.
4. Skill checks: [ROLL: dexterity difficulty 12] — always lowercase full stat name and the word "difficulty".
5. YOU handle ALL dice rolls. Never ask the player to roll. When a check or attack is needed, roll it yourself and narrate the result.
6. Only roll for attacks when the player explicitly performs an attacking action. Do not speculatively roll attacks.
7. Hit point changes: [DAMAGE: 5] or [HEAL: 3] — integer only inside brackets, nothing else.
8. Experience awards: [XP: +50] after combat and milestones. Typical: 25-150 per encounter.
9. Gold changes MUST always use a tag: [GOLD: +10] or [GOLD: -5]. Never just narrate gold changing without a tag.
10. Items gained: [ITEM: name]. To give AND equip immediately: [ITEM: name][EQUIP: name | slotid]. Slots: mainhand, offhand, armor, head, neck, cloak, hands, ring1, ring2, feet.
11. Items lost/sold/used: [REMOVE: name]. Quest item transformations: [UPDATE: Old Name | New Name].
12. Custom weapons: [ITEM: Flame Tongue | weapon | 1d8 | finesse | melee]. Custom armor: [ITEM: Mithral Shirt | armor | 15 | true | 2]. Magic items: [ITEM: Ring of Evasion | magic | ring | ac:1 | +1 armor class].
13. Never break character. Plain text only — no markdown, no asterisks, no headers. Numbered lists only for player choices.`;
};

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

  // Auto-roll attack if player is attacking
  const buildAttackContext = (userMsg) => {
    if (!/attack|strike|hit|stab|slash|swing|lunge|thrust/i.test(userMsg)) return { context:'', roll:null };
    const char   = charRef.current;
    const weapon = getMainWeapon(char.slots, char.stats, char.customItems || {});
    const pb     = profBonus(char.level);
    if (!weapon) return { context:'', roll:null };
    const atkRoll  = rollDie(20);
    const totalAtk = atkRoll + weapon.statBonus + pb + (weapon.bonus || 0);
    const dmgRoll  = rollDice(weapon.damage);
    const totalDmg = Math.max(1, dmgRoll + weapon.statBonus + (weapon.bonus || 0));
    const context  = `\n[Player attacks with ${weapon.name}: d20 rolled ${atkRoll} + ${weapon.statBonus + pb + (weapon.bonus||0)} = ${totalAtk} to hit; if hit, damage = ${dmgRoll} + ${weapon.statBonus + (weapon.bonus||0)} = ${totalDmg}]`;
    const roll     = { label:`${weapon.name} Attack`, value:totalAtk, dc:null, dmg:totalDmg };
    return { context, roll };
  };

  return { callDM, buildSystemPrompt, buildAttackContext };
}
