import fs from 'node:fs';

const path = 'src/hooks/useGame.js';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

// The player's prose is authoritative about HOW they attack. The dice engine may
// use equipped-weapon mechanics internally, but naming that weapon in GAME DATA
// makes the DM overwrite actions like "punch him" with a weapon strike.
const replacements = [
  [
    "resultText: `[ROLL RESULT: attack roll with ${label} — d20 ${result.atkRoll} + ${result.statLabel} ${result.statBonus} + proficiency ${result.profBonus}${result.weaponBonus ? ` + weapon ${result.weaponBonus}` : ''} = ${result.totalAtk} vs difficulty ${diff} — ${hit ? 'HIT' : 'MISS'}${hit ? `; damage ${result.totalDmg}` : ''}]`,",
    "resultText: `[ROLL RESULT: attack roll — d20 ${result.atkRoll} + ${result.statLabel} ${result.statBonus} + proficiency ${result.profBonus}${result.weaponBonus ? ` + equipment ${result.weaponBonus}` : ''} = ${result.totalAtk} vs difficulty ${diff} — ${hit ? 'HIT' : 'MISS'}${hit ? `; damage ${result.totalDmg}` : ''}]`,",
  ],
  [
    "label: `${label} Attack`,",
    "label: 'Attack',",
  ],
];

for (const [from, to] of replacements) {
  if (s.includes(to)) continue;
  const count = s.split(from).length - 1;
  if (count !== 1) throw new Error(`Attack roll weapon-name patch: expected one anchor, found ${count}`);
  s = s.replace(from, to);
  changed = true;
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('Weapon name removed from attack roll GAME DATA.');
} else {
  console.log('Attack roll GAME DATA already hides weapon name.');
}
