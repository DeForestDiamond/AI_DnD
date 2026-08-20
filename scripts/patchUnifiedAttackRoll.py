from pathlib import Path

p = Path('src/hooks/useGame.js')
s = p.read_text()

old = '''      const atkBonus = abilityMod + pb2 + enchant;
      const d20 = rollDie(20);
      const total = d20 + atkBonus;
      const hit = total >= diff;
      log?.(`[ROLL] ${statLabel} with ${label}: d20=${d20}+${abilityMod}+${pb2}${enchant?`+${enchant}`:''}=${total} vs DC${diff} — ${hit?'HIT':'MISS'}`);
      return {
        resultText: `[ROLL RESULT: attack roll with ${label} — d20 rolled ${d20} + ${abilityMod} ability + ${pb2} proficiency${enchant ? ` + ${enchant} enchantment` : ''} = ${total} vs difficulty ${diff} — ${hit ? 'HIT' : 'MISS'}]`,
        rollResult: {
          label: `${label} Attack`,
          value: total,
          dc: diff,
          crit: d20 === 20,
          fumble: d20 === 1,
        },
      };'''

new = '''      // Use the SAME attack engine as player-initiated attacks. This prevents
      // DM-requested [ROLL: attack ...] checks from drifting into a second copy
      // of the to-hit formula with different stat/proficiency/enchantment rules.
      const attackWeapon = weapon || {
        name: label,
        damage: '1d1',
        statBonus: abilityMod,
        bonus: enchant,
        extras: [],
      };
      const result = performAttack(attackWeapon, char.stats, char.level);
      const hit = result.crit || (!result.fumble && result.totalAtk >= diff);
      log?.(`[ROLL] ${statLabel} with ${label}: d20=${result.atkRoll}+${result.atkBonus}=${result.totalAtk} vs DC${diff} — ${hit?'HIT':'MISS'}`);
      return {
        resultText: `[ROLL RESULT: attack roll with ${label} — d20 rolled ${result.atkRoll} + ${result.atkBonus} attack bonus = ${result.totalAtk} vs difficulty ${diff} — ${hit ? 'HIT' : 'MISS'}${hit ? `; damage ${result.totalDmg}` : ''}]`,
        rollResult: {
          label: `${label} Attack`,
          value: result.totalAtk,
          dc: diff,
          dmg: hit ? result.totalDmg : null,
          crit: result.crit,
          fumble: result.fumble,
        },
      };'''

count = s.count(old)
if count != 1:
    raise SystemExit(f'Refusing to patch: expected one DM-requested attack block, found {count}')

s = s.replace(old, new, 1)
p.write_text(s)
print('Unified DM-requested attacks with performAttack()')

# trigger workflow
