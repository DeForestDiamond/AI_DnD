from pathlib import Path

p = Path('src/hooks/useGame.js')
s = p.read_text()

old = "        rollResult: { d20, mod: abilityMod, prof: pb2, gearBonus: enchant, total, difficulty: diff, hit },"
new = "        rollResult: {\n          label: `${label} Attack`,\n          value: total,\n          dc: diff,\n          crit: d20 === 20,\n          fumble: d20 === 1,\n        },"

count = s.count(old)
if count == 1:
    s = s.replace(old, new, 1)
    p.write_text(s)
    print('Standardized DM-requested attack roll for DiceRollDisplay')
elif count == 0 and 'label: `${label} Attack`' in s and 'value: total' in s and 'dc: diff' in s:
    print('Attack roll display shape already patched')
else:
    raise SystemExit(f'Refusing to patch: expected one attack roll result anchor, found {count}')
